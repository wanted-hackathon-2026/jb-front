/** 만원 단위 금액을 "1억 2,000" 처럼 읽기 좋게 만든다. */
export function formatMoney(manwon: number): string {
  if (manwon === 0) return '0'
  const eok = Math.floor(manwon / 10000)
  const rest = manwon % 10000
  if (eok === 0) return rest.toLocaleString('ko-KR')
  if (rest === 0) return `${eok}억`
  return `${eok}억 ${rest.toLocaleString('ko-KR')}`
}

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
