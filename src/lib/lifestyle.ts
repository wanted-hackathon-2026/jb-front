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
    // 서버는 방향·층·총 층수로만 등급을 낸다. 3D 건물·그림자 시뮬레이션은 쓰지 않는다
    // (property-sunlight-estimate.md). '동간거리·고층건물'이라고 적으면 거짓말이 된다.
    hint: '방향과 층수로 가늠한 볕',
  },
  // 주변 CCTV 대수·비상벨 개수와 최근접 파출소 거리를 본다. '안심귀가길'은 수집하지 않고,
  // 보안등은 원자료가 없어 아직 비어 있다(property-safety-metrics.md).
  { key: 'safety', icon: '🚓', label: '치안', hint: 'CCTV·비상벨 밀도와 파출소까지 거리' },
  {
    key: 'quietness',
    icon: '🔇',
    label: '조용함',
    // 주변 S-DoT 센서의 7일 평균 소음(dB)이다. 대로변·철도와의 이격거리를 재지 않고,
    // **실내·층간소음이나 방음 성능이 아니다** — 명세가 그렇게 부르지 말라고 못박았다
    // (property-noise-metrics.md).
    hint: '주변 센서가 잰 바깥 소음',
  },
  {
    key: 'infrastructure',
    icon: '🏪',
    label: '편의',
    // 재는 건 **직선거리**다 — "도로·보행·대중교통 이동거리가 아니다"
    // (property-infrastructure-metrics.md). '도보 n분'으로 옮기면 없는 근거를 만든다.
    hint: '지하철·버스·편의점·마트·병원·약국이 가까운 정도',
  },
] as const satisfies readonly { key: LifestyleKey; icon: string; label: string; hint: string }[]

export const lifestyleLabel = (key: LifestyleKey) =>
  LIFESTYLE_AXES.find((a) => a.key === key)!.label

/**
 * 그 축이 무엇을 재는지. 추천 결과의 축별 점수 옆에 쓴다 —
 * 백엔드가 축마다 문장을 주지 않아서(lib/api/recommendation.ts 의 `toInsights`),
 * 점수만 덩그러니 두지 않으려고 이 설명을 대신 붙인다.
 */
export const lifestyleHint = (key: LifestyleKey) => LIFESTYLE_AXES.find((a) => a.key === key)!.hint

/**
 * 중요도 슬라이더의 범위. **서버 제약 그대로다** — `@Min(1) @Max(5)`
 * (RecommendationCreateRequest.java:23-26, jb-backend 2a709d1).
 *
 * 예전엔 0~100 슬라이더를 25단위로 접어 보냈는데, 그러면 38에서 62까지 끌어도
 * 서버엔 똑같이 3 이 가서 움직여도 결과가 안 변하는 구간이 생겼다.
 * 눈금을 서버 해상도에 맞추면 슬라이더를 움직인 만큼만 결과가 달라진다.
 */
export const IMPORTANCE_RANGE = { min: 1, max: 5, step: 1 }

/** 5단짜리 눈금이라 숫자만 두면 '3' 이 무슨 뜻인지 알 수 없다. 단마다 말을 붙인다. */
const IMPORTANCE_LABELS = ['상관없음', '조금', '보통', '중요', '매우중요'] as const

export const importanceLabel = (v: number) =>
  IMPORTANCE_LABELS[
    Math.min(IMPORTANCE_RANGE.max, Math.max(IMPORTANCE_RANGE.min, Math.round(v))) - 1
  ]
