<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { MAX_ANCHORS } from '@/stores/anchors'

/**
 * 첫 방문에만 뜨는 사용법 안내.
 *
 * 화면을 어둡게 덮되 설명할 컨트롤 자리만 구멍을 뚫어, 진짜 UI 를 보면서 읽게 한다.
 * 어디든 누르면 닫힌다 — 읽고 지나가는 안내라 '닫기'를 찾게 만들 이유가 없다.
 *
 * 대상은 MapPage 의 `data-tour` 표식으로 찾는다. 표식이 없으면 그 항목은 조용히
 * 건너뛴다 — 안내 때문에 화면이 깨지는 쪽이 안내가 없는 것보다 나쁘다.
 */
const emit = defineEmits<{ close: [] }>()

interface Spot {
  key: string
  title: string
  body: string
  /** 말풍선을 구멍 위에 둘지 아래에 둘지 */
  place: 'above' | 'below'
}

const SPOTS: Spot[] = [
  {
    key: 'anchors',
    title: '먼저 거점을 등록하세요',
    body: `직장·학교처럼 자주 가는 곳을 최대 ${MAX_ANCHORS}곳까지. 여기서부터 걸리는 시간이 점수의 1순위예요.`,
    place: 'below',
  },
  {
    key: 'tabs',
    title: '조건을 정하고, 결과를 봅니다',
    body: '검색 필터에서 채광·치안·소음·편의 중요도를 조절하면, 주변 매물에 100점 만점 매칭점수가 붙어요.',
    place: 'above',
  },
]

/** 구멍이 대상에 딱 붙으면 눌린 것처럼 보인다 — 조금 넉넉하게 뚫는다. */
const PAD = 8
/** 말풍선과 구멍 사이 여백. 아래쪽 대상은 바텀시트 모서리를 피하려 더 띄운다. */
const GAP = { below: 14, above: 40 }

interface Hole extends Spot {
  x: number
  y: number
  w: number
  h: number
  r: number
}

const holes = ref<Hole[]>([])
const size = ref({ w: 0, h: 0 })

function measure() {
  const root = frame.value
  if (!root) return
  // 좌표는 뷰포트가 아니라 셸(= 이 오버레이) 기준이다. 데스크톱에서 셸은 가운데
  // 480px 만 차지하므로, 뷰포트 좌표를 그대로 쓰면 구멍이 옆으로 밀린다.
  const base = root.getBoundingClientRect()
  size.value = { w: base.width, h: base.height }
  holes.value = SPOTS.flatMap((spot) => {
    const el = document.querySelector(`[data-tour="${spot.key}"]`)
    if (!el) return []
    const r = el.getBoundingClientRect()
    const w = r.width + PAD * 2
    const h = r.height + PAD * 2
    // 알약 모양(rounded-full)은 계산값이 사실상 무한대로 나온다 — 높이 절반으로 눌러 담는다.
    const css = Number.parseFloat(getComputedStyle(el).borderTopLeftRadius) || 0
    return [
      {
        ...spot,
        x: r.x - base.x - PAD,
        y: r.y - base.y - PAD,
        w,
        h,
        r: Math.min(h / 2, css + PAD),
      },
    ]
  })
}

/** 말풍선 자리. 구멍 위/아래에 붙이고 좌우는 셸 안쪽 여백에 맞춘다. */
function labelStyle(hole: Hole) {
  return hole.place === 'below'
    ? { top: `${hole.y + hole.h + GAP.below}px` }
    : { bottom: `${size.value.h - hole.y + GAP.above}px` }
}

/**
 * 리사이즈(회전) 대응.
 *
 * 한 프레임 뒤에 한 번, 350ms 뒤에 또 한 번 잰다. 바텀시트가 transform 으로 300ms 동안
 * 미끄러지기 때문에 첫 측정은 애니메이션 중간값을 잡는다 — 실제로 시트 구멍이 화면
 * 한가운데 뚫렸다. 끝난 뒤 한 번 더 재서 제자리를 찾게 한다.
 */
let settle: ReturnType<typeof setTimeout> | undefined
function remeasure() {
  requestAnimationFrame(measure)
  clearTimeout(settle)
  settle = setTimeout(measure, 350)
}

const onKey = (e: KeyboardEvent) => {
  if (e.key === 'Escape') emit('close')
}

const panel = ref<HTMLElement | null>(null)
/** 딤과 설명이 들어가는 셸 폭 상자. 좌표 기준이자 측정 대상이다. */
const frame = ref<HTMLElement | null>(null)

onMounted(() => {
  // 레이아웃이 한 번 그려진 뒤에 재야 바텀시트가 자리를 잡은 값이 나온다.
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
    @click="emit('close')"
  >
    <!--
      딤은 앱 셸(480px) 안에만 칠한다 — 셸 밖 회색 여백까지 덮으면 앱이 어디까지인지
      알 수 없다. 대신 바깥쪽도 이 루트가 클릭을 받아 '아무 곳이나 누르면 닫힌다'.
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
              v-for="h in holes"
              :key="h.key"
              :x="h.x"
              :y="h.y"
              :width="h.w"
              :height="h.h"
              :rx="h.r"
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
          v-for="h in holes"
          :key="h.key"
          :x="h.x"
          :y="h.y"
          :width="h.w"
          :height="h.h"
          :rx="h.r"
          fill="none"
          stroke="var(--color-brand-500)"
          stroke-width="2"
        />
      </svg>

      <!-- 서비스 한 줄 소개. 구멍 사이의 빈 지도 영역에 놓는다. -->
      <div class="absolute inset-x-0 top-[30%] px-7 text-center">
        <p class="text-balance text-xl font-bold leading-snug break-keep text-white">
          통근 시간과 생활 조건을 함께 계산해 100점 만점으로 집을 줄 세워요
        </p>
        <!-- 닫는 법도 여기 붙인다. 화면 맨 아래는 바텀시트 글자가 비쳐 겹친다. -->
        <p class="mt-4 text-sm text-white/60">화면 아무 곳이나 누르면 닫혀요</p>
      </div>

      <p v-for="h in holes" :key="h.key" class="absolute inset-x-0 px-7" :style="labelStyle(h)">
        <span class="block font-bold text-brand-300">{{ h.title }}</span>
        <span class="mt-1 block text-sm leading-normal text-white/85">{{ h.body }}</span>
      </p>
    </div>
  </div>
</template>
