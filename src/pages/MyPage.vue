<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import ListingCard from '@/components/ListingCard.vue'
import SearchHistoryCard from '@/components/SearchHistoryCard.vue'
import { getFavorites, getRecentlyViewed, getSearchHistory } from '@/lib/api/me'
import { useAuthStore } from '@/stores/auth'
import type { Listing, SearchHistoryEntry } from '@/types/domain'

/** 시안 172-522 / 172-669 / 172-1192 */
type Tab = 'history' | 'favorites' | 'recent'

const TABS: { value: Tab; label: string }[] = [
  { value: 'history', label: '이전 기록' },
  { value: 'favorites', label: '관심 매물' },
  { value: 'recent', label: '최근 본 매물' },
]

const router = useRouter()
const auth = useAuthStore()

const tab = ref<Tab>('history')
const loading = ref(true)
const history = ref<SearchHistoryEntry[]>([])
const favorites = ref<Listing[]>([])
const recent = ref<Listing[]>([])

/** 탭을 옮길 때마다 받아온다. 세 벌을 한 번에 받으면 첫 화면이 그만큼 늦어진다. */
async function load(which: Tab) {
  loading.value = true
  try {
    if (which === 'history') history.value = await getSearchHistory()
    else if (which === 'favorites') favorites.value = await getFavorites()
    else recent.value = await getRecentlyViewed()
  } finally {
    loading.value = false
  }
}

onMounted(() => load(tab.value))
watch(tab, load)
</script>

<template>
  <main class="flex flex-1 flex-col overflow-hidden bg-white">
    <!-- 프로필. 시안은 여기까지가 옅은 회색 판이고 그 아래부터 흰 바탕이다. -->
    <header class="safe-top shrink-0 bg-slate-100 pb-5">
      <button
        type="button"
        class="grid size-11 place-items-center text-slate-700"
        aria-label="뒤로"
        @click="router.back()"
      >
        <svg viewBox="0 0 24 24" class="size-6" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M15 5l-7 7 7 7" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
      </button>

      <div class="flex flex-col items-center">
        <span class="size-20 rounded-full bg-slate-300" aria-hidden="true" />
        <!--
          시안에는 이름 옆에 '›' 가 있어 계정 화면으로 가는 길처럼 보이지만, 그 화면이
          아직 없다. 없는 라우트로 보내면 빈 화면이 뜨므로 지금은 표시만 한다 —
          계정 화면이 생기면 이 p 를 button 으로 바꾸고 라우트를 연결한다.
        -->
        <p class="mt-3 flex items-center gap-1 font-bold text-slate-900">
          <!-- 닉네임이 없을 수 있다(가입 직후). 그때도 자리가 무너지지 않게 대체 문구를 둔다. -->
          <span
            >{{ auth.user?.nickname ?? '내 정보' }}<span v-if="auth.user?.nickname">님</span></span
          >
          <svg
            viewBox="0 0 24 24"
            class="size-4"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            aria-hidden="true"
          >
            <path d="M9 5l7 7-7 7" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
        </p>
      </div>
    </header>

    <!-- 탭. 활성 표시는 밑줄이라, 줄이 탭 바 아래 경계선 위에 겹쳐 앉는다. -->
    <div class="flex shrink-0 border-b border-slate-200" role="tablist">
      <button
        v-for="t in TABS"
        :key="t.value"
        type="button"
        role="tab"
        :aria-selected="tab === t.value"
        class="-mb-px flex-1 border-b-2 py-3.5 text-sm font-semibold transition-colors"
        :class="
          tab === t.value ? 'border-brand-500 text-brand-500' : 'border-transparent text-slate-500'
        "
        @click="tab = t.value"
      >
        {{ t.label }}
      </button>
    </div>

    <div class="min-h-0 flex-1 overflow-y-auto">
      <p v-if="loading" class="px-5 py-16 text-center text-sm text-slate-400">불러오는 중…</p>

      <template v-else-if="tab === 'history'">
        <p v-if="!history.length" class="px-5 py-16 text-center text-sm text-slate-400">
          아직 추천받은 기록이 없어요
        </p>
        <ul v-else class="divide-y divide-slate-100 px-5">
          <li v-for="h in history" :key="h.id">
            <SearchHistoryCard :entry="h" />
          </li>
        </ul>
      </template>

      <template v-else-if="tab === 'favorites'">
        <p v-if="!favorites.length" class="px-5 py-16 text-center text-sm text-slate-400">
          관심 매물이 없어요<br />마음에 드는 매물에 하트를 눌러보세요
        </p>
        <ul v-else class="divide-y divide-slate-100 px-5">
          <li v-for="l in favorites" :key="l.id">
            <!-- 이 탭의 매물은 정의상 전부 찜한 것이라 하트가 채워져 있다. -->
            <ListingCard :listing="l" saved />
          </li>
        </ul>
      </template>

      <template v-else>
        <p v-if="!recent.length" class="px-5 py-16 text-center text-sm text-slate-400">
          최근 본 매물이 없어요
        </p>
        <ul v-else class="divide-y divide-slate-100 px-5">
          <li v-for="l in recent" :key="l.id">
            <ListingCard :listing="l" />
          </li>
        </ul>
      </template>
    </div>
  </main>
</template>
