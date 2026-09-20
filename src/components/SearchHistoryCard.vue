<script setup lang="ts">
import { computed } from 'vue'
import { formatDay, formatDeposit, formatMinutes } from '@/lib/format'
import { IMPORTANCE_RANGE, LIFESTYLE_AXES, importanceLabel } from '@/lib/lifestyle'
import { transportLabel } from '@/lib/transport'
import type { SearchHistoryEntry } from '@/types/domain'

/** 시안 172-522 — 그때 어떤 조건으로 돌렸는지를 한 장에 담는다. */
const props = defineProps<{
  entry: SearchHistoryEntry
  /**
   * 날짜를 이 장에 찍을지. 시안은 날짜가 카드마다가 아니라 **그날의 머리글**이라,
   * 같은 날 두 번 돌린 기록에서는 둘째 장부터 날짜가 없다. 판정은 목록이 한다
   * (앞 장과 같은 날인지 알아야 하는데, 카드는 제 것만 안다).
   */
  showDate?: boolean
  /**
   * 그때 고른 매물유형. **서버 기록에는 없는 값**이라(`SearchHistoryEntry`) 넘기는
   * 쪽에서만 채운다 — 지도 시트가 되읽는 추천 조건에는 있다.
   * 빈 배열은 '안 골랐다' = 전체다(lib/recommendation-request.ts 와 같은 약속).
   */
  roomTypes?: readonly string[]
}>()

const date = computed(() => formatDay(props.entry.createdAt))

/**
 * 보증금·월세·가중치는 **없을 수 있다.** 서버의 기록 목록이 거점·이동수단·이동시간만
 * 주기 때문이다(`SearchHistoryEntry`). 없으면 그 줄을 지어내지 않고 접는다 —
 * "0원 ~ 0원" 이나 빈 막대를 그리면 그때 그렇게 골랐다는 거짓말이 된다.
 */
const depositText = computed(() => {
  const v = props.entry.deposit
  return v ? `${formatDeposit(v[0])} ~ ${formatDeposit(v[1])}` : null
})
// 앞 숫자에도 단위를 붙인다 — '원' 이면 10 이 들어왔을 때 "10원 ~ 40만원" 이 된다.
const rentText = computed(() => {
  const v = props.entry.rent
  return v ? `${v[0]}만원 ~ ${v[1]}만원` : null
})

/** 끝나지 않았거나 실패한 기록임을 알리는 배지. 완료된 것에는 달지 않는다. */
const STATUS_BADGE: Partial<Record<NonNullable<SearchHistoryEntry['status']>, string>> = {
  PENDING: '대기 중',
  PROCESSING: '추천 중',
  FAILED: '실패',
}
const statusBadge = computed(() =>
  props.entry.status ? STATUS_BADGE[props.entry.status] : undefined,
)
</script>

<template>
  <article class="py-5">
    <div v-if="showDate || statusBadge" class="flex items-center gap-2">
      <h3 v-if="showDate" class="font-bold text-slate-900">{{ date }}</h3>
      <!-- 끝나지 않았거나 실패한 기록은 완료된 것과 같아 보이면 안 된다. -->
      <span
        v-if="statusBadge"
        class="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-500"
      >
        {{ statusBadge }}
      </span>
    </div>

    <!--
      거점: 여럿이면 몇 번째였는지가 순위라서 번호를 붙인다. 지금은 거점이 하나뿐이라
      (stores/anchors.ts 의 MAX_ANCHORS) 번호가 붙을 일이 없지만, 한도가 1 이 되기 전에
      남은 기록은 여전히 여럿을 들고 있어서 분기를 남겨 둔다. MapView 의 이름표와 같은 규칙.
    -->
    <ul class="flex flex-col gap-1.5" :class="showDate && 'mt-3'">
      <li v-for="(name, i) in entry.anchorNames" :key="name" class="flex items-center gap-2">
        <span class="rounded-full bg-brand-500 px-2 py-0.5 text-xs font-bold text-white">
          거점<template v-if="entry.anchorNames.length > 1"> {{ i + 1 }}</template>
        </span>
        <span class="min-w-0 truncate text-sm font-semibold text-slate-900">{{ name }}</span>
      </li>
    </ul>

    <dl class="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2">
      <div v-if="depositText" class="flex items-center gap-2">
        <dt class="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500">보증금</dt>
        <dd class="text-sm text-slate-700">{{ depositText }}</dd>
      </div>
      <div v-if="rentText" class="flex items-center gap-2">
        <dt class="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500">월세</dt>
        <dd class="text-sm text-slate-700">{{ rentText }}</dd>
      </div>
      <div v-if="roomTypes" class="flex items-center gap-2">
        <dt class="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500">매물유형</dt>
        <dd class="text-sm text-slate-700">
          {{ roomTypes.length ? roomTypes.join(' · ') : '전체' }}
        </dd>
      </div>
      <div class="flex items-center gap-2">
        <dt class="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500">거점 이동시간</dt>
        <!-- 시안은 수단보다 '최대 N분' 을 굵게 둔다 — 조건을 좁힌 쪽이 그 값이다. -->
        <dd class="text-sm text-slate-700">
          {{ transportLabel(entry.transport) }} |
          <span class="font-semibold">최대 {{ formatMinutes(entry.maxMinutes) }}</span>
        </dd>
      </div>
    </dl>

    <!--
      가중치는 슬라이더가 아니라 '그때 이랬다'는 기록이라 읽기 전용 막대다.
      축 순서·이름은 필터 시트와 같은 테이블을 본다.
      값은 1~5 눈금이라(IMPORTANCE_RANGE) 막대 길이로 쓰려면 백분율로 편다 —
      예전처럼 값을 그대로 %로 두면 5 가 5% 짜리 막대가 된다.
    -->
    <ul v-if="entry.lifestyle" class="mt-3 flex flex-col gap-1.5">
      <li v-for="axis in LIFESTYLE_AXES" :key="axis.key" class="flex items-center gap-2">
        <span
          class="w-12 shrink-0 rounded-full bg-slate-100 py-0.5 text-center text-xs text-slate-500"
        >
          {{ axis.label }}
        </span>
        <span class="h-2 flex-1 overflow-hidden rounded-full bg-slate-200">
          <span
            class="block h-full rounded-full bg-slate-400"
            :style="{ width: `${(entry.lifestyle![axis.key] / IMPORTANCE_RANGE.max) * 100}%` }"
          />
        </span>
        <span class="w-16 shrink-0 text-right text-sm text-slate-500">
          {{ importanceLabel(entry.lifestyle![axis.key]) }}
        </span>
      </li>
    </ul>
  </article>
</template>
