import { computed } from 'vue'
import { defineStore } from 'pinia'
import { useStorage } from '@vueuse/core'
import type { Anchor, PlaceSuggestion } from '@/types/domain'
import { localId } from '@/lib/id'

/** 시안의 칩 영역이 감당하는 개수. 백엔드 제약이 정해지면 맞춘다. */
export const MAX_ANCHORS = 3

export const useAnchorsStore = defineStore('anchors', () => {
  const anchors = useStorage<Anchor[]>('jb:anchors:v1', [])
  const recentSearches = useStorage<string[]>('jb:recent-searches:v1', [])

  const hasAnchors = computed(() => anchors.value.length > 0)
  const canAddMore = computed(() => anchors.value.length < MAX_ANCHORS)

  function add(place: PlaceSuggestion) {
    if (!canAddMore.value) return
    if (anchors.value.some((a) => a.name === place.name)) return
    anchors.value.push({
      id: localId('anchor'),
      name: place.name,
      address: place.address,
      // 지도 SDK 연동 전까지는 좌표를 쓰지 않는다.
      x: 0,
      y: 0,
    })
  }

  const remove = (id: string) => {
    anchors.value = anchors.value.filter((a) => a.id !== id)
  }

  function rememberSearch(keyword: string) {
    const q = keyword.trim()
    if (!q) return
    recentSearches.value = [q, ...recentSearches.value.filter((k) => k !== q)].slice(0, 10)
  }

  const forgetSearch = (keyword: string) => {
    recentSearches.value = recentSearches.value.filter((k) => k !== keyword)
  }
  const clearSearches = () => {
    recentSearches.value = []
  }

  return {
    anchors,
    recentSearches,
    hasAnchors,
    canAddMore,
    add,
    remove,
    rememberSearch,
    forgetSearch,
    clearSearches,
  }
})
