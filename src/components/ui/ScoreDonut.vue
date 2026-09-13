<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(defineProps<{ score: number; size?: number }>(), { size: 56 })

const R = 26
const CIRC = 2 * Math.PI * R
// 점수대별 색 규칙은 아직 미확정이라 단일 브랜드 색으로 간다.
const dash = computed(() => `${(props.score / 100) * CIRC} ${CIRC}`)
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
        stroke="var(--color-brand-500)"
        stroke-width="5"
        stroke-linecap="round"
        :stroke-dasharray="dash"
      />
    </svg>
    <span class="absolute inset-0 grid place-items-center text-base font-bold text-slate-900">
      {{ score }}
    </span>
  </div>
</template>
