<script setup lang="ts">
import BaseSkeleton from '@/components/BaseSkeleton.vue'
import { computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import BaseChip from '@/components/BaseChip.vue'
import { searchPlaces } from '@/lib/api/places'
import { MAX_ANCHORS, useAnchorsStore } from '@/stores/anchors'
import type { PlaceSuggestion } from '@/types/domain'

const router = useRouter()
const anchors = useAnchorsStore()

const keyword = ref('')
const results = ref<PlaceSuggestion[]>([])
/**
 * 자동완성 요청이 날아가 있는 중.
 *
 * 이게 없으면 응답이 오기 전의 빈 목록을 화면이 '검색 결과가 없어요' 라고 말한다 —
 * 아직 안 온 것과 없는 것은 다르다. 한 글자 칠 때마다 그 거짓말이 한 번씩 스친다.
 */
const searching = ref(false)
/**
 * 자동완성이 실패했나.
 *
 * `searching` 과 짝이다. 못 받아온 것을 '검색 결과가 없어요' 로 보여주면 사용자가
 * 멀쩡히 있는 주소를 없다고 믿고 검색어를 고쳐 쓰게 된다.
 */
const failed = ref(false)

async function search(word: string) {
  searching.value = true
  failed.value = false
  try {
    const found = await searchPlaces(word)
    // 늦게 온 응답은 버린다 — 빨리 치면 앞 글자의 결과가 뒤에 도착해 방금 것을 덮는다.
    if (keyword.value.trim() !== word) return
    results.value = found
  } catch {
    if (keyword.value.trim() !== word) return
    failed.value = true
  } finally {
    // 여기서 안 풀면 골격이 영영 돈다.
    if (keyword.value.trim() === word) searching.value = false
  }
}

// 입력이 비면 자동완성 대신 최근 목록으로 돌아간다.
watch(keyword, (q) => {
  const word = q.trim()
  if (!word) {
    results.value = []
    searching.value = false
    failed.value = false
    return
  }
  void search(word)
})

function pick(place: PlaceSuggestion) {
  // 가득 찼으면 add() 가 이유를 토스트로 알리고 아무것도 하지 않는다(stores/anchors.ts).
  // 등록되지 않았으면 지도로 돌려보내지도 않는다 — 여기서 거점을 지워야 하기 때문이다.
  const full = !anchors.canAddMore
  anchors.add(place)
  if (full) return
  anchors.rememberSearch(place.name)
  keyword.value = ''
  if (!anchors.canAddMore) router.push({ name: 'map' })
}

/**
 * 시안의 두 섹션은 헤더 아이콘과 행을 눌렀을 때의 동작만 다르고 생김새가 같다.
 * 마크업을 한 벌만 두고 여기서 차이를 기술한다.
 */
const sections = computed(() => [
  {
    key: 'anchor' as const,
    title: '최근 등록한 거점',
    empty: '최근 등록한 거점이 없어요',
    removeLabel: '거점 기록 삭제',
    clear: anchors.clearRecentAnchors,
    rows: anchors.recentAnchors.map((p) => ({
      label: p.name,
      // 히스토리에 좌표까지 들고 있어서 검색 없이 바로 다시 등록된다.
      select: () => pick(p),
      forget: () => anchors.forgetRecentAnchor(p.name),
    })),
  },
  {
    key: 'search' as const,
    title: '최근 검색',
    empty: '최근 검색 기록이 없어요',
    removeLabel: '검색 기록 삭제',
    clear: anchors.clearSearches,
    rows: anchors.recentSearches.map((k) => ({
      label: k,
      select: () => (keyword.value = k),
      forget: () => anchors.forgetSearch(k),
    })),
  },
])

/**
 * 입력어와 일치하는 부분을 잘라 낸다 — `hit` 인 조각을 화면이 민트로 칠한다.
 *
 * 이름만이 아니라 주소에도 쓴다. 카카오는 이름에 없는 말도 주소로 걸어 주기 때문에
 * ("신림" → 관악산 / 서울 관악구 **신림동** 산 56-1) 이름만 칠하면 목록 대부분이
 * 왜 여기 있는지 말하지 않는 회색 줄로 남는다.
 */
function split(text: string) {
  const q = keyword.value.trim()
  if (!q) return [{ text, hit: false }]
  const parts: { text: string; hit: boolean }[] = []
  let from = 0
  // 첫 한 곳만이 아니라 나온 곳 전부를 칠한다 — 주소는 같은 말이 두 번 나오기도 한다.
  for (let i = text.indexOf(q); i >= 0; i = text.indexOf(q, from)) {
    if (i > from) parts.push({ text: text.slice(from, i), hit: false })
    parts.push({ text: q, hit: true })
    from = i + q.length
  }
  if (from < text.length) parts.push({ text: text.slice(from), hit: false })
  return parts
}
</script>

<template>
  <main class="flex min-h-0 flex-1 flex-col bg-slate-50">
    <div class="safe-top bg-white px-2 pt-3 pb-2">
      <div class="flex items-center gap-1">
        <button
          type="button"
          class="grid size-11 shrink-0 place-items-center text-slate-700"
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
        <div class="flex flex-1 items-center gap-2 rounded-full bg-slate-100 px-4">
          <input
            v-model="keyword"
            type="search"
            class="h-11 flex-1 bg-transparent outline-none placeholder:text-slate-400"
            placeholder="직장·학교 이름이나 주소"
            autofocus
          />
          <svg
            viewBox="0 0 24 24"
            class="size-5 shrink-0 text-slate-400"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            aria-hidden="true"
          >
            <circle cx="11" cy="11" r="6.5" />
            <path d="M16 16l4.5 4.5" stroke-linecap="round" />
          </svg>
        </div>
      </div>

      <!--
        누르면 무슨 일이 생기는지는 고정으로 둔다. 플레이스홀더에 넣으면 타이핑하는
        순간 사라지는데, 정작 결과를 보며 '이걸 누르면?' 이 궁금해지는 건 그 다음이다.
        '거점'은 서비스 용어라 여기서 한 번 풀어 쓴다.
      -->
      <p class="mt-2 pl-16 text-xs text-slate-500">누르면 자주 가는 곳(거점)으로 등록돼요</p>
    </div>

    <!--
      시안 프레임 5: 등록한 거점 칩은 '검색어 입력 중' 화면에만 있다.
      비어 있을 때는 최근 목록 두 섹션이 그 자리를 대신한다.
    -->
    <div
      v-if="anchors.hasAnchors && (keyword.trim() || !anchors.canAddMore)"
      class="bg-white px-5 pb-3"
    >
      <!-- 320px 에서는 제목과 안내가 한 줄에 못 들어간다 — 안내를 아래 줄로 내린다. -->
      <p class="mb-2 flex flex-wrap items-center gap-x-1.5 font-bold text-slate-900">
        <svg
          viewBox="0 0 24 24"
          class="size-5 text-brand-500"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          aria-hidden="true"
        >
          <circle cx="12" cy="12" r="6" />
          <circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none" />
          <path d="M12 2v2.5M12 19.5V22M2 12h2.5M19.5 12H22" stroke-linecap="round" />
        </svg>
        등록한 거점
        <span class="basis-full pl-6.5 text-sm font-normal text-slate-500">
          {{ anchors.canAddMore ? `최대 ${MAX_ANCHORS}곳` : '바꾸려면 지우고 다시 등록하세요' }}
        </span>
      </p>
      <div class="flex flex-wrap gap-2">
        <BaseChip
          v-for="a in anchors.anchors"
          :key="a.id"
          :label="a.name"
          removable
          @remove="anchors.remove(a.id)"
        />
      </div>
    </div>

    <!--
      결과는 흰 판을 깔지 않는다 — 위의 '등록한 거점' 블록이 흰색이라, 결과까지 흰색이면
      둘이 한 덩어리로 붙어 버린다. 시안도 결과 영역은 페이지 바탕색이다.
    -->
    <ul v-if="keyword.trim()" class="min-h-0 flex-1 overflow-y-auto">
      <!--
        구분선은 글자가 시작하는 자리에서 긋는다(시안). 행 전체가 탭 대상이라 안쪽 여백을
        줄일 수 없어서, 선은 padding 안쪽에 가상 요소로 그린다.
      -->
      <li
        v-for="p in results"
        :key="p.id"
        class="relative after:absolute after:inset-x-5 after:bottom-0 after:h-px after:bg-slate-100 last:after:hidden"
      >
        <button type="button" class="w-full px-5 py-3 text-left" @click="pick(p)">
          <p class="font-semibold text-slate-900">
            <template v-for="(part, i) in split(p.name)" :key="i">
              <span :class="{ 'text-brand-500': part.hit }">{{ part.text }}</span>
            </template>
            <span v-if="p.lines" class="font-normal text-slate-600">
              ({{ p.lines.join(', ') }})
            </span>
          </p>
          <p class="text-sm text-slate-500">
            <template v-for="(part, i) in split(p.address)" :key="i">
              <span :class="{ 'text-brand-500': part.hit }">{{ part.text }}</span>
            </template>
          </p>
        </button>
      </li>
      <!--
        아직 한 건도 없을 때만 골격을 깐다. 이미 앞 글자의 결과가 떠 있으면 그대로 두는
        편이 낫다 — 한 글자마다 목록이 회색으로 번쩍이는 게 더 산만하다.
      -->
      <template v-if="searching && !results.length">
        <li class="sr-only" role="status">검색 중</li>
        <li
          v-for="i in 5"
          :key="i"
          class="relative flex flex-col gap-2 px-5 py-3.5 after:absolute after:inset-x-5 after:bottom-0 after:h-px after:bg-slate-100 last:after:hidden"
          aria-hidden="true"
        >
          <BaseSkeleton class="h-4 w-1/2" />
          <BaseSkeleton class="h-3.5 w-3/4" />
        </li>
      </template>

      <!-- 실패가 빈 결과보다 앞선다 — 뒤에 두면 '없어요' 가 먼저 걸려 실패를 가린다. -->
      <li v-else-if="failed" class="px-5 py-10 text-center">
        <p class="text-sm text-slate-500">주소를 검색하지 못했어요</p>
        <button
          type="button"
          class="mt-3 h-11 rounded-full border border-slate-200 px-5 text-sm font-semibold text-slate-700"
          @click="search(keyword.trim())"
        >
          다시 시도
        </button>
      </li>

      <li v-else-if="!results.length" class="px-5 py-10 text-center text-sm text-slate-400">
        검색 결과가 없어요
      </li>
    </ul>

    <div v-else class="min-h-0 flex-1 overflow-y-auto px-4 pb-6">
      <section v-for="s in sections" :key="s.key" class="pt-4">
        <!-- 제목과 전체삭제는 아래 카드의 모서리에 맞춘다 — 시안도 같은 선에 선다. -->
        <div class="mb-2 flex items-center justify-between">
          <p class="flex items-center gap-1.5 font-bold text-slate-900">
            <svg
              viewBox="0 0 24 24"
              class="size-5 text-brand-500"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              aria-hidden="true"
            >
              <template v-if="s.key === 'anchor'">
                <circle cx="12" cy="12" r="6" />
                <circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none" />
                <path d="M12 2v2.5M12 19.5V22M2 12h2.5M19.5 12H22" stroke-linecap="round" />
              </template>
              <template v-else>
                <circle cx="11" cy="11" r="6.5" />
                <path d="M16 16l4.5 4.5" stroke-linecap="round" />
              </template>
            </svg>
            {{ s.title }}
          </p>
          <button
            v-if="s.rows.length"
            type="button"
            class="text-sm text-slate-400"
            @click="s.clear()"
          >
            전체삭제
          </button>
        </div>

        <ul v-if="s.rows.length" class="overflow-hidden rounded-2xl bg-white">
          <li
            v-for="row in s.rows"
            :key="row.label"
            class="relative flex items-center gap-1 px-5 after:absolute after:inset-x-5 after:bottom-0 after:h-px after:bg-slate-100 last:after:hidden"
          >
            <button
              type="button"
              class="min-h-11 flex-1 truncate py-3 text-left text-slate-800"
              @click="row.select()"
            >
              {{ row.label }}
            </button>
            <button
              type="button"
              class="grid size-8 shrink-0 place-items-center text-slate-400"
              :aria-label="`${row.label} ${s.removeLabel}`"
              @click="row.forget()"
            >
              <svg
                viewBox="0 0 16 16"
                class="size-3.5"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                aria-hidden="true"
              >
                <path d="M2 2l12 12M14 2L2 14" />
              </svg>
            </button>
          </li>
        </ul>
        <p v-else class="rounded-2xl bg-white py-10 text-center text-sm text-slate-400">
          {{ s.empty }}
        </p>
      </section>
    </div>
  </main>
</template>
