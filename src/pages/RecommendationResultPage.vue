<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import ListingList from '@/features/listings/ListingList.vue'
import { useRecommendationStore } from '@/stores/recommendation'
import type { RecommendationStatus } from '@/lib/api/recommendation'
import type { Listing } from '@/types/domain'

/**
 * URL 의 id 로 서버에서 조회한다. 로그인이 없는 서비스라 결과 URL 을 북마크하거나
 * 공유해도 열리는 것이 오히려 장점이다(§5.3).
 */
const props = defineProps<{ recommendationId: string }>()

const router = useRouter()
const reco = useRecommendationStore()

const status = ref<RecommendationStatus | 'LOADING'>('LOADING')
const items = ref<Listing[]>([])

onMounted(async () => {
  try {
    const res = await reco.fetchResult(props.recommendationId)
    status.value = res.status
    items.value = res.result?.items ?? []
  } catch {
    // 만료·미존재 모두 여기로 온다. 사용자는 며칠 뒤 북마크로 들어올 수 있다(§4.3).
    status.value = 'FAILED'
    reco.drop(props.recommendationId)
  }
})
</script>

<template>
  <main class="flex min-h-0 flex-1 flex-col bg-white">
    <header class="safe-top flex items-center gap-1 border-b border-slate-100 px-2 py-3">
      <button
        type="button"
        class="grid size-10 shrink-0 place-items-center text-slate-700"
        aria-label="뒤로"
        @click="router.back()"
      >
        <svg viewBox="0 0 24 24" class="size-6" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M15 5l-7 7 7 7" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
      </button>
      <h1 class="font-bold text-slate-900">추천 결과</h1>
    </header>

    <p v-if="status === 'LOADING'" class="px-5 py-16 text-center text-sm text-slate-400">
      결과를 불러오는 중…
    </p>

    <div v-else-if="status === 'PENDING' || status === 'PROCESSING'" class="px-5 py-16 text-center">
      <p class="font-semibold text-slate-900">
        {{ status === 'PENDING' ? '대기 중이에요' : 'AI가 매물을 분석하고 있어요' }}
      </p>
      <p class="mt-1 text-sm text-slate-500">완료되면 알림으로 알려드릴게요</p>
    </div>

    <div v-else-if="status === 'FAILED'" class="px-5 py-16 text-center">
      <p class="font-semibold text-slate-900">결과를 찾을 수 없어요</p>
      <p class="mt-1 text-sm text-slate-500">시간이 지나 만료됐거나 실패한 추천이에요</p>
      <button
        type="button"
        class="mt-5 h-11 rounded-full bg-brand-500 px-6 text-sm font-semibold text-white"
        @click="router.push({ name: 'map' })"
      >
        다시 추천받기
      </button>
    </div>

    <ListingList v-else class="min-h-0 flex-1 pt-4" :listings="items" />
  </main>
</template>
