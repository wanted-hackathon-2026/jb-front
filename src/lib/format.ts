/** 만원 단위 금액을 "1억 2,000" 처럼 읽기 좋게 만든다. */
export function formatMoney(manwon: number): string {
  if (manwon === 0) return '0'
  const eok = Math.floor(manwon / 10000)
  const rest = manwon % 10000
  if (eok === 0) return rest.toLocaleString('ko-KR')
  if (rest === 0) return `${eok}억`
  return `${eok}억 ${rest.toLocaleString('ko-KR')}`
}

/** 1평 = 3.3058㎡ (한국 표준). 백엔드는 ㎡ 로 주고 화면은 평으로 쓴다. */
const SQM_PER_PYEONG = 3.305785

/**
 * ㎡ → 평. 소수 한 자리까지 남긴다 — 정수로 반올림하면 6.4평과 7.4평이 모두 "7평"이
 * 되어 매물이 구분되지 않는다.
 */
export const sqmToPyeong = (sqm: number) => Math.round((sqm / SQM_PER_PYEONG) * 10) / 10

const DEAL_LABEL = { monthly: '월세', jeonse: '전세', sale: '매매' } as const

export function formatPrice(
  dealType: keyof typeof DEAL_LABEL,
  deposit: number,
  rent: number,
): string {
  const label = DEAL_LABEL[dealType]
  return rent > 0 ? `${label} ${formatMoney(deposit)}/${rent}` : `${label} ${formatMoney(deposit)}`
}

export const dealTypeLabel = (t: keyof typeof DEAL_LABEL) => DEAL_LABEL[t]

/** "27분 · 환승 1회 · 도보 10분" */
export function formatCommute(minutes: number, transfers: number, walkMinutes: number): string {
  const parts = [`${minutes}분`]
  if (transfers > 0) parts.push(`환승 ${transfers}회`)
  if (walkMinutes > 0) parts.push(`도보 ${walkMinutes}분`)
  return parts.join(' · ')
}
