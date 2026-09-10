/** 만원 단위 금액을 "1억 2,000" 형태로 */
export function formatMoney(manwon: number): string {
  if (manwon >= 10000) {
    const eok = Math.floor(manwon / 10000)
    const rest = manwon % 10000
    return rest === 0 ? `${eok}억` : `${eok}억 ${rest.toLocaleString()}`
  }
  return manwon.toLocaleString()
}

/** ㎡ → 평 (소수 첫째자리) */
export function toPyeong(areaM2: number): number {
  return Math.round((areaM2 / 3.3058) * 10) / 10
}

export function formatArea(areaM2: number): string {
  return `${areaM2}㎡ (${toPyeong(areaM2)}평)`
}

export function formatDuration(min: number): string {
  if (min < 60) return `${min}분`
  const h = Math.floor(min / 60)
  const m = min % 60
  return m === 0 ? `${h}시간` : `${h}시간 ${m}분`
}
