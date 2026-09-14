import type { Listing } from '@/types/domain'

export type SortKey = 'score' | 'commute' | 'priceAsc' | 'priceDesc'

export const SORT_LABELS: Record<SortKey, string> = {
  score: '매칭점수순',
  commute: '이동효율순',
  priceAsc: '가격 낮은순',
  priceDesc: '가격 높은순',
}

/**
 * 비교용 단일 가격. 전세와 월세를 한 축에 올리려면 환산이 필요해서 관행대로
 * 환산보증금(보증금 + 월세×100)을 쓴다.
 *
 * ⚠️ 화면 정렬 전용 임시 규칙이다. 가격 축을 어떻게 정의할지는 백엔드 몫이므로
 * (README '역할 분담') 목록 API 가 정렬을 지원하면 이 함수는 지우고 서버에 정렬 키를 넘긴다.
 */
const priceOf = (l: Listing) => l.deposit + l.rent * 100

/** 첫 거점까지의 소요 시간. 이동 정보가 없는 매물은 항상 뒤로 보낸다. */
const commuteOf = (l: Listing) => l.commutes[0]?.minutes ?? Number.POSITIVE_INFINITY

const COMPARATORS: Record<SortKey, (a: Listing, b: Listing) => number> = {
  // 점수 없는 매물(-1)은 뒤로 간다.
  score: (a, b) => (b.score ?? -1) - (a.score ?? -1),
  commute: (a, b) => commuteOf(a) - commuteOf(b),
  priceAsc: (a, b) => priceOf(a) - priceOf(b),
  priceDesc: (a, b) => priceOf(b) - priceOf(a),
}

export const sortListings = (listings: Listing[], key: SortKey): Listing[] =>
  [...listings].sort(COMPARATORS[key])
