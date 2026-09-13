<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import AppChip from '@/components/ui/AppChip.vue'
import BottomSheet from '@/components/ui/BottomSheet.vue'
import SegmentedControl from '@/components/ui/SegmentedControl.vue'
import FilterPanel from '@/features/listings/FilterPanel.vue'
import ListingCard from '@/features/listings/ListingCard.vue'
import MapPlaceholder from '@/features/map/MapPlaceholder.vue'
import MapView from '@/features/map/MapView.vue'
import { hasKakaoKey } from '@/lib/kakao'
import { useFiltersStore } from '@/stores/filters'
import { coordToAddress } from '@/api/places'
import { getNearbyListings, getScoredListings } from '@/mocks/listings'
import { MAX_ANCHORS, useAnchorsStore } from '@/stores/anchors'
import type { Listing } from '@/types/domain'

const router = useRouter()
const anchors = useAnchorsStore()
const filters = useFiltersStore()

const tab = ref<'listings' | 'filters'>('listings')
const sheet = ref<'peek' | 'full'>('peek')
const listings = ref<Listing[]>([])
const loading = ref(true)

const TABS = [
  { value: 'listings' as const, label: '주변 매물' },
  { value: 'filters' as const, label: '검색 필터' },
]

async function load() {
  loading.value = true
  listings.value = anchors.hasAnchors ? await getScoredListings() : await getNearbyListings()
  loading.value = false
}

onMounted(load)
// 거점이 바뀌면 점수 유무가 달라진다 — 목록을 다시 받는다.
watch(() => anchors.anchors.length, load)

const total = computed(() => listings.value.length)

/** 지도에서 찍은 지점 — 주소를 확인한 뒤 거점으로 등록할지 고른다. */
const picked = ref<{ x: number; y: number; address: string } | null>(null)
const picking = ref(false)

async function onPick(coord: { x: number; y: number }) {
  picking.value = true
  picked.value = { ...coord, address: '' }
  const address = await coordToAddress(coord.x, coord.y)
  // 주소를 기다리는 동안 다른 지점을 찍었으면 늦게 온 응답은 버린다.
  if (picked.value?.x === coord.x && picked.value?.y === coord.y) {
    picked.value = { ...coord, address }
  }
  picking.value = false
}

function addPickedAnchor() {
  if (!picked.value) return
  const { x, y, address } = picked.value
  anchors.add({ id: `pin_${x}_${y}`, name: address, address, x, y })
  picked.value = null
}
</script>

<template>
  <main class="relative flex-1 overflow-hidden" style="--sheet-full: 78dvh; --sheet-peek: 7.5rem">
    <!-- 키가 없으면 자리표시자로 돈다. 키를 넣는 순간 실제 지도로 바뀐다. -->
    <MapView
      v-if="hasKakaoKey"
      :listings="listings"
      :anchors="anchors.anchors"
      :max-minutes="filters.maxMinutes"
      @pick="onPick"
    />
    <MapPlaceholder v-else :show-radius="anchors.hasAnchors" @pick="onPick" />

    <!-- 상단 검색 바. 거점이 있으면 칩이 들어차고, 없으면 placeholder 가 보인다. -->
    <div class="safe-top absolute inset-x-0 top-0 z-30 p-3">
      <div class="flex items-center gap-2 rounded-full bg-white p-2 pl-3 shadow-md">
        <div class="flex flex-1 items-center gap-2 overflow-x-auto">
          <template v-if="anchors.hasAnchors">
            <AppChip
              v-for="a in anchors.anchors"
              :key="a.id"
              :label="a.name"
              removable
              @remove="anchors.remove(a.id)"
            />
          </template>
          <span v-else class="truncate text-slate-400">직장, 학교, 자주 가는 곳 검색</span>
        </div>
        <button
          type="button"
          class="grid size-10 shrink-0 place-items-center rounded-full text-slate-600"
          aria-label="거점 검색"
          @click="router.push({ name: 'search' })"
        >
          <svg
            viewBox="0 0 24 24"
            class="size-5"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <circle cx="11" cy="11" r="7" />
            <path d="M20 20l-4-4" stroke-linecap="round" />
          </svg>
        </button>
      </div>
    </div>

    <!-- 지도에서 찍은 위치의 주소 확인 -->
    <div
      v-if="picked"
      class="absolute inset-x-4 bottom-[calc(var(--sheet-peek)+1rem)] z-20 rounded-xl bg-white p-4 shadow-lg"
    >
      <p class="text-xs text-slate-500">선택한 위치</p>
      <p class="mt-0.5 font-semibold text-slate-900">
        {{ picking ? '주소를 확인하는 중…' : picked.address }}
      </p>
      <div class="mt-3 flex gap-2">
        <button
          type="button"
          class="h-11 flex-1 rounded-full border border-slate-200 text-sm font-semibold text-slate-600"
          @click="picked = null"
        >
          닫기
        </button>
        <button
          type="button"
          class="h-11 flex-1 rounded-full bg-brand-500 text-sm font-semibold text-white disabled:opacity-40"
          :disabled="picking || !anchors.canAddMore"
          @click="addPickedAnchor"
        >
          {{ anchors.canAddMore ? '거점으로 추가' : `거점은 최대 ${MAX_ANCHORS}곳` }}
        </button>
      </div>
    </div>

    <!-- 우하단 플로팅 버튼 -->
    <!-- 핀 확인 카드가 뜨면 버튼을 위로 밀어 겹치지 않게 한다. -->
    <div
      class="absolute right-4 z-20 flex flex-col gap-3 transition-[bottom] duration-200"
      :class="
        picked
          ? 'bottom-[calc(var(--sheet-peek)+10.5rem)]'
          : 'bottom-[calc(var(--sheet-peek)+1rem)]'
      "
    >
      <button
        type="button"
        class="grid size-12 place-items-center rounded-full bg-white shadow-md"
        aria-label="마이"
      >
        <svg viewBox="0 0 24 24" class="size-6" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="8" r="3.5" />
          <path d="M4.5 20a7.5 7.5 0 0115 0" stroke-linecap="round" />
        </svg>
      </button>
      <button
        type="button"
        class="grid size-12 place-items-center rounded-full bg-white shadow-md"
        aria-label="관심 매물"
      >
        <svg viewBox="0 0 24 24" class="size-6" fill="currentColor">
          <path d="M12 20s-7-4.5-7-9a4 4 0 017-2.6A4 4 0 0119 11c0 4.5-7 9-7 9z" />
        </svg>
      </button>
    </div>

    <BottomSheet v-model="sheet">
      <div class="flex shrink-0 justify-center pb-3">
        <SegmentedControl v-model="tab" :options="TABS" />
      </div>

      <div class="min-h-0 flex-1 overflow-y-auto">
        <FilterPanel v-if="tab === 'filters'" />

        <template v-else>
          <div class="flex items-baseline justify-between px-5 pb-1">
            <p class="text-sm text-slate-500">총 {{ total }}건</p>
            <p v-if="anchors.hasAnchors" class="text-sm font-semibold text-slate-700">매칭점수순</p>
          </div>
          <p v-if="loading" class="px-5 py-10 text-center text-sm text-slate-400">
            매물을 불러오는 중…
          </p>
          <ul v-else class="divide-y divide-slate-100 px-5">
            <li v-for="l in listings" :key="l.id">
              <ListingCard :listing="l" />
            </li>
          </ul>
        </template>
      </div>
    </BottomSheet>
  </main>
</template>
