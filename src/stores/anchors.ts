import { computed, ref, watch } from 'vue'
import { defineStore } from 'pinia'
import { useStorage } from '@vueuse/core'
import type { Anchor, PlaceSuggestion } from '@/types/domain'
import { localId } from '@/lib/id'
import { createWorkplace, deleteWorkplace, listWorkplaces } from '@/lib/api/workplaces'
import { ApiError, NotFoundError } from '@/lib/api/http'
import { ERROR_CODE } from '@/types/backend'
import { useAuthStore } from './auth'
import { useNoticeStore } from './notice'

/**
 * 서버가 거절한 이유를 사용자 말로 옮긴다. `detail` 을 그대로 쓰지 않는 건 명세가
 * 그걸 "개발·운영 확인용"이라고 못박았기 때문이다(google-oauth-login.md §6).
 */
function reasonOf(e: unknown, fallback: string): string {
  if (!(e instanceof ApiError)) return fallback
  switch (e.code) {
    case ERROR_CODE.ADDRESS_NOT_GEOCODABLE:
      // 지오코딩은 도로명 주소를 기대한다. 지도 핀으로 잡은 지번 주소가 여기 걸린다.
      return '이 주소로는 위치를 찾을 수 없어요. 도로명 주소로 다시 선택해 주세요'
    case ERROR_CODE.GEOCODING_UNAVAILABLE:
      return '주소 변환 서비스가 잠시 불안정해요. 잠시 후 다시 시도해 주세요'
    case ERROR_CODE.PROFILE_INCOMPLETE:
      // 닉네임을 정해야 나머지 API 가 열린다(stores/auth.ts 의 needsProfile).
      return '닉네임을 먼저 설정해 주세요'
    default:
      return fallback
  }
}

/** 시안의 칩 영역이 감당하는 개수. 서버에는 개수 제한이 없다 — 이건 화면 사정이다. */
export const MAX_ANCHORS = 3

/**
 * 서버에 올라가기 전(또는 올라가지 못한) 거점의 id 접두사. 서버 id 는 UUID 라
 * 섞이지 않는다(lib/id.ts). 삭제할 때 서버를 부를지 가르는 기준이 된다.
 */
const LOCAL_PREFIX = 'anchor'

/**
 * 거점 스토어. 로그인 여부에 따라 두 가지 모드로 돈다:
 *
 * - **비로그인**: 예전 그대로 localStorage 에만 쌓인다. 거점 설정이 로그인을
 *   요구하지 않아야 첫 진입이 막히지 않는다.
 * - **로그인**: `/api/workplaces` 가 정본이다. 로그인 시점에 서버 목록으로 덮고,
 *   추가할 때마다 서버에 올린다.
 *
 * 추가는 **낙관적**이다 — 먼저 로컬에 넣어 화면이 즉시 반응하고, 서버 응답이 오면
 * id 와 좌표를 서버 것으로 바꿔 끼운다. 서버 좌표가 정본인 이유는 VWorld 지오코딩
 * 결과이기 때문이다(lib/api/workplaces.ts).
 */
export const useAnchorsStore = defineStore('anchors', () => {
  const auth = useAuthStore()
  const notice = useNoticeStore()

  const anchors = useStorage<Anchor[]>('jb:anchors:v1', [])
  const recentSearches = useStorage<string[]>('jb:recent-searches:v1', [])
  /**
   * 최근 등록한 거점 — 현재 목록(anchors)과 다르다. 거점을 지워도 여기엔 남아서
   * 다시 등록할 때 검색 없이 꺼내 쓴다. 그래서 좌표까지 통째로 들고 있는다.
   */
  const recentAnchors = useStorage<PlaceSuggestion[]>('jb:recent-anchors:v1', [])

  const syncing = ref(false)

  const hasAnchors = computed(() => anchors.value.length > 0)
  const canAddMore = computed(() => anchors.value.length < MAX_ANCHORS)

  /** 서버 목록으로 로컬을 덮는다. 로그인 직후에 돈다. */
  async function syncFromServer() {
    if (!auth.isAuthenticated) return
    syncing.value = true
    try {
      anchors.value = await listWorkplaces()
    } catch (e) {
      notice.error(reasonOf(e, '거점을 불러오지 못했어요'))
    } finally {
      syncing.value = false
    }
  }

  /**
   * 거점 추가. **절대 reject 하지 않는다** — 호출부(SearchPage·MapPage·
   * AnchorPickerLayer)가 await 하지 않고 부르므로, 던지면 unhandled rejection 이 된다.
   * 실패는 토스트로만 알린다(stores/notice.ts).
   */
  async function add(place: PlaceSuggestion) {
    if (!canAddMore.value) return
    if (anchors.value.some((a) => a.name === place.name)) return

    const optimisticId = localId(LOCAL_PREFIX)
    anchors.value.push({
      id: optimisticId,
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

    if (!auth.isAuthenticated) return

    try {
      const saved = await createWorkplace(place.name, place.address)
      // 낙관적으로 넣은 자리를 서버 값으로 바꿔 끼운다. 그 사이 사용자가 지웠으면
      // 되살리지 않는다 — 지운 게 나중 의사다.
      const at = anchors.value.findIndex((a) => a.id === optimisticId)
      if (at !== -1) anchors.value[at] = saved
    } catch (e) {
      /*
       * 실패를 두 가지로 가른다.
       *
       * - **영구 실패**(ADDRESS_NOT_GEOCODABLE): 주소가 도로명이 아니라서 나는 거라
       *   재시도해도 결과가 같다. 화면에만 남겨두면 사용자는 등록된 줄 알고 있다가
       *   다음 로그인 때 syncFromServer 가 서버 목록으로 덮으면서 **조용히 사라지는
       *   것**을 보게 된다. 사라질 거면 지금 사라져야 원인과 결과가 붙는다.
       * - **일시적 실패**(네트워크·502): 로컬에 남긴다. 다음에 다시 시도하면 되고,
       *   방금 고른 거점이 눈앞에서 사라지는 쪽이 더 혼란스럽다.
       */
      const permanent = e instanceof ApiError && e.code === ERROR_CODE.ADDRESS_NOT_GEOCODABLE
      if (permanent) {
        const at = anchors.value.findIndex((a) => a.id === optimisticId)
        if (at !== -1) anchors.value.splice(at, 1)
      }
      notice.error(reasonOf(e, '거점을 저장하지 못했어요'))
    }
  }

  const forgetRecentAnchor = (name: string) => {
    recentAnchors.value = recentAnchors.value.filter((p) => p.name !== name)
  }
  const clearRecentAnchors = () => {
    recentAnchors.value = []
  }

  /**
   * 거점 삭제. `add()` 를 뒤집은 모양이라 성질도 같다 — **낙관적이고, 절대 reject 하지
   * 않는다.** 호출부(SearchPage·MapPage)가 await 하지 않으므로 던지면 unhandled
   * rejection 이 된다.
   *
   * 서버까지 지우는 게 핵심이다. 예전에는 로컬에서만 지워져서 다음 로그인 때
   * syncFromServer 가 서버 목록으로 덮으며 **지운 거점이 되살아났다.**
   *
   * 404 는 성공으로 친다. 이미 서버에 없다면 목적은 달성된 것이고, 되돌려 놓으면
   * 영영 지울 수 없는 거점이 된다. 백엔드에 DELETE 가 구현되기 전인 지금은 미매핑
   * 경로라 항상 여기로 떨어진다 — 즉 구현 전까지는 예전과 똑같이 로컬 삭제로 끝나고,
   * 구현되는 순간 조용히 진짜 삭제가 된다(lib/api/workplaces.ts).
   */
  async function remove(id: string) {
    const at = anchors.value.findIndex((a) => a.id === id)
    if (at === -1) return
    const [removed] = anchors.value.splice(at, 1)

    // 서버에 없는 거점이다 — 비로그인으로 넣었거나 add() 의 등록이 실패한 것.
    if (!auth.isAuthenticated || id.startsWith(`${LOCAL_PREFIX}_`)) return

    try {
      await deleteWorkplace(id)
    } catch (e) {
      if (e instanceof NotFoundError) return
      // 실패를 삼키면 화면에서만 사라졌다가 다음 로그인에 되살아난다 — 고치려던 바로
      // 그 증상이다. 지운 자리에 되돌려 놓고 실패를 말한다.
      anchors.value.splice(Math.min(at, anchors.value.length), 0, removed)
      notice.error(reasonOf(e, '거점을 삭제하지 못했어요'))
    }
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

  /**
   * 로그인하면 서버 목록을 가져오고, 로그아웃하면 로컬을 비운다.
   * 비운다 = 그 목록은 방금 나간 사용자의 것이라 다음 사람에게 보이면 안 된다.
   * (비로그인으로 시작한 손님의 목록은 이 전이가 일어나지 않아 그대로 남는다.)
   */
  watch(
    () => auth.isAuthenticated,
    (loggedIn, was) => {
      if (loggedIn) void syncFromServer()
      else if (was) anchors.value = []
    },
  )

  return {
    anchors,
    recentSearches,
    recentAnchors,
    syncing,
    hasAnchors,
    canAddMore,
    add,
    remove,
    syncFromServer,
    forgetRecentAnchor,
    clearRecentAnchors,
    rememberSearch,
    forgetSearch,
    clearSearches,
  }
})
