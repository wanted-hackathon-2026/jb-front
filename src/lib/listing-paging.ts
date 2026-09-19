/**
 * 목록 한 화면분의 페이지 상태 — 무한 스크롤의 뼈대다.
 *
 * 쓰는 화면이 둘이라(지도 바텀시트·추천 결과) 한 벌만 둔다. 두 화면의 차이는
 * '어디서 한 페이지를 받아오냐' 하나뿐이라, 그 함수만 받는다.
 *
 * 정렬 키를 여기서 들고 있는 이유: 정렬이 바뀌면 **목록을 처음부터 다시 받아야 한다.**
 * 서버가 정렬해서 페이지를 나눠 주므로, 쌓아둔 페이지는 옛 기준으로 자른 것이라 버린다.
 */
import { ref, watch } from 'vue'
import type { ListingPage } from '@/lib/api/listings-page'
import type { SortKey } from '@/lib/listing-sort'
import type { Listing } from '@/types/domain'

/**
 * 한 번에 받아오는 건수.
 *
 * 카드가 커서(썸네일 80px + 도넛 64px) 한 화면에 대여섯 장이 들어간다 — 12면 스크롤이
 * 서너 번 굴러야 바닥에 닿는다. 더 줄이면 사용자가 기다리는 횟수만 늘고, 더 키우면
 * 첫 페이지가 그만큼 늦게 뜬다.
 */
export const LISTING_PAGE_SIZE = 12

export function useListingPages(fetchPage: (page: number, sort: SortKey) => Promise<ListingPage>) {
  const sort = ref<SortKey>('score')
  const items = ref<Listing[]>([])
  /** 조건에 맞는 전체 건수 — 머리말의 '총 N건'. 받아온 개수가 아니다. */
  const total = ref(0)
  /** 첫 페이지를 기다리는 중. 골격(스켈레톤)을 까는 건 이쪽이다. */
  const loading = ref(true)
  /** 다음 페이지를 기다리는 중. 이미 목록이 있으므로 바닥에만 표시한다. */
  const loadingMore = ref(false)
  const hasNext = ref(false)

  let page = 0
  /**
   * 응답 순서 뒤집힘 방지. 정렬을 빠르게 두 번 바꾸면 먼저 보낸 요청이 나중에
   * 도착해 방금 것을 덮는다 — 요청마다 번호를 달고, 최신 번호가 아니면 버린다.
   */
  let issued = 0

  async function reload() {
    const mine = ++issued
    page = 0
    loading.value = true
    const res = await fetchPage(page, sort.value)
    if (mine !== issued) return
    items.value = res.items
    total.value = res.total
    hasNext.value = !res.last
    loading.value = false
  }

  async function more() {
    // 바닥 감지는 스크롤 한 번에 여러 번 울린다 — 이미 받는 중이면 무시한다.
    if (loadingMore.value || loading.value || !hasNext.value) return
    const mine = issued
    loadingMore.value = true
    const res = await fetchPage(page + 1, sort.value)
    // 받는 사이 정렬이 바뀌었으면 이 페이지는 옛 기준이다 — 붙이지 않고 버린다.
    if (mine !== issued) return
    page += 1
    items.value = [...items.value, ...res.items]
    total.value = res.total
    hasNext.value = !res.last
    loadingMore.value = false
  }

  watch(sort, reload)

  return { sort, items, total, loading, loadingMore, hasNext, reload, more }
}
