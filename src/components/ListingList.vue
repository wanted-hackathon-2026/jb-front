<script setup lang="ts">
import { computed, onActivated, ref, useTemplateRef, watch } from 'vue'
import { useElementSize } from '@vueuse/core'
import BaseEmptyState from './BaseEmptyState.vue'
import BaseErrorState from './BaseErrorState.vue'
import BaseSkeleton from './BaseSkeleton.vue'
import ListingCard from './ListingCard.vue'
import ListingSortSheet from './ListingSortSheet.vue'
import { SORT_LABELS, type SortKey } from '@/lib/listing-sort'
import type { Listing } from '@/types/domain'

const props = defineProps<{
  /** 지금까지 받아온 매물. **이미 정렬된 상태로 온다** — 여기서 다시 줄 세우지 않는다. */
  listings: Listing[]
  /** 목록을 받아오는 중. */
  loading?: boolean
  /**
   * 받아오다 실패했나. **빈 목록과 구분해야 한다** — 실패를 "매물이 없어요"로 보여주면
   * 이 동네에 매물이 없다는 거짓말이 된다.
   */
  failed?: boolean
  /** 머리말의 '총 N건'. 없으면 받아온 개수로 적는다. */
  total?: number
  /**
   * 로딩 중 '총 N건 · 정렬' 줄의 자리를 미리 잡을지.
   *
   * 그 줄은 점수가 있을 때만 뜨는데(아래 hasScores), 빈 배열로 기다리는 동안에는
   * 점수가 붙어 올지 알 수 없다. 아는 건 부르는 쪽이다 — 거점이 있으면 점수가 온다.
   * 안 넘기면 목록이 도착하는 순간 그 줄이 생겨 목록 전체가 한 줄만큼 내려앉는다.
   */
  scoredWhenLoaded?: boolean
  /** 추천 결과 목록이면 그 추천의 id — 카드가 어느 상세로 갈지 정한다. */
  recommendationId?: string
}>()

const emit = defineEmits<{ retry: [] }>()

/**
 * 정렬 키. **고르기만 하고 줄 세우진 않는다** — 목록을 통째로 들고 있는 부모가
 * 정렬해서 내려준다(`lib/listing-sort.ts`).
 */
const sort = defineModel<SortKey>('sort', { default: 'score' })

/** 점수가 붙어 있으면 추천 결과 목록, 없으면 그냥 매물 조회 목록이다. */
const hasScores = computed(() => props.listings.some((l) => l.score !== null))
const options: SortKey[] = ['score', 'commute', 'priceAsc', 'priceDesc']

const picking = ref(false)
const trigger = ref<HTMLButtonElement | null>(null)

/** 시트를 닫을 땐 열었던 버튼으로 포커스를 돌려준다. */
function close() {
  picking.value = false
  trigger.value?.focus()
}

function choose(key: SortKey) {
  if (key !== sort.value) {
    // 순서가 통째로 바뀌므로 중간에 서 있으면 바뀐 1등을 못 본다. 맨 위로 돌려놓는다.
    scroller.value?.scrollTo({ top: 0 })
    sort.value = key
  }
  close()
}

/** 이 목록은 **자기 스크롤 영역** 안에서 움직인다(아래 overflow-y-auto). */
const scroller = useTemplateRef<HTMLElement>('scroller')

/*
 * 되돌아왔을 때의 스크롤.
 *
 * 살아남는 화면에서만 뜻이 있다(App.vue 의 KeepAlive) — 상세를 열었다 닫으면 목록은
 * 그대로인데 맨 위로 튄다. KeepAlive 는 DOM 을 떼어 보관하고, 떼어낸 순간 scrollTop 은
 * 0 이 되기 때문이다. 그래서 **떠날 때 읽지 않고** 스크롤하는 동안 계속 적어 둔다.
 *
 * ref 가 아니라 그냥 변수다 — 그리는 데 쓰지 않으므로 반응형일 이유가 없다.
 */
let parkedTop = 0
const rememberTop = () => {
  parkedTop = scroller.value?.scrollTop ?? 0
}

onActivated(() => {
  if (scroller.value) scroller.value.scrollTop = parkedTop
})

// 목록을 처음부터 다시 받는 중이면(정렬 변경·다른 추천) 옛 자리는 버린다.
watch(
  () => props.loading,
  (waiting) => {
    if (waiting) parkedTop = 0
  },
)

/**
 * 첫 로딩 골격의 개수. 스크롤 칸 높이를 재서 채운다 — 개수를 고정하면 그보다 긴
 * 화면에서 아래가 빈다(셸은 폭만 480px 로 고정되고 높이는 dvh 라 상한이 없다).
 * 100 = py-2.5 20 + 썸네일 80. 화면을 덮을 만큼만 깔면 되므로 상한을 12로 둔다.
 */
const { height: scrollerHeight } = useElementSize(scroller)
const skeletonCount = computed(() =>
  Math.min(12, Math.max(4, Math.ceil(scrollerHeight.value / 100))),
)
</script>

<template>
  <div class="flex flex-col">
    <!--
      집계·정렬 줄은 점수가 있을 때만 둔다.
      시안이 그렇게 나뉜다 — 추천 결과 화면(39-2654)에는 '총 34건 / 매칭점수순' 이 있고,
      거점 없이 보는 매물 조회 화면(39-3373)에는 탭 바로 아래가 카드다.
    -->
    <div
      v-if="hasScores || (loading && scoredWhenLoaded)"
      class="flex shrink-0 items-center justify-between px-5"
    >
      <!-- 로딩 중에도 같은 높이를 차지해야 한다. 높이를 정하는 건 오른쪽 버튼(min-h-11)이다. -->
      <template v-if="loading">
        <BaseSkeleton class="h-4 w-16" />
        <span class="flex min-h-11 items-center"><BaseSkeleton class="h-4 w-20" /></span>
      </template>
      <p v-else class="text-sm text-slate-500">총 {{ total ?? listings.length }}건</p>
      <!-- 여백(-mr-2 px-2)으로 터치 표적을 44px 로 넓히고 시안의 오른쪽 정렬은 유지한다. -->
      <button
        v-if="listings.length && !loading"
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
        {{ SORT_LABELS[sort] }}
      </button>
    </div>

    <div
      ref="scroller"
      class="min-h-0 flex-1"
      :class="loading ? 'overflow-hidden' : 'overflow-y-auto'"
      @scroll.passive="rememberTop"
    >
      <!--
        로딩은 카드와 **같은 골격**으로 깐다(px-5·py-2.5·썸네일 80·도넛 64).
        글자 한 줄로 두면 목록이 도착하는 순간 높이가 달라져 화면이 튄다.
        개수는 칸 높이에서 나온다(skeletonCount) — 고정하면 긴 화면에서 아래가 빈다.
        폭은 비율로 준다 — 320px 에서 본문에 남는 폭이 112px 뿐이라(README) 고정폭을
        박으면 그 칸을 넘는다.
      -->
      <template v-if="loading">
        <p class="sr-only" role="status">매물을 불러오는 중</p>
        <ul class="px-5" aria-hidden="true">
          <li v-for="i in skeletonCount" :key="i" class="flex gap-3 py-2.5">
            <BaseSkeleton class="size-20 shrink-0 rounded-xl!" />
            <div class="flex min-w-0 flex-1 flex-col gap-2 pt-1">
              <BaseSkeleton class="h-4 w-2/3" />
              <BaseSkeleton class="h-3 w-full" />
              <BaseSkeleton class="h-3 w-4/5" />
              <BaseSkeleton class="h-3 w-1/2" />
            </div>
            <BaseSkeleton class="size-16 shrink-0 rounded-full!" />
          </li>
        </ul>
      </template>
      <!-- 빈 목록의 조판은 마이페이지의 빈 탭과 같은 컴포넌트다 — 앱 안에서 '아직 없다'는
           한 가지 모습으로만 말한다. -->
      <!--
        실패가 먼저다. 빈 상태보다 앞서야 "못 받은 것"이 "없는 것"으로 둔갑하지 않는다.
      -->
      <BaseErrorState
        v-else-if="failed && !listings.length"
        title="매물을 불러오지 못했어요"
        @retry="emit('retry')"
      />
      <BaseEmptyState
        v-else-if="!listings.length"
        title="조건에 맞는 매물이 없어요"
        hint="검색 필터를 넓혀보세요"
      />
      <!--
        보던 목록은 있는데 갱신이 실패했다(지도를 옮기다 한 번 실패). 목록을 지우면
        화면이 통째로 날아가므로 그대로 두고, 낡았다는 사실만 위에 얹는다.
      -->
      <p
        v-if="failed && listings.length"
        class="mx-5 mb-2 flex items-center justify-between gap-2 rounded-xl bg-slate-100 px-3 py-2 text-sm text-slate-500"
      >
        <span>최신 목록을 못 받았어요</span>
        <button type="button" class="shrink-0 font-semibold text-brand-500" @click="emit('retry')">
          다시 시도
        </button>
      </p>

      <!-- 카드 사이에 선을 긋지 않는다 — 시안은 썸네일과 여백만으로 한 장을 가른다. -->
      <ul v-else class="px-5">
        <li v-for="l in listings" :key="l.id">
          <!-- 첫 진입 안내가 점수 읽는 법을 설명할 때 이 중 하나를 골라 짚는다. -->
          <ListingCard :listing="l" :recommendation-id="recommendationId" data-tour="listing" />
        </li>

        <!-- 끝까지 봤다는 말. 목록이 갑자기 끊기면 덜 불러온 줄 안다. -->
        <li
          v-if="listings.length"
          class="py-6 text-center text-sm text-slate-400"
          aria-hidden="true"
        >
          매물을 모두 봤어요
        </li>
      </ul>
    </div>

    <ListingSortSheet
      v-if="picking"
      :options="options"
      :active="sort"
      @choose="choose"
      @close="close"
    />
  </div>
</template>
