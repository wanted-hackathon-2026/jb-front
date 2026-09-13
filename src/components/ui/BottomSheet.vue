<script setup lang="ts">
import { ref } from 'vue'

/**
 * 이 앱의 중심 컴포넌트. 지도는 항상 뒤에 남고 시트만 peek ⇄ full 로 오간다.
 * 화면 전환이 아니라 시트 상태 전환이라는 점이 시안의 핵심이다.
 */
const state = defineModel<'peek' | 'full'>({ default: 'peek' })

const dragY = ref(0)
let startY = 0
let dragging = false
let moved = false

function onPointerDown(e: PointerEvent) {
  dragging = true
  moved = false
  startY = e.clientY
  ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
}

function onPointerMove(e: PointerEvent) {
  if (!dragging) return
  const dy = e.clientY - startY
  if (Math.abs(dy) > 4) moved = true
  // 현재 상태에서 갈 수 없는 방향으로는 끌리지 않게 한다.
  dragY.value = state.value === 'full' ? Math.max(0, dy) : Math.min(0, dy)
}

function onPointerUp() {
  if (!dragging) return
  dragging = false
  const THRESHOLD = 60
  if (dragY.value > THRESHOLD) state.value = 'peek'
  else if (dragY.value < -THRESHOLD) state.value = 'full'
  dragY.value = 0
}

function onClick() {
  // 드래그가 끝나면 click 이 이어서 발생한다. 그대로 두면 방금 드래그로 정한 상태를
  // 곧바로 되돌려버린다 — 실제로 "끌어올려도 안 고정되는" 증상이 이것이었다.
  if (moved) {
    moved = false
    return
  }
  state.value = state.value === 'peek' ? 'full' : 'peek'
}
</script>

<template>
  <section
    class="absolute inset-x-0 bottom-0 z-20 flex flex-col rounded-t-2xl bg-white shadow-[0_-2px_16px_rgba(15,23,42,0.12)]"
    :class="{ 'transition-transform duration-300': !dragY }"
    :style="{
      height: 'var(--sheet-full)',
      transform: `translateY(calc(${state === 'full' ? '0px' : 'var(--sheet-full) - var(--sheet-peek)'} + ${dragY}px))`,
    }"
  >
    <!-- 손잡이. 드래그와 탭 둘 다 받는다 — 탭만 되면 모바일에서 답답하다. -->
    <button
      type="button"
      class="grid w-full shrink-0 touch-none place-items-center py-3"
      :aria-label="state === 'peek' ? '매물 목록 펼치기' : '매물 목록 접기'"
      @pointerdown="onPointerDown"
      @pointermove="onPointerMove"
      @pointerup="onPointerUp"
      @pointercancel="onPointerUp"
      @click="onClick"
    >
      <span class="h-1 w-10 rounded-full bg-slate-300" />
    </button>

    <slot />
  </section>
</template>
