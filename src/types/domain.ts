/**
 * ⚠️ 백엔드 계약이 아니다. 목 데이터와 화면을 굴리기 위한 **프론트 전용 임시 모델**이다.
 *
 * 확인 시점(jb-backend c9ca9f3, 2026-09-12) 기준으로 백엔드에는 users 테이블과 User
 * 엔티티뿐이고 매물·거점 API 가 아직 없다. 그래서 응답 모양을 추측하지 않고, 화면이
 * 필요로 하는 최소 형태만 여기 둔다.
 *
 * 백엔드에 엔드포인트가 생기면 컨트롤러·DTO 와 Flyway 마이그레이션을 읽고 이 파일을
 * 거기에 맞춘다(CLAUDE.md '백엔드 참조').
 */

/**
 * ⚠️ `sale`(매매) 은 **백엔드에 대응이 없다.** 서버의 LeaseType 은 JEONSE·MONTHLY 뿐이고
 * 명세가 "매매 유형은 지원하지 않는다"고 명시한다(property-registration.md).
 * 목에만 존재하는 값이라, 실제 매물 API 가 붙으면 이 축을 지우거나 백엔드에 요청해야 한다.
 */
export type DealType = 'monthly' | 'jeonse' | 'sale'
export type TransportMode = 'transit' | 'car' | 'walk'

/** 거점 — 직장·학교 등 사용자가 자주 가는 곳 */
export interface Anchor {
  id: string
  name: string
  address: string
  /** 경도(lng) */
  x: number
  /** 위도(lat) */
  y: number
}

/**
 * 거점까지의 이동 정보.
 * 카카오 대중교통 경로 API(`/v2/routing/publictraffic`) 응답 필드에 맞춘 형태다.
 * totalTime(초) → minutes, transfers → transfers, steps 의 도보 구간 합 → walkMinutes
 */
export interface CommuteInfo {
  anchorId: string
  minutes: number
  transfers: number
  walkMinutes: number
}

/**
 * 라이프스타일 가중치 — 전부 1~100 스케일.
 *
 * 키는 DB 컬럼명에 맞춘다. 특히 quietness 는 '소음'이 아니라 **'조용함'** 이다 —
 * 슬라이더를 올릴수록 조용한 곳을 원한다는 뜻이고, 이름을 noise 로 두면 뜻이 정반대라
 * 조용한 곳을 원하는 사람이 시끄러운 집을 추천받는다.
 *
 * 출처: V2__create_core_domain_tables.sql:113-116 recommendation_criteria
 *      (jb-backend bc2dc5b)
 */
export interface LifestyleWeights {
  sunlight: number
  quietness: number
  safety: number
  infrastructure: number
}

/**
 * 이동 동선의 한 구간. 시안의 막대 한 칸 + 그 아래 정류 표시가 이 단위다.
 *
 * ⚠️ 백엔드에 대응하는 테이블이 없다(bc2dc5b 기준 property·recommendation_* 어디에도
 * 경로·역·구간 컬럼이 없다). 대중교통 경로는 ODsay 같은 외부 API 를 백엔드가 풀어
 * 내려줘야 채워지는 값이라, 지금은 화면을 굴리기 위한 목 전용 모양이다.
 */
export interface RouteLeg {
  mode: 'subway' | 'bus' | 'walk' | 'transfer'
  minutes: number
  /** 노선명('8호선'). 막대 색과 동그라미 표기를 여기서 고른다. 도보·환승은 없다. */
  line?: string
  /** 아래 정류 표시에 찍을 곳. 환승 구간은 표시하지 않으므로 없다. */
  stop?: string
}

/** 상세 화면의 축별 평가 한 칸 */
export interface LifestyleInsight {
  key: keyof LifestyleWeights
  /** 0~100. 매칭 점수와 같은 색 구간을 쓴다(lib/score.ts) */
  score: number
  /** 굵게 나가는 한 줄 */
  title: string
  /** 그 아래 설명 */
  body: string
}

export interface Listing {
  id: string
  dealType: DealType
  /** 보증금(만원) */
  deposit: number
  /** 월세(만원). 전세·매매면 0 */
  rent: number
  roomType: string
  areaPyeong: number
  floor: number
  address: string
  /** 경도(lng) */
  x: number
  /** 위도(lat) */
  y: number
  /** 매칭 점수 1~100. 거점 미설정 상태에서는 null */
  score: number | null
  commutes: CommuteInfo[]
  /** 인근 지하철 노선 */
  lines: string[]

  /*
   * 아래는 상세 화면 시안이 요구하는데 **백엔드에 출처가 없는** 값들이다
   * (jb-backend bc2dc5b 의 Flyway 마이그레이션 기준).
   * property 에는 exclusive_area(전용면적)까지만 있고 공급면적·욕실 수·사진이 없으며,
   * recommendation_result 는 (추천, 매물) 짝만 들고 있어 점수도 순위도 없다.
   * 계약이 생기면 여기부터 지운다.
   */

  /** 공급면적(평) */
  supplyPyeong: number
  /** 욕실 수 */
  bathrooms: number
  /**
   * 매물 사진 주소. 첫 장이 카드 썸네일이고, 상세는 전부를 갤러리로 넘긴다.
   * 시안의 "4 / 13" 인디케이터는 이 배열의 길이에서 나온다 — 장수를 따로 들고 있으면
   * 사진과 숫자가 어긋날 수 있다.
   */
  photos: string[]
  /**
   * AI 추천 요약 한 줄. 추천 맥락이 있을 때만 있다 — 어떤 조건으로 추천됐는지가 있어야
   * 나오는 문장이라, 주변 매물에서 들어온 상세에는 null 이다(score·rank·route 와 같은 부류).
   */
  aiSummary: string | null
  /** 이 추천 안에서의 순위. 1~3 위만 배지로 보여준다. */
  rank: number | null
  /**
   * 라이프스타일 네 축의 평가. aiSummary 와 같은 부류라 추천 맥락이 없으면 빈 배열이다.
   * 순서·이름은 lib/lifestyle.ts 의 축 테이블을 따른다.
   */
  lifestyleInsights: LifestyleInsight[]
  /** 거점까지의 이동 동선 */
  route: RouteLeg[]
}

/**
 * 마이페이지 '이전 기록' 한 장 — 그때 어떤 조건으로 추천을 돌렸는지.
 *
 * 추천 요청(POST /api/recommendations)의 입력값을 되읽는 화면이라, 필드가
 * RecommendRequest 와 겹친다. 백엔드의 recommendation_criteria 가 출처가 된다.
 */
export interface SearchHistoryEntry {
  id: string
  /** 추천을 돌린 시각(ISO). 카드 제목의 날짜가 여기서 나온다. */
  createdAt: string
  /** 그때 등록돼 있던 거점 이름 — 좌표는 이 화면에 필요 없다. */
  anchorNames: string[]
  /** 보증금·월세 범위(만원) */
  deposit: [number, number]
  rent: [number, number]
  transport: TransportMode
  maxMinutes: number
  lifestyle: LifestyleWeights
  /** 이 기록으로 만들어진 추천의 id. 결과로 되돌아갈 때 쓴다. */
  recommendationId: string | null
}

/** 검색 자동완성 결과 */
export interface PlaceSuggestion {
  id: string
  name: string
  address: string
  /** 경도(lng) */
  x: number
  /** 위도(lat) */
  y: number
  /** 역이면 노선 목록 */
  lines?: string[]
}
