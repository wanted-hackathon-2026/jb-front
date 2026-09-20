/**
 * 비동기 매물 추천 — **실제 백엔드를 부른다**(jb-backend c0ff0f0).
 *
 * LLM 호출이 수십 초 걸려서 `POST` 는 접수만 하고 202 로 id 와 `PENDING` 을 준다.
 * 프론트는 상태를 폴링하다 `COMPLETED` 가 되면 결과를 가져온다
 * (명세: property-recommendation.md).
 *
 * ⚠️ **처리 중에 서버가 죽으면 그 추천은 `PROCESSING` 에 멈춘 채 남는다.** 인메모리
 * 실행이라 되살리는 장치가 없다고 명세가 밝힌다. 그래서 스토어가 오래된 작업을
 * 스스로 버린다(`stores/recommendation.ts` 의 `STALE_MS`).
 */
import type { Listing } from '@/types/domain'
import type {
  RecommendationAcceptedResponse,
  RecommendationEvaluation,
  RecommendationCreateRequest,
  RecommendationHistoryResponse,
  RecommendationStatusResponse,
  RecommendedPropertyItem,
  RecommendedPropertyResponse,
} from '@/types/backend'
import { sqmToPyeong } from '@/lib/format'
import { clientSessionToken } from '@/lib/client-session'
import { request } from './http'

/**
 * 비로그인 사용자를 알아보게 하는 헤더.
 *
 * **추천 경로에만 붙인다.** 서버가 읽는 곳이 거기뿐이고, 모든 요청에 실으면 이 기기를
 * 가리키는 값이 필요 없는 곳까지 퍼진다.
 *
 * 로그인 상태에서도 그냥 붙인다 — 서버는 JWT 가 있으면 헤더를 무시한다. 붙일지
 * 말지를 로그인 여부로 가르면, 토큰이 막 만료된 찰나에 어느 쪽도 아닌 요청이 나간다.
 */
const sessionHeader = () => ({ 'X-Client-Session': clientSessionToken() })

export type RecommendationStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED'

/** 완료 상태. 스토어가 '끝났나'를 이 값으로 판단한다. */
export const SUCCESS_STATUS: RecommendationStatus = 'COMPLETED'

/**
 * 진행 문구에 쓸 예상 소요(초).
 *
 * 서버가 예상 시간을 주지 않는다 — LLM 호출이라 얼마나 걸릴지 서버도 모른다.
 * 화면이 진행 막대를 그리려면 숫자가 하나 필요해서 두는 잠정값이다.
 */
export const FALLBACK_ESTIMATED_SECONDS = 30

export type RecommendRequest = RecommendationCreateRequest

export interface RecommendationResponse {
  recommendationId: string
  status: RecommendationStatus
  /** FAILED 일 때만. 개발 확인용이라 화면에 그대로 띄우지 않는다. */
  failureReason?: string | null
}

/** 추천 접수. 202 로 id 를 받고, 결과는 폴링으로 확인한다. */
export async function createRecommendation(
  payload: RecommendRequest,
): Promise<RecommendationResponse> {
  const res = await request<RecommendationAcceptedResponse>('/api/recommendations', {
    method: 'POST',
    body: JSON.stringify(payload),
    headers: sessionHeader(),
  })
  return { recommendationId: res.recommendationId, status: res.status }
}

/**
 * 한 번에 받아올 기록 수. 서버 상한이 100 이고(`@Max(100)`) 마이페이지에 더 보기 UI 가
 * 없어서, 관심 매물과 같이 한 장만 받아 사실상 전부를 보여준다.
 */
export const HISTORY_PAGE_SIZE = 100

/**
 * 내가 요청했던 추천 목록. 비로그인도 자기 기록을 본다 — 소유자를 세션 헤더가 가른다.
 * 정렬은 서버가 최신순으로 고정한다(RecommendationService.history).
 */
export async function listRecommendations(
  page = 0,
  size = HISTORY_PAGE_SIZE,
): Promise<RecommendationHistoryResponse> {
  return request<RecommendationHistoryResponse>(`/api/recommendations?page=${page}&size=${size}`, {
    headers: sessionHeader(),
  })
}

/**
 * 처리 상태 조회. **목록은 여기 오지 않는다** — 3초마다 도는 폴링이 결과까지 끌고
 * 오지 않도록 엔드포인트가 나뉘어 있다.
 */
export async function getRecommendation(id: string): Promise<RecommendationResponse> {
  const res = await request<RecommendationStatusResponse>(`/api/recommendations/${id}`, {
    headers: sessionHeader(),
  })
  return {
    recommendationId: res.recommendationId,
    status: res.status,
    failureReason: res.failureReason,
  }
}

/**
 * 서버에 없는 값들. 매물 목록(`lib/api/listings.ts`)의 `ABSENT` 와 같은 뜻이고,
 * **점수 관련 칸이 빠졌다는 점만 다르다** — 추천 경로에는 그게 실재한다.
 */
const ABSENT = {
  lines: [],
  maintenanceFee: 0,
  moveInDate: '',
  parking: false,
  elevator: false,
  options: [],
  listingNo: '',
  postedDaysAgo: 0,
  supplyPyeong: 0,
  bathrooms: 0,
  description: '',
  direction: '',
  totalFloors: 0,
  buildYear: null,
  /**
   * ⚠️ **추천 응답에는 `favorite` 가 없다.** 그래서 이 false 는 '안 찜했다'가 아니라
   * **모른다**는 뜻이다. 결과 화면이 `favorites.sync()` 를 부르지 않아 지금은 문제가
   * 없지만, 부르는 순간 화면에 뜬 매물의 하트가 전부 꺼진다 — 목록·상세와 달리 여기서는
   * 부르면 안 된다(`stores/favorites.ts` 의 '모르는 매물은 안 찜함이 아니다').
   */
  favorite: false,
} satisfies Partial<Listing>

const pyeong = (sqm: number | null) => (sqm === null ? 0 : sqmToPyeong(sqm))

/**
 * 축별 점수 → 상세 화면의 축별 평가.
 *
 * **점수만 채운다.** 서버가 주는 문장은 매물 전체 총평(`summary`) 하나뿐이고 축마다
 * 붙는 설명은 없다. 지어내면 사용자가 그걸 평가로 읽으므로 비워 두고, 화면이 그 축이
 * 무엇을 재는지 대신 적는다.
 *
 * 통근 점수(`commuteScore`)는 여기 넣지 않는다 — 라이프스타일 네 축이 아니라
 * 거점까지의 거리라, 화면에서 이동시간과 함께 읽히는 값이다.
 */
const toInsights = (e: RecommendationEvaluation): Listing['lifestyleInsights'] => [
  { key: 'sunlight', score: e.sunlightScore },
  { key: 'quietness', score: e.quietnessScore },
  { key: 'safety', score: e.safetyScore },
  { key: 'infrastructure', score: e.infrastructureScore },
]

function toListing(p: RecommendedPropertyItem): Listing {
  const e = p.evaluation
  return {
    ...ABSENT,
    id: p.id,
    name: p.name,
    dealType: p.leaseType === 'JEONSE' ? 'jeonse' : 'monthly',
    deposit: p.deposit,
    rent: p.monthlyRent,
    roomType: p.propertyType,
    areaPyeong: pyeong(p.exclusiveArea),
    floor: p.floor ?? 0,
    address: p.roadAddress,
    x: p.longitude,
    y: p.latitude,
    photos: p.thumbnailUrl ? [p.thumbnailUrl] : [],
    // 여기부터가 추천 맥락에서만 나오는 값이다.
    score: e.totalScore,
    rank: e.rank,
    aiSummary: e.summary,
    /*
     * 통근시간은 **직선거리 근사**다(property-recommendation.md). 환승 횟수와 도보
     * 시간은 계산에 들어가지 않아 서버가 주지 않는다 — 0 으로 두면 '환승 없음'이라는
     * 거짓이 되므로, 화면이 그 둘을 안 그리도록 애초에 안 채운다.
     */
    commutes: [{ anchorId: '', minutes: e.commuteMinutes, transfers: 0, walkMinutes: 0 }],
    lifestyleInsights: toInsights(e),
    route: [],
  }
}

/**
 * 추천 매물 목록. 상태가 `COMPLETED` 가 된 뒤에 부른다 —
 * 처리 중에 부르면 409 `RECOMMENDATION_NOT_READY` 다.
 *
 * **페이지도 정렬 파라미터도 없다.** 최대 15개까지만 LLM 에 넘기므로 한 번에 다 온다.
 * 정렬은 화면이 한다(`lib/listing-sort.ts`).
 */
export async function getRecommendedListings(id: string): Promise<Listing[]> {
  const res = await request<RecommendedPropertyResponse>(`/api/recommendations/${id}/properties`, {
    headers: sessionHeader(),
  })
  return res.content.map(toListing)
}

export { NotFoundError } from './http'
