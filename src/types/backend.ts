/**
 * 백엔드 응답 계약. `domain.ts` 와 달리 **이건 추측이 아니다** — 아래 각 타입은
 * jb-backend 의 실제 DTO 를 읽고 옮긴 것이고, 출처를 한 줄씩 박아 뒀다.
 *
 * 전부 `jb-backend a2ee567` 기준이며 http://43.203.149.41/v3/api-docs 의
 * 스키마와도 대조했다. 백엔드에 springdoc 이 이미 붙어 있으므로, 타입이 늘어나
 * 손으로 관리하기 벅차지면 OpenAPI → 타입 생성으로 갈아탄다(CLAUDE.md).
 *
 * ⚠️ 매물·추천은 여기 없다. `GET /api/properties/{id}` 도 `/api/recommendations/*` 도
 *    백엔드에 존재하지 않는다 — 그쪽은 여전히 `domain.ts` + `mocks/` 가 굴린다.
 */

/** 서버 시각. Jackson 기본 직렬화라 오프셋 없는 ISO-8601 이다("2026-09-17T00:59:56.548"). */
export type LocalDateTime = string

/* ── 인증 ─────────────────────────────────────────────────────────────── */

/** 출처: UserResponse.java:7 (jb-backend a2ee567) */
export interface UserResponse {
  id: string
  email: string
  /** 닉네임 미설정이면 null. 이 값의 유무가 곧 profileCompleted 다. */
  nickname: string | null
  profileCompleted: boolean
}

/**
 * 출처: LoginResponse.java:5 (jb-backend a2ee567)
 *
 * refresh token 은 이 본문에 없다 — `refresh_token` httpOnly 쿠키로만 내려온다
 * (AuthController.java:44). 그래서 프론트는 refresh token 을 만질 수 없고,
 * 만질 필요도 없다.
 */
export interface LoginResponse {
  accessToken: string
  /** 항상 "Bearer". */
  tokenType: string
  /** access token 수명(초). 현재 900 = 15분 (JwtTokenService.java:32). */
  expiresIn: number
  isNewUser: boolean
  user: UserResponse
}

/** 출처: TokenResponse.java:3 (jb-backend a2ee567) */
export interface TokenResponse {
  accessToken: string
  tokenType: string
  expiresIn: number
}

/* ── 내 계정 ───────────────────────────────────────────────────────────── */

/** 출처: AccountResponse.java:7 (jb-backend a2ee567) */
export interface AccountResponse {
  id: string
  /** 대문자로 내려온다("GOOGLE"). */
  provider: string
  email: string
  nickname: string | null
  /** UserRole enum — "USER" | "ADMIN". */
  role: string
  profileCompleted: boolean
  createdAt: LocalDateTime
}

/**
 * 닉네임은 2~15자. 서버가 strip 한 뒤 검증하므로 공백만으로는 통과하지 못한다.
 * 출처: UpdateNicknameRequest.java:5 (jb-backend a2ee567)
 */
export const NICKNAME_MIN = 2
export const NICKNAME_MAX = 15

/* ── 거점(workplace) ───────────────────────────────────────────────────── */

/**
 * 출처: WorkplaceResponse.java:7 (jb-backend a2ee567)
 *
 * 프론트의 `Anchor`(domain.ts) 와 같은 것을 가리키지만 필드 이름이 다르다 —
 * `roadAddress`/`lat`/`lng` ↔ `address`/`y`/`x`. 변환은 lib/api/workplaces.ts.
 */
export interface WorkplaceResponse {
  id: string
  name: string
  roadAddress: string
  lat: number
  lng: number
}

/**
 * 출처: WorkplaceCreateRequest.java:6 (jb-backend a2ee567)
 *
 * **좌표를 보내지 않는다.** 서버가 VWorld 로 지오코딩해서 lat/lng 를 채운다
 * (WorkplaceService.java:39). 그래서 로그인 상태에서는 lib/api/geocode.ts 의
 * 카카오 지오코딩이 필요 없다.
 */
export interface WorkplaceCreateRequest {
  /** 최대 50자 */
  name: string
  /** 최대 255자. 도로명 주소여야 VWorld 가 찾는다. */
  roadAddress: string
}

/* ── 찜(favorite) ─────────────────────────────────────────────────────── */

/** 출처: LeaseType.java (jb-backend a2ee567). domain.ts 의 DealType 과 다르다 — 매매가 없다. */
export type LeaseType = 'JEONSE' | 'MONTHLY'

/** 출처: FavoriteDtos.java:18 Summary (jb-backend a2ee567) */
export interface FavoritePropertySummary {
  id: string
  name: string
  address: string
  roadAddress: string
  propertyType: string
  leaseType: LeaseType
  /** 보증금(원 단위인지 만원 단위인지는 property 적재 정책에 달렸다 — 표시 전 확인할 것) */
  deposit: number
  monthlyRent: number
  /** 전용면적(㎡). BigDecimal 이 문자열이 아닌 number 로 직렬화된다. */
  exclusiveArea: number | null
  floor: number | null
  buildYear: number | null
}

/** 출처: FavoriteDtos.java:25 Detail (jb-backend a2ee567) */
export interface FavoritePropertyDetail extends FavoritePropertySummary {
  sggCode: string
  umdName: string
  latitude: number
  longitude: number
  totalFloors: number | null
  direction: string | null
  description: string | null
}

/** 출처: FavoriteDtos.java:35 Item (jb-backend a2ee567) */
export interface FavoriteItem {
  favoriteId: string
  createdAt: LocalDateTime
  property: FavoritePropertySummary
}

/** 출처: FavoriteDtos.java:38 Detailed (jb-backend a2ee567) */
export interface FavoriteDetailed {
  favoriteId: string
  createdAt: LocalDateTime
  property: FavoritePropertyDetail
}

/**
 * 출처: FavoriteDtos.java:41 Listing (jb-backend a2ee567)
 * Spring Page 를 그대로 노출하지 않고 이 모양으로 감싸서 내려준다.
 */
export interface FavoritePage {
  content: FavoriteItem[]
  page: number
  size: number
  totalElements: number
  totalPages: number
  last: boolean
}

/** 출처: FavoriteDtos.java:15 Created (jb-backend a2ee567) */
export interface FavoriteCreated {
  favoriteId: string
  propertyId: string
  createdAt: LocalDateTime
}

/* ── 오류 ─────────────────────────────────────────────────────────────── */

/**
 * `application/problem+json`. 모든 예외 핸들러가 이 모양으로 맞춰 내려준다
 * (AuthProblemDetails.response 를 workplace·me 쪽에서도 같이 쓴다).
 *
 * 실제 응답 예: {"type":"about:blank","status":401,"instance":"/api/me",
 *               "code":"INVALID_ACCESS_TOKEN","detail":"인증에 실패했습니다.", …}
 */
export interface ProblemDetail {
  type?: string
  title?: string
  status?: number
  instance?: string
  /** 분기해도 되는 유일한 필드. detail 문구는 바뀔 수 있다. */
  code?: string
  detail?: string
  timestamp?: string
}
