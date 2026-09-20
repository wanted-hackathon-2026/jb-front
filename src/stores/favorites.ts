import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { addFavorite, removeFavorite } from '@/lib/api/favorites'
import { ApiError } from '@/lib/api/http'
import { ERROR_CODE } from '@/types/backend'
import type { Listing } from '@/types/domain'
import { useAuthStore } from './auth'
import { useNoticeStore } from './notice'

/**
 * 찜한 매물 id — **서버가 정본이다.**
 *
 * 화면 여러 곳이 같은 값을 봐야 해서 스토어로 둔다. 목록 카드의 하트와 상세의 저장
 * 버튼이 각자 상태를 들고 있으면, 상세에서 저장하고 뒤로 나왔을 때 하트가 비어 있다.
 *
 * **localStorage 에 담지 않는다.** 예전에는 매물이 전부 목이라 서버에 보낼 수 있는 id 가
 * 없어서 이 기기에만 쌓았는데, 그러다 보니 다른 기기에서 찜한 것이 반영되지 않았다.
 * 목록·상세 응답이 `favorite` 를 함께 주므로(선택적 인증 — 비로그인이면 전부 false)
 * 받아올 때마다 그 값으로 덮는다. 로컬에 남겨두면 그게 서버 값을 이겨 다시 어긋난다.
 *
 * 그래서 **모르는 매물은 '안 찜함'이 아니라 그냥 모르는 것**이다. 아직 받아오지 않은
 * 매물의 하트가 비어 보이는 건 정상이고, 목록이 도착하면 채워진다.
 */
export const useFavoritesStore = defineStore('favorites', () => {
  const auth = useAuthStore()
  const notice = useNoticeStore()

  /** 서버가 알려준 값 + 내 낙관적 토글까지 반영한 **지금 값**. */
  const ids = ref<string[]>([])

  const has = (id: string) => ids.value.includes(id)

  function set(id: string, on: boolean) {
    const at = ids.value.indexOf(id)
    if (on && at === -1) ids.value.push(id)
    else if (!on && at !== -1) ids.value.splice(at, 1)
  }

  /**
   * 받아온 매물들의 찜 여부를 반영한다. 목록·상세를 부른 화면이 호출한다.
   *
   * **받아온 것만** 건드린다 — 통째로 갈아치우면 지도 영역 밖 매물의 상태가 사라진다.
   */
  function sync(listings: Listing[]) {
    for (const l of listings) set(l.id, l.favorite)
  }

  /**
   * 찜하기/해제. **낙관적이고 절대 reject 하지 않는다** — 호출부가 클릭 핸들러라
   * 던지면 unhandled rejection 이 된다.
   */
  async function toggle(id: string) {
    // 화면이 먼저 로그인을 받지만(ListingCard·ListingDetailPage), 닉네임 미설정은
    // 거기서 안 걸러진다. 그대로 보내면 403 이라 여기서 막는다.
    if (!auth.canUseApi) return

    const was = has(id)
    set(id, !was)
    try {
      if (was) await removeFavorite(id)
      else await addFavorite(id)
    } catch (e) {
      // 이미 찜한 매물을 또 찜한 것뿐이다. 목적은 달성됐으니 되돌리지 않는다.
      // (해제는 서버가 멱등이라 없는 걸 지워도 204 다 — 여기로 오지 않는다.)
      if (e instanceof ApiError && e.code === ERROR_CODE.FAVORITE_ALREADY_EXISTS) return
      set(id, was)
      notice.error(
        e instanceof ApiError && e.code === ERROR_CODE.PROPERTY_NOT_FOUND
          ? '지금은 없는 매물이에요'
          : '찜을 저장하지 못했어요',
      )
    }
  }

  return { ids, count: computed(() => ids.value.length), has, sync, toggle }
})
