import type { Instant } from '@/lib/server-time'

/** 만원 단위 금액을 "1억 2,000" 처럼 읽기 좋게 만든다. */
export function formatMoney(manwon: number): string {
  if (manwon === 0) return '0'
  const eok = Math.floor(manwon / 10000)
  const rest = manwon % 10000
  if (eok === 0) return rest.toLocaleString('ko-KR')
  if (rest === 0) return `${eok}억`
  return `${eok}억 ${rest.toLocaleString('ko-KR')}`
}

/**
 * 조건으로 읽는 보증금 — 필터 시트의 범위, 기록 카드의 "그때 이랬다".
 *
 * formatMoney 와 달리 단위를 붙인다. 매물 카드의 "월세 3,500/35" 는 부동산 관례라
 * 단위 없이 읽히지만, 범위는 "0 ~ 2억 5,000" 처럼 뒤 숫자가 만원인지 알 수 없다.
 * 시안(필터 시트·기록 카드)도 "5,000만원 ~ 1억" 으로 적는다.
 */
export function formatDeposit(manwon: number): string {
  if (manwon === 0) return '0원'
  const eok = Math.floor(manwon / 10000)
  const rest = manwon % 10000
  if (eok === 0) return `${rest.toLocaleString('ko-KR')}만원`
  if (rest === 0) return `${eok}억`
  return `${eok}억 ${rest.toLocaleString('ko-KR')}만원`
}

/**
 * "2026. 8. 21" — 기록 목록의 날짜. ko-KR 의 기본 숫자 표기가 그 모양이라(시안과 같다)
 * 끝에 붙는 마침표만 떼어낸다('2026. 8. 21.').
 *
 * 카드와 목록이 같은 함수를 봐야 한다 — 목록은 이 문자열이 같은지로 같은 날을 가른다.
 */
export const formatDay = (iso: Instant) =>
  new Intl.DateTimeFormat('ko-KR').format(new Date(iso)).replace(/\.$/, '')

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

/**
 * 분 → "50분" · "1시간" · "1시간 20분".
 *
 * 이동시간 상한이 180 까지 열려 있어(서버 `@Max(180)`) 분으로만 적으면
 * "최대 180분" 처럼 한 번 계산해야 읽히는 값이 나온다.
 */
export function formatMinutes(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (!h) return `${m}분`
  return m ? `${h}시간 ${m}분` : `${h}시간`
}
