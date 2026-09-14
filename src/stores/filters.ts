import { computed } from 'vue'
import { defineStore } from 'pinia'
import { useStorage } from '@vueuse/core'
import type { DealType, LifestyleWeights, TransportMode } from '@/types/domain'

/** 슬라이더 범위 — 전부 만원 단위 */
export const DEPOSIT_RANGE = { min: 0, max: 50000, step: 500 }
export const RENT_RANGE = { min: 0, max: 200, step: 5 }
export const MINUTES_RANGE = { min: 0, max: 60, step: 5 }

/**
 * 첫 진입 기본값 — 시안의 예시 숫자(채광 45·치안 73)를 그대로 쓴다.
 * 초기화가 돌아갈 곳은 이 값이 아니라 아래 NEUTRAL_* 다.
 */
const DEFAULT_LIFESTYLE: LifestyleWeights = { light: 45, safety: 73, noise: 50, convenience: 50 }

/**
 * 초기화가 돌아갈 '조건 없음' 상태.
 *
 * 초기화는 값을 0 으로 만드는 게 아니라 필터를 푸는 것이다. 그래서 축의 성격에 따라
 * 가는 곳이 다르다 — 범위형(보증금·월세·이동시간)은 **양끝**이 조건 해제이고,
 * 가중치형(라이프스타일)은 **중앙**이 '선호 없음'이다. 가중치를 0 으로 두면
 * "무엇도 중요하지 않다"가 되어 모든 매물이 동점이 된다.
 */
const NEUTRAL_LIFESTYLE: LifestyleWeights = { light: 50, safety: 50, noise: 50, convenience: 50 }

export const useFiltersStore = defineStore('filters', () => {
  // 거래유형은 중복 선택이다(시안: "중복선택 가능").
  const dealTypes = useStorage<DealType[]>('jb:deal-types:v1', ['monthly', 'jeonse'])
  const deposit = useStorage<[number, number]>('jb:deposit:v1', [5000, 10000])
  const rent = useStorage<[number, number]>('jb:rent:v1', [0, 40])
  const transport = useStorage<TransportMode>('jb:transport:v1', 'transit')
  const maxMinutes = useStorage('jb:max-minutes:v1', 30)
  const lifestyle = useStorage<LifestyleWeights>('jb:lifestyle:v1', { ...DEFAULT_LIFESTYLE })

  const hasRent = computed(() => dealTypes.value.includes('monthly'))

  function toggleDealType(t: DealType) {
    const next = dealTypes.value.includes(t)
      ? dealTypes.value.filter((v) => v !== t)
      : [...dealTypes.value, t]
    // 전부 끄면 결과가 비어버린다 — 마지막 하나는 남긴다.
    if (next.length > 0) dealTypes.value = next
  }

  function reset() {
    // 거래유형은 전부 켠 상태가 '거르지 않음'이다.
    dealTypes.value = ['monthly', 'jeonse', 'sale']
    deposit.value = [DEPOSIT_RANGE.min, DEPOSIT_RANGE.max]
    rent.value = [RENT_RANGE.min, RENT_RANGE.max]
    // 이동수단은 범위가 아니라 단일 선택이라 중립값이 없다 — 서비스 기본을 쓴다.
    transport.value = 'transit'
    maxMinutes.value = MINUTES_RANGE.max
    lifestyle.value = { ...NEUTRAL_LIFESTYLE }
  }

  return {
    dealTypes,
    deposit,
    rent,
    transport,
    maxMinutes,
    lifestyle,
    hasRent,
    toggleDealType,
    reset,
  }
})
