<script setup lang="ts">
import { computed, ref } from 'vue'
import ListingCard from './ListingCard.vue'
import ListingSortSheet from './ListingSortSheet.vue'
import { SORT_LABELS, sortListings, type SortKey } from '@/lib/listing-sort'
import type { Listing } from '@/types/domain'

const props = defineProps<{
  listings: Listing[]
  loading?: boolean
  /** 추천 결과 목록이면 그 추천의 id — 카드가 어느 상세로 갈지 정한다. */
  recommendationId?: string
}>()

/**
 * 정렬은 이미 받아둔 목록을 프론트에서 다시 줄 세우는 것이다. 목록 API 가 생기면
 * 정렬 키를 서버로 넘기는 쪽으로 옮긴다(README '역할 분담' — 정렬은 백엔드 몫).
 */
/** 점수가 붙어 있으면 추천 결과 목록, 없으면 그냥 매물 조회 목록이다. */
const hasScores = computed(() => props.listings.some((l) => l.score !== null))
const options: SortKey[] = ['score', 'commute', 'priceAsc', 'priceDesc']

const active = ref<SortKey>('score')
const sorted = computed(() => sortListings(props.listings, active.value))

const picking = ref(false)
const trigger = ref<HTMLButtonElement | null>(null)

/** 시트를 닫을 땐 열었던 버튼으로 포커스를 돌려준다. */
function close() {
  picking.value = false
  trigger.value?.focus()
}

function choose(key: SortKey) {
  active.value = key
  close()
}
</script>

<template>
  <div class="flex flex-col">
    <!--
      집계·정렬 줄은 점수가 있을 때만 둔다.
      시안이 그렇게 나뉜다 — 추천 결과 화면(39-2654)에는 '총 34건 / 매칭점수순' 이 있고,
      거점 없이 보는 매물 조회 화면(39-3373)에는 탭 바로 아래가 카드다.
    -->
    <div v-if="hasScores" class="flex shrink-0 items-center justify-between px-5">
      <p class="text-sm text-slate-500">총 {{ listings.length }}건</p>
      <!-- 여백(-mr-2 px-2)으로 터치 표적을 44px 로 넓히고 시안의 오른쪽 정렬은 유지한다. -->
      <button
        v-if="listings.length"
        ref="trigger"
        data-tour="sort"
        type="button"
        class="-mr-2 flex min-h-11 items-center gap-1.5 px-2 text-sm text-slate-500"
        @click="picking = true"
      >
        <svg
          viewBox="0 0 20 20"
          class="size-[18px] shrink-0"
          fill="none"
          stroke="currentColor"
          stroke-width="1.6"
          aria-hidden="true"
        >
          <rect x="2.2" y="2.2" width="6.6" height="6.6" rx="1.4" />
          <rect x="2.2" y="11.2" width="6.6" height="6.6" rx="1.4" />
          <path
            d="M14 2.6v14.8M14 17.4l-2.6-2.8M14 17.4l2.6-2.8"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
        {{ SORT_LABELS[active] }}
      </button>
    </div>

    <div class="min-h-0 flex-1 overflow-y-auto">
      <p v-if="loading" class="px-5 py-10 text-center text-sm text-slate-400">
        매물을 불러오는 중…
      </p>
      <p v-else-if="!listings.length" class="px-5 py-10 text-center text-sm text-slate-400">
        조건에 맞는 매물이 없어요<br />검색 필터를 넓혀보세요
      </p>
      <ul v-else class="divide-y divide-slate-100 px-5">
        <li v-for="l in sorted" :key="l.id">
          <!-- 첫 진입 안내가 점수 읽는 법을 설명할 때 이 중 하나를 골라 짚는다. -->
          <ListingCard :listing="l" :recommendation-id="recommendationId" data-tour="listing" />
        </li>
      </ul>
    </div>

    <ListingSortSheet
      v-if="picking"
      :options="options"
      :active="active"
      @choose="choose"
      @close="close"
    />
  </div>
</template>
