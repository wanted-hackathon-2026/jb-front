/**
 * 목록 한 벌의 상태 — 받아오기와 정렬.
 *
 * 쓰는 화면이 둘이라(지도 바텀시트·추천 결과) 한 벌만 둔다. 두 화면의 차이는
 * '어디서 목록을 받아오냐' 하나뿐이라, 그 함수만 받는다.
 *
 * **페이지가 없다.** 실제 목록 API 가 영역(bbox) 조회로 한 번에 다 주고 명세가
 * "전통적인 페이지네이션을 사용하지 않는다"고 못박았다
 * (jb-backend docs/specs/property-listing-and-detail.md). 그래서 무한 스크롤도,
 * 응답 순서 뒤집힘 방지도 필요 없어졌다 — 요청이 목록당 한 번뿐이다.
 *
 * 정렬은 **받아온 뒤 화면에서** 한다. 서버가 정렬 키를 받지 않고, 전부 들고 있으므로
 * 다시 줄 세워도 끼어들 다음 페이지가 없다.
 */
import { computed, ref } from 'vue'
import { sortListings, type SortKey } from '@/lib/listing-sort'
import type { Listing } from '@/types/domain'

export function useListingList(fetchAll: () => Promise<Listing[]>) {
  const sort = ref<SortKey>('score')
  const raw = ref<Listing[]>([])
  const loading = ref(true)

  /** 정렬은 파생값이다 — 기준이 바뀌어도 다시 받아올 이유가 없다. */
  const items = computed(() => sortListings(raw.value, sort.value))
  const total = computed(() => raw.value.length)

  /**
   * 응답 순서 뒤집힘 방지. 거점이 바뀌면 이 함수가 연달아 불릴 수 있는데, 먼저 보낸
   * 요청이 나중에 도착하면 방금 것을 덮는다. 요청마다 번호를 달고 최신 것만 반영한다.
   */
  let issued = 0

  async function reload() {
    const mine = ++issued
    loading.value = true
    const got = await fetchAll()
    if (mine !== issued) return
    raw.value = got
    loading.value = false
  }

  return { sort, items, total, loading, reload }
}
