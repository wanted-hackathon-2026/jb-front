<script setup lang="ts">
import RangeSlider from '@/components/ui/RangeSlider.vue'
import WeightSlider from '@/components/ui/WeightSlider.vue'
import { formatMoney } from '@/lib/format'
import { DEPOSIT_RANGE, MINUTES_RANGE, RENT_RANGE, useFiltersStore } from '@/stores/filters'
import type { DealType, TransportMode } from '@/types/domain'

const filters = useFiltersStore()

defineProps<{ submitting?: boolean }>()
defineEmits<{ submit: [] }>()

const DEALS: { value: DealType; label: string }[] = [
  { value: 'monthly', label: '월세' },
  { value: 'jeonse', label: '전세' },
  { value: 'sale', label: '매매' },
]
const TRANSPORTS: { value: TransportMode; label: string }[] = [
  { value: 'transit', label: '대중교통' },
  { value: 'car', label: '자가용' },
  { value: 'walk', label: '도보' },
]
const LIFESTYLE = [
  {
    key: 'sunlight',
    icon: '🌤',
    label: '채광',
    hint: '방향·동간거리·주변 고층건물 유무 기반 일조량',
  },
  { key: 'safety', icon: '🚓', label: '치안', hint: 'CCTV 밀도·가로등·안심귀가길·경찰서 접근성' },
  {
    key: 'quietness',
    icon: '🔇',
    label: '조용함',
    hint: '대로변·철도·유흥가와의 이격거리, 주변 상권 밀집도',
  },
  {
    key: 'infrastructure',
    icon: '🏪',
    label: '편의',
    hint: '편의점·마트·병원·약국·공원 도보 접근성',
  },
] as const
</script>

<template>
  <div class="flex flex-col gap-7 px-5 pb-8">
    <section>
      <h3 class="mb-3 font-bold text-slate-900">
        거래유형 <span class="text-sm font-normal text-slate-500">중복선택 가능</span>
      </h3>
      <div class="flex gap-2">
        <button
          v-for="d in DEALS"
          :key="d.value"
          type="button"
          class="h-11 flex-1 rounded-full border text-sm font-semibold transition-colors"
          :class="
            filters.dealTypes.includes(d.value)
              ? 'border-brand-500 bg-brand-500 text-white'
              : 'border-slate-200 bg-white text-slate-600'
          "
          :aria-pressed="filters.dealTypes.includes(d.value)"
          @click="filters.toggleDealType(d.value)"
        >
          {{ d.label }}
        </button>
      </div>
    </section>

    <section>
      <div class="mb-2 flex items-baseline justify-between">
        <h3 class="font-bold text-slate-900">보증금</h3>
        <span class="text-sm font-semibold text-brand-600">
          {{ formatMoney(filters.deposit[0]) }} ~ {{ formatMoney(filters.deposit[1]) }}
        </span>
      </div>
      <RangeSlider v-model="filters.deposit" v-bind="DEPOSIT_RANGE" label="보증금" />
    </section>

    <section data-tour="conditions" v-if="filters.hasRent">
      <div class="mb-2 flex items-baseline justify-between">
        <h3 class="font-bold text-slate-900">월세</h3>
        <span class="text-sm font-semibold text-brand-600">
          {{ filters.rent[0] }}만원 ~ {{ filters.rent[1] }}만원
        </span>
      </div>
      <RangeSlider v-model="filters.rent" v-bind="RENT_RANGE" label="월세" />
    </section>

    <section data-tour="conditions">
      <h3 class="mb-3 font-bold text-slate-900">거점 이동시간</h3>
      <!-- 시안: 이동수단 칩과 '최대 N분'이 같은 줄에 있고, 슬라이더는 그 아래 전체 폭이다. -->
      <div class="mb-3 flex items-center gap-2">
        <button
          v-for="t in TRANSPORTS"
          :key="t.value"
          type="button"
          class="h-9 rounded-full px-4 text-sm font-semibold transition-colors"
          :class="
            filters.transport === t.value
              ? 'bg-brand-500 text-white'
              : 'bg-slate-100 text-slate-600'
          "
          :aria-pressed="filters.transport === t.value"
          @click="filters.transport = t.value"
        >
          {{ t.label }}
        </button>
        <span class="ml-auto shrink-0 text-sm font-semibold text-brand-600">
          최대 {{ filters.maxMinutes }}분
        </span>
      </div>
      <WeightSlider
        v-model="filters.maxMinutes"
        label="거점까지 최대 이동시간"
        bare
        v-bind="MINUTES_RANGE"
      />
    </section>

    <section data-tour="conditions">
      <div class="mb-3 flex items-baseline justify-between">
        <h3 class="font-bold text-slate-900">라이프스타일</h3>
      </div>
      <div class="flex flex-col gap-4">
        <WeightSlider
          v-for="item in LIFESTYLE"
          :key="item.key"
          v-model="filters.lifestyle[item.key]"
          :icon="item.icon"
          :label="item.label"
          :hint="item.hint"
        />
      </div>
    </section>

    <!--
      시안: 시트 맨 아래에 적용(채움) · 필터 초기화(테두리)를 쌓는다.
      초기화가 라이프스타일 헤더에 있을 때는 그 섹션만 되돌릴 것처럼 보였는데,
      실제로는 거래유형·보증금·월세·이동시간까지 전부 되돌린다. 맨 아래로 내려오면
      되돌리는 범위가 시트 전체라는 게 위치로 드러난다.
    -->
    <div class="flex flex-col gap-3">
      <button
        type="button"
        data-tour="apply"
        class="h-14 w-full rounded-full bg-brand-500 text-base font-bold text-white disabled:opacity-50"
        :disabled="submitting"
        @click="$emit('submit')"
      >
        {{ submitting ? '요청하는 중…' : '적용' }}
      </button>
      <button
        type="button"
        class="h-14 w-full rounded-full border border-slate-200 bg-white text-base font-bold text-slate-900"
        @click="filters.reset"
      >
        필터 초기화
      </button>
    </div>
  </div>
</template>
