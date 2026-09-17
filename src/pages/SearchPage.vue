<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import BaseChip from '@/components/BaseChip.vue'
import { searchPlaces } from '@/lib/api/places'
import { MAX_ANCHORS, useAnchorsStore } from '@/stores/anchors'
import { useNoticeStore } from '@/stores/notice'
import type { PlaceSuggestion } from '@/types/domain'

const router = useRouter()
const anchors = useAnchorsStore()
const notice = useNoticeStore()

const keyword = ref('')
const results = ref<PlaceSuggestion[]>([])

// 입력이 비면 자동완성 대신 최근 목록으로 돌아간다.
watch(keyword, async (q) => {
  results.value = q.trim() ? await searchPlaces(q) : []
})

function pick(place: PlaceSuggestion) {
  /*
   * 가득 찼으면 add() 가 조용히 아무것도 하지 않는다(stores/anchors.ts). 그대로 두면
   * 눌러도 아무 일이 없는 화면이 되므로 여기서 이유를 말한다 — 지도에서 돋보기로
   * 언제든 이 화면에 올 수 있어서, 한도에 걸린 사용자가 실제로 여기까지 온다.
   */
  if (!anchors.canAddMore) {
    notice.error(`거점은 최대 ${MAX_ANCHORS}곳이에요. 등록된 거점을 지우고 다시 골라 주세요`)
    return
  }
  anchors.add(place)
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

/** 입력어와 일치하는 앞부분만 강조한다. */
function split(name: string) {
  const q = keyword.value.trim()
  const i = q ? name.indexOf(q) : -1
  if (i < 0) return [name, '', ''] as const
  return [name.slice(0, i), name.slice(i, i + q.length), name.slice(i + q.length)] as const
}
</script>

<template>
  <main class="flex min-h-0 flex-1 flex-col bg-slate-50">
    <div class="safe-top flex items-center gap-1 bg-white px-2 py-3">
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
      <div class="flex flex-1 items-center gap-2 rounded-full bg-slate-100 px-4">
        <input
          v-model="keyword"
          type="search"
          class="h-11 flex-1 bg-transparent outline-none placeholder:text-slate-400"
          placeholder="직장, 학교 등 자주가는 곳 검색"
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
      시안 프레임 5: 등록한 거점 칩은 '검색어 입력 중' 화면에만 있다.
      비어 있을 때는 최근 목록 두 섹션이 그 자리를 대신한다.
    -->
    <div
      v-if="anchors.hasAnchors && (keyword.trim() || !anchors.canAddMore)"
      class="bg-white px-5 pb-3"
    >
      <p class="mb-2 flex items-center gap-1.5 font-bold text-slate-900">
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
        <span class="text-sm font-normal text-slate-500">
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

    <ul v-if="keyword.trim()" class="min-h-0 flex-1 overflow-y-auto bg-white">
      <li v-for="p in results" :key="p.id" class="border-b border-slate-100">
        <button type="button" class="w-full px-5 py-3 text-left" @click="pick(p)">
          <p class="font-semibold text-slate-900">
            <template v-for="(part, i) in split(p.name)" :key="i">
              <span :class="{ 'text-brand-500': i === 1 }">{{ part }}</span>
            </template>
            <span v-if="p.lines" class="font-normal text-slate-600">
              ({{ p.lines.join(', ') }})
            </span>
          </p>
          <p class="text-sm text-slate-500">{{ p.address }}</p>
        </button>
      </li>
      <li v-if="!results.length" class="px-5 py-10 text-center text-sm text-slate-400">
        검색 결과가 없어요
      </li>
    </ul>

    <div v-else class="min-h-0 flex-1 overflow-y-auto px-4 pb-6">
      <section v-for="s in sections" :key="s.key" class="pt-4">
        <div class="mb-2 flex items-center justify-between px-1">
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
            class="flex items-center gap-1 border-b border-slate-100 px-4 last:border-0"
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
