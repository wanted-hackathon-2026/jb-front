<script setup lang="ts">
import { computed } from 'vue'
import { formatMoney } from '@/lib/format'
import { LIFESTYLE_AXES } from '@/lib/lifestyle'
import { transportLabel } from '@/lib/transport'
import type { SearchHistoryEntry } from '@/types/domain'

/** 시안 172-522 — 그때 어떤 조건으로 돌렸는지를 한 장에 담는다. */
const props = defineProps<{ entry: SearchHistoryEntry }>()

/** 시안은 "2026. 8. 21" 형태다. */
const date = computed(() =>
  new Intl.DateTimeFormat('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' }).format(
    new Date(props.entry.createdAt),
  ),
)

const depositText = computed(
  () => `${formatMoney(props.entry.deposit[0])} ~ ${formatMoney(props.entry.deposit[1])}`,
)
const rentText = computed(() => `${props.entry.rent[0]}원 ~ ${props.entry.rent[1]}만원`)
</script>

<template>
  <article class="py-5">
    <h3 class="font-bold text-slate-900">{{ date }}</h3>

    <!-- 거점: 몇 번째 거점이었는지가 순위라서 번호를 함께 보여준다. -->
    <ul class="mt-3 flex flex-col gap-1.5">
      <li v-for="(name, i) in entry.anchorNames" :key="name" class="flex items-center gap-2">
        <span class="rounded-full bg-brand-500 px-2 py-0.5 text-xs font-bold text-white">
          거점 {{ i + 1 }}
        </span>
        <span class="min-w-0 truncate text-sm font-semibold text-slate-900">{{ name }}</span>
      </li>
    </ul>

    <dl class="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2">
      <div class="flex items-center gap-2">
        <dt class="rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-500">보증금</dt>
        <dd class="text-sm text-slate-700">{{ depositText }}</dd>
      </div>
      <div class="flex items-center gap-2">
        <dt class="rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-500">월세</dt>
        <dd class="text-sm text-slate-700">{{ rentText }}</dd>
      </div>
      <div class="flex items-center gap-2">
        <dt class="rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-500">거점 이동시간</dt>
        <dd class="text-sm text-slate-700">
          {{ transportLabel(entry.transport) }} | 최대 {{ entry.maxMinutes }}분
        </dd>
      </div>
    </dl>

    <!--
      가중치는 슬라이더가 아니라 '그때 이랬다'는 기록이라 읽기 전용 막대다.
      축 순서·이름은 필터 시트와 같은 테이블을 본다.
    -->
    <ul class="mt-3 flex flex-col gap-1.5">
      <li v-for="axis in LIFESTYLE_AXES" :key="axis.key" class="flex items-center gap-2">
        <span class="w-12 shrink-0 rounded bg-slate-100 py-0.5 text-center text-xs text-slate-500">
          {{ axis.label }}
        </span>
        <span class="h-2 flex-1 overflow-hidden rounded-full bg-slate-200">
          <span
            class="block h-full rounded-full bg-slate-400"
            :style="{ width: `${entry.lifestyle[axis.key]}%` }"
          />
        </span>
        <span class="w-10 shrink-0 text-right text-sm text-slate-500">
          {{ entry.lifestyle[axis.key] }}점
        </span>
      </li>
    </ul>
  </article>
</template>
