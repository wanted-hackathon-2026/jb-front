import { getMockFavorites, getMockRecentlyViewed, getMockSearchHistory } from '@/mocks/me'
import type { Listing, SearchHistoryEntry } from '@/types/domain'

/**
 * 마이페이지 세 탭의 데이터. **지금은 전부 목이다.**
 *
 * 찜의 실제 계약은 `api/favorites.ts` 에 이미 있다(`/api/me/favorites`). 여기서 다시
 * 부르지 않는 이유는 반환 타입이 다르기 때문이다 — 그쪽은 백엔드의 Favorite* 이고
 * 이 화면이 그리는 건 프론트의 추측형 Listing 이다. 둘을 섞으면 어느 쪽이 사실인지
 * 알 수 없게 되므로, 매핑을 정하는 시점에 이 파일에서 favorites.ts 를 부르도록 바꾼다.
 */
export async function getFavorites(): Promise<Listing[]> {
  return getMockFavorites()
}

/**
 * 최근 본 매물. 백엔드에 해당 엔드포인트가 없다 — 조회 이력을 서버가 쌓을지
 * 프론트가 localStorage 로 들고 있을지부터 정해야 한다.
 */
export async function getRecentlyViewed(): Promise<Listing[]> {
  return getMockRecentlyViewed()
}

/**
 * 이전 추천 기록. 비로그인 사용자는 이 목록이 브라우저에만 있으므로, 승계 설계가
 * 붙으면 localStorage 의 recommendationId 를 서버에 넘긴다
 * (docs/async-recommendation.md §8).
 */
export async function getSearchHistory(): Promise<SearchHistoryEntry[]> {
  return getMockSearchHistory()
}
