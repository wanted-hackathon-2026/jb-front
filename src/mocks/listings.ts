/** ⚠️ 가짜 매물 데이터. 백엔드 연동 시 이 파일을 통째로 삭제한다. */
import type { Listing } from '@/types/domain'

const ROOM_TYPES = ['분리형 원룸', '오픈형 원룸', '복층 원룸', '1.5룸', '투룸']
const ADDRESSES = ['역삼동', '도곡동', '대치동', '삼성동', '논현동', '구로동']
const LINE_SETS = [
  ['2호선', '1호선'],
  ['3호선', '1호선'],
  ['2호선'],
  ['9호선'],
  ['분당선', '2호선'],
]

/** 화면 확인용으로 결정적인 값을 만든다 — 새로고침마다 바뀌면 비교가 안 된다. */
function build(i: number): Listing {
  const score = [92, 68, 82, 74, 86, 61, 95, 78][i % 8]
  const deposit = [2000, 3000, 5000, 8000, 10000][i % 5]
  const rent = [35, 45, 55, 0, 40][i % 5]
  return {
    id: `l${i + 1}`,
    dealType: rent === 0 ? 'jeonse' : 'monthly',
    deposit,
    rent,
    roomType: ROOM_TYPES[i % ROOM_TYPES.length],
    areaPyeong: 6 + (i % 4),
    floor: 1 + (i % 5),
    address: `서울 강남구 ${ADDRESSES[i % ADDRESSES.length]}`,
    score,
    commutes: [
      { anchorId: 'a1', minutes: 20 + (i % 5) * 4, transfers: i % 3, walkMinutes: 5 + (i % 4) * 2 },
    ],
    lines: LINE_SETS[i % LINE_SETS.length],
  }
}

const ALL = Array.from({ length: 24 }, (_, i) => build(i))

/** 거점이 등록된 상태 — 매칭 점수 내림차순 */
export async function getScoredListings(): Promise<Listing[]> {
  await new Promise((r) => setTimeout(r, 220))
  return [...ALL].sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
}

/** 거점 미설정 상태 — 점수 없이 노선 배지만 */
export async function getNearbyListings(): Promise<Listing[]> {
  await new Promise((r) => setTimeout(r, 220))
  return ALL.map((l) => ({ ...l, score: null, commutes: [] }))
}
