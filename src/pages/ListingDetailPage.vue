<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import BaseScoreDonut from '@/components/BaseScoreDonut.vue'
import RouteTimeline from '@/components/RouteTimeline.vue'
import { getListing, getRecommendedListing } from '@/lib/api/listings'
import { formatCommute, formatPrice } from '@/lib/format'
import type { Listing } from '@/types/domain'

const props = defineProps<{
  id: string
  /** 추천 결과에서 들어왔다면 그 추천의 id. 주변 매물에서 들어오면 없다. */
  recommendationId?: string
}>()

const router = useRouter()
const listing = ref<Listing | null>(null)
const failed = ref(false)
const saved = ref(false)

/** 사진이 아직 없어 첫 장에 고정한다. 슬라이더가 붙으면 이 값이 움직인다. */
const photoIndex = ref(1)

const price = computed(() =>
  listing.value
    ? formatPrice(listing.value.dealType, listing.value.deposit, listing.value.rent)
    : '',
)

const commute = computed(() => {
  const c = listing.value?.commutes[0]
  return c ? formatCommute(c.minutes, c.transfers, c.walkMinutes) : null
})

/**
 * 같은 컴포넌트가 두 라우트(/listings/:id, /recommendations/:recId/listings/:id)를 맡는다.
 * onMounted 로만 받아오면 라우트만 바뀌고 인스턴스가 재사용될 때 옛 매물이 남는다.
 */
watch(
  () => [props.id, props.recommendationId],
  async () => {
    listing.value = null
    failed.value = false
    try {
      // 맥락이 있으면 점수·순위·이동 동선이 함께 오는 쪽으로 묻는다.
      listing.value = props.recommendationId
        ? await getRecommendedListing(props.recommendationId, props.id)
        : await getListing(props.id)
    } catch {
      failed.value = true
    }
  },
  { immediate: true },
)
</script>

<template>
  <main class="relative flex min-h-0 flex-1 flex-col bg-white">
    <div class="min-h-0 flex-1 overflow-y-auto">
      <!-- 히어로. 이미지가 아직 없어 회색 자리표시자로 둔다. -->
      <div class="relative aspect-[4/3] shrink-0 bg-[#c7c7c7]">
        <!-- 사진 위에 얹히는 버튼이라 어떤 사진이 와도 보이도록 반투명 판을 깐다. -->
        <button
          type="button"
          class="safe-top absolute left-3 top-3 grid size-10 place-items-center rounded-full bg-black/25 text-white backdrop-blur-sm"
          aria-label="뒤로"
          @click="router.back()"
        >
          <svg
            viewBox="0 0 24 24"
            class="size-6"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <path d="M15 5l-7 7 7 7" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
        </button>

        <button
          type="button"
          class="safe-top absolute right-3 top-3 grid size-10 place-items-center rounded-full bg-black/25 text-white backdrop-blur-sm"
          :aria-label="saved ? '관심 매물에서 빼기' : '관심 매물로 저장'"
          :aria-pressed="saved"
          @click="saved = !saved"
        >
          <svg
            viewBox="0 0 19 17"
            class="size-5"
            :fill="saved ? 'currentColor' : 'none'"
            aria-hidden="true"
          >
            <path
              d="M16.2374 8.69124L9.15777 15.65L2.0781 8.69124C1.61113 8.24026 1.24331 7.69821 0.997792 7.09922C0.752274 6.50023 0.634382 5.85727 0.651539 5.21084C0.668696 4.56441 0.820531 3.92851 1.09748 3.34318C1.37443 2.75784 1.7705 2.23576 2.26075 1.80981C2.75099 1.38386 3.32479 1.06326 3.94601 0.868202C4.56724 0.673146 5.22242 0.607859 5.87032 0.676451C6.51821 0.745044 7.14478 0.94603 7.71057 1.26675C8.27635 1.58748 8.76909 2.02099 9.15777 2.54C9.54813 2.02476 10.0414 1.59503 10.6068 1.27771C11.1722 0.960393 11.7975 0.76231 12.4436 0.695861C13.0897 0.629412 13.7426 0.696028 14.3616 0.891539C14.9805 1.08705 15.5521 1.40725 16.0407 1.83209C16.5292 2.25694 16.9241 2.77728 17.2007 3.36056C17.4772 3.94384 17.6295 4.5775 17.648 5.22187C17.6665 5.86625 17.5507 6.50747 17.308 7.10541C17.0653 7.70335 16.7008 8.24514 16.2374 8.69686"
              stroke="currentColor"
              stroke-width="1.3"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
        </button>

        <span
          v-if="listing"
          class="absolute bottom-3 right-3 rounded-full bg-black/55 px-2.5 py-1 text-xs font-medium text-white"
        >
          {{ photoIndex }} / {{ listing.photoCount }}
        </span>
      </div>

      <p v-if="failed" class="px-5 py-16 text-center text-sm text-slate-400">
        매물을 찾을 수 없어요
      </p>

      <p v-else-if="!listing" class="px-5 py-16 text-center text-sm text-slate-400">불러오는 중…</p>

      <template v-else>
        <section class="flex items-start gap-4 px-5 pb-5 pt-6">
          <div class="min-w-0 flex-1">
            <p
              v-if="listing.rank !== null && listing.rank <= 3"
              class="mb-2 inline-block rounded-full bg-brand-50 px-2.5 py-1 text-xs font-semibold text-brand-500"
            >
              추천 {{ listing.rank }}순위
            </p>
            <h1 class="truncate text-2xl font-bold text-slate-900">{{ price }}</h1>
            <p class="mt-1 truncate text-sm text-slate-500">{{ listing.address }}</p>
          </div>

          <BaseScoreDonut v-if="listing.score !== null" :score="listing.score" :size="80" />
        </section>

        <hr class="mx-5 border-slate-100" />

        <!-- AI 요약. 테두리·아이콘 모두 브랜드→강조색 그라디언트다(완료 배너와 같은 축). -->
        <section class="px-5 pt-5">
          <div
            class="rounded-full bg-linear-to-r/srgb from-brand-500 to-accent-500 p-px shadow-[0_1px_3px_rgba(15,23,42,0.08)]"
          >
            <div class="flex items-center gap-2.5 rounded-full bg-white py-1.5 pl-1.5 pr-4">
              <span
                class="size-8 shrink-0 rounded-full bg-linear-to-r/srgb from-accent-500 to-brand-500"
                aria-hidden="true"
              />
              <p class="min-w-0 flex-1 truncate text-sm text-slate-800">{{ listing.aiSummary }}</p>
            </div>
          </div>
        </section>

        <section class="grid grid-cols-2 gap-3 px-5 pt-5">
          <div class="rounded-2xl bg-slate-100 px-4 py-5 text-center">
            <p class="text-xs font-semibold text-slate-500">전용/공급면적</p>
            <p class="mt-1 text-lg font-semibold text-slate-900">
              {{ listing.areaPyeong }}평 / {{ listing.supplyPyeong }}평
            </p>
          </div>
          <div class="rounded-2xl bg-slate-100 px-4 py-5 text-center">
            <p class="text-xs font-semibold text-slate-500">구조/욕실 수</p>
            <p class="mt-1 truncate text-lg font-semibold text-slate-900">
              {{ listing.roomType }} / {{ listing.bathrooms }}개
            </p>
          </div>
        </section>

        <section v-if="listing.route.length" class="px-5 pb-8 pt-7">
          <h2 class="font-bold text-slate-900">
            이동 동선
            <span class="ml-1 text-sm font-normal text-slate-400">최적 경로 기준</span>
          </h2>
          <p v-if="commute" class="mb-4 mt-1 font-bold text-brand-500">{{ commute }}</p>
          <RouteTimeline :legs="listing.route" />
        </section>
      </template>
    </div>

    <!-- 하단 고정 바. 목록으로 돌아가지 않고도 저장할 수 있어야 한다. -->
    <div
      v-if="listing"
      class="safe-bottom flex shrink-0 items-center gap-4 border-t border-slate-100 px-5 py-3"
    >
      <p class="min-w-0 flex-1 truncate font-bold text-slate-900">{{ price }}</p>
      <button
        type="button"
        class="h-11 shrink-0 rounded-xl px-8 font-semibold transition-colors"
        :class="saved ? 'bg-brand-50 text-brand-700' : 'bg-brand-500 text-white'"
        :aria-pressed="saved"
        @click="saved = !saved"
      >
        {{ saved ? '저장됨' : '매물 저장하기' }}
      </button>
    </div>
  </main>
</template>
