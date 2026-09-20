/**
 * 백엔드 응답 계약. `domain.ts` 와 달리 **이건 추측이 아니다** — 아래 각 타입은
 * jb-backend 의 실제 DTO 를 읽고 옮긴 것이고, 출처를 한 줄씩 박아 뒀다.
 *
 * 전부 `jb-backend a2ee567` 기준이며 http://43.203.149.41/v3/api-docs 의
 * 스키마와도 대조했다. 백엔드에 springdoc 이 이미 붙어 있으므로, 타입이 늘어나
 * 손으로 관리하기 벅차지면 OpenAPI → 타입 생성으로 갈아탄다(CLAUDE.md).
 *
 * ⚠️ **추천은 여기 없다.** `/api/recommendations/*` 는 아직 백엔드에 없어서
 *    `domain.ts` + `mocks/recommendation.ts` 가 굴린다. 매물 목록·상세는 2026-09-20 에
 *    실재하게 됐다(jb-backend 663da20).
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

/**
 * 매물 `direction` 에 넣을 수 있는 값.
 *
 * 서버는 이 여덟 개만 알아듣는다 — **"지원하지 않는 방향은 임의로 해석하지 않고 저장하지
 * 않는다"**(docs/specs/property-sunlight-estimate.md, jb-backend 1dc33ee).
 *
 * ⚠️ 어긋나도 **등록은 201 로 성공한다.** 채광 추정만 조용히 빠진다. 그래서 자유 입력으로
 * 두면 "남" · "남쪽" 같은 값이 들어가 채광이 없는 매물이 소리 없이 쌓인다.
 * 등록 화면이 이 목록으로 고르게 하는 이유다.
 *
 * `direction` 자체는 여전히 선택 필드다(비워도 등록된다). 다만 채광은
 * `direction`·`floor`·`totalFloors` 가 **모두** 있어야 계산된다.
 */
/**
 * 매물 유형 어휘. **등록 화면과 추천 요청이 이 하나를 같이 쓴다.**
 *
 * 서버가 추천 후보를 `p.propertyType in :propertyTypes` 로 — **정확히 일치**로 —
 * 거른다(PropertyRepository). 등록할 때 '원룸'이라 적고 추천에서 '원룸형'을 보내면
 * 그 매물은 영영 안 잡힌다. 자유 입력을 두면 언젠가 반드시 어긋나므로 목록을 고정하고
 * 양쪽이 같은 상수를 보게 했다.
 *
 * 값을 늘릴 때는 **뒤에 덧붙인다** — 기존 매물의 문자열이 그대로 남아 있어서
 * 이름을 바꾸면 이미 등록된 매물이 추천에서 사라진다.
 */
export const PROPERTY_TYPES = ['원룸', '투룸', '쓰리룸', '오피스텔', '아파트', '빌라'] as const

export type PropertyTypeName = (typeof PROPERTY_TYPES)[number]

export const PROPERTY_DIRECTIONS = [
  '남향',
  '남동향',
  '남서향',
  '동향',
  '서향',
  '북동향',
  '북서향',
  '북향',
] as const

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
  /** 공급면적(**㎡**). 전용면적과 같은 제약 (jb-backend 663da20, V8) */
  supplyArea?: number | null
  floor?: number | null
  /** 욕실 수. 0보다 큼 (jb-backend 663da20, V8) */
  bathroomCount?: number | null
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
  /**
   * 대표 사진(`displayOrder = 0`). 사진이 없으면 null.
   * **2026-09-20 에 생겼다**(jb-backend 6783d46) — 그전에는 찜 목록 카드가 늘 회색이었다.
   */
  thumbnailUrl: string | null
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

/* ── 매물 조회(공개) ───────────────────────────────────────────────────── */

/**
 * 매물 사진 한 장. 출처: PropertyImageResponse.Image (jb-backend 663da20)
 *
 * `url` 은 **경로**다(`/api/property-images/…`). 같은 오리진으로 프록시되므로
 * 그대로 `<img src>` 에 넣으면 된다.
 */
export interface PropertyImage {
  id: string
  url: string
  /** 0 이 대표 사진. 상세 응답은 이 순서대로 온다. */
  displayOrder: number
}

/**
 * 지도 영역 안의 매물 한 건. 출처: PropertyMapResponse.Item (jb-backend 663da20)
 *
 * 상세보다 **얇다** — 도로명주소·공급면적·욕실 수·사진 전체·지표가 없다.
 * 명세가 "상세 화면에서만 제공"이라고 정했다(property-listing-and-detail.md).
 */
export interface PropertyMapItem {
  id: string
  latitude: number
  longitude: number
  /** 대표 사진(`displayOrder = 0`). 사진이 한 장도 없으면 **null** 이다. */
  thumbnailUrl: string | null
  name: string
  propertyType: string
  leaseType: LeaseType
  /** 만원 */
  deposit: number
  monthlyRent: number
  /** ㎡. 등록 시 선택이라 null 일 수 있다. */
  exclusiveArea: number | null
  floor: number | null
  /** 지번 주소. 목록에는 도로명이 오지 않는다. */
  address: string
  /** 비로그인이면 전부 false — 선택적 인증이다. */
  favorite: boolean
}

/** 사진 업로드 응답. 출처: PropertyImageResponse (jb-backend 663da20) */
export interface PropertyImageUploadResponse {
  propertyId: string
  /** 방금 올린 것만이 아니라 **그 매물의 사진 전체**가 순서대로 온다. */
  images: PropertyImage[]
}

/** 매물 한 건에 저장할 수 있는 사진 수. 기존 것을 포함한 상한이다. */
export const PROPERTY_IMAGE_MAX_COUNT = 10
/** 한 장의 최대 크기(바이트). */
export const PROPERTY_IMAGE_MAX_BYTES = 10 * 1024 * 1024
/** 허용 형식. 서버는 확장자가 아니라 **파일 시그니처**로 확인한다. */
export const PROPERTY_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const

/** 출처: PropertyMapResponse (jb-backend 663da20) */
export interface PropertyMapResponse {
  properties: PropertyMapItem[]
}

/**
 * 지도 영역 조회 조건.
 *
 * **페이지가 없다.** 명세가 "전통적인 페이지네이션을 사용하지 않는다"고 못박았고,
 * 영역 안 매물이 `limit` 보다 많으면 **최근 등록순으로 잘라서** 준다(잘렸는지 알려주는
 * 필드도 없다). 정렬 파라미터도 받지 않는다 — 정렬은 화면 몫이다.
 */
export interface PropertyMapQuery {
  minLat: number
  maxLat: number
  minLng: number
  maxLng: number
  /** 1~200. 서버 기본값 100. */
  limit?: number
}

/**
 * 매물 상세. 출처: PropertyDetailResponse (jb-backend 663da20)
 *
 * 관리자 등록 응답(`PropertyResponse`)과 **다른 DTO** 다 — 이쪽은 공개용이라
 * `sggCode`·`umdName`·`createdAt`·`updatedAt` 이 없다.
 *
 * ⚠️ 치안·소음·인프라·채광 지표는 **여기 오지 않는다.** 저장은 되지만 응답에 싣지
 * 않기로 했고(추천 단계 몫), 점수·순위·이동시간·AI 요약도 마찬가지다.
 */
export interface PropertyDetailResponse {
  id: string
  name: string
  address: string
  roadAddress: string
  latitude: number
  longitude: number
  propertyType: string
  leaseType: LeaseType
  deposit: number
  monthlyRent: number
  /** ㎡ */
  exclusiveArea: number | null
  supplyArea: number | null
  floor: number | null
  bathroomCount: number | null
  totalFloors: number | null
  buildYear: number | null
  direction: string | null
  description: string | null
  /** `displayOrder` 오름차순. 사진이 없으면 빈 배열이다. */
  images: PropertyImage[]
  favorite: boolean
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
  /** 404. 매물이 없다 — 찜 등록과 상세 조회가 같은 코드를 쓴다. */
  PROPERTY_NOT_FOUND: 'PROPERTY_NOT_FOUND',
  /** 400. 지도 영역이 잘못됐다(위경도 범위 밖, min > max). */
  INVALID_MAP_BOUNDS: 'INVALID_MAP_BOUNDS',
  /** 400. 파일이 없거나 비었거나, 기존 것까지 합쳐 10장을 넘었다. */
  INVALID_PROPERTY_IMAGE: 'INVALID_PROPERTY_IMAGE',
  /** 413. 한 장이 10MB 를 넘었다. */
  PROPERTY_IMAGE_TOO_LARGE: 'PROPERTY_IMAGE_TOO_LARGE',
  /** 415. JPEG·PNG·WEBP 가 아니거나, 확장자와 실제 내용이 다르다(시그니처 검사). */
  UNSUPPORTED_PROPERTY_IMAGE_TYPE: 'UNSUPPORTED_PROPERTY_IMAGE_TYPE',
  /** 500. 볼륨에 저장하지 못했다. */
  PROPERTY_IMAGE_STORAGE_FAILED: 'PROPERTY_IMAGE_STORAGE_FAILED',
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
  /** 400. 비로그인인데 `X-Client-Session` 헤더가 없다. 전송 계층이 늘 붙이므로 나면 버그다. */
  CLIENT_SESSION_REQUIRED: 'CLIENT_SESSION_REQUIRED',
  /** 404. 내 추천이 아니거나 없는 id 다. 남의 것도 '없음'으로 온다. */
  RECOMMENDATION_NOT_FOUND: 'RECOMMENDATION_NOT_FOUND',
  /** 409. 아직 처리 중이다. 결과를 부르기 전에 상태가 COMPLETED 인지 확인한다. */
  RECOMMENDATION_NOT_READY: 'RECOMMENDATION_NOT_READY',
  /** 404. 추천에 넘긴 거점이 내 것이 아니거나 지워졌다. */
  WORKPLACE_NOT_FOUND: 'WORKPLACE_NOT_FOUND',
  /** 502. VWorld 주소 검색이 죽었다. */
  ADDRESS_SEARCH_UNAVAILABLE: 'ADDRESS_SEARCH_UNAVAILABLE',
} as const

/* ── 추천 ──────────────────────────────────────────────────────────────── */

/**
 * 이동수단. 출처: TransportType.java (jb-backend c0ff0f0)
 *
 * ⚠️ **통근시간은 직선거리 근사다.** 이 enum 이 들고 있는 건 실제 경로가 아니라
 * 우회·환승·대기를 뭉뚱그려 보정한 실효 속도고, 응답의 `commuteMinutes` 도 같은
 * 근사값이다(property-recommendation.md). 길찾기 API 가 붙으면 바뀐다.
 */
export type TransportType = 'WALK' | 'BICYCLE' | 'TRANSIT' | 'CAR'

/** 출처: RecommendationStatus.java (jb-backend c0ff0f0) */
export type RecommendationStatusCode = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED'

/**
 * 추천 요청. 출처: RecommendationCreateRequest.java (jb-backend c0ff0f0)
 *
 * 값 제약이 빡빡하다. 어긋나면 전부 400 이라 보내기 전에 프론트가 맞춘다
 * (`lib/recommendation-request.ts`).
 */
export interface RecommendationCreateRequest {
  /**
   * 등록된 거점의 id. **좌표가 아니라 id 다** — 서버가 스냅샷으로 복사해 둔다.
   * `workplace` 와 **정확히 하나만** 보낸다(서버 `@AssertTrue`). 둘 다 보내도 400 이다.
   */
  workplaceId?: string
  /**
   * 이번 요청에만 쓸 거점. 저장하지 않는다.
   * **비로그인은 거점을 저장할 수 없어 이쪽만 쓴다**(jb-backend 9cd8ab2).
   * 서버가 주소를 지오코딩하므로 등록과 같은 실패 코드가 난다
   * (ADDRESS_NOT_GEOCODABLE · GEOCODING_UNAVAILABLE).
   */
  workplace?: { name: string; roadAddress: string }
  transportType: TransportType
  /** 5~180. 프론트 슬라이더 하한도 5 다. */
  maxCommuteMinutes: number
  /** 넷 다 1~5. 프론트의 0~100 슬라이더를 접어서 보낸다. */
  sunlightImportance: number
  quietnessImportance: number
  safetyImportance: number
  infrastructureImportance: number
  /** 만원. min ≤ max 여야 한다. */
  depositMin: number
  depositMax: number
  monthlyRentMin: number
  monthlyRentMax: number
  /**
   * 매물 유형. **1~10개고 비면 400 이다.**
   * 서버가 `property_type` 을 **정확히 일치**로 거르므로(PropertyRepository 의
   * `p.propertyType in :propertyTypes`), 등록 화면과 같은 어휘를 써야 한다
   * — 그래서 `PROPERTY_TYPES` 하나를 양쪽이 공유한다.
   */
  roomTypes: string[]
}

/** 출처: RecommendationAcceptedResponse.java. 202 로 온다. */
export interface RecommendationAcceptedResponse {
  recommendationId: string
  status: RecommendationStatusCode
}

/** 출처: RecommendationStatusResponse.java */
export interface RecommendationStatusResponse {
  recommendationId: string
  status: RecommendationStatusCode
  requestedAt: LocalDateTime
  startedAt: LocalDateTime | null
  completedAt: LocalDateTime | null
  /** FAILED 일 때만 채워진다. 개발 확인용 문구라 화면에 그대로 띄우지 않는다. */
  failureReason: string | null
}

/**
 * 한 매물에 대한 LLM 평가. 출처: RecommendationEvaluation.java
 *
 * 점수는 **이 추천 기준에서만** 의미가 있다. 같은 매물이라도 조건이 바뀌면 달라져서
 * 매물 상세(`/api/properties/{id}`)에는 없고 추천 경로에만 붙는다.
 */
export interface RecommendationEvaluation {
  /** 1부터. 추천 순위다. */
  rank: number
  commuteMinutes: number
  totalScore: number
  sunlightScore: number
  quietnessScore: number
  safetyScore: number
  infrastructureScore: number
  commuteScore: number
  summary: string
}

/** 출처: RecommendedPropertyResponse.java */
export interface RecommendedPropertyItem {
  id: string
  name: string
  /** 목록과 달리 **도로명**이 온다. */
  roadAddress: string
  latitude: number
  longitude: number
  thumbnailUrl: string | null
  propertyType: string
  leaseType: LeaseType
  deposit: number
  monthlyRent: number
  exclusiveArea: number | null
  floor: number | null
  evaluation: RecommendationEvaluation
}

export interface RecommendedPropertyResponse {
  content: RecommendedPropertyItem[]
}

/** 출처: RecommendedPropertyDetailResponse.java — 매물 상세에 평가만 덧붙인다. */
export interface RecommendedPropertyDetailResponse {
  property: PropertyDetailResponse
  evaluation: RecommendationEvaluation
}
