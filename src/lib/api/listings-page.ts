/**
 * 목록 한 페이지의 계약.
 *
 * 화면(ListingList)과 목 서버(mocks/listings.ts)가 같이 보는 모양이라 둘 중 어느
 * 쪽도 아닌 여기 둔다 — 목을 지울 때 이 파일은 남고, 안이 실제 요청으로 바뀐다.
 *
 * **봉투 모양은 지어내지 않았다.** 이미 실재하는 페이지 API(`/api/me/favorites`,
 * FavoriteController — jb-backend e11ac1a)가 Spring `Page` 봉투를 그대로 내려주므로
 * (`content`·`totalElements`·`last`, page 는 0부터) 매물 목록도 같은 모양으로 올
 * 것을 전제한다. 다르게 오면 고칠 곳은 아래 `toListingPage` 한 줄이다.
 *
 * ⚠️ 정렬 키(`sort`)를 서버가 어떤 이름으로 받는지는 **미확정이다.** 목록
 * 엔드포인트 자체가 아직 없다(PropertyController 는 POST 하나뿐). 실제로 붙일 때
 * 확인할 것: 파라미터 이름(`sort=score,desc` 인지 자체 키인지)과 가격 축의 정의.
 */
import type { Listing } from '@/types/domain'
import type { SortKey } from '@/lib/listing-sort'

/** 목록 조회 조건. `page` 는 0부터 — 찜 목록과 같은 규약이다. */
export interface ListingQuery {
  page: number
  size: number
  sort: SortKey
}

/**
 * 한 페이지.
 *
 * `last` 와 `total` 만 들고 있는다 — 무한 스크롤에 필요한 건 '다음이 있나'와
 * 머리말의 '총 N건' 둘뿐이라, totalPages 같은 나머지 봉투 필드는 여기서 버린다.
 */
export interface ListingPage {
  items: Listing[]
  last: boolean
  total: number
}

/** Spring `Page` 봉투. 출처: FavoritePage(types/backend.ts) 와 같은 모양이다. */
export interface SpringPage<T> {
  content: T[]
  page: number
  size: number
  totalElements: number
  totalPages: number
  last: boolean
}

export const toListingPage = (p: SpringPage<Listing>): ListingPage => ({
  items: p.content,
  last: p.last,
  total: p.totalElements,
})

/** 조회 조건을 쿼리스트링으로. 서버가 `sort` 를 어떻게 받을지는 위 주석 참고. */
export const listingQuery = (q: ListingQuery) =>
  `page=${q.page}&size=${q.size}&sort=${encodeURIComponent(q.sort)}`
