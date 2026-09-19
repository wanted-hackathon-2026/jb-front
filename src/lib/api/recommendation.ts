/**
 * 비동기 매물 추천 API.
 *
 * 백엔드와 미확정인 항목(docs/async-recommendation.md §4)의 기본값을 **이 파일 한 곳에**
 * 격리한다. 확정되면 여기만 고치면 되고 스토어·화면은 손대지 않는다.
 */
import { getListingPage } from '@/mocks/listings'
import {
  listingQuery,
  toListingPage,
  type ListingPage,
  type ListingQuery,
  type SpringPage,
} from './listings-page'
import type { Listing } from '@/types/domain'
import { hasListingApi, NotFoundError, request } from './http'
import { createMockJob, readMockJob } from '@/mocks/recommendation'

export type RecommendationStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED'

/** §4.2 성공 상태 문자열. COMPLETED / SUCCESS / DONE 중 미확정 — 잠정 COMPLETED. */
export const SUCCESS_STATUS: RecommendationStatus = 'COMPLETED'

/** §4.4 예상 소요 시간을 백엔드가 안 줄 때 문구에 쓸 잠정값(초). */
export const FALLBACK_ESTIMATED_SECONDS = 30

export interface RecommendRequest {
  anchors: { name: string; address: string; x: number; y: number }[]
  weights: Record<string, number>
  maxMinutes: number
}

export interface RecommendationResponse {
  recommendationId: string
  status: RecommendationStatus
  error?: { code: string; message: string }
  estimatedSeconds?: number
}

export async function createRecommendation(
  payload: RecommendRequest,
): Promise<RecommendationResponse> {
  if (!hasListingApi) return createMockJob()
  return request<RecommendationResponse>('/api/recommendations', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

/**
 * 처리 상태 조회. **목록은 여기 오지 않는다** — API 정의상 이 엔드포인트의 응답은
 * 처리상태(PENDING/PROCESSING/FAILED/…) 뿐이고, 추천 매물 목록은 아래가 따로 맡는다.
 * 3초마다 도는 폴링이 목록까지 끌고 오지 않는다는 뜻이기도 하다.
 */
export async function getRecommendation(id: string): Promise<RecommendationResponse> {
  if (!hasListingApi) {
    const job = readMockJob(id)
    if (!job) throw new NotFoundError(404)
    return { recommendationId: id, status: job.status }
  }
  return request<RecommendationResponse>(`/api/recommendations/${id}`)
}

/**
 * 추천 매물 목록 **한 페이지**. 상태가 완료로 바뀐 뒤에 부른다.
 *
 * 정렬과 페이지 나누기는 서버가 한다 — 화면은 키만 넘긴다(`lib/api/listings-page.ts`).
 * 파라미터 이름과 봉투 모양은 그 파일의 주석에 근거와 함께 적어 뒀다.
 */
export async function getRecommendedListings(id: string, q: ListingQuery): Promise<ListingPage> {
  if (!hasListingApi) {
    const job = readMockJob(id)
    if (!job) throw new NotFoundError(404)
    return job.status === SUCCESS_STATUS
      ? getListingPage({ ...q, scored: true })
      : { items: [], last: true, total: 0 }
  }
  const page = await request<SpringPage<Listing>>(
    `/api/recommendations/${id}/properties?${listingQuery(q)}`,
  )
  return toListingPage(page)
}

export { NotFoundError }
