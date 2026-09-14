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
        key: 'filters',
        title: '2. 조건마다 중요도를 정하세요',
        body: '채광·치안·소음·편의를 각각 올리고 내리면 AI가 그 비중대로 찾아줘요. 예산과 이동시간도 여기서 정합니다.',
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
      {
        key: 'sort',
        title: '원하는 기준으로 줄 세우기',
        body: '매칭점수순 · 이동효율순 · 가격 낮은순 · 가격 높은순',
        place: 'below',
      },
      {
        key: 'listing',
        title: '3. 결과는 이렇게 나와요',
        body: '매물마다 100점 만점 매칭점수가 붙고, 점수대에 따라 도넛 색이 달라져요.',
        place: 'below',
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
 * 말풍선과 구멍 사이 여백.
 * 짧게 둔다 — 설명이 멀리 떨어져 있으면 무엇을 가리키는지 한눈에 안 붙는다.
 * 위쪽은 글의 마지막 줄 아래 여백이 조금 더 있어 보여서 2px 만 더 준다.
 */
const GAP = { below: 10, above: 12 }

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
 * 버튼 묶음이 화면 위아래 끝에서 최소한 이만큼은 떨어져 있어야 한다.
 * 아래쪽은 홈 인디케이터·브라우저 하단 바까지 더해서 잰다 — 모바일에서는 같은 px 라도
 * 훨씬 붙어 보인다.
 */
const EDGE_GAP = 40

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
    const r = el.getBoundingClientRect()
    const w = r.width + PAD * 2
    const h = r.height + PAD * 2
    // 알약 모양(rounded-full)은 계산값이 사실상 무한대로 나온다 — 높이 절반으로 눌러 담는다.
    const css = Number.parseFloat(getComputedStyle(el).borderTopLeftRadius) || 0
    placed.push({
      ...spot,
      x: r.x - base.x - PAD,
      y: r.y - base.y - PAD,
      w,
      h,
      r: Math.min(h / 2, css + PAD),
    })
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
    (el) => el.getBoundingClientRect().bottom > base.bottom - 8,
  )
  if (spills && placed.some((h) => h.place === 'below')) {
    holes.value = placed.map((h) => ({ ...h, place: 'above' as const }))
    await nextTick()
  }

  placeStack(root, base)
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

  // 말풍선이 비워 둔 띠의 한가운데에 놓는다. 화면 정중앙이 아니라 '남은 자리의 중앙'이다 —
  // 화면을 기준으로 삼으면 말풍선이 길어질 때 그 위를 덮는다.
  let top = 0
  let bottom = base.height
  holes.value.forEach((hole, i) => {
    const r = labels[i]
    if (!r) return
    if (hole.place === 'below') top = Math.max(top, r.bottom - base.top)
    else bottom = Math.min(bottom, r.top - base.top)
  })

  /*
    접힌 시트가 깔고 앉은 아래쪽은 빈 자리가 아니다. 그걸 빼지 않으면 '남은 자리의
    중앙'이 눈에 보이는 여백보다 아래로 내려가 어정쩡하게 걸린다.
    시트를 뚫어 설명하는 단계(펼친 상태)에서는 시트 안이 곧 설명 대상이라 빼지 않는다.
  */
  if (STEPS[step.value].sheet === 'peek') {
    const sheetEl = document.querySelector('[data-tour="sheet"]')
    if (sheetEl) bottom = Math.min(bottom, sheetEl.getBoundingClientRect().top - base.top)
  }

  const centered = top + (bottom - top - h) / 2
  // 화면 끝에 붙지 않게 잘라낸다. 위아래가 다 빠듯하면 위쪽을 살린다(버튼이 잘리면 못 누른다).
  const floor = base.height - EDGE_GAP - safeBottom() - h
  const clamped = Math.min(Math.max(top + 8, centered), Math.max(EDGE_GAP, floor))
  setStack({ top: `${Math.round(clamped)}px` })
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
  const ok = all.filter((el) => {
    const r = el.getBoundingClientRect()
    const top = r.top - base.top - PAD
    const bottom = r.bottom - base.top + PAD
    if (top < 8 || bottom > base.height - 8) return false
    return !placed.some((p) => top < p.y + p.h && p.y < bottom)
  })
  const pool = ok.length ? ok : all
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
  sheet.tab = STEPS[0].tab
  sheet.previewScored = false
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
  const sheetMoves = sheet.state !== target.sheet
  const listChanges = sheet.previewScored !== !!target.previewScored
  sheet.state = target.sheet
  sheet.tab = target.tab
  sheet.previewScored = !!target.previewScored
  // 시트는 transform 으로 300ms 미끄러지고, 목록이 바뀌면 다시 받아오는 시간이 든다.
  if (sheetMoves || listChanges) await wait(340)

  // 옛 구멍이 남아 잠깐 엉뚱한 자리를 뚫는 걸 막는다.
  holes.value = []
  step.value = i
  // 버튼 자리를 먼저 잡아둔다 — 측정이 끝나고 잡으면 화면을 가로질러 튄다.
  baselineStack(i)
  await nextTick()
  await measure()
}

/**
 * 리사이즈(회전) 대응. 한 프레임 뒤에 한 번, 350ms 뒤에 또 한 번 잰다.
 * 바텀시트가 transform 으로 300ms 미끄러지기 때문에 첫 측정은 애니메이션 중간값을 잡는다.
 */
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
      -->
      <svg class="absolute inset-0 size-full" aria-hidden="true">
        <defs>
          <mask id="jb-tour-mask" maskUnits="userSpaceOnUse">
            <rect :width="size.w" :height="size.h" fill="white" />
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
          :width="size.w"
          :height="size.h"
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
        class="absolute inset-x-0 px-7"
        :class="labelAlign(h)"
        :style="labelStyle(h)"
      >
        <span class="block font-bold text-brand-300">{{ h.title }}</span>
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

      <!-- 헤드라인과 진행 버튼. 단계마다 구멍을 피해 자리를 옮긴다. -->
      <div data-stack class="absolute inset-x-0 px-7 text-center" :style="stackStyle">
        <p
          v-if="STEPS[step].headline"
          class="mb-6 text-balance text-xl font-bold leading-snug break-keep text-white"
        >
          {{ STEPS[step].headline }}
        </p>

        <div class="flex items-center justify-center gap-1.5" aria-hidden="true">
          <span
            v-for="(_, i) in STEPS"
            :key="i"
            class="size-1.5 rounded-full transition-colors"
            :class="i === step ? 'bg-brand-400' : 'bg-white/30'"
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
