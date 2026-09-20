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
  /**
   * 실패 사유. **빈 목록과 못 받아온 것은 사용자에게 전혀 다른 상황이다** —
   * 실패를 빈 목록으로 보여주면 "이 동네에 매물이 없다"는 거짓말이 된다.
   */
  const failed = ref(false)

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
    failed.value = false
    try {
      const got = await fetchAll()
      if (mine !== issued) return
      raw.value = got
    } catch {
      if (mine !== issued) return
      // 받아둔 목록은 지우지 않는다 — 지도를 옮기다 한 번 실패했다고 보던 걸 비우면
      // 화면이 통째로 날아간다. 실패했다는 사실만 덧붙인다.
      failed.value = true
    } finally {
      // 여기서 안 풀면 **로딩이 영영 안 끝난다.** 예전엔 try 가 없어서 실제로 그랬다.
      if (mine === issued) loading.value = false
    }
  }

  return { sort, items, total, loading, failed, reload }
}
