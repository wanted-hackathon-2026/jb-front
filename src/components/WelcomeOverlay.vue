<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import { MAX_ANCHORS } from '@/stores/anchors'
import { useSheetStore } from '@/stores/sheet'
import { SCORE_BANDS } from '@/lib/score'

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
  /** 헤드라인·버튼 묶음의 세로 위치 (구멍을 피해 단계마다 다르다) */
  stack: string
  /** 이 단계를 보려면 바텀시트가 어떤 상태여야 하는가 */
  sheet: 'peek' | 'full'
}

const STEPS: Step[] = [
  {
    sheet: 'peek',
    stack: 'top-[30%]',
    headline: '통근 시간과 생활 조건을 함께 계산해 100점 만점으로 집을 줄 세워요',
    spots: [
      {
        key: 'anchors',
        title: '먼저 거점을 등록하세요',
        body: `직장·학교처럼 자주 가는 곳을 최대 ${MAX_ANCHORS}곳까지. 여기서부터 걸리는 시간이 점수의 1순위예요.`,
        place: 'below',
      },
      {
        key: 'tabs',
        title: '조건을 정하고, 결과를 봅니다',
        body: '검색 필터에서 채광·치안·소음·편의 중요도를 조절하면, 주변 매물에 매칭점수가 붙어요.',
        place: 'above',
      },
    ],
  },
  {
    sheet: 'full',
    // 아래쪽에 앉힌다 — 화면 위에 떠 있으면 불안정해 보인다. 좁은 화면에서는 말풍선이
    // 구멍 위로 올라가므로(measure 참고) 마지막 구멍 아래가 이 묶음의 자리로 남는다.
    stack: 'bottom-2',
    spots: [
      {
        key: 'sort',
        title: '원하는 기준으로 줄 세우기',
        body: '매칭점수순 · 이동효율순 · 가격 낮은순 · 가격 높은순',
        place: 'below',
      },
      {
        key: 'listing',
        title: '점수는 색으로도 읽혀요',
        // 첫 방문에는 거점이 없어 점수 도넛이 아직 없다 — '붙는다'가 아니라
        // '등록하면 붙는다'로 적어야 화면과 어긋나지 않는다.
        body: '거점을 등록하면 매물마다 100점 만점 점수가 붙어요.',
        place: 'below',
        legend: true,
        // 첫 카드는 정렬 버튼과 맞닿아 있어 테두리가 서로를 파고든다. 목록 가운데쯤의
        // 카드를 짚으면 둘이 충분히 떨어진다.
        pick: 'middle',
      },
    ],
  },
]

/** 구멍이 대상에 딱 붙으면 눌린 것처럼 보인다 — 조금 넉넉하게 뚫는다. */
const PAD = 8
/** 말풍선과 구멍 사이 여백. 위에 놓을 땐 바텀시트 모서리를 피하려 더 띄운다. */
const GAP = { below: 14, above: 40 }

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

const panel = ref<HTMLElement | null>(null)
/** 딤과 설명이 들어가는 셸 폭 상자. 좌표 기준이자 측정 대상이다. */
const frame = ref<HTMLElement | null>(null)

async function measure() {
  const root = frame.value
  if (!root) return
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

  await nextTick()
  // 말풍선이 화면 아래로 넘치면(짧은 화면에서 마지막 구멍 아래에 자리가 안 남는다)
  // 전부 구멍 위로 올린다. 하나만 뒤집으면 남은 말풍선과 자리가 엉켜 서로를 덮는다.
  const spills = [...root.querySelectorAll('[data-label]')].some(
    (el) => el.getBoundingClientRect().bottom > base.bottom - 8,
  )
  if (spills && placed.some((h) => h.place === 'below')) {
    holes.value = placed.map((h) => ({ ...h, place: 'above' as const }))
  }
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

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms))

function close() {
  // 안내 때문에 펼친 시트는 되돌린다 — 지도가 먼저 보이는 게 이 화면의 기본이다.
  sheet.state = STEPS[0].sheet
  emit('close')
}

/** 단계 이동. 시트 상태는 각 단계가 들고 있어서 앞뒤 어느 쪽으로 가든 같은 코드로 맞는다. */
async function goto(i: number) {
  if (i < 0) return
  if (i >= STEPS.length) return close()
  const sheetMoves = sheet.state !== STEPS[i].sheet
  sheet.state = STEPS[i].sheet
  // 옛 구멍이 남아 잠깐 엉뚱한 자리를 뚫는 걸 막는다.
  holes.value = []
  step.value = i
  await nextTick()
  // 시트가 transform 으로 300ms 미끄러진다 — 멈춘 뒤에 재야 제자리가 나온다.
  if (sheetMoves) await wait(340)
  measure()
}

/**
 * 리사이즈(회전) 대응. 한 프레임 뒤에 한 번, 350ms 뒤에 또 한 번 잰다.
 * 바텀시트가 transform 으로 300ms 미끄러지기 때문에 첫 측정은 애니메이션 중간값을 잡는다.
 */
let settle: ReturnType<typeof setTimeout> | undefined
function remeasure() {
  requestAnimationFrame(measure)
  clearTimeout(settle)
  settle = setTimeout(measure, 350)
}

const onKey = (e: KeyboardEvent) => {
  if (e.key === 'Escape') close()
}

onMounted(() => {
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
      <div class="absolute inset-x-0 px-7 text-center" :class="STEPS[step].stack">
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
