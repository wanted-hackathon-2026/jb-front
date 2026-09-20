/**
 * 매칭 점수대별 색 — 시안 실측.
 *
 * 도넛(BaseScoreDonut)과 첫 진입 안내의 범례가 같은 값을 봐야 해서 여기 한 곳에 둔다.
 * 색 자체는 main.css 의 --color-score-* 토큰이고, 여기서는 '어느 점수대가 어느 색인가'만 정한다.
 */
export const SCORE_BANDS = [
  { min: 90, token: '--color-score-high', color: 'var(--color-score-high)', label: '90점+' },
  { min: 80, token: '--color-score-good', color: 'var(--color-score-good)', label: '80점대' },
  { min: 70, token: '--color-score-fair', color: 'var(--color-score-fair)', label: '70점대' },
  { min: 0, token: '--color-score-low', color: 'var(--color-score-low)', label: '60점대↓' },
] as const

const bandOf = (score: number) => SCORE_BANDS.find((b) => score >= b.min)!

/** CSS 에서 쓰는 형태. 도넛·범례처럼 스타일에 그대로 넣는 자리용이다. */
export const scoreColor = (score: number) => bandOf(score).color

/**
 * 실제 색값. **`var()` 를 못 쓰는 자리용**이다 — 지도 마커는 SVG 를 data URI 로
 * 감싸 넣는데, 그 안에서는 페이지의 CSS 변수를 볼 수 없어 `var(--…)` 가 그냥 무시된다.
 *
 * 그래서 토큰을 런타임에 풀어 읽는다. 색을 여기 박아두면 팔레트가 바뀔 때 지도만
 * 옛 색으로 남는다 — MapView 의 `brandColor()` 와 같은 이유, 같은 방식이다.
 */
export const scoreColorValue = (score: number, fallback = '#00c8b3') =>
  getComputedStyle(document.documentElement).getPropertyValue(bandOf(score).token).trim() ||
  fallback
