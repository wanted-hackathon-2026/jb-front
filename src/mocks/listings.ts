/** ⚠️ 가짜 매물 데이터. 백엔드 연동 시 이 파일을 통째로 삭제한다. */
import type { Listing, RouteLeg } from '@/types/domain'

const ROOM_TYPES = ['분리형 원룸', '오픈형 원룸', '복층 원룸', '1.5룸', '투룸']
const ADDRESSES = ['역삼동', '도곡동', '대치동', '삼성동', '논현동', '구로동']
const LINE_SETS = [
  ['2호선', '1호선'],
  ['3호선', '1호선'],
  ['2호선'],
  ['9호선'],
  ['분당선', '2호선'],
]

const STATIONS = ['문정', '잠실', '신도림', '역삼', '왕십리', '합정', '건대입구', '사당']

const SUMMARIES = [
  '통근이 짧고 주변이 조용해 조건에 잘 맞아요',
  '역세권이라 이동이 편하고 편의시설이 가까워요',
  '채광이 좋고 같은 가격대에서 면적이 넓은 편이에요',
  '치안 지표가 높은 동네에 있는 매물이에요',
]

/**
 * 이동 동선. 첫 노선으로 타고 → (환승) → 두 번째 노선 → 도보 로 만든다.
 * 노선이 하나뿐이면 환승 구간을 빼고 두 칸으로 끝낸다.
 */
function buildRoute(i: number, lines: string[], walkMinutes: number): RouteLeg[] {
  const ride = 6 + (i % 5) * 2
  const legs: RouteLeg[] = [
    { mode: 'subway', minutes: ride, line: lines[0], stop: `${STATIONS[i % STATIONS.length]}역` },
  ]
  if (lines[1]) {
    legs.push({ mode: 'transfer', minutes: 2 })
    legs.push({
      mode: 'subway',
      minutes: ride + 3,
      line: lines[1],
      stop: `${STATIONS[(i + 3) % STATIONS.length]}역`,
    })
  }
  legs.push({
    mode: 'walk',
    minutes: walkMinutes,
    stop: `${STATIONS[(i + 5) % STATIONS.length]}역`,
  })
  return legs
}

/** 화면 확인용으로 결정적인 값을 만든다 — 새로고침마다 바뀌면 비교가 안 된다. */
function build(i: number): Listing {
  const score = [92, 68, 82, 74, 86, 61, 95, 78][i % 8]
  const deposit = [2000, 3000, 5000, 8000, 10000][i % 5]
  const rent = [35, 45, 55, 0, 40][i % 5]
  const areaPyeong = 6 + (i % 4)
  const walkMinutes = 5 + (i % 4) * 2
  const lines = LINE_SETS[i % LINE_SETS.length]
  return {
    id: `l${i + 1}`,
    dealType: rent === 0 ? 'jeonse' : 'monthly',
    deposit,
    rent,
    roomType: ROOM_TYPES[i % ROOM_TYPES.length],
    areaPyeong,
    floor: 1 + (i % 5),
    address: `서울 강남구 ${ADDRESSES[i % ADDRESSES.length]}`,
    // 강남 일대에 흩어놓는다. 실제 좌표가 아니라 지도 렌더 확인용이다.
    x: 127.02 + ((i % 7) - 3) * 0.012,
    y: 37.5 + ((i % 5) - 2) * 0.009,
    score,
    commutes: [{ anchorId: 'a1', minutes: 20 + (i % 5) * 4, transfers: i % 3, walkMinutes }],
    lines,
    supplyPyeong: areaPyeong + 4 + (i % 3),
    bathrooms: 1 + (i % 2),
    photoCount: 8 + (i % 8),
    aiSummary: SUMMARIES[i % SUMMARIES.length],
    rank: null,
    route: buildRoute(i, lines, walkMinutes),
  }
}

const ALL = Array.from({ length: 24 }, (_, i) => build(i))

/** 거점이 등록된 상태 — 매칭 점수 내림차순 */
export async function getScoredListings(): Promise<Listing[]> {
  await new Promise((r) => setTimeout(r, 220))
  // 순위는 매물의 성질이 아니라 '이 추천 안에서 몇 번째냐'다 — 정렬한 뒤에 매긴다.
  return [...ALL]
    .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
    .map((l, i) => ({ ...l, rank: i + 1 }))
}

/** 거점 미설정 상태 — 점수 없이 노선 배지만 */
export async function getNearbyListings(): Promise<Listing[]> {
  await new Promise((r) => setTimeout(r, 220))
  return ALL.map((l) => ({ ...l, score: null, commutes: [] }))
}

/**
 * 단건 조회. 목록과 같은 목 데이터에서 찾는다.
 * 순위는 매물이 아니라 추천 결과의 성질이라, 목록과 같은 점수순 기준으로 매겨 돌려준다.
 */
export async function getMockListing(id: string): Promise<Listing | null> {
  await new Promise((r) => setTimeout(r, 180))
  const ranked = await getScoredListings()
  return ranked.find((l) => l.id === id) ?? null
}
