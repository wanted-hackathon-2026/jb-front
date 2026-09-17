<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import BaseChip from '@/components/BaseChip.vue'
import BaseEmptyState from '@/components/BaseEmptyState.vue'
import ListingCard from '@/components/ListingCard.vue'
import SearchHistoryCard from '@/components/SearchHistoryCard.vue'
import { getFavorites, getRecentlyViewed, getSearchHistory } from '@/lib/api/me'
import { useAuthStore } from '@/stores/auth'
import { useLoginPromptStore } from '@/stores/login-prompt'
import type { Listing, SearchHistoryEntry } from '@/types/domain'

/** 시안 172-522 / 172-669 / 172-1192 */
type Tab = 'history' | 'favorites' | 'recent'

const TABS: { value: Tab; label: string }[] = [
  { value: 'history', label: '이전 기록' },
  { value: 'favorites', label: '관심 매물' },
  { value: 'recent', label: '최근 본 매물' },
]

const router = useRouter()
const route = useRoute()
const auth = useAuthStore()

/**
 * 진입할 때 열 탭. 지도의 하트 FAB 가 `?tab=favorites` 로 바로 보낸다.
 * 모르는 값이 오면 기본 탭으로 떨어뜨린다 — 주소창은 사용자가 고칠 수 있다.
 */
const initialTab = TABS.some((t) => t.value === route.query.tab)
  ? (route.query.tab as Tab)
  : 'history'

const tab = ref<Tab>(initialTab)

/** 빈 화면의 다음 행동은 셋 다 지도다 — 매물도 추천도 거기서 시작한다. */
const goMap = () => router.push({ name: 'map' })

/** 로그인 팝업. 관심 매물 탭의 안내에서 연다 — 로그인이 끝나면 아래 watch 가 다시 받아온다. */
const loginPrompt = useLoginPromptStore()

/** 프로필 사진이 없어서 첫 글자로 대신한다 — 프로필 화면의 동그라미와 같은 규칙이다. */
const initial = computed(
  () => auth.user?.nickname?.[0] ?? auth.user?.email?.[0]?.toUpperCase() ?? '',
)

const loading = ref(true)
/** 실패 사유. 비어 있는 것과 못 불러온 것은 사용자에게 전혀 다른 상황이다. */
const error = ref<string | null>(null)
const history = ref<SearchHistoryEntry[]>([])
const favorites = ref<Listing[]>([])
const recent = ref<Listing[]>([])

/**
 * 관심 매물은 서버에 있고 로그인이 필요하다. 로그인하지 않았으면 호출해 봐야 401 이라
 * 아예 부르지 않고 안내를 띄운다(`auth.status` 가 확정되기 전에는 판단을 미룬다).
 */
const needsLogin = computed(() => tab.value === 'favorites' && auth.status === 'anonymous')

/** 탭을 옮길 때마다 받아온다. 세 벌을 한 번에 받으면 첫 화면이 그만큼 늦어진다. */
async function load(which: Tab) {
  if (which === 'favorites' && !auth.isAuthenticated) {
    // 복원이 아직 안 끝났으면(idle·restoring) 로그인 여부를 모르는 상태다. 그때
    // 빈 목록을 보여주면 '찜한 게 없다'는 거짓말이 되므로 로딩을 유지하고, 상태가
    // 확정되면 아래 watch 가 다시 부른다. 비로그인이 확정된 경우에만 안내로 넘긴다.
    loading.value = auth.status !== 'anonymous'
    return
  }
  loading.value = true
  error.value = null
  try {
    if (which === 'history') history.value = await getSearchHistory()
    else if (which === 'favorites') favorites.value = await getFavorites()
    else recent.value = await getRecentlyViewed()
  } catch {
    // 서버 문구를 그대로 띄우지 않는다 — 개발·운영 확인용이라 사용자에게 쓸 말이 아니다.
    error.value = '목록을 불러오지 못했어요'
  } finally {
    loading.value = false
  }
}

/* ── 이전 기록 검색 ───────────────────────────────────────────────────────
 * 거점 이름으로 거른다. 기록은 아직 목이라 서버에 검색을 넘길 곳이 없어서
 * 받아온 목록을 화면에서 거른다 — 기록 API 가 생기면 질의를 서버로 넘긴다.
 */
/** 확정된 조건. 칩 하나가 거점 이름 하나고, 여러 개면 전부 만족해야 한다(AND). */
const keywords = ref<string[]>([])
/** 아직 엔터를 누르지 않은 입력. 이것도 조건으로 같이 센다 — 치는 즉시 좁혀진다. */
const draft = ref('')

const matches = (entry: SearchHistoryEntry, word: string) =>
  entry.anchorNames.some((name) => name.toLowerCase().includes(word.toLowerCase()))

const filteredHistory = computed(() => {
  const words = [...keywords.value, draft.value.trim()].filter(Boolean)
  return words.length
    ? history.value.filter((h) => words.every((w) => matches(h, w)))
    : history.value
})

/** 같은 말을 두 번 담지 않는다 — 칩이 늘어도 결과가 그대로라 사용자만 헷갈린다. */
function commitDraft() {
  const word = draft.value.trim()
  if (word && !keywords.value.includes(word)) keywords.value.push(word)
  draft.value = ''
}

function clearSearch() {
  keywords.value = []
  draft.value = ''
}

/** v-model 을 쓰지 않는 이유는 NicknamePage 와 같다 — 한글 조합 중에는 갱신되지 않는다. */
function onSearchInput(e: Event) {
  draft.value = (e.target as HTMLInputElement).value
}

/** 빈 입력에서 지우면 마지막 칩을 뗀다 — 칩의 × 를 정확히 누르지 않아도 된다. */
function backspace() {
  if (!draft.value) keywords.value.pop()
}

onMounted(() => load(tab.value))
watch(tab, load)
/**
 * 세션 복원이 끝나거나 로그인 상태가 바뀌면 관심 매물을 다시 받아온다.
 *
 * `isAuthenticated` 가 아니라 `status` 를 보는 이유가 있다 — 복원이 **실패**하면
 * (restoring → anonymous) `isAuthenticated` 는 false 에서 false 로 그대로라 watch 가
 * 돌지 않고, 위에서 켜둔 로딩이 영원히 풀리지 않는다.
 */
watch(
  () => auth.status,
  () => {
    if (tab.value === 'favorites') void load('favorites')
  },
)
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
        <p
          class="grid size-20 place-items-center rounded-full bg-slate-300 text-2xl font-bold text-slate-600"
          aria-hidden="true"
        >
          {{ initial }}
        </p>
        <!--
          시안에는 이름 옆에 '›' 가 있어 계정 화면으로 가는 길처럼 보이지만, 그 화면이
          아직 없다. 없는 라우트로 보내면 빈 화면이 뜨므로 지금은 표시만 한다 —
          계정 화면이 생기면 이 p 를 button 으로 바꾸고 라우트를 연결한다.
        -->
        <!-- 로그인했을 때만 닉네임 변경으로 이어진다. 비로그인이면 누를 것이 없다. -->
        <button
          v-if="auth.isAuthenticated"
          type="button"
          class="mt-3 flex min-h-11 items-center gap-1 font-bold text-slate-900"
          @click="router.push({ name: 'nickname', query: { redirect: '/my' } })"
        >
          <!-- 닉네임이 없을 수 있다(가입 직후). 그때도 자리가 무너지지 않게 대체 문구를 둔다. -->
          <span
            ><span class="text-brand-500">{{ auth.user?.nickname ?? '내 정보' }}</span
            ><span v-if="auth.user?.nickname">님</span></span
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
        </button>
        <p v-else class="mt-3 flex min-h-11 items-center font-bold text-slate-900">내 정보</p>
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

      <!-- 로그인해야 볼 수 있는 탭. 호출도 하지 않고 여기서 멈춘다. -->
      <BaseEmptyState
        v-else-if="needsLogin"
        title="로그인하면 관심 매물을 볼 수 있어요"
        hint="저장한 매물은 계정에 남아 다른 기기에서도 보여요"
        action-label="로그인"
        @action="loginPrompt.require({ redirect: '/my?tab=favorites' })"
      />

      <!-- 실패를 빈 목록으로 보여주면 '찜한 게 없다'는 거짓말이 된다. -->
      <div v-else-if="error" class="px-5 py-16 text-center">
        <p class="text-sm text-slate-400">{{ error }}</p>
        <button
          type="button"
          class="mt-3 min-h-11 px-4 text-sm font-semibold text-brand-500"
          @click="load(tab)"
        >
          다시 시도
        </button>
      </div>

      <template v-else-if="tab === 'history'">
        <BaseEmptyState
          v-if="!history.length"
          title="아직 추천받은 기록이 없어요"
          hint="거점과 조건을 정하면 AI가 맞는 매물을 찾아드려요"
          action-label="방정식 풀러 가기"
          @action="goMap"
        />
        <template v-else>
          <!--
            거점 이름으로 거른다. 칩 하나가 조건 하나고, 엔터로 확정한다 —
            여러 거점으로 돌린 기록을 찾으려면 조건도 여러 개여야 하기 때문이다.
            입력창이 아니라 상자 전체가 클릭 대상이라 label 로 감싼다.
          -->
          <label
            class="mx-5 mt-4 flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2"
            for="history-search"
          >
            <svg
              viewBox="0 0 24 24"
              class="size-6 shrink-0 text-slate-500"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              aria-hidden="true"
            >
              <circle cx="11" cy="11" r="6.5" />
              <path d="M16 16l4.5 4.5" stroke-linecap="round" />
            </svg>
            <BaseChip
              v-for="k in keywords"
              :key="k"
              :label="k"
              removable
              remove-label="검색 조건에서 제외"
              @remove="keywords = keywords.filter((x) => x !== k)"
            />
            <input
              id="history-search"
              :value="draft"
              type="search"
              class="h-9 min-w-16 flex-1 bg-transparent outline-none placeholder:text-slate-400"
              :placeholder="keywords.length ? '' : '거점 이름으로 검색'"
              enterkeyhint="search"
              aria-label="거점 이름으로 기록 검색"
              @input="onSearchInput"
              @keydown.enter.prevent="commitDraft"
              @keydown.backspace="backspace"
            />
          </label>

          <!-- 거르고 나서 하나도 안 남는 건 '기록이 없는' 것과 다르다. 되돌릴 길을 준다. -->
          <BaseEmptyState
            v-if="!filteredHistory.length"
            title="조건에 맞는 기록이 없어요"
            hint="거점 이름의 일부만 넣어도 찾아드려요"
            action-label="검색 조건 지우기"
            @action="clearSearch"
          />
          <ul v-else class="divide-y divide-slate-100 px-5">
            <li v-for="h in filteredHistory" :key="h.id">
              <SearchHistoryCard :entry="h" />
            </li>
          </ul>
        </template>
      </template>

      <template v-else-if="tab === 'favorites'">
        <BaseEmptyState
          v-if="!favorites.length"
          title="관심 매물이 없어요"
          hint="마음에 드는 매물에 하트를 눌러 저장해 보세요"
          action-label="매물 보러 가기"
          @action="goMap"
        >
          <template #icon>
            <svg viewBox="0 0 17 15" class="size-7 text-slate-300" fill="currentColor">
              <path
                d="M7.89484 14.7579C8.0653 14.9249 8.27839 15 8.5 15C8.72161 15 8.9347 14.9165 9.10516 14.7579L15.4977 8.4962C17.5008 6.53421 17.5008 3.44511 15.4977 1.47477C13.5374 -0.428777 10.5115 -0.487219 8.5 1.3078C6.48847 -0.487219 3.46265 -0.437126 1.50226 1.47477C-0.500752 3.44511 -0.500752 6.53421 1.50226 8.4962L7.89484 14.7579Z"
              />
            </svg>
          </template>
        </BaseEmptyState>
        <ul v-else class="divide-y divide-slate-100 px-5">
          <li v-for="l in favorites" :key="l.id">
            <!-- 이 탭의 매물은 정의상 전부 찜한 것이라 하트가 채워져 있다. -->
            <ListingCard :listing="l" saved />
          </li>
        </ul>
      </template>

      <template v-else>
        <BaseEmptyState
          v-if="!recent.length"
          title="최근 본 매물이 없어요"
          hint="매물을 둘러보면 여기에 쌓여요"
          action-label="매물 보러 가기"
          @action="goMap"
        />
        <ul v-else class="divide-y divide-slate-100 px-5">
          <li v-for="l in recent" :key="l.id">
            <ListingCard :listing="l" />
          </li>
        </ul>
      </template>
    </div>
  </main>
</template>
