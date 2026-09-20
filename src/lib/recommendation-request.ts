/**
 * 화면의 필터 → 추천 요청.
 *
 * **서버 제약을 넘기 전에 여기서 다 맞춘다.** 어긋나면 전부 400 인데, 사용자가 슬라이더를
 * 끝까지 내린 것뿐인데 "입력이 잘못됐다"는 말을 듣게 할 수는 없다. 변환을 화면이 아니라
 * 이 파일에 두는 이유는, 계약이 바뀌면 고칠 곳이 한 군데여야 해서다.
 */
import {
  PROPERTY_TYPES,
  type RecommendationCreateRequest,
  type TransportType,
} from '@/types/backend'
import { IMPORTANCE_RANGE } from '@/lib/lifestyle'
import type { LifestyleWeights, TransportMode } from '@/types/domain'

/** 서버가 받는 최소 통근시간. `@Min(5)` 라 0 을 보내면 400 이다. */
export const MIN_COMMUTE_MINUTES = 5
/** 서버 상한. `@Max(180)`. */
export const MAX_COMMUTE_MINUTES = 180

/** 프론트 이동수단 → 서버 enum. 서버의 네 값을 전부 쓴다(TransportType.java). */
const TRANSPORT: Record<TransportMode, TransportType> = {
  transit: 'TRANSIT',
  car: 'CAR',
  bicycle: 'BICYCLE',
  walk: 'WALK',
}

/**
 * 중요도. 슬라이더 눈금이 이미 서버와 같은 1~5 라(`lib/lifestyle.ts` 의
 * `IMPORTANCE_RANGE`) 환산하지 않는다 — 옛 0~100 값이 로컬에 남아 있을 때만
 * 대비해 양끝을 자른다. 슬라이더 하한이 5 여도 여기서 한 번 더 막는 것과 같은 이유다.
 */
export const toImportance = (weight: number) =>
  Math.min(IMPORTANCE_RANGE.max, Math.max(IMPORTANCE_RANGE.min, Math.round(weight)))

export interface FilterSnapshot {
  /**
   * 거점. **저장된 것을 고르거나(id) 이번 요청에만 쓸 주소를 넣는다.**
   * 서버가 둘 중 정확히 하나만 받으므로 여기서도 한쪽만 채운다.
   * 비로그인은 거점을 저장할 수 없어 늘 후자다.
   */
  workplace: { id: string } | { name: string; roadAddress: string }
  transport: TransportMode
  maxMinutes: number
  lifestyle: LifestyleWeights
  deposit: [number, number]
  rent: [number, number]
  /** 비면 전체로 본다 — 서버는 빈 배열을 400 으로 막는다. */
  roomTypes: readonly string[]
}

export function toRecommendationRequest(f: FilterSnapshot): RecommendationCreateRequest {
  const [depositMin, depositMax] = f.deposit
  const [monthlyRentMin, monthlyRentMax] = f.rent
  return {
    ...('id' in f.workplace
      ? { workplaceId: f.workplace.id }
      : { workplace: { name: f.workplace.name, roadAddress: f.workplace.roadAddress } }),
    transportType: TRANSPORT[f.transport],
    // 슬라이더 하한이 5 지만, 예전 값이 로컬에 남아 있을 수 있어 여기서도 막는다.
    maxCommuteMinutes: Math.min(
      MAX_COMMUTE_MINUTES,
      Math.max(MIN_COMMUTE_MINUTES, Math.round(f.maxMinutes)),
    ),
    sunlightImportance: toImportance(f.lifestyle.sunlight),
    quietnessImportance: toImportance(f.lifestyle.quietness),
    safetyImportance: toImportance(f.lifestyle.safety),
    infrastructureImportance: toImportance(f.lifestyle.infrastructure),
    // 슬라이더가 뒤집혀 들어와도 서버의 min ≤ max 검증에 걸리지 않게 한 번 세운다.
    depositMin: Math.min(depositMin, depositMax),
    depositMax: Math.max(depositMin, depositMax),
    monthlyRentMin: Math.min(monthlyRentMin, monthlyRentMax),
    monthlyRentMax: Math.max(monthlyRentMin, monthlyRentMax),
    // 아무것도 안 고른 건 '아무거나 좋다'는 뜻이다. 서버엔 빈 배열을 보낼 수 없어
    // 전체를 펴서 보낸다 — 유형이 10개를 넘으면 상한에 걸리므로 그때 나눠야 한다.
    roomTypes: f.roomTypes.length ? [...f.roomTypes] : [...PROPERTY_TYPES],
  }
}
