/**
 * 서버 시각 보정.
 *
 * 백엔드는 **UTC 로 저장한다** — 추천도 매물 지표도 전부 `LocalDateTime.now(ZoneOffset.UTC)`
 * 다(jb-backend `RecommendationService`·`SunlightMetricServiceImpl` 등). 그런데 응답
 * 타입이 `LocalDateTime` 이라 **오프셋을 담지 못해** `2026-09-20T13:12:52.942674` 로
 * 내려온다.
 *
 * 브라우저는 오프셋 없는 이 문자열을 **로컬 시각으로** 읽는다(ECMA-262). KST 에서는
 * 9시간이 어긋나, 자정 근처 기록이 하루 밀린 날짜로 찍힌다.
 *
 * 그래서 들어오는 자리에서 한 번 세워 준다. 시각을 내보내는 DTO 가 다섯이고
 * (`RecommendationHistoryResponse`·`RecommendationStatusResponse`·`FavoriteDtos`·
 * `AccountResponse`·`PropertyResponse`) 전부 같은 처지라, 쓰는 쪽마다 따로 외우지 않게
 * 한 곳에 둔다.
 *
 * **백엔드가 고치면 저절로 물러난다.** 오프셋이 이미 붙은 값은 그대로 통과시키므로,
 * 서버가 `Instant` 로 바꿔 `…Z` 를 보내기 시작해도 이 함수는 아무것도 하지 않는다.
 * 그때 이 모듈을 지우는 건 선택이지, 급한 일이 되지 않는다.
 */

/**
 * **시간대가 분명한** 시각 문자열. 표식(brand)이 달려 있어 아무 문자열이나 들어갈 수 없다.
 *
 * 이게 이 모듈의 강제 장치다. 시각을 쓰는 자리(`formatDay`, `SearchHistoryEntry.createdAt`)
 * 가 `Instant` 를 요구하므로, 서버 값을 `toInstant()` 없이 넘기면 **컴파일이 막힌다.**
 * 주석으로 적어 두면 다음 사람이 안 읽지만, 이건 안 읽어도 걸린다.
 *
 * `string` 이기도 해서 `new Date(v)` 나 비교는 그대로 된다 — 막는 건 들어오는 쪽뿐이다.
 */
export type Instant = string & { readonly __instant: unique symbol }

/** 끝에 `Z` 나 `+09:00` 같은 오프셋이 붙어 있는가. */
const HAS_ZONE = /(?:Z|[+-]\d{2}:?\d{2})$/

/**
 * 시각 문자열을 시간대가 분명한 값으로 세운다.
 *
 * 오프셋이 없으면 **UTC 로 읽는다.** 근거는 저장하는 쪽이 UTC 라는 것이고, 근거가
 * 깨지면(서버가 KST 로 바꾸면) 여기 한 줄만 고치면 된다 — 화면 곳곳에 흩어질 가정을
 * 한자리에 모아 둔 것이 이 함수의 값어치다.
 *
 * 이미 오프셋이 있는 값(브라우저가 만든 `toISOString()` 포함)은 그대로 통과한다.
 */
export const toInstant = (v: string): Instant => (HAS_ZONE.test(v) ? v : `${v}Z`) as Instant

/** 널을 그대로 흘려보내는 판 — `completedAt` 처럼 아직 없을 수 있는 값에 쓴다. */
export const toInstantOrNull = (v: string | null): Instant | null =>
  v === null ? null : toInstant(v)
