/**
 * 목록 정렬 — 키·라벨과 **줄 세우는 법**.
 *
 * 예전에는 정렬을 서버가 했다. 페이지를 나눠 주는 쪽이 정렬도 해야, 받은 페이지만
 * 다시 줄 세웠을 때 다음 페이지가 그 사이에 끼어드는 일이 없기 때문이다.
 *
 * **이제 페이지가 없다.** 실제 목록 API 가 영역(bbox) 조회이고 명세가
 * "전통적인 페이지네이션을 사용하지 않는다"고 못박았다
 * (jb-backend docs/specs/property-listing-and-detail.md). 영역 안 매물을 한 번에
 * 다 받으므로 **화면이 직접 정렬한다** — 끼어들 다음 페이지가 없다.
 */
import type { Listing } from '@/types/domain'

export type SortKey = 'score' | 'commute' | 'saved' | 'priceAsc' | 'priceDesc'

export const SORT_LABELS: Record<SortKey, string> = {
  score: '매칭점수순',
  commute: '이동효율순',
  saved: '최근 저장순',
  priceAsc: '가격 낮은순',
  priceDesc: '가격 높은순',
}

/**
 * 비교용 단일 가격. 전세와 월세를 한 축에 올리려면 환산이 필요해서 관행대로
 * 환산보증금(보증금 + 월세×100)을 쓴다.
 *
 * ⚠️ **가격 축의 정의는 원래 백엔드 몫이다**(README '역할 분담'). 목록 API 가 정렬을
 * 지원하지 않아 화면이 임시로 흉내 내는 규칙이다 — 서버가 정렬 키를 받기 시작하면
 * 이 함수를 지우고 그 키를 넘긴다.
 */
const priceOf = (l: Listing) => l.deposit + l.rent * 100

/** 첫 거점까지의 소요 시간. 이동 정보가 없는 매물은 항상 뒤로 보낸다. */
const commuteOf = (l: Listing) => l.commutes[0]?.minutes ?? Number.POSITIVE_INFINITY

const COMPARATORS: Record<SortKey, (a: Listing, b: Listing) => number> = {
  // 점수 없는 매물(-1)은 뒤로 간다.
  score: (a, b) => (b.score ?? -1) - (a.score ?? -1),
  /*
   * 최근 저장순 = **받아온 순서 그대로.**
   *
   * 찜 목록은 서버가 이미 최신순으로 준다(FavoriteServiceImpl: createdAt DESC, id DESC).
   * 응답에 저장 시각이 안 실려 오므로 화면이 다시 줄 세울 근거가 없고, 그럴 이유도 없다.
   * 아무것도 하지 않는 비교자를 두는 건 Array#sort 가 안정 정렬이라 **원래 순서가
   * 그대로 남기** 때문이다.
   */
  saved: () => 0,
  commute: (a, b) => commuteOf(a) - commuteOf(b),
  priceAsc: (a, b) => priceOf(a) - priceOf(b),
  priceDesc: (a, b) => priceOf(b) - priceOf(a),
}

/** 원본을 건드리지 않고 정렬한 새 배열을 준다 — 호출부가 props 를 그대로 넘기기 때문이다. */
export const sortListings = (items: Listing[], key: SortKey) => [...items].sort(COMPARATORS[key])
