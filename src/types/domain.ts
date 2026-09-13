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

/** 라이프스타일 가중치 — 전부 1~100 스케일 */
export interface LifestyleWeights {
  light: number
  safety: number
  noise: number
  convenience: number
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
