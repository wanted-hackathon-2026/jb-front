import { getMockListing, getMockRecommendedListing } from '@/mocks/listings'
import type { Listing } from '@/types/domain'
import { hasApiBase, NotFoundError, request } from './http'

/**
 * 매물 단건 조회 — 추천 맥락 없음.
 *
 * 점수·순위·이동 동선은 '어느 추천 기준이냐'가 있어야 나오는 값이라 여기엔 없다.
 * 지도의 '주변 매물' 목록에서 들어오는 경로가 이쪽이다.
 */
export async function getListing(id: string): Promise<Listing> {
  if (!hasApiBase) {
    const found = await getMockListing(id)
    if (!found) throw new NotFoundError(404)
    return found
  }
  return request<Listing>(`/api/properties/${id}`)
}

/**
 * 추천 맥락이 붙은 매물 단건 조회.
 *
 * 같은 매물이라도 어느 추천 기준이냐에 따라 점수·이동시간이 달라져서 엔드포인트가
 * 따로 있다. 추천 결과 목록에서 들어오는 경로가 이쪽이다.
 */
export async function getRecommendedListing(
  recommendationId: string,
  id: string,
): Promise<Listing> {
  if (!hasApiBase) {
    const found = await getMockRecommendedListing(id)
    if (!found) throw new NotFoundError(404)
    return found
  }
  return request<Listing>(`/api/recommendations/${recommendationId}/properties/${id}`)
}
