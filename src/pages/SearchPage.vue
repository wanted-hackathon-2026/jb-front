<script setup lang="ts">
import { ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import AppChip from '@/components/ui/AppChip.vue'
import { searchPlaces } from '@/lib/api/places'
import { MAX_ANCHORS, useAnchorsStore } from '@/stores/anchors'
import type { PlaceSuggestion } from '@/types/domain'

const router = useRouter()
const anchors = useAnchorsStore()

const keyword = ref('')
const results = ref<PlaceSuggestion[]>([])

// 입력이 비면 자동완성 대신 최근 목록으로 돌아간다.
watch(keyword, async (q) => {
  results.value = q.trim() ? await searchPlaces(q) : []
})

function pick(place: PlaceSuggestion) {
  anchors.add(place)
  anchors.rememberSearch(place.name)
  keyword.value = ''
  if (!anchors.canAddMore) router.push({ name: 'map' })
}

/** 입력어와 일치하는 앞부분만 강조한다. */
function split(name: string) {
  const q = keyword.value.trim()
  const i = q ? name.indexOf(q) : -1
  if (i < 0) return [name, '', ''] as const
  return [name.slice(0, i), name.slice(i, i + q.length), name.slice(i + q.length)] as const
}
</script>

<template>
  <main class="flex flex-1 flex-col bg-white">
    <div class="safe-top flex items-center gap-1 px-2 py-3">
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
      <div class="flex flex-1 items-center rounded-full bg-slate-100 px-4">
        <input
          v-model="keyword"
          type="search"
          class="h-11 flex-1 bg-transparent outline-none placeholder:text-slate-400"
          placeholder="직장, 학교 등 자주가는 곳 검색"
          autofocus
        />
      </div>
    </div>

    <div v-if="anchors.hasAnchors" class="border-b border-slate-100 px-5 pb-4">
      <p class="mb-2 text-sm font-bold text-slate-900">
        등록한 거점
        <span class="ml-1 text-xs font-normal text-slate-500">
          주요 거점 순으로 정렬하세요 · 최대 {{ MAX_ANCHORS }}곳
        </span>
      </p>
      <div class="flex flex-wrap gap-2">
        <AppChip
          v-for="a in anchors.anchors"
          :key="a.id"
          :label="a.name"
          removable
          @remove="anchors.remove(a.id)"
        />
      </div>
    </div>

    <!-- 검색어가 있으면 자동완성, 없으면 최근 검색 -->
    <ul v-if="keyword.trim()" class="flex-1 overflow-y-auto">
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

    <div v-else class="flex-1 overflow-y-auto px-5 pt-4">
      <div class="mb-2 flex items-center justify-between">
        <p class="text-sm font-bold text-slate-900">최근 검색</p>
        <button
          v-if="anchors.recentSearches.length"
          type="button"
          class="text-sm text-slate-400"
          @click="anchors.clearSearches"
        >
          전체삭제
        </button>
      </div>
      <ul v-if="anchors.recentSearches.length" class="overflow-hidden rounded-xl bg-slate-50">
        <li
          v-for="k in anchors.recentSearches"
          :key="k"
          class="flex items-center justify-between border-b border-white px-4 last:border-0"
        >
          <button type="button" class="flex-1 py-3 text-left text-slate-800" @click="keyword = k">
            {{ k }}
          </button>
          <button
            type="button"
            class="grid size-8 place-items-center text-slate-400"
            :aria-label="`${k} 검색 기록 삭제`"
            @click="anchors.forgetSearch(k)"
          >
            <svg
              viewBox="0 0 16 16"
              class="size-3.5"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <path d="M2 2l12 12M14 2L2 14" />
            </svg>
          </button>
        </li>
      </ul>
      <p v-else class="py-10 text-center text-sm text-slate-400">최근 검색 기록이 없어요</p>
    </div>
  </main>
</template>
