<script setup lang="ts">
import { computed } from 'vue'
import BaseSpinner from './BaseSpinner.vue'
import BaseRangeSlider from '@/components/BaseRangeSlider.vue'
import BaseWeightSlider from '@/components/BaseWeightSlider.vue'
import { formatDeposit, formatMinutes } from '@/lib/format'
import { IMPORTANCE_RANGE, LIFESTYLE_AXES, importanceLabel } from '@/lib/lifestyle'
import { TRANSPORTS } from '@/lib/transport'
import { DEPOSIT_RANGE, MINUTES_RANGE, RENT_RANGE, useFiltersStore } from '@/stores/filters'
import { useAnchorsStore } from '@/stores/anchors'
import type { DealType } from '@/types/domain'

const filters = useFiltersStore()
const anchors = useAnchorsStore()

defineProps<{ submitting?: boolean }>()
defineEmits<{ submit: []; pickAnchor: [] }>()

/**
 * 거점이 없으면 이동시간 절을 잠근다.
 *
 * 서버는 거점 없는 추천을 받지 못한다 — 검증이 `workplaceId` 와 `workplace` 중
 * **정확히 하나**를 요구하고(RecommendationCreateRequest), 후보 선정 자체가 거점
 * 좌표에서 반경을 잡아 뽑는다(RecommendationProcessor.findCandidates).
 *
 * 그래서 예전에는 '적용'을 누른 **뒤에** 토스트로 거부했다. 조건을 다 맞춰 놓고
 * 마지막에 안 된다는 걸 아는 순서라 가장 늦게 알려주는 모양이었다. 잠가서 **누르기
 * 전에** 알린다.
 *
 * 백엔드가 거점 없는 추천을 받게 되면 이 값만 지우면 된다 — 잠금이 전부 여기서 나온다.
 */
const needsAnchor = computed(() => !anchors.hasAnchors)

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

    <!--
      매물 유형. 거래유형과 달리 **아무것도 안 고른 상태가 기본**이고 그게 '전체'다 —
      서버는 빈 목록을 400 으로 막지만, 그 변환은 화면이 아니라
      lib/recommendation-request.ts 가 맡는다.
      칩은 여섯 개라 한 줄에 안 들어간다. flex-wrap 으로 흘리면 마지막 줄에 혼자
      남는 칩이 남은 폭을 다 먹어 '빌라'만 길어지므로, 3열 그리드로 두 줄에 나눠
      폭을 균일하게 둔다.
    -->
    <section>
      <h3 class="mb-3 font-bold text-slate-900">
        매물유형
        <span class="text-sm font-normal text-slate-500">
          {{ filters.roomTypes.length ? '중복선택 가능' : '전체' }}
        </span>
      </h3>
      <div class="grid grid-cols-3 gap-2">
        <button
          v-for="t in filters.allRoomTypes"
          :key="t"
          type="button"
          class="h-11 rounded-full border px-3 text-sm font-semibold transition-colors"
          :class="
            filters.roomTypes.includes(t)
              ? 'border-brand-500 bg-brand-500 text-white'
              : 'border-slate-200 bg-white text-slate-600'
          "
          :aria-pressed="filters.roomTypes.includes(t)"
          @click="filters.toggleRoomType(t)"
        >
          {{ t }}
        </button>
      </div>
    </section>

    <section>
      <div class="mb-2 flex items-baseline justify-between">
        <h3 class="font-bold text-slate-900">보증금</h3>
        <span class="text-sm font-semibold text-brand-500">
          {{ formatDeposit(filters.deposit[0]) }} ~ {{ formatDeposit(filters.deposit[1]) }}
        </span>
      </div>
      <BaseRangeSlider v-model="filters.deposit" v-bind="DEPOSIT_RANGE" label="보증금" />
    </section>

    <section v-if="filters.hasRent" data-tour="conditions">
      <div class="mb-2 flex items-baseline justify-between">
        <h3 class="font-bold text-slate-900">월세</h3>
        <span class="text-sm font-semibold text-brand-500">
          {{ filters.rent[0] }}만원 ~ {{ filters.rent[1] }}만원
        </span>
      </div>
      <BaseRangeSlider v-model="filters.rent" v-bind="RENT_RANGE" label="월세" />
    </section>

    <section data-tour="conditions">
      <!--
        '최대 N분'은 칩과 같은 줄에 있었는데, 이동수단이 넷이 되면서 320px 한 줄에
        들어가지 않는다. 보증금·월세 절이 이미 쓰는 '제목 줄 오른쪽에 현재값' 배치로 옮긴다.
      -->
      <div class="mb-3 flex items-baseline justify-between">
        <h3 class="font-bold text-slate-900">거점 이동시간</h3>
        <!-- 잠겼을 때 값만 또렷하면 고를 수 있는 것처럼 보인다 — 아래 조작부와 같이 흐려진다. -->
        <span class="text-sm font-semibold text-brand-500" :class="needsAnchor ? 'opacity-40' : ''">
          최대 {{ formatMinutes(filters.maxMinutes) }}
        </span>
      </div>
      <!--
        거점이 없으면 이 절을 잠근다. 흐리게만 두면 눌리는데 반응이 없어 고장으로 보이므로
        입력 자체를 막고(`disabled`·`pointer-events-none`), 보조기기에도 알린다.
      -->
      <div
        :class="needsAnchor ? 'pointer-events-none opacity-40' : ''"
        :aria-disabled="needsAnchor"
      >
        <!--
          칩이 넷이라 가로로 늘어놓으면 320px 을 넘는다('대중교통'만 글자폭 56px).
          매물유형과 같이 그리드로 폭을 나눠 네 칸을 균일하게 둔다 — 칸이 폭을 정하므로
          칩에서 좌우 패딩을 뺀다.
        -->
        <div class="mb-3 grid grid-cols-4 gap-2">
          <button
            v-for="t in TRANSPORTS"
            :key="t.value"
            type="button"
            class="h-9 rounded-full text-sm font-semibold transition-colors"
            :class="
              filters.transport === t.value
                ? 'bg-brand-500 text-white'
                : 'bg-slate-100 text-slate-600'
            "
            :aria-pressed="filters.transport === t.value"
            :disabled="needsAnchor"
            @click="filters.transport = t.value"
          >
            {{ t.label }}
          </button>
        </div>
        <BaseWeightSlider
          v-model="filters.maxMinutes"
          label="거점까지 최대 이동시간"
          bare
          v-bind="MINUTES_RANGE"
        />
      </div>

      <!--
        안내는 잠근 것 **바로 아래** 둔다. 토스트로 띄우면 화면 위쪽에 떴다 사라져서
        무엇이 왜 잠겼는지와 이어지지 않는다. 다음에 할 일(거점 선택)까지 여기 둔다 —
        문구만 있으면 막다른 길이다.
      -->
      <p
        v-if="needsAnchor"
        class="mt-3 flex items-center justify-between gap-2 rounded-xl bg-slate-100 px-3 py-2.5 text-sm text-slate-500"
      >
        <span class="min-w-0">거점을 선택하면 통근시간으로도 걸러드려요</span>
        <button
          type="button"
          class="shrink-0 font-semibold text-brand-500"
          @click="$emit('pickAnchor')"
        >
          거점 선택
        </button>
      </p>
    </section>

    <section data-tour="conditions">
      <h3 class="mb-3 font-bold text-slate-900">라이프스타일</h3>
      <div class="flex flex-col gap-4">
        <!--
          눈금은 서버와 같은 1~5 다. 다섯 칸뿐이라 숫자만 적으면 '3' 이 무슨 뜻인지
          알 수 없어, 값 자리에는 단 이름을 적는다.
        -->
        <BaseWeightSlider
          v-for="item in LIFESTYLE_AXES"
          :key="item.key"
          v-model="filters.lifestyle[item.key]"
          :icon="item.icon"
          :label="item.label"
          :hint="item.hint"
          :value-text="importanceLabel(filters.lifestyle[item.key])"
          v-bind="IMPORTANCE_RANGE"
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
        :disabled="submitting || needsAnchor"
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
