/**
 * 최소 HTTP 클라이언트.
 *
 * 기본값은 **같은 오리진**이다. 개발에서는 Vite 프록시가 `/api` 를 배포 서버로
 * 넘긴다(vite.config.ts). 프록시를 쓰는 이유는 두 가지이고 둘 다 실측한 것이다:
 *
 * 1. 배포 서버의 CORS 허용 오리진에 `http://localhost:5173` 이 없다.
 *    실측(2026-09-17): localhost:3000 과 43.203.149.41 만 200, 나머지는 403
 *    "Invalid CORS request". jb-backend 는 이 레포에서 읽기 전용이라 고칠 수 없다.
 * 2. refresh token 쿠키가 `SameSite=Lax` 다(AuthController.java:80). 교차 사이트
 *    fetch 에는 실려 가지 않으므로, 프록시로 같은 오리진을 만들어야 재발급이 돈다.
 */
import type { ProblemDetail, TokenResponse } from '@/types/backend'

/** 비워 두면 같은 오리진. 배포에서 프론트와 API 가 다른 호스트면 그때 채운다. */
const BASE = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? ''

/**
 * 매물·추천 API 가 백엔드에 존재하는가.
 *
 * **지금은 false 다.** jb-backend a2ee567 에는 `GET /api/properties/{id}` 도
 * `/api/recommendations/*` 도 없다(존재하는 건 `POST /api/properties` 뿐이고
 * 그것도 ADMIN 전용이다). 그래서 그쪽 호출부는 전부 mocks 로 떨어진다.
 * 엔드포인트가 생기면 이 한 줄만 true 로 바꾼다.
 *
 * 타입을 boolean 으로 못박아 둔 건 리터럴 narrowing 때문이다 — 안 그러면
 * 아래 실제 호출 코드가 '도달 불가'로 접혀서 타입 검사를 받지 못한다.
 */
export const hasListingApi: boolean = false

/** 서버가 더는 모르는 작업(404/410). 폴링을 멈출 근거가 된다. */
export class NotFoundError extends Error {
  readonly status: number

  constructor(status: number) {
    super(`요청한 리소스를 찾을 수 없다 (${status})`)
    this.status = status
  }
}

/**
 * problem+json 을 실어 나르는 오류. 분기는 `code` 로만 한다 — `detail` 문구는
 * 언제든 바뀐다(예: ADDRESS_NOT_GEOCODABLE, INVALID_ACCESS_TOKEN).
 */
export class ApiError extends Error {
  readonly status: number
  readonly code: string | null
  readonly problem: ProblemDetail | null

  constructor(status: number, problem: ProblemDetail | null, fallback: string) {
    super(problem?.detail ?? fallback)
    this.status = status
    this.code = problem?.code ?? null
    this.problem = problem
  }
}

/* ── access token ─────────────────────────────────────────────────────── */

/**
 * access token 은 **메모리에만** 둔다. 15분짜리라 새로고침 때마다 재발급받으면
 * 되고(`reissue`), 오래 사는 쪽은 프론트가 건드릴 수 없는 httpOnly 쿠키다.
 * localStorage 에 넣으면 수명만 늘고 XSS 노출면만 커진다.
 */
let accessToken: string | null = null

export const setAccessToken = (token: string | null) => {
  accessToken = token
}
export const getAccessToken = () => accessToken

/* ── 전송 ─────────────────────────────────────────────────────────────── */

const REISSUE_PATH = '/api/auth/reissue'

function send(path: string, init?: RequestInit): Promise<Response> {
  return fetch(`${BASE}${path}`, {
    ...init,
    // refresh_token 쿠키를 싣는다. 프록시 덕에 같은 오리진이라 실제로 실린다.
    credentials: 'include',
    headers: {
      // 본문이 있을 때만 붙인다. GET 에 붙이면 교차 오리진에서 불필요한 preflight 가 뜬다.
      ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...init?.headers,
    },
  })
}

/**
 * 재발급은 **동시에 한 번만** 돈다. 화면 진입 때 여러 요청이 한꺼번에 401 을 맞는데,
 * 각자 재발급을 쏘면 서버가 refresh token 을 회전시키는 사이 서로의 토큰을 무효화한다.
 */
let inFlightReissue: Promise<boolean> | null = null

/**
 * refresh 쿠키로 access token 을 다시 받는다. 성공하면 true.
 *
 * 앱 시작 시 '로그인 상태 복원'도 이 함수다 — 쿠키가 살아 있으면 통과하고,
 * 없으면 401 로 조용히 실패한다(로그인한 적 없는 사용자의 정상 경로다).
 */
export function reissue(): Promise<boolean> {
  if (inFlightReissue) return inFlightReissue

  inFlightReissue = (async () => {
    try {
      const res = await send(REISSUE_PATH, { method: 'POST' })
      if (!res.ok) {
        setAccessToken(null)
        return false
      }
      const tokens = (await res.json()) as TokenResponse
      setAccessToken(tokens.accessToken)
      return true
    } catch {
      // 네트워크 실패는 '로그아웃'이 아니다. 토큰은 그대로 두고 실패만 알린다.
      return false
    } finally {
      inFlightReissue = null
    }
  })()

  return inFlightReissue
}

async function problemOf(res: Response): Promise<ProblemDetail | null> {
  try {
    return (await res.json()) as ProblemDetail
  } catch {
    return null // 본문이 비었거나 JSON 이 아니다(예: nginx 가 만든 502).
  }
}

export async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let res = await send(path, init)

  // 401 한 번은 만료로 보고 재발급 후 딱 한 번 더 시도한다. 재발급 자체가 401 이면
  // 쿠키가 죽은 것이므로 더 볼 것 없다(무한 재시도 방지).
  if (res.status === 401 && path !== REISSUE_PATH && (await reissue())) {
    res = await send(path, init)
  }

  // 410 Gone 도 같은 취급이다 — 만료든 미존재든 프론트가 할 일은 같다.
  if (res.status === 404 || res.status === 410) throw new NotFoundError(res.status)
  if (!res.ok) {
    throw new ApiError(
      res.status,
      await problemOf(res),
      `${init?.method ?? 'GET'} ${path} 실패: ${res.status}`,
    )
  }

  // 204 No Content(로그아웃·찜 삭제)와 빈 본문은 파싱하지 않는다.
  if (res.status === 204 || res.headers.get('Content-Length') === '0') {
    return undefined as T
  }
  return (await res.json()) as T
}
