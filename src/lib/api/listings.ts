import { getMockListing } from '@/mocks/listings'
import type { Listing } from '@/types/domain'
import { hasApiBase, NotFoundError, request } from './http'

/**
 * 매물 단건 조회.
 *
 * 백엔드에는 추천 맥락이 붙은 상세(`/api/recommendations/{id}/properties/{propertyId}`)도
 * 따로 있다. 같은 매물이라도 어느 추천 기준이냐에 따라 점수·이동시간이 달라지기 때문이다.
 * 지금은 목 데이터가 그 구분을 갖지 않아 단일 경로만 둔다 — 계약이 확정되면 여기서 갈린다.
 */
export async function getListing(id: string): Promise<Listing> {
  if (!hasApiBase) {
    const found = await getMockListing(id)
    if (!found) throw new NotFoundError(404)
    return found
  }
  return request<Listing>(`/api/properties/${id}`)
}
