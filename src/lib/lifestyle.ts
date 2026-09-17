import type { LifestyleWeights } from '@/types/domain'

export type LifestyleKey = keyof LifestyleWeights

/**
 * 라이프스타일 네 축의 표시 정보.
 *
 * 필터 시트(가중치 슬라이더)와 상세 화면(축별 평가)이 같은 이름·순서를 써야 해서 한 곳에 둔다.
 * 예전에 라벨이 두 곳에 흩어져 있어, 'noise → quietness' 로 뜻을 바로잡을 때 한쪽이
 * '소음'인 채로 남았다.
 */
export const LIFESTYLE_AXES = [
  {
    key: 'sunlight',
    icon: '🌤',
    label: '채광',
    hint: '방향·동간거리·주변 고층건물 유무 기반 일조량',
  },
  { key: 'safety', icon: '🚓', label: '치안', hint: 'CCTV 밀도·가로등·안심귀가길·경찰서 접근성' },
  {
    key: 'quietness',
    icon: '🔇',
    label: '조용함',
    hint: '대로변·철도·유흥가와의 이격거리, 주변 상권 밀집도',
  },
  {
    key: 'infrastructure',
    icon: '🏪',
    label: '편의',
    hint: '편의점·마트·병원·약국·공원 도보 접근성',
  },
] as const satisfies readonly { key: LifestyleKey; icon: string; label: string; hint: string }[]

export const lifestyleLabel = (key: LifestyleKey) =>
  LIFESTYLE_AXES.find((a) => a.key === key)!.label
