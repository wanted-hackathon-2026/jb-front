<script setup lang="ts">
import { useElementSize } from '@vueuse/core'
import { computed, onActivated, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import BaseChip from '@/components/BaseChip.vue'
import BaseEmptyState from '@/components/BaseEmptyState.vue'
import BaseSkeleton from '@/components/BaseSkeleton.vue'
import ListingCard from '@/components/ListingCard.vue'
import SearchHistoryCard from '@/components/SearchHistoryCard.vue'
import { formatDay } from '@/lib/format'
import { getFavorites, getSearchHistory } from '@/lib/api/me'
import { useAuthStore } from '@/stores/auth'
import { useFavoritesStore } from '@/stores/favorites'
import { useRecentlyViewedStore } from '@/stores/recently-viewed'
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
/** 하트가 보는 스토어. 화면 변수 `favorites`(목록)와 이름이 겹쳐 따로 부른다. */
const favoriteIds = useFavoritesStore()
/**
 * '최근 본 매물'은 서버가 아니라 이 기기에 쌓인다(stores/recently-viewed.ts).
 * 받아올 게 없어서 로딩도 오류도 없다 — 탭을 열면 이미 있다.
 */
const recentlyViewed = useRecentlyViewedStore()

/**
 * 이 화면도 KeepAlive 로 살려 둔다(App.vue) — 매물 상세를 다녀와도 목록과 스크롤이
 * 남아야 한다. include 가 이름으로 고르므로 파일명에 기대지 않고 박아 둔다.
 */
defineOptions({ name: 'MyPage' })

/**
 * 주소가 정본이다. 지도의 하트 FAB 가 `?tab=favorites` 로 바로 보내고, 탭을 옮기면
 * 아래 watch 가 주소에 다시 적는다. 모르는 값이 오면 기본 탭으로 떨어뜨린다 —
 * 주소창은 사용자가 고칠 수 있다.
 */
const toTab = (q: unknown): Tab => (TABS.some((t) => t.value === q) ? (q as Tab) : 'history')

const tab = ref<Tab>(toTab(route.query.tab))

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

/**
 * 로딩 골격의 개수. 목록이 들어갈 칸 높이를 재서 채운다 — 고정하면 그보다 긴 화면에서
 * 아래가 비고, 셸은 폭만 480px 로 고정되고 높이는 dvh 라 상한이 없다.
 * 높이 상수는 아래 골격 마크업과 짝이다(기록 py-5+3줄, 매물 py-2.5+썸네일 80).
 */
const listBox = ref<HTMLElement | null>(null)
const { height: listBoxHeight } = useElementSize(listBox)
const skeletonCount = computed(() => {
  // 기록은 카드(124) + 사이 띠(18), 매물은 카드(100) — 매물 사이에는 선이 없다.
  const cardHeight = tab.value === 'history' ? 142 : 100
  // 재기 전(0) 에는 가장 좁은 화면 기준으로 깔고, 실측이 오면 늘어난다.
  return Math.max(3, Math.ceil(listBoxHeight.value / cardHeight))
})

/**
 * 관심 매물은 서버에 있고 로그인이 필요하다. 로그인하지 않았으면 호출해 봐야 401 이라
 * 아예 부르지 않고 안내를 띄운다(`auth.status` 가 확정되기 전에는 판단을 미룬다).
 */
const needsLogin = computed(() => tab.value === 'favorites' && auth.status === 'anonymous')

/**
 * 로그인은 했는데 닉네임이 없다. 백엔드가 이 상태의 요청을 403 `PROFILE_INCOMPLETE` 로
 * 막으므로(jb-backend e11ac1a) 역시 부르지 않는다 — 부르면 '못 불러왔다'는 오류로 보이지만
 * 사실은 **사용자가 할 일이 남은 것**이라, 오류가 아니라 안내로 갈라야 한다.
 */
const needsNickname = computed(() => tab.value === 'favorites' && auth.needsProfile)

/**
 * 탭을 옮길 때마다 받아온다. 세 벌을 한 번에 받으면 첫 화면이 그만큼 늦어진다.
 *
 * `quiet` 는 **보던 화면을 지우지 않고** 다시 받는 것이다 — 골격도 실패 화면도 띄우지
 * 않고, 도착하면 목록만 갈아 끼운다. 되살아날 때 쓴다(아래 onActivated): 그 사이
 * 목록이 달라졌을 수 있어 다시 받긴 해야 하는데, 골격을 깔면 스크롤 자리가 사라져
 * 화면을 살려 둔 뜻이 없어진다.
 */
async function load(which: Tab, quiet = false) {
  if (which === 'favorites' && !auth.canUseApi) {
    // 조용한 갱신은 안내 화면(로그인·닉네임)을 건드리지 않는다.
    if (quiet) return
    // 복원이 아직 안 끝났으면(idle·restoring) 로그인 여부를 모르는 상태다. 그때
    // 빈 목록을 보여주면 '찜한 게 없다'는 거짓말이 되므로 로딩을 유지하고, 상태가
    // 확정되면 아래 watch 가 다시 부른다. 비로그인·닉네임 미설정이 확정된 경우에만
    // 안내로 넘긴다.
    loading.value = auth.status !== 'anonymous' && !auth.needsProfile
    return
  }
  if (!quiet) {
    loading.value = true
    error.value = null
  }
  try {
    if (which === 'history') history.value = await getSearchHistory()
    else if (which === 'favorites') {
      favorites.value = await getFavorites()
      // 이 목록은 정의상 전부 찜한 것이다 — 하트가 채워지도록 스토어에 심는다.
      favoriteIds.sync(favorites.value)
    }
  } catch {
    // 서버 문구를 그대로 띄우지 않는다 — 개발·운영 확인용이라 사용자에게 쓸 말이 아니다.
    // 조용한 갱신이 실패하면 보던 목록을 그대로 둔다 — 멀쩡한 화면을 오류로 덮지 않는다.
    if (!quiet) error.value = '목록을 불러오지 못했어요'
  } finally {
    if (!quiet) loading.value = false
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

/**
 * 날짜를 그날의 첫 장에만 남긴다(시안 172-522) — 같은 날 두 번 돌리면 카드마다
 * 같은 날짜가 연달아 찍힌다.
 *
 * 앞 장과만 비교하므로 **목록이 날짜순으로 와야** 한다 — 기록 API 도 최신순으로 준다
 * (lib/api/me.ts). 뒤섞여 오면 같은 날짜가 여러 번 나올 뿐 깨지지는 않는다.
 */
const datedHistory = computed(() =>
  filteredHistory.value.map((entry, i, list) => ({
    entry,
    showDate: i === 0 || formatDay(entry.createdAt) !== formatDay(list[i - 1].createdAt),
  })),
)

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
// load 의 둘째 인자는 quiet 라, watch 가 넘기는 '이전 값'이 새어 들어가지 않게 감싼다.
watch(tab, (t) => void load(t))

/**
 * 되살아날 때(App.vue 의 KeepAlive).
 *
 * 주소가 정본이라 먼저 맞춘다 — 지도의 하트 FAB 처럼 `?tab=` 을 달고 다시 들어오면
 * 살아남은 인스턴스는 옛 탭을 보고 있다. 탭이 바뀌면 위 watch 가 골격까지 깔고
 * 받아오므로 여기서 더 할 일이 없다.
 *
 * 같은 탭으로 돌아왔으면 조용히 다시 받는다. 세 탭 모두 그 사이 달라질 수 있다 —
 * 상세에서 찜을 풀었거나(관심 매물), 지도에서 추천을 새로 돌렸거나(이전 기록),
 * 매물을 하나 더 봤거나(최근 본 매물).
 */
let activatedOnce = false
onActivated(() => {
  const want = toTab(route.query.tab)
  const first = !activatedOnce
  activatedOnce = true
  if (want !== tab.value) return void (tab.value = want)
  restoreTop()
  // 첫 활성화는 위 onMounted 와 겹친다 — 같은 걸 두 번 받지 않는다.
  if (!first) void load(tab.value, true)
})

/*
 * 되돌아왔을 때의 스크롤. KeepAlive 는 DOM 을 떼어 보관하는데 떼는 순간 scrollTop 이
 * 0 이 되므로, 떠날 때 읽지 않고 스크롤하는 동안 계속 적어 둔다(ListingList 와 같다).
 * 그리는 데 쓰지 않으므로 반응형일 이유가 없다.
 */
let parkedTop = 0
const rememberTop = () => {
  parkedTop = listBox.value?.scrollTop ?? 0
}
const restoreTop = () => {
  if (listBox.value) listBox.value.scrollTop = parkedTop
}
// 탭을 옮기면 다른 목록이다 — 옛 자리는 버린다.
watch(tab, () => {
  parkedTop = 0
})

/**
 * 고른 탭을 주소에 적는다.
 *
 * 매물 상세를 다녀오면 이 화면은 새로 뜬다 — 주소에 없으면 무엇을 보고 있었는지 알
 * 길이 없어 첫 탭으로 돌아간다. 최근 본 매물에서 한 장을 열었다 닫으면 이전 기록이
 * 열려 있던 게 그래서다.
 *
 * 읽는 쪽은 이미 있었다(지도의 하트가 `?tab=favorites` 로 들어온다) — 쓰기만 더한다.
 * push 가 아니라 replace 다. 탭은 되돌아갈 자리가 아니라 지금 보고 있는 자리라,
 * 쌓아 두면 뒤로 가기가 탭 사이를 오간다.
 *
 * 기본 탭은 주소에서 뺀다 — /my 와 /my?tab=history 가 같은 화면이면 하나로 족하다.
 */
watch(tab, (t) => router.replace({ query: t === 'history' ? {} : { tab: t } }))
/**
 * 세션 복원이 끝나거나, 로그인 상태가 바뀌거나, 닉네임을 정하면 관심 매물을 다시 받아온다.
 *
 * **둘 다 봐야 한다.**
 * - `status` — `isAuthenticated` 로는 부족하다. 복원이 **실패**하면
 *   (restoring → anonymous) false 에서 false 로 그대로라 watch 가 돌지 않고,
 *   위에서 켜둔 로딩이 영원히 풀리지 않는다
 * - `needsProfile` — 닉네임을 정해도 `status` 는 'authenticated' 그대로라 안 바뀐다.
 *   이걸 빼면 닉네임 설정 직후 목록이 안내 화면에 멈춰 있는다
 */
watch(
  () => [auth.status, auth.needsProfile],
  () => {
    if (tab.value === 'favorites') void load('favorites')
  },
)
</script>

<template>
  <main class="flex flex-1 flex-col overflow-hidden bg-white">
    <!-- 프로필. 시안은 여기까지가 옅은 회색 판이고 그 아래부터 흰 바탕이다. -->
    <header class="safe-top shrink-0 bg-slate-100 px-2 pb-5">
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

    <!-- 골격은 마지막 한 장이 잘리게 두는 쪽이 자연스럽다 — 스크롤바만 잠깐 뜨는 걸 막는다. -->
    <div
      ref="listBox"
      class="min-h-0 flex-1"
      :class="loading ? 'overflow-hidden' : 'overflow-y-auto'"
      @scroll.passive="rememberTop"
    >
      <!--
        로딩 골격은 탭마다 다르다 — 기록 카드와 매물 카드는 높이가 아예 달라서,
        한 모양으로 때우면 도착하는 순간 목록이 통째로 밀린다. 개수는 고정하지 않는다:
        셸 높이가 dvh 라 상한이 없어서, 몇 개든 고정하면 그보다 긴 화면에서 아래가 빈다
        (skeletonCount 가 남은 높이를 카드 높이로 나눈다).
      -->
      <template v-if="loading">
        <p class="sr-only" role="status">목록을 불러오는 중</p>
        <!-- 구분도 탭을 따라간다 — 기록은 두툼한 띠, 매물은 여백뿐(아래 목록과 같은 모양). -->
        <ul
          class="divide-slate-100"
          :class="tab === 'history' ? 'divide-y-[1.125rem]' : 'px-5 pt-4'"
          aria-hidden="true"
        >
          <li v-for="i in skeletonCount" :key="i" :class="tab === 'history' && 'px-5'">
            <!-- 기록 카드: 날짜 + 거점 줄 + 조건 줄(py-5) -->
            <div v-if="tab === 'history'" class="flex flex-col gap-3 py-5">
              <BaseSkeleton class="h-5 w-32" />
              <BaseSkeleton class="h-5 w-1/2 rounded-full!" />
              <BaseSkeleton class="h-5 w-2/3" />
            </div>
            <!-- 매물 카드: 썸네일 80 + 본문 + 도넛 64(py-2.5) -->
            <div v-else class="flex gap-3 py-2.5">
              <BaseSkeleton class="size-20 shrink-0 rounded-xl!" />
              <div class="flex min-w-0 flex-1 flex-col gap-2 pt-1">
                <BaseSkeleton class="h-4 w-2/3" />
                <BaseSkeleton class="h-3 w-full" />
                <BaseSkeleton class="h-3 w-4/5" />
                <BaseSkeleton class="h-3 w-1/2" />
              </div>
              <BaseSkeleton class="size-16 shrink-0 rounded-full!" />
            </div>
          </li>
        </ul>
      </template>

      <!-- 로그인해야 볼 수 있는 탭. 호출도 하지 않고 여기서 멈춘다. -->
      <BaseEmptyState
        v-else-if="needsLogin"
        title="로그인하면 관심 매물을 볼 수 있어요"
        hint="저장한 매물은 계정에 남아 다른 기기에서도 보여요"
        action-label="로그인"
        @action="loginPrompt.require({ redirect: '/my?tab=favorites' })"
      />

      <!-- 로그인은 했지만 닉네임이 없다. 오류가 아니라 남은 할 일이다. -->
      <BaseEmptyState
        v-else-if="needsNickname"
        title="닉네임을 정하면 관심 매물을 볼 수 있어요"
        hint="가입을 마치면 저장한 매물이 계정에 남아요"
        action-label="닉네임 설정"
        @action="router.push({ name: 'nickname', query: { redirect: '/my?tab=favorites' } })"
      />

      <!--
        실패를 빈 목록으로 보여주면 '찜한 게 없다'는 거짓말이 된다.
        조판은 매물 상세·추천 결과의 실패 화면과 같다 — 세 곳이 같은 사고를 말한다.
      -->
      <div v-else-if="error" class="px-5 py-16 text-center">
        <p class="font-semibold text-slate-900">{{ error }}</p>
        <p class="mt-1 text-sm text-slate-500">잠시 후 다시 시도해 주세요</p>
        <button
          type="button"
          class="mt-5 h-11 rounded-full bg-brand-500 px-6 text-sm font-semibold text-white"
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
          <!--
            기록 사이는 실선이 아니라 두툼한 회색 띠다(시안 실측 18px). 카드 한 장이
            날짜·거점·조건 3줄·가중치 4줄이라 1px 선으로는 어디까지가 한 번의 추천인지
            읽히지 않는다. 띠는 화면 폭을 가로지르므로 좌우 여백은 항목이 가진다.
          -->
          <ul v-else class="divide-y-[1.125rem] divide-slate-100">
            <li v-for="h in datedHistory" :key="h.entry.id" class="px-5">
              <SearchHistoryCard :entry="h.entry" :show-date="h.showDate" />
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
        <!-- 카드의 상하 여백이 10px 이라 탭 바로 아래에 붙는다 — 목록 머리에만 더 준다. -->
        <ul v-else class="px-5 pt-4">
          <li v-for="l in favorites" :key="l.id">
            <!-- 이 탭의 매물은 정의상 전부 찜한 것이라 하트가 채워져 있다. -->
            <ListingCard :listing="l" />
          </li>
        </ul>
      </template>

      <template v-else>
        <BaseEmptyState
          v-if="!recentlyViewed.count"
          title="최근 본 매물이 없어요"
          hint="매물을 둘러보면 여기에 쌓여요"
          action-label="매물 보러 가기"
          @action="goMap"
        />
        <ul v-else class="px-5 pt-4">
          <li v-for="l in recentlyViewed.items" :key="l.id">
            <ListingCard :listing="l" />
          </li>
        </ul>
      </template>
    </div>
  </main>
</template>
