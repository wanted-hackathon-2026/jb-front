<script setup lang="ts">
import { computed } from 'vue'
import { scoreColor } from '@/lib/score'

const props = withDefaults(defineProps<{ score: number; size?: number }>(), { size: 72 })

const R = 26
const CIRC = 2 * Math.PI * R

/** 링과 가운데 숫자가 같은 색을 쓴다. 구간표는 lib/score.ts 에 있다. */
const color = computed(() => scoreColor(props.score))

/** 100점이 한 바퀴다. */
const arc = computed(() => (Math.max(0, Math.min(100, props.score)) / 100) * CIRC)
const dash = computed(() => `${arc.value} ${CIRC - arc.value}`)
/**
 * 호의 '끝'을 12시에 붙인다. 음수 오프셋이 대시 패턴을 그만큼 앞으로 밀어서, 점수가
 * 낮아지면 시작점만 시계방향으로 물러난다 — 시안의 네 도넛 모두 틈이 12시에서 시작한다.
 */
const offset = computed(() => arc.value - CIRC)
</script>

<template>
  <div
    class="relative shrink-0"
    :style="{ width: `${size}px`, height: `${size}px` }"
    role="img"
    :aria-label="`매칭 점수 ${score}점`"
  >
    <svg viewBox="0 0 60 60" class="size-full -rotate-90">
      <circle cx="30" cy="30" :r="R" fill="none" stroke="var(--color-slate-200)" stroke-width="5" />
      <circle
        cx="30"
        cy="30"
        :r="R"
        fill="none"
        :stroke="color"
        stroke-width="5"
        stroke-linecap="round"
        :stroke-dasharray="dash"
        :stroke-dashoffset="offset"
      />
    </svg>
    <span class="absolute inset-0 grid place-items-center text-lg font-bold" :style="{ color }">
      {{ score }}
    </span>
  </div>
</template>
