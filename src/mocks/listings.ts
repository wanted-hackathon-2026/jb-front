/** ⚠️ 가짜 매물 데이터. 백엔드 연동 시 이 파일을 통째로 삭제한다. */
import { LIFESTYLE_AXES } from '@/lib/lifestyle'
import { sortListings } from '@/lib/listing-sort'
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
  { dong: '역삼동', count: 22, x: 127.0364, y: 37.5008 },
  { dong: '논현동', count: 16, x: 127.0214, y: 37.5109 },
  { dong: '삼성동', count: 13, x: 127.0632, y: 37.5088 },
  { dong: '대치동', count: 9, x: 127.0567, y: 37.4946 },
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
 * 목 사진 — 매물 한 건이 **한 집**이 되도록 묶은 세트다.
 *
 * 처음엔 사진 스물네 장을 공용 풀로 두고 돌려 썼는데, 그러면 한 매물 안에서 첫 장은
 * A 집 주방이고 둘째 장은 B 집 침실이었다. 매물 사진은 같은 집이어야 말이 된다.
 *
 * 그래서 **같은 촬영본끼리 묶었다.** 언스플래시 사진 id 의 앞자리는 업로드 시각(ms)이라,
 * 같은 작가가 비슷한 시각에 올린 것들은 한 집을 찍은 연작이다. 그렇게 모은 뒤 눈으로
 * 확인해 열두 세트를 남겼다. 순서도 손으로 잡았다 — **첫 장이 집 전체가 보이는 컷**이고
 * 뒤로 갈수록 주방·욕실 같은 부분 컷이다. 카드 썸네일이 곧 첫 장이라 더 그렇다.
 *
 * 장수는 네 장이다. 목으로 화면을 굴리는 데는 그 이상이 필요 없다.
 *
 * 언스플래시 라이선스는 상업적 사용까지 무료이고 출처 표기 의무가 없다. 유료인
 * Unsplash+(plus.unsplash.com)는 골라내고 무료(images.unsplash.com)만 남겼다.
 * 주소에 붙는 건 언스플래시가 제공하는 리사이즈 파라미터다 — 원본은 수 MB 라
 * 그대로 부르면 목록 한 장이 통째로 느려진다.
 *
 * ⚠️ 네트워크가 필요하다. 끊기면 <img> 가 실패하고 지금의 회색 자리표시자가 남는다
 * (ListingCard·ListingDetailPage 가 실패를 받아 이미지를 숨긴다).
 * 이 파일과 함께 사라질 값이라 레포에 사진 파일을 들이지는 않는다.
 */
const PHOTO_SETS = [
  // 흰 주방 원룸
  [
    '1630699293875-e56c25151c4b',
    '1630699294110-6bbec2bb9ea4',
    '1630699293676-74731c1a0e66',
    '1630699293259-0b6c08606c62',
  ],
  // 볕 드는 거실 아파트
  [
    '1560185009-5bf9f2849488',
    '1560185007-cde436f6a4d0',
    '1560185007-5f0bb1866cab',
    '1560448075-57d0285fc59b',
  ],
  // 파란 소파 원룸
  [
    '1737737210863-387afd35344e',
    '1737737149038-e6532662659e',
    '1737737192166-e0e2fa311fd7',
    '1737737196308-e5b848160b78',
  ],
  // 가벽 나눈 원룸
  [
    '1702014859878-5d4743176d28',
    '1702014857653-dcea938d51f0',
    '1702014859908-d48b9b844240',
    '1702014859028-c773f15029db',
  ],
  // 빈 회색 원룸
  [
    '1789353527502-929a999695ac',
    '1789353527453-2121cc451a89',
    '1789353527453-791631816c06',
    '1789353527593-53f737dc286f',
  ],
  // 붉은 포인트 원룸
  [
    '1629042306547-c1d7c6c85ffa',
    '1629042306541-85e77116aed3',
    '1629042306558-7d1e15cc02fa',
    '1629042306548-1bfb25a3ff78',
  ],
  // 짙은 초록 주방 원룸
  [
    '1738748444626-ed333be8afc7',
    '1738748444659-f8975b12ce57',
    '1738748444626-08b04513bcac',
    '1738748444551-2f0819de6faa',
  ],
  // 빈 원룸(주방 분리)
  [
    '1789352844272-7753113a8384',
    '1789352844192-7d495ffebb69',
    '1789352844229-28e8ecc783a5',
    '1789352844163-a44a9fcc9070',
  ],
  // 민트 주방 원룸
  [
    '1737233459465-8eaf6c7d8856',
    '1737233451637-9fd32d96eb26',
    '1737233463795-34fccdfc67bb',
    '1737233523182-99e287258d58',
  ],
  // 어두운 우드 아파트
  [
    '1738168279272-c08d6dd22002',
    '1738168246881-40f35f8aba0a',
    '1738168362059-44a0b8a80b39',
    '1738168273959-952fdc961991',
  ],
  // 흰 거실 아파트
  [
    '1628744876497-eb30460be9f6',
    '1628745277862-bc0b2d68c50c',
    '1628744876525-f2678d8af47f',
    '1628744876490-19b035ecf9c3',
  ],
  // 빈 흰 원룸
  [
    '1630699144919-681cf308ae82',
    '1630699144867-37acec97df5a',
    '1630699144641-72fa7a6b8aa1',
    '1630699144418-6ca9059f9a44',
  ],
]

/**
 * i 번째 매물의 사진 = 세트 하나.
 *
 * 세트를 5 씩 건너뛰며 고른다. 목록은 점수순으로 정렬되는데 점수가 i % 8 로 정해져서
 * **i, i+8, i+16 이 목록에서 나란히 붙는다.** 5 와 12 가 서로소라 그 셋은 서로 다른
 * 세트를 받는다 — 같은 집이 연달아 세 줄 나오는 걸 막는 건 이 한 줄이다.
 */
const photosOf = (i: number) =>
  PHOTO_SETS[(i * 5) % PHOTO_SETS.length].map(
    (id) => `https://images.unsplash.com/photo-${id}?w=800&h=600&fit=crop&q=70`,
  )

/** 중개사가 적어 넣는 한 줄. 실제 매물 글의 말투를 흉내 낸다. */
const DESCRIPTIONS = [
  '보증보험 가능 · 즉시 입주 가능한 깔끔한 매물이에요',
  '전세자금대출 가능하고 관리비에 수도세가 포함됩니다',
  '남향이라 하루 종일 볕이 들고 채광이 아주 좋아요',
  '역까지 도보 5분, 주변에 편의점과 마트가 가깝습니다',
  '리모델링 완료된 매물로 옵션이 모두 새 제품이에요',
]

/** 빌트인 옵션. 매물마다 한 벌씩 돌려 쓴다. */
const OPTION_SETS = [
  ['에어컨', '냉장고', '세탁기', '인덕션', '붙박이장'],
  ['에어컨', '냉장고', '전자레인지', '책상', '신발장'],
  ['에어컨', '세탁기', '가스레인지', '도어록'],
  ['에어컨', '냉장고', '세탁기', '전자레인지', '붙박이장', '도어록'],
]

/** 화면 확인용으로 결정적인 값을 만든다 — 새로고침마다 바뀌면 비교가 안 된다. */
function build(i: number): Listing {
  const spot = HOTSPOTS[SPOT_OF[i]]
  /*
   * 8개짜리 표만 돌리면 60건에서 같은 점수가 일곱 번씩 나온다 — 도넛이 죄다 같은
   * 숫자라 정렬이 듣는지도 안 보인다. 서로 소인 주기(8·11)를 겹쳐 흩뜨린다.
   * 결정적인 값인 건 그대로라 새로고침해도 같은 매물은 같은 점수다.
   */
  const score = Math.max(
    55,
    Math.min(99, [92, 68, 82, 74, 86, 61, 95, 78][i % 8] + ((i * 7) % 11) - 5),
  )
  const deposit = [2000, 3000, 5000, 8000, 10000][i % 5]
  const rent = [35, 45, 55, 0, 40][i % 5]
  const areaPyeong = 6 + (i % 4)
  const walkMinutes = 5 + (i % 4) * 2
  const lines = LINE_SETS[i % LINE_SETS.length]
  return {
    id: `l${i + 1}`,
    // 목에는 '내가 찜했나'가 없다 — 서버만 아는 값이다.
    favorite: false,
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
    description: DESCRIPTIONS[i % DESCRIPTIONS.length],
    // 0 이 섞여야 '관리비 없음'으로 떨어지는 화면도 같이 확인된다.
    maintenanceFee: [0, 5, 7, 8, 12][i % 5],
    // 전체 층수는 반드시 floor 보다 크다 — '5층 / 전체 3층'은 말이 안 된다.
    totalFloors: 1 + (i % 5) + 3 + (i % 12),
    direction: ['남', '남동', '동', '남서', '서'][i % 5],
    moveInDate: ['즉시 입주', '협의 가능', '1개월 후', '즉시 입주'][i % 4],
    parking: i % 3 !== 0,
    elevator: i % 4 !== 0,
    options: OPTION_SETS[i % OPTION_SETS.length],
    // 자릿수만 실제 매물 번호를 닮게 둔다. 뜻이 있는 값은 아니다.
    listingNo: String(50353437 + i * 613),
    postedDaysAgo: 1 + (i % 14),
    photos: photosOf(i),
    aiSummary: SUMMARIES[i % SUMMARIES.length],
    rank: null,
    lifestyleInsights: buildInsights(i, score),
    route: buildRoute(i, lines, walkMinutes),
  }
}

const ALL = Array.from({ length: SPOT_OF.length }, (_, i) => build(i))

/**
 * 거점이 있으면 점수·순위가 붙고, 없으면 점수 없이 노선 배지만 남는다.
 *
 * 순위는 매물의 성질이 아니라 '이 추천 안에서 몇 번째냐'다 — **화면 정렬과 무관하게**
 * 점수 내림차순으로 매긴다. 가격순으로 보더라도 카드의 '추천 3위'는 그대로여야 한다.
 */
const dataset = (scored: boolean): Listing[] =>
  scored
    ? sortListings(ALL, 'score').map((l, i) => ({ ...l, rank: i + 1 }))
    : ALL.map((l) => ({ ...l, score: null, commutes: [] }))

/**
 * 매물 목록. **지도 핀과 시트 목록이 같은 걸 쓴다.**
 *
 * 예전에는 둘로 나뉘어 있었다 — 핀은 전부, 목록은 한 페이지씩. 실제 API 가 영역(bbox)
 * 조회로 한 번에 다 주고 "전통적인 페이지네이션을 사용하지 않는다"고 못박아서
 * (property-listing-and-detail.md) 나눌 이유가 없어졌다.
 *
 * 정렬도 화면이 한다 — 서버가 정렬 키를 받지 않는다(lib/listing-sort.ts).
 */
export async function getListings(scored: boolean): Promise<Listing[]> {
  await new Promise((r) => setTimeout(r, 220))
  return dataset(scored)
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
  const ranked = dataset(true)
  return ranked.find((l) => l.id === id) ?? null
}
