<script setup lang="ts">
import BaseSpinner from './BaseSpinner.vue'
import BaseRangeSlider from '@/components/BaseRangeSlider.vue'
import BaseWeightSlider from '@/components/BaseWeightSlider.vue'
import { formatMoney } from '@/lib/format'
import { LIFESTYLE_AXES } from '@/lib/lifestyle'
import { TRANSPORTS } from '@/lib/transport'
import { DEPOSIT_RANGE, MINUTES_RANGE, RENT_RANGE, useFiltersStore } from '@/stores/filters'
import type { DealType } from '@/types/domain'

const filters = useFiltersStore()

defineProps<{ submitting?: boolean }>()
defineEmits<{ submit: [] }>()

const DEALS: { value: DealType; label: string }[] = [
  { value: 'monthly', label: '월세' },
  { value: 'jeonse', label: '전세' },
  { value: 'sale', label: '매매' },
]
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
        <span class="text-sm font-semibold text-brand-500">
          {{ formatMoney(filters.deposit[0]) }} ~ {{ formatMoney(filters.deposit[1]) }}
        </span>
      </div>
      <BaseRangeSlider v-model="filters.deposit" v-bind="DEPOSIT_RANGE" label="보증금" />
    </section>

    <section data-tour="conditions" v-if="filters.hasRent">
      <div class="mb-2 flex items-baseline justify-between">
        <h3 class="font-bold text-slate-900">월세</h3>
        <span class="text-sm font-semibold text-brand-500">
          {{ filters.rent[0] }}만원 ~ {{ filters.rent[1] }}만원
        </span>
      </div>
      <BaseRangeSlider v-model="filters.rent" v-bind="RENT_RANGE" label="월세" />
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
        <span class="ml-auto shrink-0 text-sm font-semibold text-brand-500">
          최대 {{ filters.maxMinutes }}분
        </span>
      </div>
      <BaseWeightSlider
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
        <BaseWeightSlider
          v-for="item in LIFESTYLE_AXES"
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
        class="flex h-14 w-full items-center justify-center gap-2 rounded-full bg-brand-500 text-base font-bold text-white disabled:opacity-50"
        :disabled="submitting"
        :aria-busy="submitting"
        @click="$emit('submit')"
      >
        <!-- 글자만 바꾸면 눌린 건지 멈춘 건지 알 수 없다. 도는 것이 있어야 '받는 중'이 된다. -->
        <BaseSpinner v-if="submitting" />
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
