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

/**
 * 등록할 수 있는 거점 수. 서버에는 개수 제한이 없다 — 이건 제품 결정이다.
 *
 * 이 값을 줄여도 이미 등록된 거점은 지우지 않는다. 사용자가 넣어둔 것을 말없이
 * 버리는 쪽이 더 나쁘다 — 한도를 넘긴 상태면 추가만 막히고(canAddMore), 하나씩
 * 지우면 자연히 한도 안으로 들어온다.
 */
export const MAX_ANCHORS = 1

/**
 * 한도에 걸렸을 때 하는 말. 문구를 한 곳에 두는 이유는 말하는 자리가 둘이기
 * 때문이다 — add() 와, 좌표를 찾기 전에 먼저 막는 우편번호 레이어.
 */
export const ANCHOR_LIMIT_MESSAGE = `거점은 최대 ${MAX_ANCHORS}곳이에요. 등록된 거점을 지우고 다시 골라 주세요`

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
  /**
   * **지웠는데 서버에는 아직 남아 있는 거점의 id.**
   *
   * `DELETE /api/workplaces/{id}` 가 백엔드에 없다 — WorkplaceController 에는
   * POST·GET 둘뿐이다(jb-backend e11ac1a). 그래서 삭제 요청은 미매핑 경로의 404 로
   * 떨어지고, 서버 목록에는 지운 거점이 그대로 남는다. 다음 앱 시작 때
   * syncFromServer 가 그 목록으로 로컬을 덮으면서 **지운 거점이 되살아난다.**
   *
   * 되살아나는 걸 막으려고 지운 id 를 여기 적어 두고 동기화 결과에서 걸러낸다.
   * 서버가 DELETE 를 구현하면 삭제가 204 로 끝나 묘비가 더는 쌓이지 않고, 이미 쌓인
   * 것도 서버 목록에서 사라지는 순간 syncFromServer 가 지운다 — 그때 이 저장소와
   * 아래 걸러내기를 통째로 지우면 된다.
   */
  const removedIds = useStorage<string[]>('jb:anchors-removed:v1', [])

  const syncing = ref(false)

  const hasAnchors = computed(() => anchors.value.length > 0)
  const canAddMore = computed(() => anchors.value.length < MAX_ANCHORS)

  /** 서버 목록으로 로컬을 덮는다. 로그인 직후에 돈다. */
  async function syncFromServer() {
    if (!auth.canUseApi) return
    syncing.value = true
    try {
      const rows = await listWorkplaces()
      // 서버에서 사라진 id 의 묘비는 같이 치운다 — 남겨두면 영영 자라기만 한다.
      removedIds.value = removedIds.value.filter((id) => rows.some((r) => r.id === id))
      anchors.value = rows.filter((r) => !removedIds.value.includes(r.id))
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
    /*
     * 한도에 걸리면 이유를 말한다. 여기서 알리는 이유는 부르는 곳이 여럿이기
     * 때문이다(SearchPage·AnchorPickerLayer·지도 핀 카드) — 호출부마다 같은 검사를
     * 두면 한 곳을 고칠 때 나머지가 조용히 어긋난다.
     */
    if (!canAddMore.value) {
      notice.error(ANCHOR_LIMIT_MESSAGE)
      return
    }
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

    if (!auth.canUseApi) return

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
   * 영영 지울 수 없는 거점이 된다. 다만 **화면에서 지웠다고 서버에서 지워진 건
   * 아니다** — 백엔드에 DELETE 가 아직 없어서(jb-backend e11ac1a) 모든 삭제가 미매핑
   * 404 로 떨어지고 서버 목록에는 그대로 남는다. 그래서 지운 id 를 `removedIds` 에
   * 적어 두고 다음 동기화에서 걸러낸다 — 그 설명은 선언부에 있다.
   */
  async function remove(id: string) {
    const at = anchors.value.findIndex((a) => a.id === id)
    if (at === -1) return
    const [removed] = anchors.value.splice(at, 1)

    // 서버에 없는 거점이다 — 비로그인으로 넣었거나 add() 의 등록이 실패한 것.
    if (!auth.canUseApi || id.startsWith(`${LOCAL_PREFIX}_`)) return

    try {
      await deleteWorkplace(id)
    } catch (e) {
      if (e instanceof NotFoundError) {
        /*
         * 404 는 두 가지다 — '이미 지워졌다'(목적 달성)와 'DELETE 경로 자체가 없다'
         * (지금의 백엔드). 둘을 구분할 방법이 없으므로 안전한 쪽으로 기록해 둔다:
         * 전자라면 다음 동기화에서 서버 목록에 없어 묘비가 곧 치워지고, 후자라면
         * 이 한 줄이 되살아남을 막는다.
         */
        if (!removedIds.value.includes(id)) removedIds.value = [...removedIds.value, id]
        return
      }
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
   * 서버를 부를 수 있게 되면 목록을 가져오고, 그 자격을 잃으면 로컬을 비운다.
   * 비운다 = 그 목록은 방금 나간 사용자의 것이라 다음 사람에게 보이면 안 된다.
   * (비로그인으로 시작한 손님의 목록은 이 전이가 일어나지 않아 그대로 남는다.)
   *
   * `isAuthenticated` 가 아니라 `canUseApi` 를 보는 게 중요하다. 신규 가입자는 로그인
   * 직후 닉네임이 없어 서버가 403 으로 막으므로, 그때 부르면 실패 토스트만 뜬다.
   * 닉네임을 정하는 순간 이 값이 true 로 바뀌며 **동기화가 저절로 이어진다** —
   * `isAuthenticated` 로 보면 그 시점에 이미 true 라 watch 가 돌지 않는다.
   */
  watch(
    () => auth.canUseApi,
    (usable, was) => {
      if (usable) void syncFromServer()
      // `was` 는 immediate 첫 호출에서 undefined 다 — 그때는 비울 것도 없다.
      else if (was) anchors.value = []
    },
    /*
     * 이 스토어는 지도·검색 화면이 처음 열릴 때 만들어진다. 그때 이미 로그인이 끝나
     * 있으면 **전이가 없어 watch 가 돌지 않는다** — 로그인한 채로 /my 를 새로고침하고
     * 지도로 넘어오는 경로가 그렇다. 그러면 서버 목록을 영영 안 부르고 localStorage 의
     * 낡은 값만 보인다(다른 기기에서 추가한 거점이 안 보인다).
     */
    { immediate: true },
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
