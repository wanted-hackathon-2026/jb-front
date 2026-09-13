import { computed } from 'vue'
import { defineStore } from 'pinia'
import { useStorage } from '@vueuse/core'
import type { DealType, LifestyleWeights, TransportMode } from '@/types/domain'

/** 슬라이더 범위 — 전부 만원 단위 */
export const DEPOSIT_RANGE = { min: 0, max: 50000, step: 500 }
export const RENT_RANGE = { min: 0, max: 200, step: 5 }
export const MINUTES_RANGE = { min: 0, max: 60, step: 5 }

const DEFAULT_LIFESTYLE: LifestyleWeights = { light: 45, safety: 73, noise: 50, convenience: 50 }

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
    dealTypes.value = ['monthly', 'jeonse']
    deposit.value = [5000, 10000]
    rent.value = [0, 40]
    transport.value = 'transit'
    maxMinutes.value = 30
    lifestyle.value = { ...DEFAULT_LIFESTYLE }
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
