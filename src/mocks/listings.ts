/** ⚠️ 가짜 매물 데이터. 백엔드 연동 시 이 파일을 통째로 삭제한다. */
import { LIFESTYLE_AXES } from '@/lib/lifestyle'
import type { LifestyleInsight, Listing, RouteLeg } from '@/types/domain'

const ROOM_TYPES = ['분리형 원룸', '오픈형 원룸', '복층 원룸', '1.5룸', '투룸']

/**
 * 매물이 몰려 있는 지점.
 *
 * 고르게 흩어 놓으면 지도에서 클러스터가 뭉쳤다 풀리는 걸 확인할 수 없다 — 몇 군데에
 * 몰아 두고 **개수도 일부러 다르게** 잡는다. 10건짜리는 배지가 한 단계 커지므로
 * (lib/kakao.ts 의 CLUSTER_STEPS) 구간이 나뉘는 것도 같이 보인다.
 *
 * count 의 합은 아래 ALL 의 개수와 같아야 한다.
 */
const HOTSPOTS = [
  { dong: '역삼동', count: 10, x: 127.0364, y: 37.5008 },
  { dong: '논현동', count: 6, x: 127.0214, y: 37.5109 },
  { dong: '삼성동', count: 5, x: 127.0632, y: 37.5088 },
  { dong: '대치동', count: 3, x: 127.0567, y: 37.4946 },
]

/** i 번째 매물이 속한 지점. 앞에서부터 count 만큼 채운다. */
const SPOT_OF = HOTSPOTS.flatMap((s, si) => Array.from({ length: s.count }, () => si))
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

/** 축별 평가 문안. 축마다 점수 높은 순으로 한 벌씩 돌려 쓴다. */
const INSIGHTS: Record<string, { title: string; body: string }[]> = {
  sunlight: [
    {
      title: '남향으로 햇빛이 잘 들어요',
      body: '창이 남향으로 뚫려 있고 건물 간 거리가 넓어 한낮에도 조명을 안 켜도 됩니다.',
    },
    {
      title: '오후에 볕이 드는 편이에요',
      body: '앞 건물과의 거리가 보통이라 아침보다 오후에 볕이 더 들어옵니다.',
    },
  ],
  safety: [
    {
      title: 'CCTV가 촘촘한 골목이에요',
      body: '가로등과 CCTV가 많고 파출소가 도보 거리라 늦은 귀가도 무리가 없습니다.',
    },
    {
      title: '무난한 편이에요',
      body: '큰길과 가까워 인적이 있는 편이지만, 안쪽 골목은 밤에 조금 어둡습니다.',
    },
  ],
  quietness: [
    {
      title: '대로변에서 떨어져 조용해요',
      body: '큰길·철길과 거리가 있어 창을 열어둬도 소음이 적습니다.',
    },
    {
      title: '유흥가가 가까워 밤에 소리가 있어요',
      body: '역세권이라 이동은 편하지만 주말 밤에는 바깥 소리가 들어옵니다.',
    },
  ],
  infrastructure: [
    {
      title: '편의점이 걸어서 3분이에요',
      body: '약국과 병원도 가깝습니다. 다만 대형마트는 없어 장은 배송을 쓰게 됩니다.',
    },
    {
      title: '기본 시설은 갖춰져 있어요',
      body: '편의점·약국은 가깝고, 마트와 공원은 한 정거장 거리입니다.',
    },
  ],
}

/** 매칭 점수 언저리에서 축마다 조금씩 흩어 놓는다 — 네 칸이 다 같은 숫자면 확인이 안 된다. */
function buildInsights(i: number, score: number): LifestyleInsight[] {
  return LIFESTYLE_AXES.map((axis, a) => {
    const s = Math.max(40, Math.min(99, score + [0, -7, -24, -17][a] + (i % 5)))
    const pool = INSIGHTS[axis.key]
    return { key: axis.key, score: s, ...pool[s >= 80 ? 0 : 1] }
  })
}

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

/**
 * 목 사진.
 *
 * picsum.photos 는 **씨드가 같으면 늘 같은 사진**을 준다. 이 파일의 다른 값들이 전부
 * 결정적인 것과 같은 이유로 씨드를 쓴다 — 새로고침마다 방이 바뀌면 화면 비교가 안 된다.
 *
 * ⚠️ 네트워크가 필요하다. 끊기면 <img> 가 실패하고 지금의 회색 자리표시자가 남는다
 * (ListingCard·ListingDetailPage 가 실패를 받아 이미지를 숨긴다).
 * 이 파일과 함께 사라질 값이라 레포에 사진 파일을 들이지는 않는다.
 */
const photosOf = (i: number) =>
  Array.from({ length: 5 + (i % 4) }, (_, n) => `https://picsum.photos/seed/jb-${i}-${n}/800/600`)

/** 화면 확인용으로 결정적인 값을 만든다 — 새로고침마다 바뀌면 비교가 안 된다. */
function build(i: number): Listing {
  const spot = HOTSPOTS[SPOT_OF[i]]
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
    address: `서울 강남구 ${spot.dong}`,
    // 지점 둘레 150m 안에 흩뜨린다. 실제 좌표가 아니라 지도 렌더 확인용이다 —
    // 끝까지 확대하면 낱개 점으로 갈라져야 하므로 완전히 겹치게 두지는 않는다.
    x: spot.x + (((i * 7) % 5) - 2) * 0.0007,
    y: spot.y + (((i * 3) % 5) - 2) * 0.0005,
    score,
    commutes: [{ anchorId: 'a1', minutes: 20 + (i % 5) * 4, transfers: i % 3, walkMinutes }],
    lines,
    supplyPyeong: areaPyeong + 4 + (i % 3),
    bathrooms: 1 + (i % 2),
    photos: photosOf(i),
    aiSummary: SUMMARIES[i % SUMMARIES.length],
    rank: null,
    lifestyleInsights: buildInsights(i, score),
    route: buildRoute(i, lines, walkMinutes),
  }
}

const ALL = Array.from({ length: SPOT_OF.length }, (_, i) => build(i))

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
 * 맥락 없는 단건 조회.
 *
 * 점수·순위·이동 동선은 '어느 추천 기준이냐'가 있어야 나오는 값이라 싣지 않는다.
 * 추천을 돌린 적도 없는데 "추천 1순위 · 20분 · 도보 5분" 을 단언하면 거짓말이 된다.
 */
export async function getMockListing(id: string): Promise<Listing | null> {
  await new Promise((r) => setTimeout(r, 180))
  const found = ALL.find((l) => l.id === id)
  return found
    ? {
        ...found,
        score: null,
        rank: null,
        aiSummary: null,
        lifestyleInsights: [],
        commutes: [],
        route: [],
      }
    : null
}

/**
 * 추천 맥락이 붙은 단건 조회. 점수·순위·이동 동선이 함께 온다.
 *
 * 목 데이터는 추천마다 다른 점수를 갖지 않아서 recommendationId 를 쓰지 않는다 —
 * 실제 API 는 이 값으로 기준을 갈라 다른 점수를 내려준다.
 */
export async function getMockRecommendedListing(id: string): Promise<Listing | null> {
  await new Promise((r) => setTimeout(r, 180))
  const ranked = await getScoredListings()
  return ranked.find((l) => l.id === id) ?? null
}
