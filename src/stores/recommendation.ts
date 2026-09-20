import { computed, ref, watch } from 'vue'
import { defineStore } from 'pinia'
import { useDocumentVisibility, useIntervalFn, useStorage } from '@vueuse/core'
import {
  createRecommendation,
  getRecommendation,
  getRecommendedListings,
  NotFoundError,
  SUCCESS_STATUS,
  type RecommendRequest,
  type RecommendationStatus,
} from '@/lib/api/recommendation'
import { useListingList } from '@/lib/listing-list'
import type { SearchHistoryEntry } from '@/types/domain'

/**
 * 추천 작업의 단일 진실 공급원.
 *
 * 폴링을 페이지 컴포넌트가 소유하면 사용자가 다른 화면으로 이동하는 순간 언마운트되며
 * 죽는다. 라우트 이동과 무관하게 살아 있는 층이 스토어뿐이라 여기에 둔다.
 */

const POLL_MS = 3_000
/** 하루 넘게 PENDING 인 작업은 서버가 잊은 것으로 본다 — 무한 폴링 방지(§7.3). */
const STALE_MS = 24 * 60 * 60 * 1000

/**
 * 그 추천에 **실제로 보낸 조건**. 결과 화면의 '검색 조건 다시 보기'가 되읽는 값이다.
 *
 * 지금 필터 스토어를 읽어 그리면 안 된다 — 결과를 받은 뒤 슬라이더를 만진 사람에게는
 * 그게 거짓말이 된다. 그래서 요청하는 **그 순간**에 박아 둔다.
 *
 * 모양은 마이페이지 '이전 기록'과 같다(`SearchHistoryEntry`). 같은 카드로 그리기
 * 위해서다 — 조건을 읽는 그림이 앱 안에 두 벌 생기면 한쪽만 고쳐진 채로 남는다.
 * 매물유형만 더 있다: 서버 기록에는 없고 요청에는 있는 값이다.
 */
export type RecommendationCriteria = Pick<
  SearchHistoryEntry,
  'anchorNames' | 'deposit' | 'rent' | 'transport' | 'maxMinutes' | 'lifestyle'
> & { roomTypes: string[] }

export interface Job {
  id: string
  status: RecommendationStatus
  createdAt: number
  /** 그때 보낸 조건. **예전 기록에는 없다** — 그때는 남기지 않았다. */
  criteria?: RecommendationCriteria
}

const isDone = (s: RecommendationStatus) => s === SUCCESS_STATUS || s === 'FAILED'

export const useRecommendationStore = defineStore('recommendation', () => {
  // localStorage — 탭을 닫았다 와도 진행 중이던 작업을 기억한다.
  const jobs = useStorage<Job[]>('jb:reco-jobs:v1', [])

  const pending = computed(() => jobs.value.filter((j) => !isDone(j.status)))
  /** 완료 팝업이 바라보는 값. 닫으면 null 로 되돌린다. */
  const arrived = ref<Job | null>(null)

  const { pause, resume } = useIntervalFn(check, POLL_MS, { immediate: false })

  function drop(id: string) {
    jobs.value = jobs.value.filter((j) => j.id !== id)
  }

  async function check() {
    if (!pending.value.length) return pause()

    for (const job of pending.value) {
      if (Date.now() - job.createdAt > STALE_MS) {
        drop(job.id)
        continue
      }
      try {
        const res = await getRecommendation(job.id)
        job.status = res.status
        // 목록은 결과 화면이 따로 받아온다 — 폴링이 매 3초마다 끌고 올 이유가 없다.
        if (res.status === SUCCESS_STATUS) arrived.value = job
      } catch (e) {
        // 서버가 더는 모르는 작업이면 영원히 폴링하지 않도록 정리한다.
        if (e instanceof NotFoundError) job.status = 'FAILED'
        // 그 밖의 네트워크 오류는 무시하고 다음 tick 에 재시도한다.
      }
    }
  }

  async function request(payload: RecommendRequest, criteria: RecommendationCriteria) {
    const res = await createRecommendation(payload)
    jobs.value.push({
      id: res.recommendationId,
      status: res.status,
      createdAt: Date.now(),
      criteria,
    })
    resume()
    return res.recommendationId
  }

  /** 그 추천에 보낸 조건. 남의 링크로 들어왔거나 예전 기록이면 없다. */
  const criteriaOf = (id: string) => jobs.value.find((j) => j.id === id)?.criteria ?? null

  /**
   * 지도 시트가 들고 있는 추천 결과 한 벌 — 펼쳐 보는 중이거나, 조건 폼 뒤에
   * 접어둔 그 결과다.
   *
   * 결과는 별도 화면이 아니라 지도 바텀시트의 'AI 추천' 탭에서 본다 — 그래야 같은
   * 매물을 시트 뒤 지도에서 바로 짚어볼 수 있다. 그런데 **지도는 KeepAlive 대상이
   * 아니라서**(App.vue) 매물 상세를 다녀올 때마다 언마운트된다. 목록을 그 화면에
   * 두면 상세를 여닫을 때마다 같은 결과를 다시 받는다 — 그래서 여기에 둔다.
   *
   * **localStorage 에는 넣지 않는다.** 용량·신선도 때문이다(§5.4) — 탭을 닫았다 오면
   * 결과 URL(`/?reco=<id>`)로 다시 받는다.
   */
  const activeId = ref<string | null>(null)
  const result = useListingList(() =>
    activeId.value ? getRecommendedListings(activeId.value) : Promise.resolve([]),
  )

  /**
   * 결과를 받아 둔다. 같은 추천이면 다시 받지 않는다 — 한 추천의 결과는 고정된 값이다.
   *
   * **펼쳐져 있는지는 여기가 정하지 않는다**(주소가 정한다 — MapPage). 조건 폼으로
   * 돌아가도 이 한 벌은 들고 있는다. 그래야 '결과 다시 보기'가 다시 받지 않고 연다.
   */
  async function show(id: string) {
    if (activeId.value === id && !result.failed.value) return
    activeId.value = id
    await result.reload()
  }

  // 백그라운드 탭에서는 브라우저가 setInterval 을 1분까지 늦춘다. 복귀 즉시 한 번 확인해
  // "끝난 지 한참인데 팝업이 안 뜨는" 현상을 막는다(§7.1).
  watch(useDocumentVisibility(), (v) => {
    if (v === 'visible' && pending.value.length) check()
  })

  // 앱 부팅 시 진행 중이던 작업을 이어받는다 — 새로고침·재방문 복구의 핵심.
  if (pending.value.length) resume()

  return {
    jobs,
    pending,
    arrived,
    request,
    check,
    drop,
    // 결과 한 벌. 스토어가 밖으로 낼 때 ref 가 한 겹 벗겨지도록 이름을 풀어 둔다 —
    // 객체째 넘기면 쓰는 쪽에서 .value 를 달아야 한다(pinia 는 최상위만 푼다).
    activeId,
    resultSort: result.sort,
    result: result.items,
    resultTotal: result.total,
    resultLoading: result.loading,
    resultFailed: result.failed,
    reloadResult: result.reload,
    show,
    criteriaOf,
  }
})
