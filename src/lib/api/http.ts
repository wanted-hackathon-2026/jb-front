/**
 * 최소 HTTP 클라이언트. 백엔드가 아직 없어서 base 가 비어 있으면 목으로 떨어진다
 * (`hasApiBase` 로 호출부에서 판단).
 */
const BASE = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? ''

export const hasApiBase = Boolean(BASE)

/** 서버가 더는 모르는 작업(404/410). 폴링을 멈출 근거가 된다. */
export class NotFoundError extends Error {
  readonly status: number

  constructor(status: number) {
    super(`요청한 리소스를 찾을 수 없다 (${status})`)
    this.status = status
  }
}

export async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...init?.headers },
  })
  // 410 Gone 도 같은 취급이다 — 만료든 미존재든 프론트가 할 일은 같다.
  if (res.status === 404 || res.status === 410) throw new NotFoundError(res.status)
  if (!res.ok) throw new Error(`${init?.method ?? 'GET'} ${path} 실패: ${res.status}`)
  return res.json() as Promise<T>
}
