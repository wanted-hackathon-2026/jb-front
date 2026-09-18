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
 * 목 사진 — 실제 방 사진이다.
 *
 * 처음엔 picsum.photos 를 썼는데 주제를 못 고른다. 분류를 받는 대체 서비스
 * (loremflickr)는 죽어 있어서, 언스플래시에서 원룸·주방·침실 사진을 골라 id 로 박았다.
 * 언스플래시 라이선스는 상업적 사용까지 무료이고 출처 표기 의무가 없다. 유료인
 * Unsplash+(plus.unsplash.com)는 골라내고 무료(images.unsplash.com)만 남겼다.
 *
 * **눈으로 고른 목록이다.** 검색 결과를 그대로 쓰면 같은 촬영본이 여러 장 섞여
 * (한 번 그렇게 됐다) 카드마다 같은 흰 주방이 뜬다. 스물네 장을 서로 다르게 골랐다.
 *
 * 주소에 붙는 건 언스플래시가 제공하는 리사이즈 파라미터다 — 원본은 수 MB 라
 * 그대로 부르면 목록 한 장이 통째로 느려진다.
 *
 * ⚠️ 네트워크가 필요하다. 끊기면 <img> 가 실패하고 지금의 회색 자리표시자가 남는다
 * (ListingCard·ListingDetailPage 가 실패를 받아 이미지를 숨긴다).
 * 이 파일과 함께 사라질 값이라 레포에 사진 파일을 들이지는 않는다.
 */
const PHOTO_IDS = [
  '1630699376167-3870469e7598', // white and brown kitchen cabinet
  '1616486029423-aaa4789e8c9a', // A bedroom with a bed, a leather bench, and wall art in a sunlit room
  '1737233463795-34fccdfc67bb', // A kitchen with a wooden floor and white walls
  '1696762932825-2737db830bbe', // a bedroom with a bed and a chair
  '1702014859908-d48b9b844240', // a room with a table, chairs and a television
  '1633944095397-878622ebc01c', // a bed sitting in a bedroom next to a window
  '1689043528099-2ba014dd7c64', // a kitchen with a table and chairs next to a window
  '1699869653495-fe26f4c70b3e', // a bedroom with a large bed and a round mirror on the wall
  '1764080582659-652c0000ff1d', // Modern kitchen with dining table and chairs
  '1757344454333-cc666252e596', // Modern bedroom with wooden accents and soft lighting
  '1702014861373-527115231f8c', // a kitchen with a sink, stove, microwave and toaster oven
  '1633809365429-2fa048a02119', // a bedroom with a large bed and a dresser
  '1720420021124-4e18564e070f', // A bedroom with a bed and a desk
  '1675279200694-8529c73b1fd0', // a kitchen with a table and chairs next to a window
  '1616593969747-4797dc75033e', // 2 brown wooden armchairs beside white wall
  '1560448076-957f79776e95', // white table lamp
  '1555930112-0159bcdc3fe5', // black laptop computer
  '1785706313842-541f09684d5f', // Bright room with wooden floor, patterned rug, and leaded win
  '1697807665472-908cfe732b8e', // a room with a desk and a book shelf
  '1650347683799-c2e44df2859c', // a desk with a lamp, books, and papers on it
  '1633948393301-d43e3ec0e5cd', // a bed room with a neatly made bed and a desk
  '1648634158203-199accfd7afc', // a bedroom with a large bed
  '1663811397207-418a92396ad5', // a bedroom with a large mirror
  '1773098587137-1a62971cfedb', // A modern kitchen with stainless steel appliances and wooden floors
]

/**
 * i 번째 매물의 사진.
 *
 * 시작점을 5 씩 어긋나게 돌린다. 사진이 매물 수(24)와 같고 5 와 24 가 서로소라
 * **모든 매물의 첫 장이 다르다** — 대표 사진이 겹치면 목록에서 같은 방이 두 번
 * 나온 것처럼 보인다. 한 번 그렇게 됐다(사진 14장에 매물 24개라 열 개가 겹쳤다).
 *
 * 새로고침마다 방이 바뀌면 화면 비교가 안 되므로 여기서도 결정적으로 고른다.
 */
const photosOf = (i: number) =>
  Array.from(
    { length: 5 + (i % 4) },
    (_, n) =>
      `https://images.unsplash.com/photo-${PHOTO_IDS[(i * 5 + n) % PHOTO_IDS.length]}?w=800&h=600&fit=crop&q=70`,
  )

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
