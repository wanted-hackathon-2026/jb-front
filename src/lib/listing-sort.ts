/**
 * 목록 정렬 **키와 라벨**. 어떻게 줄 세우는지는 여기 없다 — 페이지를 나눠 주는 쪽,
 * 즉 서버(지금은 `mocks/listings.ts`)가 정렬까지 한다. 받은 페이지만 화면에서 다시
 * 줄 세우면 다음 페이지가 붙을 때 그 사이에 끼어들기 때문이다.
 *
 * 그래서 이 파일은 목록 API 가 붙어도 남는다. 사라지는 건 목 안의 비교 함수 쪽이고,
 * 이 키는 그대로 서버 파라미터가 된다(`lib/api/listings-page.ts`).
 */
export type SortKey = 'score' | 'commute' | 'priceAsc' | 'priceDesc'

export const SORT_LABELS: Record<SortKey, string> = {
  score: '매칭점수순',
  commute: '이동효율순',
  priceAsc: '가격 낮은순',
  priceDesc: '가격 높은순',
}
