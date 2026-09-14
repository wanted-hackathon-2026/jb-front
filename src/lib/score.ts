/**
 * 매칭 점수대별 색 — 시안 실측.
 *
 * 도넛(BaseScoreDonut)과 첫 진입 안내의 범례가 같은 값을 봐야 해서 여기 한 곳에 둔다.
 * 색 자체는 main.css 의 --color-score-* 토큰이고, 여기서는 '어느 점수대가 어느 색인가'만 정한다.
 */
export const SCORE_BANDS = [
  { min: 90, color: 'var(--color-score-high)', label: '90점+' },
  { min: 80, color: 'var(--color-score-good)', label: '80점대' },
  { min: 70, color: 'var(--color-score-fair)', label: '70점대' },
  { min: 0, color: 'var(--color-score-low)', label: '60점대↓' },
] as const

export const scoreColor = (score: number) => SCORE_BANDS.find((b) => score >= b.min)!.color
