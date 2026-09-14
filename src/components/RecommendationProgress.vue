<script setup lang="ts">
import { computed, ref } from 'vue'
import { useIntervalFn } from '@vueuse/core'
import { FALLBACK_ESTIMATED_SECONDS } from '@/lib/api/recommendation'
import type { Job } from '@/stores/recommendation'

/** 시안 39-1780 — 추천이 도는 동안 지도 위에 떠 있는 진행 표시. */
const props = defineProps<{ job: Job }>()

const now = ref(Date.now())
useIntervalFn(() => (now.value = Date.now()), 500)

const elapsed = computed(() => (now.value - props.job.createdAt) / 1000)

/**
 * 실제 진행률은 서버가 주지 않는다. 남은 시간을 선형으로 채우면 예상보다 오래 걸릴 때
 * 100% 에 붙어 멈춘 것처럼 보인다 — 거짓말이 된다.
 * 그래서 점근선으로 붙되 90% 를 넘지 않게 둔다. 끝은 완료 신호가 찍는다.
 */
const percent = computed(() => {
  const tau = FALLBACK_ESTIMATED_SECONDS * 0.6
  return Math.min(90, (1 - Math.exp(-elapsed.value / tau)) * 100)
})

// PENDING 과 PROCESSING 을 구분한다. 폴링 로직상 둘 다 "계속 돌려"로 같지만,
// 상태가 한 번 바뀌어 주는 것만으로 체감 대기가 줄어든다.
const label = computed(() =>
  props.job.status === 'PENDING'
    ? '자취방정식을 세우는 중이에요'
    : '취향에 딱 맞게 자취방정식을 대입중이에요',
)
</script>

<template>
  <!-- 시안: 지도가 비쳐 보이는 반투명 흰 카드. 흐림(blur)은 쓰지 않는다 —
       시안에서도 아래 지도 글자가 또렷하게 읽힌다. -->
  <div class="rounded-card bg-white/80 p-4 shadow-lg">
    <p class="text-center text-sm font-bold text-slate-900">{{ label }} 👀</p>
    <div
      class="mt-2 h-5 overflow-hidden rounded-full bg-slate-200/60"
      role="progressbar"
      :aria-valuenow="Math.round(percent)"
      aria-valuemin="0"
      aria-valuemax="100"
      :aria-label="label"
    >
      <!-- 그라디언트는 채움 막대 자신에게 건다. 시안에서도 채운 구간 안에서
           민트→파랑이 다 돌기 때문에, 막대가 자랄수록 색이 늘어나는 게 맞다. -->
      <div
        class="h-full rounded-full bg-linear-to-r/srgb from-brand-500 to-accent-500 transition-[width] duration-500 ease-out"
        :style="{ width: `${percent}%` }"
      />
    </div>
  </div>
</template>
