import type { Listing, SearchHistoryEntry, TransportMode } from '@/types/domain'
import type { FavoritePropertySummary, TransportType } from '@/types/backend'
import { listFavorites } from './favorites'
import { listRecommendations } from './recommendation'
import { sqmToPyeong } from '@/lib/format'
import { toInstant } from '@/lib/server-time'

/**
 * 서버 enum → 프론트 이동수단. `lib/recommendation-request.ts` 의 반대 방향이라
 * 네 값을 다 받는다 — 보낼 때 자전거를 쓰므로 돌아올 때도 온다.
 */
const TRANSPORT_MODE: Record<TransportType, TransportMode> = {
  TRANSIT: 'transit',
  CAR: 'car',
  BICYCLE: 'bicycle',
  WALK: 'walk',
}

/**
 * 마이페이지 세 탭의 데이터.
 *
 * **관심 매물과 이전 기록은 실제 백엔드를 본다**(`/api/me/favorites`,
 * `/api/recommendations`). '최근 본 매물'은 여기 없다 — 서버가 아니라 이 기기에 쌓는다
 * (`stores/recently-viewed.ts`).
 */

/**
 * 한 번에 받아올 최대 개수. 서버가 페이지네이션을 하는데(기본 20) 마이페이지에는
 * 더 보기 UI 가 없어서, 상한치(100)로 한 장만 받아 사실상 전부를 보여준다.
 * 100개를 넘기는 사용자가 생기면 그때 무한 스크롤을 붙이고 이 상수를 지운다.
 */
export const FAVORITES_PAGE_SIZE = 100

/**
 * 백엔드 매물 → 프론트 `Listing`.
 *
 * 변환을 이 파일 한 곳에만 둔다. `Listing` 은 목을 굴리려고 만든 **추측형**이라
 * 백엔드에 출처가 없는 필드가 많은데, 그걸 여기서 정직하게 비워서 화면이 없는 값을
 * 지어내지 않게 한다. 매물 API 가 제대로 생기면 이 함수부터 다시 본다.
 */
function toListing(p: FavoritePropertySummary): Listing {
  return {
    id: p.id,
    name: p.name,
    // 이 목록은 정의상 전부 찜한 것이다.
    favorite: true,
    // 서버 LeaseType 에는 매매가 없다 — 전세·월세뿐이다(types/domain.ts 의 DealType 주석).
    dealType: p.leaseType === 'JEONSE' ? 'jeonse' : 'monthly',
    // 둘 다 만원 단위라 환산이 필요 없다.
    deposit: p.deposit,
    rent: p.monthlyRent,
    roomType: p.propertyType,
    // 전용면적은 ㎡ 로 온다. 없는 매물이 있어(선택 필드) 0 으로 떨어뜨린다.
    areaPyeong: p.exclusiveArea === null ? 0 : sqmToPyeong(p.exclusiveArea),
    floor: p.floor ?? 0,
    buildYear: p.buildYear ?? null,
    // 도로명이 없으면 지번으로 떨어뜨린다(카카오 장소 검색과 같은 규칙).
    address: p.roadAddress || p.address,

    /*
     * 아래는 **목록 응답에 없는 값들**이다. 지어내지 않고 비워 둔다.
     *
     * - 좌표: 목록(Summary)에는 없고 상세(Detail)에만 있다. 카드가 쓰지 않아 0 으로 둔다.
     * - 점수·순위·이동 동선·AI 요약·라이프스타일 평가: '어느 추천 기준이냐'가 있어야
     *   나오는 값이라 찜 목록에는 존재할 수 없다(lib/api/listings.ts 의 같은 구분).
     * - 공급면적·욕실·관리비·향·옵션 따위 상세 값: 목록 응답에 없다.
     *   찜 목록은 카드로만 쓰이니 화면에 영향도 없다 — 상세로 들어가면 매물 API 를
     *   다시 부른다. (대표 사진은 2026-09-20 에 생겨서 이제 채운다.)
     */
    x: 0,
    y: 0,
    score: null,
    commutes: [],
    lines: [],
    supplyPyeong: 0,
    bathrooms: 0,
    description: '',
    maintenanceFee: 0,
    totalFloors: 0,
    direction: '',
    moveInDate: '',
    parking: false,
    elevator: false,
    options: [],
    listingNo: '',
    postedDaysAgo: 0,
    // 대표 사진 한 장. 카드는 첫 장만 쓴다.
    photos: p.thumbnailUrl ? [p.thumbnailUrl] : [],
    aiSummary: null,
    rank: null,
    lifestyleInsights: [],
    route: [],
  }
}

/**
 * 관심 매물. **로그인이 필요하다** — 비로그인으로 부르면 401 이 난다.
 * 호출 전에 로그인 여부를 확인하는 건 화면 몫이다(MyPage 가 그렇게 한다).
 */
export async function getFavorites(): Promise<Listing[]> {
  const page = await listFavorites(0, FAVORITES_PAGE_SIZE)
  return page.content.map((item) => toListing(item.property))
}

/**
 * 이전 추천 기록 — **실제 백엔드를 본다**(jb-backend 71b2a79).
 *
 * `GET /api/recommendations` 가 내가 요청했던 추천들을 최신순으로 준다. 로그인 여부와
 * 무관하게 부를 수 있다 — 소유자는 JWT 아니면 `X-Client-Session` 이 가르므로,
 * 비로그인 사용자도 이 기기에서 돌린 기록을 본다(관심 매물과 다른 점이다).
 *
 * ⚠️ **응답에 조건이 다 오지 않는다.** 서버는 보증금·월세·라이프스타일 중요도까지
 * `recommendation_criteria` 에 스냅샷으로 들고 있는데 이 목록에는 안 싣는다. 지어내지
 * 않고 비워서 넘기면 카드가 그 줄을 접는다(`SearchHistoryEntry` 의 선택 필드).
 * 백엔드가 그 셋을 응답에 더하면 여기서 채우기만 하면 된다.
 */
export async function getSearchHistory(): Promise<SearchHistoryEntry[]> {
  const page = await listRecommendations()
  return page.content.map((item) => ({
    id: item.recommendationId,
    // 오프셋 없이 오는 값이라 세워서 넣는다 — 안 세우면 KST 에서 9시간 어긋난다.
    createdAt: toInstant(item.requestedAt),
    // 거점은 한 번에 하나다 — 조건 스냅샷이 이름 하나만 들고 있다.
    anchorNames: [item.workplaceName],
    transport: TRANSPORT_MODE[item.transportType],
    maxMinutes: item.maxCommuteMinutes,
    status: item.status,
    // 결과로 되돌아갈 때 쓴다. 끝나지 않았거나 실패한 추천에는 볼 결과가 없다.
    recommendationId: item.status === 'COMPLETED' ? item.recommendationId : null,
  }))
}
