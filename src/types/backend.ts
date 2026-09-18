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

/* ── 매물 등록(관리자) ─────────────────────────────────────────────────── */

/**
 * 출처: PropertyCreateRequest.java (jb-backend a2ee567)
 *
 * 주소 네 칸은 **좌표의 근거**다. 서버가 `roadAddress` 를 VWorld 에 넘겨 좌표를 직접
 * 찾고(PropertyService.create), 못 찾으면 저장하지 않고 ADDRESS_NOT_GEOCODABLE 로
 * 거절한다. 그래서 요청에 좌표 필드가 아예 없다 — 클라이언트 좌표는 받지 않는다.
 */
export interface PropertyCreateRequest {
  /** 최대 100자 */
  name: string
  /** 지번 주소. 최대 255자 */
  address: string
  /** 도로명 주소. 최대 255자. 이 값으로만 좌표를 찾는다 */
  roadAddress: string
  /** 시군구 코드 — **숫자 5자리**(우편번호가 아니다). 우편번호 위젯의 sigunguCode */
  sggCode: string
  /** 법정동명. 최대 50자. 우편번호 위젯의 bname */
  umdName: string
  /** 자유 문자열, 최대 20자 ("분리형 원룸" 등) */
  propertyType: string
  leaseType: LeaseType
  /** 보증금(**만원**), 0 이상 */
  deposit: number
  /**
   * 월세(**만원**), 0 이상. leaseType 과 교차 검증된다 —
   * JEONSE 는 반드시 0, MONTHLY 는 반드시 0보다 커야 한다(@AssertTrue + DB CHECK).
   */
  monthlyRent: number
  /** 전용면적(**㎡**), 0보다 큼. 정수 6자리·소수 2자리까지 */
  exclusiveArea?: number | null
  floor?: number | null
  /** 0보다 큼 */
  totalFloors?: number | null
  /** 0보다 큼 */
  buildYear?: number | null
  /** 최대 10자. 공백만 있는 값은 거절된다 */
  direction?: string | null
  /** 최대 16383자 */
  description?: string | null
}

/**
 * 출처: PropertyResponse.java (jb-backend a2ee567). 201 로 내려온다.
 * 요청과 달리 **좌표가 채워져 있다** — 서버가 찾아 넣은 값이다.
 */
export interface PropertyResponse extends Omit<PropertyCreateRequest, 'exclusiveArea'> {
  id: string
  latitude: number
  longitude: number
  exclusiveArea: number | null
  createdAt: LocalDateTime
  updatedAt: LocalDateTime
}

/** 출처: FavoriteDtos.java:18 Summary (jb-backend a2ee567) */
export interface FavoritePropertySummary {
  id: string
  name: string
  address: string
  roadAddress: string
  propertyType: string
  leaseType: LeaseType
  /**
   * 보증금(**만원**). 전세는 monthlyRent 가 0, 월세는 0보다 크다.
   * 출처: docs/specs/my-account-and-favorites.md, property-registration.md
   * → 프론트의 `Listing.deposit`·`rent` 와 단위가 같아서 환산이 필요 없다.
   */
  deposit: number
  monthlyRent: number
  /**
   * 전용면적(**㎡**). BigDecimal 이 문자열이 아닌 number 로 직렬화된다.
   * 프론트는 평으로 표시하므로 `lib/format.ts` 의 변환을 거친다.
   */
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

/**
 * 분기해도 되는 오류 코드. 명세가 "클라이언트가 분기 처리하는 **안정적인 식별자**"라고
 * 정의한 값이다(docs/specs/google-oauth-login.md §6). 반대로 `detail` 은 개발·운영
 * 확인용이라 화면에 그대로 띄우면 안 된다.
 *
 * 출처: docs/specs 의 세 명세 + 실제 구현(FavoriteServiceImpl·AccountServiceImpl 등).
 * 여기 없는 코드도 서버는 보낼 수 있다 — 분기하는 것만 적는다.
 */
export const ERROR_CODE = {
  /** 401. 액세스 토큰이 없거나 만료·변조됐다. 재발급 후 한 번 재시도한다. */
  INVALID_ACCESS_TOKEN: 'INVALID_ACCESS_TOKEN',
  /** 401. refresh 쿠키가 없거나 죽었다. 실패 사유를 구분해 주지 않는다(의도된 설계). */
  INVALID_REFRESH_TOKEN: 'INVALID_REFRESH_TOKEN',
  /** 401. 구글 ID 토큰 검증 실패 — audience 불일치가 가장 흔하다. */
  INVALID_GOOGLE_TOKEN: 'INVALID_GOOGLE_TOKEN',
  /** 502. 구글 공개 키 조회 실패 등. 사용자 잘못이 아니므로 재시도를 권한다. */
  GOOGLE_AUTH_UNAVAILABLE: 'GOOGLE_AUTH_UNAVAILABLE',
  /**
   * 403. 닉네임 설정 전에 `GET`·`PATCH /api/me` 외의 API 를 불렀다.
   * 호출 전에 `auth.canUseApi` 로 걸러야 한다 — 이 코드를 보게 되면 이미 늦은 것이다.
   */
  PROFILE_INCOMPLETE: 'PROFILE_INCOMPLETE',
  /** 409. 다른 사용자가 쓰는 닉네임. 자기 닉네임을 다시 저장하는 건 성공한다. */
  NICKNAME_ALREADY_EXISTS: 'NICKNAME_ALREADY_EXISTS',
  /** 404. 찜하려는 매물이 없다. */
  PROPERTY_NOT_FOUND: 'PROPERTY_NOT_FOUND',
  /** 404. 내가 찜한 적 없는 매물이다. */
  FAVORITE_NOT_FOUND: 'FAVORITE_NOT_FOUND',
  /** 409. 이미 찜했다. 동시 요청도 한 건만 저장되고 나머지가 이걸 받는다. */
  FAVORITE_ALREADY_EXISTS: 'FAVORITE_ALREADY_EXISTS',
  /** 400. 도로명주소의 좌표를 못 찾았다. 주소를 다시 고르게 해야 한다. */
  ADDRESS_NOT_GEOCODABLE: 'ADDRESS_NOT_GEOCODABLE',
  /** 502. VWorld 가 죽었다. 사용자 잘못이 아니다. */
  GEOCODING_UNAVAILABLE: 'GEOCODING_UNAVAILABLE',
  /** 400. 요청 JSON·필드 검증 실패. */
  INVALID_REQUEST: 'INVALID_REQUEST',
} as const
