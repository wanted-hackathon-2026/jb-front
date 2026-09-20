<script setup lang="ts">
import { onActivated, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import BaseSpinner from '@/components/BaseSpinner.vue'
import ListingList from '@/components/ListingList.vue'
import { LISTING_PAGE_SIZE, useListingPages } from '@/lib/listing-paging'
import { useRecommendationStore } from '@/stores/recommendation'
import { SUCCESS_STATUS, type RecommendationStatus } from '@/lib/api/recommendation'

/**
 * URL 의 id 로 서버에서 조회한다. 로그인이 없는 서비스라 결과 URL 을 북마크하거나
 * 공유해도 열리는 것이 오히려 장점이다(§5.3).
 */
const props = defineProps<{ recommendationId: string }>()

/**
 * 이 화면은 KeepAlive 로 살려 둔다(App.vue) — 상세를 다녀와도 받아둔 페이지와 스크롤이
 * 남아야 한다. include 가 이름으로 고르므로 파일명에 기대지 않고 여기 박아 둔다.
 */
defineOptions({ name: 'RecommendationResultPage' })

const router = useRouter()
const reco = useRecommendationStore()

const status = ref<RecommendationStatus | 'LOADING'>('LOADING')

/** 무한 스크롤. 정렬이 바뀌면 이 안에서 알아서 첫 페이지부터 다시 받는다. */
const { sort, items, total, loading, loadingMore, hasNext, reload, more } = useListingPages(
  (page, sortKey) =>
    reco.fetchPage(props.recommendationId, { page, size: LISTING_PAGE_SIZE, sort: sortKey }),
)

async function load() {
  status.value = 'LOADING'
  try {
    status.value = await reco.fetchStatus(props.recommendationId)
    // 완료가 아니면 목록을 부를 이유가 없다 — 빈 페이지만 받아 온다.
    if (status.value === SUCCESS_STATUS) await reload()
  } catch {
    // 만료·미존재 모두 여기로 온다. 사용자는 며칠 뒤 북마크로 들어올 수 있다(§4.3).
    status.value = 'FAILED'
    reco.drop(props.recommendationId)
  }
}

/**
 * 살아남은 화면이라 onMounted 는 첫 한 번만 돈다. **다른 추천으로 옮겨오면**
 * (완료 배너를 눌렀을 때처럼) 같은 인스턴스가 재사용되므로 id 를 지켜본다 —
 * 안 그러면 새 id 에 옛 목록이 붙어 있다.
 */
watch(() => props.recommendationId, load, { immediate: true })

/**
 * 돌아왔을 때 아직 끝나지 않은 추천이었으면 다시 물어본다. 완료된 결과는 다시 받지
 * 않는다 — 그대로 두는 것이 이 화면을 살려 둔 이유고(스크롤·페이지), 결과는 그 추천에
 * 한 번 고정된 값이라 다시 받아도 같다.
 */
let activatedOnce = false
onActivated(() => {
  // 첫 활성화는 위 watch(immediate) 와 겹친다 — 같은 걸 두 번 받지 않는다.
  const first = !activatedOnce
  activatedOnce = true
  if (!first && status.value !== SUCCESS_STATUS) void load()
})
</script>

<template>
  <main class="flex min-h-0 flex-1 flex-col bg-white">
    <header class="safe-top flex items-center gap-1 border-b border-slate-100 px-2 py-3">
      <button
        type="button"
        class="grid size-11 shrink-0 place-items-center text-slate-700"
        aria-label="뒤로"
        @click="router.back()"
      >
        <svg viewBox="0 0 24 24" class="size-6" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M15 5l-7 7 7 7" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
      </button>
      <h1 class="font-bold text-slate-900">추천 결과</h1>
    </header>

    <!-- 로딩 골격은 목록이 직접 안다 — 결과가 들어올 자리와 같은 컴포넌트로 깐다. -->
    <ListingList
      v-if="status === 'LOADING'"
      class="min-h-0 flex-1 pt-4"
      :listings="[]"
      loading
      scored-when-loaded
    />

    <div v-else-if="status === 'PENDING' || status === 'PROCESSING'" class="px-5 py-16 text-center">
      <!-- 결과가 아직 없는 화면이라 깔아둘 골격이 없다 — 스켈레톤 대신 도는 표시다. -->
      <BaseSpinner :size="28" class="mx-auto mb-4 text-brand-500" />
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

    <ListingList
      v-else
      v-model:sort="sort"
      class="min-h-0 flex-1 pt-4"
      :listings="items"
      :loading="loading"
      :total="total"
      :has-next="hasNext"
      :loading-more="loadingMore"
      :recommendation-id="recommendationId"
      scored-when-loaded
      @load-more="more"
    />
  </main>
</template>
