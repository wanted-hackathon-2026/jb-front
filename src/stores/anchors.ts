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
  /**
   * 최근 등록한 거점 — 현재 목록(anchors)과 다르다. 거점을 지워도 여기엔 남아서
   * 다시 등록할 때 검색 없이 꺼내 쓴다. 그래서 좌표까지 통째로 들고 있는다.
   */
  const recentAnchors = useStorage<PlaceSuggestion[]>('jb:recent-anchors:v1', [])

  const hasAnchors = computed(() => anchors.value.length > 0)
  const canAddMore = computed(() => anchors.value.length < MAX_ANCHORS)

  function add(place: PlaceSuggestion) {
    if (!canAddMore.value) return
    if (anchors.value.some((a) => a.name === place.name)) return
    anchors.value.push({
      id: localId('anchor'),
      name: place.name,
      address: place.address,
      x: place.x,
      y: place.y,
    })
    // 실제로 등록된 것만 히스토리에 남긴다(가득 찼거나 중복이면 위에서 빠져나간다).
    recentAnchors.value = [
      place,
      ...recentAnchors.value.filter((p) => p.name !== place.name),
    ].slice(0, 10)
  }

  const forgetRecentAnchor = (name: string) => {
    recentAnchors.value = recentAnchors.value.filter((p) => p.name !== name)
  }
  const clearRecentAnchors = () => {
    recentAnchors.value = []
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
    recentAnchors,
    hasAnchors,
    canAddMore,
    add,
    remove,
    forgetRecentAnchor,
    clearRecentAnchors,
    rememberSearch,
    forgetSearch,
    clearSearches,
  }
})
