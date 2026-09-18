import { computed } from 'vue'
import { useStorage } from '@vueuse/core'
import { defineStore } from 'pinia'

/**
 * 찜한 매물 id.
 *
 * 화면 여러 곳이 **같은 값을 봐야 해서** 스토어로 둔다. 목록 카드의 하트와 상세의 저장
 * 버튼이 각자 상태를 들고 있으면, 상세에서 저장하고 뒤로 나왔을 때 하트가 비어 있고
 * 저장한 매물을 다시 열어도 '저장하기'라고 적혀 있다.
 *
 * ⚠️ **아직 서버와 주고받지 않는다.** 찜 API 는 있지만(lib/api/favorites.ts) 매물 id 가
 * 목이라 붙일 수 없다. 지금은 이 기기에만 남고, 매물 API 가 실제 백엔드로 바뀔 때
 * 여기 toggle 이 서버 호출이 들어갈 자리다.
 *
 * 로그인 여부로 나누지 않는 것도 그 때문이다 — 저장을 누르기 전에 로그인을 받는 건
 * 화면 몫이고(ListingCard·ListingDetailPage), 서버에 사용자별로 나뉘어 저장되기
 * 시작하면 이 키는 통째로 사라진다.
 */
export const useFavoritesStore = defineStore('favorites', () => {
  const ids = useStorage<string[]>('jb:favorites:v1', [])

  const has = (id: string) => ids.value.includes(id)

  /** 서버가 '찜한 매물'이라고 알려준 것을 로컬에도 반영할 때 쓴다(마이페이지). */
  function add(id: string) {
    if (!has(id)) ids.value.push(id)
  }

  function toggle(id: string) {
    const at = ids.value.indexOf(id)
    if (at === -1) ids.value.push(id)
    else ids.value.splice(at, 1)
  }

  return { ids, count: computed(() => ids.value.length), has, add, toggle }
})
