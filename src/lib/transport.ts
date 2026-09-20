import type { TransportMode } from '@/types/domain'

/**
 * 이동수단의 표시 이름.
 *
 * 필터 시트(칩)와 마이페이지 이전 기록 카드가 같은 이름을 써야 해서 한 곳에 둔다 —
 * lib/lifestyle.ts 와 같은 이유다(라벨이 흩어지면 한쪽만 고쳐진 채로 남는다).
 */
export const TRANSPORTS = [
  { value: 'transit', label: '대중교통' },
  { value: 'car', label: '자가용' },
  { value: 'bicycle', label: '자전거' },
  { value: 'walk', label: '도보' },
] as const satisfies readonly { value: TransportMode; label: string }[]

export const transportLabel = (mode: TransportMode) =>
  TRANSPORTS.find((t) => t.value === mode)!.label
