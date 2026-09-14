/**
 * 노선별 색.
 *
 * 시안의 이동 동선 막대는 노선 색으로 구간을 구분한다(8호선 분홍, 2호선 초록).
 * 값은 시안에서 실측한 것이고, 서울 지하철 공식 색을 조금 눌러 쓴 톤이다.
 * 표에 없는 노선은 회색으로 떨어뜨린다 — 모르는 노선을 아무 색으로 칠하면
 * 다른 노선과 같은 색이 되어 구간 구분이 거짓말이 된다.
 */
const LINE_COLORS: Record<string, string> = {
  '1호선': '#0052a4',
  '2호선': '#4ba557',
  '3호선': '#ef7c1c',
  '4호선': '#00a5de',
  '5호선': '#996cac',
  '6호선': '#cd7c2f',
  '7호선': '#747f00',
  '8호선': '#d3356c',
  '9호선': '#bb8336',
  신분당선: '#d31145',
  분당선: '#f5a200',
  경의중앙선: '#77c4a3',
  공항철도: '#0090d2',
}

/** 노선 색을 모르면 이 회색으로 그린다(도보·환승 구간도 같은 회색을 쓴다). */
export const NEUTRAL_LINE = '#9aa3af'

export const lineColor = (line?: string) => (line && LINE_COLORS[line]) || NEUTRAL_LINE

/** 막대 위 동그라미에 넣을 짧은 표기 — '8호선' → '8'. 숫자가 없으면 첫 글자. */
export const lineBadge = (line?: string) => {
  if (!line) return ''
  const num = line.match(/^\d+/)
  return num ? num[0] : line.slice(0, 1)
}
