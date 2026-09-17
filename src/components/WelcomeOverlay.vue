<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import { MAX_ANCHORS } from '@/stores/anchors'
import { SCORE_BANDS } from '@/lib/score'
import { useSheetStore } from '@/stores/sheet'

/**
 * 첫 방문에만 뜨는 사용법 안내.
 *
 * 화면을 어둡게 덮되 설명할 컨트롤 자리만 뚫어, 진짜 UI 를 보면서 읽게 한다.
 * 대상은 MapPage·ListingList 의 `data-tour` 표식으로 찾는다. 표식이 없으면 그 항목은
 * 조용히 건너뛴다 — 안내 때문에 화면이 깨지는 쪽이 안내가 없는 것보다 나쁘다.
 *
 * 2단계인 이유: 시트가 접힌 상태(peek)에서 하단에 남는 높이가 120px 뿐이라 말풍선이
 * 하나밖에 안 들어간다. 정렬과 점수 색은 목록이 보여야 설명이 되므로, 2단계로 넘어갈 때
 * 시트를 직접 펼친다.
 */
const emit = defineEmits<{ close: [] }>()

const sheet = useSheetStore()

interface Spot {
  key: string
  title: string
  body: string
  /** 말풍선을 구멍 위에 둘지 아래에 둘지 */
  place: 'above' | 'below'
  /** 점수대별 색 범례를 붙일지 */
  legend?: boolean
  /** 스크롤 영역 안에 있어 화면 밖으로 밀려나 있을 수 있는 대상인지 */
  scroll?: boolean
  /** 같은 표식이 여럿이면 하나로 묶어 통째로 뚫을지(여러 섹션을 한 영역으로 보여준다) */
  union?: boolean
  /**
   * 같은 표식이 여럿일 때 고르는 법.
   * 'middle' — 화면 한가운데에 가장 가까운 것. 목록처럼 같은 요소가 죽 늘어선 경우에 쓴다.
   */
  pick?: 'middle'
}

interface Step {
  spots: Spot[]
  headline?: string
  /** 이 단계를 보려면 바텀시트가 어떤 상태여야 하는가 */
  sheet: 'peek' | 'full'
  /** 시트 안에서 어느 탭이 열려 있어야 하는가 */
  tab: 'listings' | 'filters'
  /** 목록을 '추천 받은 뒤'(점수 붙은) 상태로 보여줄지 */
  previewScored?: boolean
  /** 'AI가 찾는 중' 진행 표시를 띄워 보여줄지 */
  previewProgress?: boolean
}

const STEPS: Step[] = [
  {
    sheet: 'peek',
    tab: 'listings',
    headline: '통근 시간과 생활 조건을 함께 계산해 100점 만점으로 집을 줄 세워요',
    spots: [
      {
        key: 'anchors',
        title: '1. 거점을 등록하세요',
        body: `직장·학교처럼 자주 가는 곳을 최대 ${MAX_ANCHORS}곳까지. 여기서부터 걸리는 시간이 점수의 1순위예요.`,
        place: 'below',
      },
    ],
  },
  {
    // 조건을 설명하면서 조건을 안 보여줄 수는 없다 — 시트를 펼쳐 검색 필터를 띄운다.
    sheet: 'full',
    tab: 'filters',
    spots: [
      {
        key: 'conditions',
        title: '2. 조건마다 중요도를 정하세요',
        // 화면 높이에 따라 묶음에 들어가는 섹션 수가 달라진다 — 좁으면 라이프스타일만
        // 남는다. 그래서 문구는 늘 보이는 것(중요도 조절)을 앞에 두고, 예산·이동시간은
        // '같은 화면에 있다'고만 말한다.
        body: '채광·치안·조용함·인프라를 각각 올리고 내리면 AI가 그 비중대로 찾아줘요. 예산과 이동시간도 같은 화면에서 정합니다.',
        place: 'above',
        scroll: true,
        union: true,
      },
    ],
  },
  {
    // '적용' 버튼 자체는 글자 그대로라 설명할 게 없다. 정작 모르면 당황하는 건
    // '눌러도 바로 안 나온다'는 동작이라, 그 화면을 직접 띄워 보여준다.
    sheet: 'peek',
    tab: 'listings',
    previewProgress: true,
    spots: [
      {
        key: 'progress',
        title: '3. 적용을 누르면 AI가 찾기 시작해요',
        body: '분석에는 시간이 걸려요. 기다리지 않고 다른 걸 보고 있어도 끝나면 알려드립니다.',
        place: 'above',
      },
    ],
  },
  {
    // 추천을 받은 뒤의 화면을 설명하는 단계라, 목록도 점수가 붙은 상태로 보여준다.
    sheet: 'full',
    tab: 'listings',
    previewScored: true,
    spots: [
      // 설명을 둘 다 구멍 위에 둔다 — 아래에 두면 화면 아래쪽을 다 먹어서
      // 버튼이 갈 곳이 없어지고 지도 위로 올라간다.
      {
        key: 'sort',
        title: '원하는 기준으로 줄 세우기',
        body: '매칭점수순 · 이동효율순 · 가격 낮은순 · 가격 높은순',
        place: 'above',
      },
      {
        key: 'listing',
        title: '4. 결과는 이렇게 나와요',
        body: '매물마다 100점 만점 매칭점수가 붙고, 점수대에 따라 도넛 색이 달라져요.',
        place: 'above',
        legend: true,
        // 첫 카드는 정렬 버튼과 맞닿아 테두리가 겹친다 — 가운데쯤의 카드를 짚는다.
        pick: 'middle',
      },
    ],
  },
]

/** 구멍이 대상에 딱 붙으면 눌린 것처럼 보인다 — 조금 넉넉하게 뚫는다. */
const PAD = 8
/**
 * 버튼 묶음이 화면 위아래 끝에서 최소한 이만큼은 떨어져 있어야 한다.
 * 아래쪽은 홈 인디케이터·브라우저 하단 바까지 더해서 잰다 — 모바일에서는 같은 px 라도
 * 훨씬 붙어 보인다.
 */
const EDGE_GAP = 40

/** 구멍이 화면 끝에 닿으면 테두리가 잘려 열린 것처럼 보인다 — 이만큼은 남긴다. */
const EDGE_CLAMP = 8

/**
 * 구멍의 좌우가 화면 끝에서 최소한 이만큼은 떨어져 있어야 한다.
 *
 * 목록·필터의 좌우 여백(px-5 = 20)에서 구멍 여백(PAD)을 뺀 값이다. 대상마다 제 상자가
 * 조금씩 달라서 — 정렬 버튼은 -mr-2 로 콘텐츠 열 밖으로 8px 나와 있다 — 그대로 두면
 * 어떤 테두리는 화면 끝에 4px 까지 붙고 어떤 건 12px 떨어져 제각각으로 보인다.
 */
const SIDE_INSET = 12

/**
 * 바닥에 떼어 두는 버튼 자리.
 *
 * 구멍과 말풍선이 이 아래로 못 내려오게 막는다. 그래야 '이전/다음' 이 단계가 바뀌어도
 * 늘 같은 자리에 있다 — 자리를 다투게 두면 화면이 짧을 때 버튼이 지도 위로 밀려 올라간다.
 * 점 여백(16) + 버튼 높이(44) + 위아래 여백(EDGE_GAP 씩). 위쪽 여백을 아끼면 구멍
 * 테두리가 버튼에 2px 까지 붙는다.
 */
const STACK_RESERVE = 16 + 44 + EDGE_GAP * 2

/**
 * 구멍 위에 말풍선이 들어갈 만큼의 자리.
 *
 * 여러 후보 중에 하나를 고를 때(pick: 'middle') 쓴다. 앞서 잡힌 구멍 바로 아래 것을
 * 고르면 그 사이에 말풍선이 안 들어가 글이 앞 구멍의 테두리를 밟는다.
 */
const LABEL_ROOM = 110
/**
 * 말풍선과 구멍 사이 여백.
 * 짧게 둔다 — 설명이 멀리 떨어져 있으면 무엇을 가리키는지 한눈에 안 붙는다.
 * 위쪽은 글의 마지막 줄 아래 여백이 조금 더 있어 보여서 2px 만 더 준다.
 */
const GAP = { below: 10, above: 6 }

interface Hole extends Spot {
  x: number
  y: number
  w: number
  h: number
  r: number
}

const step = ref(0)
const holes = ref<Hole[]>([])
const size = ref({ w: 0, h: 0 })
const stackStyle = ref<Record<string, string>>({})
/**
 * 단계를 갈아끼우는 중인지.
 *
 * 옛 구멍을 그대로 둔 채 시트를 움직이면, 민트 영역이 이미 비켜난 자리를 가리키며
 * 남아 있다가 툭 사라진다. 누르는 즉시 지우고, 새 안내는 떠오르듯 들어오게 한다.
 */
const swapping = ref(false)
const headlineStyle = ref<Record<string, string>>({})

const safeBottom = () =>
  Number.parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--safe-bottom')) ||
  0

/**
 * 단계별로 마지막에 재 둔 버튼 묶음 자리.
 *
 * 되돌아갈 때 추정값으로 세웠다가 측정값으로 보정하면 그 차이만큼 움직인다(1단계에서
 * 321px → 328px 로 7px 이 툭 내려갔다). 한 번 가 본 단계는 잰 값이 그대로 맞으므로
 * 추정하지 않고 꺼내 쓴다. 화면 크기가 바뀌면 값이 무의미해지니 비운다.
 */
const stackCache = new Map<number, Record<string, string>>()

const panel = ref<HTMLElement | null>(null)
/** 딤과 설명이 들어가는 셸 폭 상자. 좌표 기준이자 측정 대상이다. */
const frame = ref<HTMLElement | null>(null)

/** 구멍 자리만 다시 잡는다(동기). 시트가 미끄러지는 동안 매 프레임 부르는 쪽이다. */
function measureHoles() {
  const root = frame.value
  if (!root) return null
  // 좌표는 뷰포트가 아니라 셸(= 이 상자) 기준이다. 데스크톱에서 셸은 가운데 480px 만
  // 차지하므로, 뷰포트 좌표를 그대로 쓰면 구멍이 옆으로 밀린다.
  const base = root.getBoundingClientRect()
  size.value = { w: base.width, h: base.height }
  const placed: Hole[] = []
  for (const spot of STEPS[step.value].spots) {
    const el = choose(spot, base, placed)
    if (!el) continue
    const r = spot.union ? unionRect(spot.key) : el.getBoundingClientRect()
    // 알약 모양(rounded-full)은 계산값이 사실상 무한대로 나온다 — 높이 절반으로 눌러 담는다.
    const css = Number.parseFloat(getComputedStyle(el).borderTopLeftRadius) || 0
    // 화면 밖으로 넘치면 테두리가 닫히지 않는다 — 보이는 만큼만 뚫는다.
    const top = Math.max(EDGE_CLAMP, r.y - base.y - PAD)
    const bottom = Math.min(base.height - STACK_RESERVE, r.bottom - base.y + PAD)
    const left = Math.max(SIDE_INSET, r.x - base.x - PAD)
    const right = Math.min(base.width - SIDE_INSET, r.right - base.x + PAD)
    const hole = {
      ...spot,
      x: left,
      y: top,
      w: Math.max(0, right - left),
      h: Math.max(0, bottom - top),
      r: Math.min((bottom - top) / 2, css + PAD),
    }
    /*
      앞서 잡힌 구멍과 겹치면 그쪽을 버리고 이것만 남긴다.
      화면이 짧으면(320x568) 피할 자리가 없어 두 대상이 맞닿는데, 그대로 두면 테두리가
      하나로 합쳐지고 말풍선 둘이 같은 자리에 겹쳐 앉는다. 한 번에 하나만 짚는 게 낫다.
    */
    for (let i = placed.length - 1; i >= 0; i--) {
      const p = placed[i]
      if (hole.y < p.y + p.h && p.y < hole.y + hole.h) placed.splice(i, 1)
    }
    placed.push(hole)
  }
  holes.value = placed
  return { root, base, placed }
}

/** 구멍을 잡고, 말풍선이 그려진 뒤 넘침 보정과 버튼 자리까지 마무리한다. */
async function measure() {
  const m = measureHoles()
  if (!m) return
  const { root, base, placed } = m

  await nextTick()
  // 말풍선이 화면 아래로 넘치면(짧은 화면에서 마지막 구멍 아래에 자리가 안 남는다)
  // 전부 구멍 위로 올린다. 하나만 뒤집으면 남은 말풍선과 자리가 엉켜 서로를 덮는다.
  const spills = [...root.querySelectorAll('[data-label]')].some(
    (el) => el.getBoundingClientRect().bottom > base.bottom - STACK_RESERVE,
  )
  // 반대로 위가 잘리면 아래로 내린다. 시트가 화면을 다 덮어 구멍이 꼭대기에 붙으면
  // '위'에 놓인 말풍선이 화면 밖으로 나가 통째로 안 보인다(실제로 iOS 에서 그랬다).
  const clipped = [...root.querySelectorAll('[data-label]')].some(
    (el) => el.getBoundingClientRect().top < base.top + EDGE_CLAMP,
  )

  if (spills && placed.some((h) => h.place === 'below')) {
    holes.value = placed.map((h) => ({ ...h, place: 'above' as const }))
    await nextTick()
  } else if (clipped && placed.some((h) => h.place === 'above')) {
    holes.value = placed.map((h) => ({ ...h, place: 'below' as const }))
    await nextTick()
  }

  placeStack(root, base)
  await nextTick()
  const stackEl = root.querySelector('[data-stack]')
  placeHeadline(root, base, stackEl ? stackEl.getBoundingClientRect().top - base.top : base.height)
}

/**
 * 단계가 바뀌는 즉시 잡아두는 버튼 묶음의 대략 자리.
 *
 * 정확한 값은 재 봐야 나오지만, 그때까지 이전 단계의 자리를 들고 있으면 측정이 끝나는
 * 순간 화면 절반을 가로질러 튄다(1단계 가운데 → 2단계 아래로 500px 가까이 움직였다).
 * 먼저 목적지 근처에 세워두고, 측정 뒤 placeStack 이 몇 픽셀만 다듬는다.
 */
function baselineStack(i: number) {
  const cached = stackCache.get(i)
  if (cached) {
    stackStyle.value = cached
    return
  }
  // 처음 가는 단계에만 쓰는 눈대중. 38% 는 '가운데 띠'가 보통 떨어지는 자리다.
  stackStyle.value = { top: '38%' }
}

function setStack(value: Record<string, string>) {
  stackStyle.value = value
  stackCache.set(step.value, value)
}

/**
 * 헤드라인·버튼 묶음의 자리.
 *
 * 'bottom' 이면 바닥에서 STACK_LIFT 만큼 띄우되, 마지막 구멍·말풍선 아래로 남는 자리를
 * 넘지 않게 깎는다. 고정값을 쓰면 320x568 처럼 아래가 빠듯한 화면에서 구멍을 밟는다.
 */
function placeStack(root: HTMLElement, base: DOMRect) {
  const el = root.querySelector('[data-stack]')
  const h = el ? el.getBoundingClientRect().height : 0
  const labels = [...root.querySelectorAll('[data-label]')].map((p) => p.getBoundingClientRect())

  // 말풍선과 구멍이 차지한 자리. 둘 다 피해야 버튼이 글자 위에 얹히지 않는다.
  const taken = [
    ...labels.map((r) => ({ top: r.top - base.top, bottom: r.bottom - base.top })),
    ...holes.value.map((x) => ({ top: x.y, bottom: x.y + x.h })),
  ]
  const hits = (top: number) => taken.some((t) => t.top < top + h && top < t.bottom)

  const floor = base.height - safeBottom() - EDGE_GAP

  /*
    자리는 단계가 바뀌어도 되도록 같은 곳이어야 한다 — 버튼이 매번 다른 데 있으면
    누를 때마다 눈으로 찾아야 한다. 그래서 '바닥에서 EDGE_GAP 띄운 자리'를 기본으로
    삼고, 거기가 구멍·말풍선에 물릴 때만 피해서 옮긴다.
  */
  const anchored = floor - h
  if (anchored >= EDGE_GAP && !hits(anchored)) {
    setStack({ top: `${Math.round(anchored)}px` })
    return
  }

  // 물리면 비어 있는 띠 중 넓은 쪽 한가운데로 피한다.
  const tops = taken.map((t) => t.top)
  const bottoms = taken.map((t) => t.bottom)
  // 띠의 시작은 화면 끝(EDGE_CLAMP)으로 잡는다. 여백은 아래에서 gap 으로 한 번 더
  // 보장하므로, 여기서 EDGE_GAP 을 먼저 빼면 좁은 띠가 실제보다 작아져 밖으로 밀린다.
  const above = { top: EDGE_CLAMP, bottom: tops.length ? Math.min(...tops) : floor }
  const below = { top: bottoms.length ? Math.max(...bottoms) : EDGE_GAP, bottom: floor }
  const band = below.bottom - below.top >= above.bottom - above.top ? below : above
  // 띠가 버튼보다 좁으면 EDGE_GAP 을 고집할 수 없다 — 그대로 두면 말풍선 위로 밀려 올라간다.
  // 320x568 의 2단계가 그랬다(띠 58px, 버튼 66px).
  const gap = band.bottom - band.top >= h + EDGE_GAP * 2 ? EDGE_GAP : EDGE_CLAMP
  const centered = band.top + (band.bottom - band.top - h) / 2
  setStack({ top: `${Math.round(Math.max(gap, Math.min(centered, floor - h)))}px` })
}

/** 헤드라인은 말풍선과 버튼 사이에 남은 띠의 한가운데에 놓는다. */
function placeHeadline(root: HTMLElement, base: DOMRect, stackTop: number) {
  const el = root.querySelector('[data-headline]')
  if (!el) {
    headlineStyle.value = {}
    return
  }
  const h = el.getBoundingClientRect().height
  const labelBottoms = [...root.querySelectorAll('[data-label]')].map(
    (p) => p.getBoundingClientRect().bottom - base.top,
  )
  const top = Math.max(EDGE_GAP, ...labelBottoms, ...holes.value.map((x) => x.y + x.h))
  const centered = top + (stackTop - EDGE_GAP - top - h) / 2
  headlineStyle.value = { top: `${Math.round(Math.max(top + EDGE_GAP, centered))}px` }
}

/**
 * 같은 표식이 붙은 것들을 하나로 묶은 사각형.
 *
 * 스크롤 영역 위로 밀려난 섹션은 뺀다. 넣으면 안 보이는 데까지 테두리가 뻗고, 화면에
 * 안 들어가 아래가 잘리면서 목록 한가운데가 끊긴다(라이프스타일에서 채광만 남았다).
 * 들어가는 만큼만 묶는 쪽이 낫다.
 */
function unionRect(key: string): DOMRect {
  const els = [...document.querySelectorAll<HTMLElement>(`[data-tour="${key}"]`)]
  const scroller = els[0] ? scrollerOf(els[0]) : null
  const limit = scroller ? scroller.getBoundingClientRect().top : Number.NEGATIVE_INFINITY
  const visible = els.map((el) => el.getBoundingClientRect()).filter((r) => r.top >= limit - 1)
  const rects = visible.length ? visible : els.map((el) => el.getBoundingClientRect())
  const x = Math.min(...rects.map((r) => r.x))
  const y = Math.min(...rects.map((r) => r.y))
  const right = Math.max(...rects.map((r) => r.right))
  const bottom = Math.max(...rects.map((r) => r.bottom))
  return new DOMRect(x, y, right - x, bottom - y)
}

/**
 * 표식이 여럿일 때 어느 것을 짚을지 고른다.
 *
 * 기본은 첫 번째. `pick: 'middle'` 이면 (1) 화면 안에 온전히 들어오고 (2) 앞서 잡힌
 * 구멍과 겹치지 않는 것들 중, 화면 한가운데에 가장 가까운 것을 고른다.
 * 겹치는 것을 걸러내는 게 핵심이다 — 목록 첫 카드는 정렬 버튼과 맞닿아 있어서
 * 가운데만 따지면 오히려 첫 카드가 뽑혀 테두리가 서로를 파고든다.
 */
function choose(spot: Spot, base: DOMRect, placed: Hole[]): Element | null {
  const all = [...document.querySelectorAll(`[data-tour="${spot.key}"]`)]
  if (spot.pick !== 'middle') return all[0] ?? null

  const mid = base.height / 2
  const center = (el: Element) => {
    const r = el.getBoundingClientRect()
    return r.top + r.height / 2 - base.top
  }
  const inside = all.filter((el) => {
    const r = el.getBoundingClientRect()
    const top = r.top - base.top - PAD
    const bottom = r.bottom - base.top + PAD
    return top >= EDGE_CLAMP && bottom <= base.height - STACK_RESERVE
  })
  const gapTo = (el: Element) => {
    const r = el.getBoundingClientRect()
    const top = r.top - base.top - PAD
    const bottom = r.bottom - base.top + PAD
    return { top, bottom }
  }
  // 겹치지 않는 것, 그중에서도 말풍선 자리까지 있는 것을 우선한다.
  // 한 번에 다 걸러내면 후보가 0 이 되어 맨 앞 것으로 되돌아가고, 그러면 앞 구멍과
  // 맞닿아 테두리가 하나로 합쳐진다.
  const clear = inside.filter((el) => {
    const { top, bottom } = gapTo(el)
    return placed.every((p) => bottom <= p.y || top >= p.y + p.h)
  })
  const roomy = clear.filter((el) => {
    const { top, bottom } = gapTo(el)
    return placed.every((p) => bottom <= p.y || top >= p.y + p.h + LABEL_ROOM)
  })
  const pool = roomy.length ? roomy : clear.length ? clear : inside.length ? inside : all
  return pool.sort((a, b) => Math.abs(center(a) - mid) - Math.abs(center(b) - mid))[0] ?? null
}

interface Rect {
  x: number
  y: number
  w: number
  h: number
  r: number
}

/**
 * 실제로 뚫고 테두리를 그릴 사각형들.
 *
 * 겹치는 구멍은 하나로 합친다. 대상 고르기(choose)에서 이미 겹치는 후보를 걸러내므로
 * 보통은 그대로 하나씩 그려지지만, 화면이 좁아 피할 자리가 없을 때는 여기서 합쳐진다.
 * 이게 없으면 맞닿은 두 요소에 테두리가 각각 그려져 서로를 파고든다.
 * 말풍선 위치는 합치기 전 개별 구멍(holes)을 그대로 쓴다.
 */
const rings = computed<Rect[]>(() => {
  const out: Rect[] = []
  for (const h of holes.value) {
    const hit = out.find(
      (o) => o.x < h.x + h.w && h.x < o.x + o.w && o.y < h.y + h.h && h.y < o.y + o.h,
    )
    if (!hit) {
      out.push({ x: h.x, y: h.y, w: h.w, h: h.h, r: h.r })
      continue
    }
    const right = Math.max(hit.x + hit.w, h.x + h.w)
    const bottom = Math.max(hit.y + hit.h, h.y + h.h)
    hit.x = Math.min(hit.x, h.x)
    hit.y = Math.min(hit.y, h.y)
    hit.w = right - hit.x
    hit.h = bottom - hit.y
    // 알약 반지름이 큰 쪽을 따라가면 합친 상자가 캡슐처럼 보인다 — 작은 쪽을 쓴다.
    hit.r = Math.min(hit.r, h.r)
  }
  return out
})

/** 말풍선 자리. 구멍 위/아래에 붙이고 좌우는 셸 안쪽 여백에 맞춘다. */
function labelStyle(hole: Hole) {
  return hole.place === 'below'
    ? { top: `${hole.y + hole.h + GAP.below}px` }
    : { bottom: `${size.value.h - hole.y + GAP.above}px` }
}

/**
 * 글을 구멍이 있는 쪽으로 붙인다.
 *
 * 말풍선은 셸 폭을 다 쓰지만 구멍은 그렇지 않다. 정렬 버튼처럼 오른쪽 끝에 있는 작은
 * 대상 아래에 왼쪽 정렬 글이 오면, 세로로는 붙어 있어도 가로로 240px 쯤 떨어져 보여
 * 무엇을 가리키는지 흐려진다.
 */
function labelAlign(hole: Hole) {
  const center = hole.x + hole.w / 2
  if (center > size.value.w * 0.62) return 'text-right'
  return 'text-left'
}

function close() {
  // 안내 때문에 펼친 시트는 되돌린다 — 지도가 먼저 보이는 게 이 화면의 기본이다.
  sheet.state = STEPS[0].sheet
  // 탭은 단계가 아니라 화면의 기본값('주변 매물')으로 되돌린다 — 안내가 마지막에
  // 들른 탭에 사용자를 버려두면 안내 전과 후의 첫 화면이 달라진다.
  sheet.tab = 'listings'
  sheet.previewScored = false
  sheet.previewProgress = false
  emit('close')
}

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms))

/**
 * 단계 이동.
 *
 * 시트를 **먼저** 움직이고 멈춘 뒤에 단계를 바꾼다. 움직이는 화면 위에서 자리를 다시
 * 잡으면 글과 버튼이 쓸려 다닌다 — 그 동안은 이전 단계의 안내를 그대로 두고, 시트가
 * 제자리에 선 뒤에 한 번에 갈아끼운다.
 */
async function goto(i: number) {
  if (i < 0) return
  if (i >= STEPS.length) return close()

  const target = STEPS[i]

  // 옛 안내를 먼저 지운다 — 대상이 움직이는 동안 남아 있으면 엉뚱한 자리를 가리킨다.
  swapping.value = true
  holes.value = []
  await nextTick()

  const sheetMoves = sheet.state !== target.sheet
  const listChanges =
    sheet.previewScored !== !!target.previewScored ||
    sheet.previewProgress !== !!target.previewProgress
  sheet.state = target.sheet
  sheet.tab = target.tab
  sheet.previewScored = !!target.previewScored
  sheet.previewProgress = !!target.previewProgress
  // 시트는 transform 으로 300ms 미끄러지고, 목록이 바뀌면 다시 받아오는 시간이 든다.
  if (sheetMoves || listChanges) await wait(340)

  // 스크롤 영역 안에 있는 대상은 보이는 자리로 끌어온다 — 화면 밖에 있으면 뚫을 수도,
  // 테두리를 닫을 수도 없다.
  for (const spot of target.spots) {
    if (!spot.scroll) continue
    if (spot.union) revealUnion(spot.key)
    else {
      const el = document.querySelector<HTMLElement>(`[data-tour="${spot.key}"]`)
      if (el) reveal(el, 'center')
    }
  }

  step.value = i
  // 버튼 자리를 먼저 잡아둔다 — 측정이 끝나고 잡으면 화면을 가로질러 튄다.
  baselineStack(i)
  await nextTick()
  await measureUntilStable()
  swapping.value = false

  // 그 뒤에도 늦게 바뀌는 경우가 있어(주소창 접힘 등) 한 번 더 확인한다. 멱등이라 같은
  // 값이면 아무 일도 일어나지 않는다.
  clearTimeout(recheck)
  recheck = setTimeout(measure, 300)
}

/** 요소를 품은 스크롤 영역을 찾는다. 없으면 null. */
function scrollerOf(el: HTMLElement): HTMLElement | null {
  for (let p = el.parentElement; p; p = p.parentElement) {
    const overflow = getComputedStyle(p).overflowY
    if ((overflow === 'auto' || overflow === 'scroll') && p.scrollHeight > p.clientHeight) return p
  }
  return null
}

/**
 * 대상을 스크롤 영역 안의 보이는 자리로 끌어온다.
 *
 * scrollIntoView 를 쓰지 않는다 — iOS 는 그걸 부르면 중첩 스크롤 영역만이 아니라 창
 * (비주얼 뷰포트)까지 밀어버린다. 그러면 getBoundingClientRect 가 주는 좌표와 실제로
 * 보이는 화면이 어긋나, 구멍이 엉뚱한 자리에 그려진다. 스크롤 영역만 직접 움직인다.
 */
function reveal(el: HTMLElement, align: 'start' | 'center') {
  const scroller = scrollerOf(el)
  if (!scroller) return
  const gap = el.getBoundingClientRect().top - scroller.getBoundingClientRect().top
  const offset =
    align === 'center'
      ? (scroller.clientHeight - el.getBoundingClientRect().height) / 2
      : EDGE_CLAMP
  scroller.scrollTop += gap - offset
}

/**
 * 묶음은 '마지막 섹션의 아래'가 버튼 자리 바로 위에 오도록 스크롤한다.
 *
 * 첫 섹션을 위에 맞추면 아래가 화면 밖으로 넘쳐 잘린다. 아래를 기준으로 맞추면 위쪽
 * 섹션이 스크롤 밖으로 밀려나는데, 그건 unionRect 가 알아서 묶음에서 뺀다.
 */
function revealUnion(key: string) {
  const els = [...document.querySelectorAll<HTMLElement>(`[data-tour="${key}"]`)]
  const last = els.at(-1)
  const root = frame.value
  if (!last || !root) return
  const scroller = scrollerOf(last)
  if (!scroller) return
  const base = root.getBoundingClientRect()
  const availBottom = base.top + base.height - STACK_RESERVE
  scroller.scrollTop += last.getBoundingClientRect().bottom + PAD - availBottom
}

/**
 * 값이 두 번 연속 같아질 때까지 다시 잰다.
 *
 * '340ms 면 다 끝났겠지' 라는 가정을 버린다. 시트가 미끄러지고, 탭이 바뀌며 필터 패널이
 * 새로 붙고, 스크롤이 자리를 잡는 일이 순서대로 일어나는데 기기가 느리면 그 사이에
 * 재게 된다 — 아이폰에서 2단계 구멍이 엉뚱한 데 생긴 게 이것이다.
 * 재는 동안에는 안내가 감춰져 있어(swapping) 값이 흔들려도 화면에 보이지 않는다.
 */
async function measureUntilStable(maxMs = 900) {
  const started = performance.now()
  let previous = ''
  while (performance.now() - started < maxMs) {
    await measure()
    const now = holes.value.map((h) => `${h.x},${h.y},${h.w},${h.h}`).join('|')
    if (now && now === previous) return
    previous = now
    await new Promise((r) => requestAnimationFrame(r))
  }
}

/**
 * 리사이즈(회전) 대응. 한 프레임 뒤에 한 번, 350ms 뒤에 또 한 번 잰다.
 * 바텀시트가 transform 으로 300ms 미끄러지기 때문에 첫 측정은 애니메이션 중간값을 잡는다.
 */
let recheck: ReturnType<typeof setTimeout> | undefined
let settle: ReturnType<typeof setTimeout> | undefined
function remeasure() {
  // 화면이 바뀌면 재 둔 자리는 더 이상 맞지 않는다.
  stackCache.clear()
  requestAnimationFrame(measure)
  clearTimeout(settle)
  settle = setTimeout(measure, 350)
}

const onKey = (e: KeyboardEvent) => {
  if (e.key === 'Escape') close()
}

onMounted(() => {
  // 첫 렌더에 자리 없이 그려지면 측정 뒤 한 번 튄다.
  baselineStack(step.value)
  requestAnimationFrame(measure)
  window.addEventListener('resize', remeasure)
  document.addEventListener('keydown', onKey)
  panel.value?.focus()
})
onBeforeUnmount(() => {
  clearTimeout(recheck)
  clearTimeout(settle)
  window.removeEventListener('resize', remeasure)
  document.removeEventListener('keydown', onKey)
})
</script>

<template>
  <div
    ref="panel"
    class="fixed inset-0 z-50 outline-none"
    tabindex="-1"
    role="dialog"
    aria-modal="true"
    aria-label="자취방정식 사용법 안내"
  >
    <!--
      딤은 앱 셸(480px) 안에만 칠한다 — 셸 밖 회색 여백까지 덮으면 앱이 어디까지인지
      알 수 없다.
    -->
    <div ref="frame" class="absolute inset-y-0 left-1/2 w-full max-w-shell -translate-x-1/2">
      <!--
        딤을 통째로 칠하고 mask 로 구멍을 뚫는다. 구멍마다 box-shadow 를 주는 흔한 방법은
        그림자가 겹치는 자리가 두 배로 어두워져서, 구멍이 둘 이상이면 쓸 수 없다.

        딤의 크기는 잰 값(size)이 아니라 100% 다. 구멍은 좌표를 재야 하지만 딤은 잴 이유가
        없고, 재면 측정이 한 프레임이라도 늦은 순간 — 창 크기를 바꾸는 중이거나 그 직후 —
        모자란 만큼 안 칠해진 띠가 남는다. 0,0 에 붙어 있으니 남는 쪽은 늘 오른쪽과 아래다.
      -->
      <svg class="absolute inset-0 size-full" aria-hidden="true">
        <defs>
          <mask id="jb-tour-mask" maskUnits="userSpaceOnUse">
            <rect width="100%" height="100%" fill="white" />
            <rect
              v-for="(ring, i) in rings"
              :key="i"
              :x="ring.x"
              :y="ring.y"
              :width="ring.w"
              :height="ring.h"
              :rx="ring.r"
              fill="black"
            />
          </mask>
        </defs>
        <rect
          width="100%"
          height="100%"
          fill="#0f172a"
          fill-opacity="0.8"
          mask="url(#jb-tour-mask)"
        />
        <rect
          v-for="(ring, i) in rings"
          :key="i"
          :x="ring.x"
          :y="ring.y"
          :width="ring.w"
          :height="ring.h"
          :rx="ring.r"
          fill="none"
          stroke="var(--color-brand-500)"
          stroke-width="2"
        />
      </svg>

      <p
        v-for="h in holes"
        :key="h.key"
        data-label
        class="absolute inset-x-0 px-7 transition-opacity duration-200"
        :class="[labelAlign(h), swapping ? 'opacity-0' : 'opacity-100']"
        :style="labelStyle(h)"
      >
        <span class="block font-bold text-brand-500">{{ h.title }}</span>
        <span class="mt-1 block text-sm leading-normal text-white/85">{{ h.body }}</span>
        <!-- 점수대별 색 범례. 도넛과 같은 표(lib/score.ts)를 본다. -->
        <span
          v-if="h.legend"
          class="mt-2 flex flex-wrap gap-x-2 gap-y-1 text-xs text-white/70"
          :class="labelAlign(h) === 'text-right' ? 'justify-end' : 'justify-start'"
        >
          <span v-for="b in SCORE_BANDS" :key="b.label" class="inline-flex items-center gap-1.5">
            <span class="size-2.5 rounded-full" :style="{ background: b.color }" />
            {{ b.label }}
          </span>
        </span>
      </p>

      <!--
        서비스 한 줄 소개. 버튼과 한 덩어리로 묶어두면 버튼을 바닥에 고정할 때 문구까지
        같이 내려가 화면 한가운데가 텅 빈다. 떼어 두고 각자 제자리를 잡게 한다.
      -->
      <p
        v-if="STEPS[step].headline"
        data-headline
        class="absolute inset-x-0 text-balance px-7 text-center text-xl font-bold leading-snug break-keep text-white transition-opacity duration-200"
        :class="swapping ? 'opacity-0' : 'opacity-100'"
        :style="headlineStyle"
      >
        {{ STEPS[step].headline }}
      </p>

      <!-- 진행 버튼. 단계가 바뀌어도 같은 자리에 둔다. -->
      <div data-stack class="absolute inset-x-0 px-7 text-center" :style="stackStyle">
        <div class="flex items-center justify-center gap-1.5" aria-hidden="true">
          <span
            v-for="(_, i) in STEPS"
            :key="i"
            class="size-1.5 rounded-full transition-colors"
            :class="i === step ? 'bg-brand-500' : 'bg-white/30'"
          />
        </div>

        <!--
          건너뛰기를 버튼 아래가 아니라 같은 줄에 둔다. 320x568 에서는 위아래 말풍선
          사이에 192px 밖에 없어서, 한 줄을 더 쌓으면 아래 말풍선과 겹친다.
        -->
        <div class="mt-4 flex items-center justify-center gap-2">
          <!--
            첫 단계에선 '건너뛰기', 그 뒤로는 '이전'. 마지막 단계의 '시작하기'가
            건너뛰기와 같은 일을 하므로 셋을 나란히 두지 않는다.
          -->
          <button
            type="button"
            class="h-11 shrink-0 px-3 text-sm text-white/60"
            @click="step === 0 ? close() : goto(step - 1)"
          >
            {{ step === 0 ? '건너뛰기' : '이전' }}
          </button>
          <!-- 폭을 채우지 않는다 — 안내 위에 뜨는 버튼이라 화면을 가로지르면 과하다. -->
          <button
            type="button"
            class="h-11 shrink-0 rounded-full bg-brand-500 px-8 text-sm font-semibold text-white"
            @click="goto(step + 1)"
          >
            {{ step === STEPS.length - 1 ? '시작하기' : '다음' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
