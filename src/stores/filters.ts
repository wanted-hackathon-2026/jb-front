import { computed } from 'vue'
import { defineStore } from 'pinia'
import { useStorage } from '@vueuse/core'
import type { DealType, LifestyleWeights, TransportMode } from '@/types/domain'
import { PROPERTY_TYPES, type PropertyTypeName } from '@/types/backend'
import { MAX_COMMUTE_MINUTES, MIN_COMMUTE_MINUTES } from '@/lib/recommendation-request'

/** 슬라이더 범위 — 전부 만원 단위 */
export const DEPOSIT_RANGE = { min: 0, max: 50000, step: 500 }
export const RENT_RANGE = { min: 0, max: 200, step: 5 }
/**
 * 통근시간 슬라이더. **하한이 0 이 아니라 5 다** — 서버가 `@Min(5)` 로 막는다
 * (RecommendationCreateRequest). 0 을 고를 수 있게 두면 누를 수는 있는데 저장은
 * 400 인 버튼이 된다.
 */
export const MINUTES_RANGE = {
  min: MIN_COMMUTE_MINUTES,
  max: Math.min(60, MAX_COMMUTE_MINUTES),
  step: 5,
}

/**
 * 첫 진입 기본값 — 모든 축을 가운데에서 시작한다.
 *
 * 범위형(보증금·월세)은 **최소부터 중간까지**다. 한 점으로 두면 폭이 0 이라 결과가 비고,
 * 전체로 두면 거르지 않는 것이라 슬라이더가 있는 이유가 없어진다.
 * 가중치형은 중앙값 하나(50)가 곧 '선호 없음'이라 NEUTRAL 과 같은 값이 된다.
 */
const toMid = ({ min, max }: { min: number; max: number }): [number, number] => [
  min,
  (min + max) / 2,
]

/**
 * 초기화가 돌아갈 '조건 없음' 상태.
 *
 * 초기화는 값을 0 으로 만드는 게 아니라 필터를 푸는 것이다. 그래서 축의 성격에 따라
 * 가는 곳이 다르다 — 범위형(보증금·월세·이동시간)은 **양끝**이 조건 해제이고,
 * 가중치형(라이프스타일)은 **중앙**이 '선호 없음'이다. 가중치를 0 으로 두면
 * "무엇도 중요하지 않다"가 되어 모든 매물이 동점이 된다.
 */
const NEUTRAL_LIFESTYLE: LifestyleWeights = {
  sunlight: 50,
  quietness: 50,
  safety: 50,
  infrastructure: 50,
}

export const useFiltersStore = defineStore('filters', () => {
  // 거래유형은 중복 선택이다(시안: "중복선택 가능").
  const dealTypes = useStorage<DealType[]>('jb:deal-types:v1', ['monthly', 'jeonse'])
  // 키의 버전을 올린 이유: 기본값만 바꾸면 이미 저장된 브라우저는 옛 값을 계속 쓴다.
  const deposit = useStorage<[number, number]>('jb:deposit:v2', toMid(DEPOSIT_RANGE))
  const rent = useStorage<[number, number]>('jb:rent:v2', toMid(RENT_RANGE))
  const transport = useStorage<TransportMode>('jb:transport:v1', 'transit')
  const maxMinutes = useStorage('jb:max-minutes:v2', (MINUTES_RANGE.min + MINUTES_RANGE.max) / 2)
  const lifestyle = useStorage<LifestyleWeights>('jb:lifestyle:v3', { ...NEUTRAL_LIFESTYLE })
  /**
   * 매물 유형. **비어 있으면 '아무거나'** 라는 뜻이고, 보낼 때 전체로 펴진다
   * (`lib/recommendation-request.ts`). 어휘는 등록 화면과 같은 `PROPERTY_TYPES` 다 —
   * 서버가 정확히 일치로 거르기 때문이다.
   */
  const roomTypes = useStorage<PropertyTypeName[]>('jb:room-types:v1', [])

  const hasRent = computed(() => dealTypes.value.includes('monthly'))

  function toggleRoomType(t: PropertyTypeName) {
    roomTypes.value = roomTypes.value.includes(t)
      ? roomTypes.value.filter((v) => v !== t)
      : [...roomTypes.value, t]
  }

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
    roomTypes.value = []
  }

  return {
    dealTypes,
    deposit,
    rent,
    transport,
    maxMinutes,
    lifestyle,
    roomTypes,
    hasRent,
    allRoomTypes: PROPERTY_TYPES,
    toggleRoomType,
    toggleDealType,
    reset,
  }
})
