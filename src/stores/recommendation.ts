import { computed, ref, watch } from 'vue'
import { defineStore } from 'pinia'
import { useDocumentVisibility, useIntervalFn, useStorage } from '@vueuse/core'
import {
  createRecommendation,
  getRecommendation,
  NotFoundError,
  SUCCESS_STATUS,
  type RecommendRequest,
  type RecommendationResult,
  type RecommendationStatus,
} from '@/lib/api/recommendation'

/**
 * 추천 작업의 단일 진실 공급원.
 *
 * 폴링을 페이지 컴포넌트가 소유하면 사용자가 다른 화면으로 이동하는 순간 언마운트되며
 * 죽는다. 라우트 이동과 무관하게 살아 있는 층이 스토어뿐이라 여기에 둔다.
 */

const POLL_MS = 3_000
/** 하루 넘게 PENDING 인 작업은 서버가 잊은 것으로 본다 — 무한 폴링 방지(§7.3). */
const STALE_MS = 24 * 60 * 60 * 1000

export interface Job {
  id: string
  status: RecommendationStatus
  createdAt: number
}

const isDone = (s: RecommendationStatus) => s === SUCCESS_STATUS || s === 'FAILED'

export const useRecommendationStore = defineStore('recommendation', () => {
  // localStorage — 탭을 닫았다 와도 진행 중이던 작업을 기억한다.
  const jobs = useStorage<Job[]>('jb:reco-jobs:v1', [])
  /** 결과 본문은 저장하지 않는다(용량·신선도). 메모리 캐시로만 들고 있는다. */
  const results = new Map<string, RecommendationResult>()

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
        if (res.status === SUCCESS_STATUS) {
          if (res.result) results.set(job.id, res.result)
          arrived.value = job
        }
      } catch (e) {
        // 서버가 더는 모르는 작업이면 영원히 폴링하지 않도록 정리한다.
        if (e instanceof NotFoundError) job.status = 'FAILED'
        // 그 밖의 네트워크 오류는 무시하고 다음 tick 에 재시도한다.
      }
    }
  }

  async function request(payload: RecommendRequest) {
    const res = await createRecommendation(payload)
    jobs.value.push({ id: res.recommendationId, status: res.status, createdAt: Date.now() })
    resume()
    return res.recommendationId
  }

  /** 결과 페이지용. 캐시에 없으면 서버에서 받아온다. */
  async function fetchResult(id: string) {
    const cached = results.get(id)
    if (cached) return { status: SUCCESS_STATUS as RecommendationStatus, result: cached }
    const res = await getRecommendation(id)
    if (res.result) results.set(id, res.result)
    return { status: res.status, result: res.result }
  }

  // 백그라운드 탭에서는 브라우저가 setInterval 을 1분까지 늦춘다. 복귀 즉시 한 번 확인해
  // "끝난 지 한참인데 팝업이 안 뜨는" 현상을 막는다(§7.1).
  watch(useDocumentVisibility(), (v) => {
    if (v === 'visible' && pending.value.length) check()
  })

  // 앱 부팅 시 진행 중이던 작업을 이어받는다 — 새로고침·재방문 복구의 핵심.
  if (pending.value.length) resume()

  return { jobs, pending, arrived, request, check, fetchResult, drop }
})
