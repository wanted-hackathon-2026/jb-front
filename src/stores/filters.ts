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
 * 통근시간 슬라이더. 양끝이 서버 제약 그대로다 — `@Min(5) @Max(180)`
 * (RecommendationCreateRequest.java:22). 서버가 안 받는 값을 고를 수 있게 두면
 * 누를 수는 있는데 저장은 400 인 버튼이 된다.
 */
export const MINUTES_RANGE = {
  min: MIN_COMMUTE_MINUTES,
  max: MAX_COMMUTE_MINUTES,
  step: 5,
}

/**
 * 범위형 축의 기본값 — **최소부터 중간까지**.
 *
 * 한 점으로 두면 폭이 0 이라 결과가 비고, 전체로 두면 거르지 않는 것이라 슬라이더가
 * 있는 이유가 없어진다.
 *
 * **첫 진입과 초기화가 같은 자리로 간다.** 예전엔 초기화만 양끝으로 보냈는데,
 * 사용자에게 초기화는 '조건 해제'가 아니라 '처음 그 상태로'다 — 갈라 두면 초기화를
 * 누른 뒤 화면이 한 번도 본 적 없는 모습이 된다. 이동시간은 특히 나빴다: 상한을
 * 서버 제약대로 180 까지 열고 나니 초기화가 "최대 3시간"으로 떨어졌다.
 */
const toMid = ({ min, max }: { min: number; max: number }): [number, number] => [
  min,
  (min + max) / 2,
]

/**
 * 이동시간 기본값. 범위(5~180)를 반으로 가르면 92.5 라 '가운데'가 통근시간으로는
 * 뜻이 없다 — 이 축만 중간값 대신 30 분을 쓴다. step 5 격자 위에 있는 값이라
 * "최대 32.5분" 같은 것도 안 나온다.
 */
const DEFAULT_MAX_MINUTES = 30

/**
 * 가중치형(라이프스타일)의 '선호 없음'.
 *
 * 범위형과 달리 여기선 **중앙**이 중립이다. 가중치를 최하로 두면 "무엇도 중요하지
 * 않다"가 되어 모든 매물이 동점이 된다. 눈금은 1~5 (`IMPORTANCE_RANGE`) 고 그
 * 한가운데가 3 이다.
 */
const NEUTRAL_LIFESTYLE: LifestyleWeights = {
  sunlight: 3,
  quietness: 3,
  safety: 3,
  infrastructure: 3,
}

export const useFiltersStore = defineStore('filters', () => {
  // 거래유형은 중복 선택이다(시안: "중복선택 가능").
  const dealTypes = useStorage<DealType[]>('jb:deal-types:v1', ['monthly', 'jeonse'])
  /*
   * 키의 버전을 올린 이유: 기본값만 바꾸면 이미 저장된 브라우저는 옛 값을 계속 쓴다.
   *
   * 이번에 한 번 더 올린 건 **옛 초기화가 남긴 값** 때문이다. 초기화가 양끝으로
   * 보내던 시절에 그 버튼을 누른 브라우저에는 [0, 최대] 가 저장돼 있고, useStorage 는
   * 저장된 게 있으면 기본값을 보지 않는다 — 코드를 고쳐도 그 브라우저는 안 낫는다.
   */
  const deposit = useStorage<[number, number]>('jb:deposit:v3', toMid(DEPOSIT_RANGE))
  const rent = useStorage<[number, number]>('jb:rent:v3', toMid(RENT_RANGE))
  const transport = useStorage<TransportMode>('jb:transport:v1', 'transit')
  const maxMinutes = useStorage('jb:max-minutes:v4', DEFAULT_MAX_MINUTES)
  const lifestyle = useStorage<LifestyleWeights>('jb:lifestyle:v4', { ...NEUTRAL_LIFESTYLE })
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

  /** 첫 진입 상태로 되돌린다 — 위 useStorage 의 기본값과 **같은 자리**여야 한다. */
  function reset() {
    // 거래유형은 전부 켠 상태가 '거르지 않음'이다.
    dealTypes.value = ['monthly', 'jeonse', 'sale']
    deposit.value = toMid(DEPOSIT_RANGE)
    rent.value = toMid(RENT_RANGE)
    // 이동수단은 범위가 아니라 단일 선택이라 중립값이 없다 — 서비스 기본을 쓴다.
    transport.value = 'transit'
    maxMinutes.value = DEFAULT_MAX_MINUTES
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
