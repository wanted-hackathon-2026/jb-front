/**
 * 비동기 매물 추천 API.
 *
 * 백엔드와 미확정인 항목(docs/async-recommendation.md §4)의 기본값을 **이 파일 한 곳에**
 * 격리한다. 확정되면 여기만 고치면 되고 스토어·화면은 손대지 않는다.
 */
import { getScoredListings } from '@/mocks/listings'
import type { Listing } from '@/types/domain'
import { hasApiBase, NotFoundError, request } from './http'
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

export interface RecommendationResult {
  items: Listing[]
}

export interface RecommendationResponse {
  recommendationId: string
  status: RecommendationStatus
  result: RecommendationResult | null
  error?: { code: string; message: string }
  estimatedSeconds?: number
}

export async function createRecommendation(
  payload: RecommendRequest,
): Promise<RecommendationResponse> {
  if (!hasApiBase) return createMockJob()
  return request<RecommendationResponse>('/api/recommendations', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function getRecommendation(id: string): Promise<RecommendationResponse> {
  if (!hasApiBase) {
    const job = readMockJob(id)
    if (!job) throw new NotFoundError(404)
    return {
      recommendationId: id,
      status: job.status,
      result: job.status === SUCCESS_STATUS ? { items: await getScoredListings() } : null,
    }
  }
  return request<RecommendationResponse>(`/api/recommendations/${id}`)
}

export { NotFoundError }
