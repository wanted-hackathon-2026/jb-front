/**
 * 매물 조회 — **실제 백엔드를 부른다**(jb-backend 663da20).
 *
 * 목록은 페이지가 아니라 **지도 영역(bbox)** 조회다. 상세는 사진 전체와 `favorite` 를
 * 함께 준다. 둘 다 `permitAll` 이라 **비로그인도 본다** — 토큰이 있으면 `favorite` 가
 * 그 사용자 기준으로 채워진다(선택적 인증).
 *
 * 추천 맥락이 붙은 단건(`getRecommendedListing`)만 아직 목이다. 추천 API 자체가 없다.
 */
import { getMockRecommendedListing } from '@/mocks/listings'
import type { Listing } from '@/types/domain'
import type {
  PropertyDetailResponse,
  PropertyMapItem,
  PropertyMapQuery,
  PropertyMapResponse,
} from '@/types/backend'
import { sqmToPyeong } from '@/lib/format'
import { hasRecommendationApi, NotFoundError, request } from './http'

/**
 * 서버에 없는 값들.
 *
 * 우리 `Listing` 은 목을 굴리려고 만든 **추측형**이라 백엔드에 출처가 없는 필드가 많다.
 * 지어내지 않고 비운다 — 화면이 "없음"과 "모름"을 구분할 수 있어야 한다.
 *
 * - **점수·순위·이동 동선·AI 요약·라이프스타일 평가**: '어느 추천 기준이냐'가 있어야
 *   나오는 값이다. 추천 API 가 생기면 그쪽에서 온다
 * - **지하철 호선(`lines`)**: 백엔드가 **일부러 구현하지 않았다** — 역-호선 매핑 데이터가
 *   없어서 "임의로 구현하지 않았다"고 명세에 적혀 있다
 *   (property-listing-and-detail.md '2차 확장' 3번)
 * - **관리비·입주일·주차·엘리베이터·옵션·등록번호·등록 경과일**: 컬럼 자체가 없다
 */
const ABSENT = {
  score: null,
  commutes: [],
  lines: [],
  rank: null,
  aiSummary: null,
  lifestyleInsights: [],
  route: [],
  maintenanceFee: 0,
  moveInDate: '',
  parking: false,
  elevator: false,
  options: [],
  listingNo: '',
  postedDaysAgo: 0,
} satisfies Partial<Listing>

/** 서버 LeaseType → 프론트 DealType. 서버에는 매매가 없다. */
const dealTypeOf = (t: PropertyMapItem['leaseType']) => (t === 'JEONSE' ? 'jeonse' : 'monthly')

/** ㎡ → 평. 없는 면적은 0 으로 둔다 — 등록 시 선택 필드라 비어 올 수 있다. */
const pyeong = (sqm: number | null) => (sqm === null ? 0 : sqmToPyeong(sqm))

/** 지도 영역 응답 한 건 → 화면이 쓰는 `Listing`. */
function toListing(p: PropertyMapItem): Listing {
  return {
    ...ABSENT,
    id: p.id,
    name: p.name,
    favorite: p.favorite,
    dealType: dealTypeOf(p.leaseType),
    deposit: p.deposit,
    rent: p.monthlyRent,
    roomType: p.propertyType,
    areaPyeong: pyeong(p.exclusiveArea),
    floor: p.floor ?? 0,
    address: p.address,
    // 준공 연도는 목록 응답에 없다. 상세에서만 온다.
    buildYear: null,
    x: p.longitude,
    y: p.latitude,
    // 목록에는 대표 사진 한 장만 온다. 없으면 빈 배열 — 카드가 자리표시자로 간다.
    photos: p.thumbnailUrl ? [p.thumbnailUrl] : [],
    // 목록 응답에는 이 셋이 없다. 상세에서만 온다.
    supplyPyeong: 0,
    bathrooms: 0,
    totalFloors: 0,
    description: '',
    direction: '',
  }
}

/** 상세 응답 → `Listing`. 목록보다 채워지는 칸이 많다. */
function detailToListing(p: PropertyDetailResponse): Listing {
  return {
    ...ABSENT,
    id: p.id,
    name: p.name,
    favorite: p.favorite,
    dealType: dealTypeOf(p.leaseType),
    deposit: p.deposit,
    rent: p.monthlyRent,
    roomType: p.propertyType,
    areaPyeong: pyeong(p.exclusiveArea),
    supplyPyeong: pyeong(p.supplyArea),
    buildYear: p.buildYear,
    floor: p.floor ?? 0,
    totalFloors: p.totalFloors ?? 0,
    bathrooms: p.bathroomCount ?? 0,
    direction: p.direction ?? '',
    description: p.description ?? '',
    // 도로명이 있으면 그쪽을 쓴다 — 목록(지번)보다 읽기 쉽다.
    address: p.roadAddress || p.address,
    x: p.longitude,
    y: p.latitude,
    photos: p.images.map((i) => i.url),
  }
}

/**
 * 지도 영역 안의 매물.
 *
 * ⚠️ **잘려도 알 수 없다.** 영역 안 매물이 `limit`(기본 100, 최대 200)보다 많으면
 * 최근 등록순으로 잘라서 주고, 잘렸는지 알려주는 필드가 없다. 명세가 "지도에서는
 * 영역을 좁히거나 확대하는 것으로 충분하다"고 본 결과다.
 */
export async function getListingsInBounds(q: PropertyMapQuery): Promise<Listing[]> {
  const params = new URLSearchParams({
    minLat: String(q.minLat),
    maxLat: String(q.maxLat),
    minLng: String(q.minLng),
    maxLng: String(q.maxLng),
    ...(q.limit ? { limit: String(q.limit) } : {}),
  })
  const res = await request<PropertyMapResponse>(`/api/properties/map?${params}`)
  return res.properties.map(toListing)
}

/**
 * 매물 단건 조회 — 추천 맥락 없음.
 *
 * 점수·순위·이동 동선은 '어느 추천 기준이냐'가 있어야 나오는 값이라 여기엔 없다.
 * 지도의 '주변 매물' 목록에서 들어오는 경로가 이쪽이다.
 */
export async function getListing(id: string): Promise<Listing> {
  return detailToListing(await request<PropertyDetailResponse>(`/api/properties/${id}`))
}

/**
 * 추천 맥락이 붙은 매물 단건 조회.
 *
 * 같은 매물이라도 어느 추천 기준이냐에 따라 점수·이동시간이 달라져서 엔드포인트가
 * 따로 있다. **아직 목이다** — 추천 API 가 없다.
 */
export async function getRecommendedListing(
  recommendationId: string,
  id: string,
): Promise<Listing> {
  if (!hasRecommendationApi) {
    const found = await getMockRecommendedListing(id)
    if (!found) throw new NotFoundError(404)
    return found
  }
  return request<Listing>(`/api/recommendations/${recommendationId}/properties/${id}`)
}
