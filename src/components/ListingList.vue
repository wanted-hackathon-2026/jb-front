<script setup lang="ts">
import { computed, ref, useTemplateRef } from 'vue'
import { useElementSize, useIntersectionObserver } from '@vueuse/core'
import BaseSkeleton from './BaseSkeleton.vue'
import ListingCard from './ListingCard.vue'
import ListingSortSheet from './ListingSortSheet.vue'
import { LISTING_PAGE_SIZE } from '@/lib/listing-paging'
import { SORT_LABELS, type SortKey } from '@/lib/listing-sort'
import type { Listing } from '@/types/domain'

const props = defineProps<{
  /** 지금까지 받아온 매물. **이미 정렬된 상태로 온다** — 여기서 다시 줄 세우지 않는다. */
  listings: Listing[]
  /** 첫 페이지를 기다리는 중. 다음 페이지는 `loadingMore` 다. */
  loading?: boolean
  /** 조건에 맞는 전체 건수. 없으면 받아온 개수로 적는다(페이지를 안 쓰는 호출부). */
  total?: number
  /** 더 받아올 게 남았나. 바닥 감지를 켤지 가르는 값이다. */
  hasNext?: boolean
  loadingMore?: boolean
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

const emit = defineEmits<{ loadMore: [] }>()

/**
 * 정렬 키. **고르기만 하고 줄 세우진 않는다** — 정렬은 페이지를 나눠 주는 서버가
 * 하고(mocks/listings.ts), 바뀌면 부모가 목록을 처음부터 다시 받는다.
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
    /*
     * 기준이 바뀌면 목록은 처음부터 다시 받는다(부모의 useListingPages). 스크롤을
     * 그대로 두면 새 1페이지의 중간에 서 있게 되는데, 바뀐 순서의 1등을 못 보는 데다
     * 바닥과 가까우면 그 자리에서 곧장 다음 장을 부른다. 맨 위로 돌려놓는다.
     */
    scroller.value?.scrollTo({ top: 0 })
    sort.value = key
  }
  close()
}

/*
 * 바닥 감지.
 *
 * 스크롤 이벤트를 세는 대신 목록 끝의 빈 표식이 보이는지로 판단한다 — 스크롤 위치
 * 계산은 카드 높이가 제각각이면 어긋나는데, 이건 '끝이 보이면'이라 어긋날 게 없다.
 *
 * root 를 명시하는 게 중요하다. 이 목록은 **자기 스크롤 영역** 안에서 움직이므로
 * (아래 overflow-y-auto), 기본값인 뷰포트로 두면 바닥에 닿아도 울리지 않는다.
 * rootMargin 은 바닥에 닿기 200px 전에 미리 부르려고 둔다.
 */
const scroller = useTemplateRef<HTMLElement>('scroller')

/**
 * 첫 로딩 골격의 개수. 스크롤 칸 높이를 재서 채운다 — 개수를 고정하면 그보다 긴
 * 화면에서 아래가 빈다(셸은 폭만 480px 로 고정되고 높이는 dvh 라 상한이 없다).
 * 한 페이지(12건)는 넘기지 않는다 — 실제로 그보다 많이 도착하지 않으니
 * 더 깔아 봐야 없는 걸 약속하는 셈이다. 113 = py-4 32 + 썸네일 80 + 구분선 1.
 */
const { height: scrollerHeight } = useElementSize(scroller)
const skeletonCount = computed(() =>
  Math.min(LISTING_PAGE_SIZE, Math.max(4, Math.ceil(scrollerHeight.value / 113))),
)
const sentinel = useTemplateRef<HTMLElement>('sentinel')

useIntersectionObserver(
  sentinel,
  ([entry]) => {
    if (entry?.isIntersecting) emit('loadMore')
  },
  { root: scroller, rootMargin: '200px' },
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
    >
      <!--
        로딩은 카드와 **같은 골격**으로 깐다(divide-y·px-5·py-4·썸네일 80·도넛 72).
        글자 한 줄로 두면 목록이 도착하는 순간 높이가 달라져 화면이 튄다.
        개수는 칸 높이에서 나온다(skeletonCount) — 고정하면 긴 화면에서 아래가 빈다.
        폭은 비율로 준다 — 320px 에서 본문에 남는 폭이 104px 뿐이라(README) 고정폭을
        박으면 그 칸을 넘는다.
      -->
      <template v-if="loading">
        <p class="sr-only" role="status">매물을 불러오는 중</p>
        <ul class="divide-y divide-slate-100 px-5" aria-hidden="true">
          <li v-for="i in skeletonCount" :key="i" class="flex gap-3 py-4">
            <BaseSkeleton class="size-20 shrink-0 rounded-xl!" />
            <div class="flex min-w-0 flex-1 flex-col gap-2 pt-1">
              <BaseSkeleton class="h-4 w-2/3" />
              <BaseSkeleton class="h-3 w-full" />
              <BaseSkeleton class="h-3 w-4/5" />
              <BaseSkeleton class="h-3 w-1/2" />
            </div>
            <BaseSkeleton class="size-18 shrink-0 rounded-full!" />
          </li>
        </ul>
      </template>
      <p v-else-if="!listings.length" class="px-5 py-10 text-center text-sm text-slate-400">
        조건에 맞는 매물이 없어요<br />검색 필터를 넓혀보세요
      </p>
      <ul v-else class="divide-y divide-slate-100 px-5">
        <li v-for="l in listings" :key="l.id">
          <!-- 첫 진입 안내가 점수 읽는 법을 설명할 때 이 중 하나를 골라 짚는다. -->
          <ListingCard :listing="l" :recommendation-id="recommendationId" data-tour="listing" />
        </li>

        <!--
          다음 페이지 자리. 카드와 같은 골격이라 목록이 이어지는 것처럼 보이고,
          도착해도 높이가 바뀌지 않는다(위 첫 로딩과 같은 이유다).
        -->
        <template v-if="loadingMore">
          <li class="sr-only" role="status">매물을 더 불러오는 중</li>
          <li v-for="i in 2" :key="`more-${i}`" class="flex gap-3 py-4" aria-hidden="true">
            <BaseSkeleton class="size-20 shrink-0 rounded-xl!" />
            <div class="flex min-w-0 flex-1 flex-col gap-2 pt-1">
              <BaseSkeleton class="h-4 w-2/3" />
              <BaseSkeleton class="h-3 w-full" />
              <BaseSkeleton class="h-3 w-4/5" />
              <BaseSkeleton class="h-3 w-1/2" />
            </div>
            <BaseSkeleton class="size-18 shrink-0 rounded-full!" />
          </li>
        </template>

        <!--
          바닥 표식. 높이가 0 이면 관측기가 못 잡는 브라우저가 있어 1px 을 준다.
          더 받을 게 없으면 아예 그리지 않는다 — 끝에 닿아도 아무 일이 없어야 한다.
        -->
        <li v-else-if="hasNext" ref="sentinel" class="h-px" aria-hidden="true" />

        <!-- 끝까지 봤다는 말. 목록이 갑자기 끊기면 덜 불러온 줄 안다. -->
        <li
          v-else-if="listings.length"
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
