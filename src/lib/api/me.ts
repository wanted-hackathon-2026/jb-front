import type { Listing, SearchHistoryEntry } from '@/types/domain'
import type { FavoritePropertySummary } from '@/types/backend'
import { listFavorites } from './favorites'
import { sqmToPyeong } from '@/lib/format'

/**
 * 마이페이지 세 탭의 데이터.
 *
 * **관심 매물만 실제 백엔드를 본다**(`/api/me/favorites`). '이전 기록'은 추천 API 가
 * 없어서 아직 목이다. '최근 본 매물'은 여기 없다 — 서버가 아니라 이 기기에 쌓는다
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
 * 이전 추천 기록 — **항상 빈 목록이다.**
 *
 * 백엔드에 *내가 요청했던 추천들*을 주는 엔드포인트가 없다. 지금 있는 넷은 모두
 * id 를 이미 알아야 부를 수 있어서(`GET /api/recommendations/{id}` …), 서버만으로는
 * 목록을 만들 수 없다.
 *
 * 그래서 목을 지웠다. 가짜 기록을 띄우면 사용자가 자기 기록이라고 믿고, 눌러 들어간
 * 결과가 실제와 다르다. **비어 보이는 게 사실에 가깝다** — 화면은 '아직 추천받은
 * 기록이 없어요'로 뜬다.
 *
 * 채우는 길은 둘이다.
 * 1. `stores/recommendation.ts` 가 이미 쌓아 둔 `jb:reco-jobs:v1` 의 id 로 상태를
 *    조회한다. 값은 진짜지만 **기기를 바꾸면 사라지고**, 카드에 띄울 조건(거점·예산)은
 *    요청할 때 같이 저장해 둬야 한다
 * 2. 백엔드가 목록 API 를 준다. 서버는 이미 조건을 `recommendation_criteria` 에
 *    스냅샷으로 복사해 두므로 데이터는 다 있다
 *
 * 어느 쪽이든 **이 함수 하나만 갈아끼우면 된다** — 화면은 손대지 않는다.
 */
export async function getSearchHistory(): Promise<SearchHistoryEntry[]> {
  return []
}
