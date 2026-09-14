<script setup lang="ts">
import { computed } from 'vue'
import { lineBadge, lineColor, NEUTRAL_LINE } from '@/lib/subway'
import type { RouteLeg } from '@/types/domain'

/**
 * 시안의 '이동 동선' 막대.
 *
 * 구간 길이는 소요 시간에 비례한다. 다만 그대로 비례시키면 2분짜리 환승 구간이
 * 글자도 못 넣을 만큼 얇아져서, 칸마다 최소 폭을 준 뒤 남는 폭을 시간 비율로 나눈다.
 */
const props = defineProps<{ legs: RouteLeg[] }>()

/** 동그라미가 칸 왼쪽 끝에 걸터앉으므로 그만큼은 항상 비워둬야 한다. */
const MIN_PERCENT = 9

const segments = computed(() => {
  const total = props.legs.reduce((sum, l) => sum + l.minutes, 0) || 1
  const free = Math.max(0, 100 - MIN_PERCENT * props.legs.length)
  return props.legs.map((leg) => ({
    leg,
    color: leg.mode === 'subway' || leg.mode === 'bus' ? lineColor(leg.line) : NEUTRAL_LINE,
    ride: leg.mode === 'subway' || leg.mode === 'bus',
    // 환승은 '어디'가 아니라 '사이'다 — 시안에서도 회색 틈만 있고 동그라미가 없다.
    node: leg.mode !== 'transfer',
    percent: MIN_PERCENT + (leg.minutes / total) * free,
  }))
})

/** 아래 정류 표시는 환승 구간을 건너뛴다 — 환승은 '어디'가 아니라 '사이'다. */
const stops = computed(() => props.legs.filter((l) => l.stop))
</script>

<template>
  <div>
    <!-- 막대. 칸마다 왼쪽 끝에 동그라미가 걸터앉는다. -->
    <div class="flex h-5 items-center">
      <div
        v-for="(s, i) in segments"
        :key="i"
        class="relative flex h-3 items-center justify-center rounded-full"
        :style="{ width: `${s.percent}%`, background: s.ride ? s.color : 'var(--color-slate-200)' }"
      >
        <span
          v-if="s.node"
          class="absolute -left-0.5 grid size-5 place-items-center rounded-full text-[10px] font-bold ring-2 ring-white"
          :style="
            s.ride
              ? { background: s.color, color: '#fff' }
              : { background: '#fff', color: 'var(--color-slate-400)' }
          "
        >
          <template v-if="s.ride">{{ lineBadge(s.leg.line) }}</template>
          <!-- 도보·환승은 숫자 대신 걷는 사람 -->
          <svg v-else viewBox="0 0 16 16" class="size-3" fill="currentColor" aria-hidden="true">
            <circle cx="9" cy="2.4" r="1.6" />
            <path
              d="M8.2 4.6 6 6.1c-.4.3-.6.7-.6 1.2v2.3h1.6V7.9l1.3-.8-.6 2.5 2 2.1v3.1h1.6v-3.7l-1.7-1.8.6-2.4 1 1.5h2v-1.5h-1.2l-1-1.6c-.4-.6-1-.9-1.6-.9-.4 0-.8.1-1.2.3Z"
            />
            <path d="M4.6 12.1 3.4 15.6h1.7l1-2.8-1.5-1.6v.9Z" />
          </svg>
        </span>
        <span
          class="truncate text-[10px] font-semibold"
          :class="[s.node ? 'ml-3' : '', s.ride ? 'text-white' : 'text-slate-500']"
        >
          {{ s.leg.minutes }}분
        </span>
      </div>
    </div>

    <!-- 정류 표시. 칸 수가 아니라 정류 수로 나눠 고르게 편다. -->
    <ol class="mt-3 flex items-start">
      <template v-for="(stop, i) in stops" :key="i">
        <!-- 정류 사이를 잇는 선. 한 경로라는 걸 보여준다. -->
        <li v-if="i > 0" class="mx-2 mt-4 h-px min-w-3 flex-1 bg-slate-200" aria-hidden="true" />
        <li class="flex min-w-0 shrink items-start gap-1.5">
          <span
            class="mt-0.5 shrink-0"
            :style="{ color: stop.line ? lineColor(stop.line) : 'var(--color-slate-400)' }"
            aria-hidden="true"
          >
            <svg v-if="stop.line" viewBox="0 0 16 16" class="size-4" fill="currentColor">
              <rect x="3" y="1.5" width="10" height="9.5" rx="2" />
              <path d="M4.2 11.8 2.6 14.5h2l1.2-2.1zM11.8 11.8l1.6 2.7h-2l-1.2-2.1z" />
            </svg>
            <svg v-else viewBox="0 0 16 16" class="size-4" fill="currentColor">
              <circle cx="9" cy="2.4" r="1.6" />
              <path
                d="M8.2 4.6 6 6.1c-.4.3-.6.7-.6 1.2v2.3h1.6V7.9l1.3-.8-.6 2.5 2 2.1v3.1h1.6v-3.7l-1.7-1.8.6-2.4 1 1.5h2v-1.5h-1.2l-1-1.6c-.4-.6-1-.9-1.6-.9-.4 0-.8.1-1.2.3Z"
              />
              <path d="M4.6 12.1 3.4 15.6h1.7l1-2.8-1.5-1.6v.9Z" />
            </svg>
          </span>
          <span class="min-w-0">
            <span
              class="block truncate text-xs font-bold"
              :style="{ color: stop.line ? lineColor(stop.line) : 'var(--color-slate-400)' }"
            >
              {{ stop.line ?? '하차' }}
            </span>
            <span class="block truncate text-sm text-slate-700">{{ stop.stop }}</span>
          </span>
        </li>
      </template>
    </ol>
  </div>
</template>
