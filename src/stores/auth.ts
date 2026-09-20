/**
 * 로그인 상태.
 *
 * 로그인 자체를 시작하지는 않는다 — 구글이 그린 버튼을 사용자가 눌러야 ID 토큰이
 * 나오기 때문이다(lib/google.ts). 화면(`LoginPrompt`)이 토큰을 받아 `login()` 에 넘긴다.
 *
 * 토큰은 여기 두지 않는다 — 전송 계층(lib/api/http.ts)이 메모리에 들고 있고,
 * 이 스토어는 '누가 로그인했나'만 안다. 새로고침 복원은 `restore()` 다.
 */
import { computed, ref, watch } from 'vue'
import { defineStore } from 'pinia'
import { useStorage } from '@vueuse/core'
import type { AccountResponse } from '@/types/backend'
import { getAccount, updateNickname as patchNickname } from '@/lib/api/account'
import { loginWithGoogle, logout as apiLogout, reissue } from '@/lib/api/auth'
import { forgetGoogleSession, hasGoogleClientId } from '@/lib/google'
import { useNoticeStore } from './notice'
import { useRecentlyViewedStore } from './recently-viewed'

/**
 * idle: 아직 복원을 시도하지 않았다 (앱 시작 직후)
 * restoring: refresh 쿠키로 복원 중 — 이 동안은 비로그인이라고 단정하면 안 된다
 * authenticated / anonymous: 확정된 상태
 */
export type AuthStatus = 'idle' | 'restoring' | 'authenticated' | 'anonymous'

export const useAuthStore = defineStore('auth', () => {
  const notice = useNoticeStore()
  const recentlyViewed = useRecentlyViewedStore()

  const user = ref<AccountResponse | null>(null)
  const status = ref<AuthStatus>('idle')
  /**
   * '이 브라우저에서 로그인한 적이 있다'는 힌트.
   *
   * refresh 쿠키는 httpOnly 라 프론트가 존재를 확인할 수 없다. 이 힌트가 없으면
   * 로그인한 적 없는 방문자도 페이지를 열 때마다 반드시 401 이 나는 재발급 요청을
   * 한 번씩 쏘게 된다. 힌트는 쿠키의 대체물이 아니라 **불필요한 시도를 거르는 용도**다 —
   * 실제 인증은 언제나 서버의 쿠키 검증이 한다.
   */
  const hadSession = useStorage<boolean>('jb:had-session:v1', false)

  const isAuthenticated = computed(() => status.value === 'authenticated')
  /**
   * 로그인은 됐지만 닉네임이 없는 상태. 온보딩(닉네임 설정)을 띄울 근거다.
   *
   * 신규 가입자는 **항상** 이 상태로 시작한다 — 구글이 주는 이름을 닉네임으로 쓰지 않고
   * `nickname: null` 로 저장하기 때문이다(docs/specs/google-oauth-login.md §3).
   *
   * 명세상 이 상태에서는 인증·닉네임 설정 외의 API 가 403 `PROFILE_INCOMPLETE` 로
   * 막히게 되어 있다. a2ee567 기준 아직 구현되지 않았지만, 구현되는 순간 신규 가입자의
   * 거점·찜 호출이 전부 막히므로 **닉네임 설정 UI 가 로그인 UI 와 같이 와야 한다.**
   */
  const needsProfile = computed(() => isAuthenticated.value && !user.value?.profileCompleted)
  /**
   * **서버 API 를 부를 수 있는 상태인가.**
   *
   * 로그인만으로는 부족하다 — 백엔드가 닉네임 없는 계정의 요청을 403
   * `PROFILE_INCOMPLETE` 로 막는다(`ProfileAuthorizationManager`, jb-backend e11ac1a).
   * 열려 있는 건 `GET`·`PATCH /api/me` 둘뿐이다.
   *
   * 그래서 서버를 부를지 가르는 기준은 `isAuthenticated` 가 아니라 이 값이다.
   * 닉네임을 정하는 순간 false → true 로 바뀌므로, 이걸 watch 하면 **설정 직후
   * 동기화가 저절로 이어진다**(`isAuthenticated` 는 그때 이미 true 라 안 바뀐다).
   */
  const canUseApi = computed(() => isAuthenticated.value && !needsProfile.value)

  /**
   * 로그인 여부가 **정해졌는가**. idle·restoring 은 아직 모르는 상태다.
   */
  const settled = computed(() => status.value === 'authenticated' || status.value === 'anonymous')

  /**
   * 정해질 때까지 기다린다.
   *
   * access token 은 메모리에만 살아서(`lib/api/http.ts`) 새로고침 직후엔 비어 있다.
   * 그동안 서버를 부르면 **로그인한 사용자의 요청이 익명으로 나간다** — 소유자를
   * 토큰으로 가르는 API(추천·기록)는 그걸 '남의 것'으로 보고 404 를 준다.
   *
   * 부를 수 있느냐(`canUseApi`)와는 다른 질문이다. 비로그인도 부를 수 있지만
   * **누구 것이냐**가 갈리는 API 가 이걸 쓴다.
   */
  function whenSettled(): Promise<void> {
    if (settled.value) return Promise.resolve()
    return new Promise((resolve) => {
      const stop = watch(settled, (ok) => {
        if (!ok) return
        stop()
        resolve()
      })
    })
  }

  /** 구글 클라이언트 ID 가 없으면 로그인 버튼 자체를 비활성으로 둔다. */
  const canLogin = hasGoogleClientId

  /**
   * 새로고침 후 세션 복원. refresh 쿠키가 살아 있으면 조용히 다시 로그인된다.
   * 쿠키가 없는 게 정상인 경로(로그인한 적 없음)라 실패를 오류로 취급하지 않는다.
   */
  async function restore(): Promise<void> {
    if (status.value === 'restoring') return
    // 로그인한 적이 없으면 쿠키도 없다. 확실히 실패할 요청은 아예 보내지 않는다.
    if (!hadSession.value) {
      status.value = 'anonymous'
      return
    }
    status.value = 'restoring'
    if (!(await reissue())) {
      hadSession.value = false
      status.value = 'anonymous'
      return
    }
    try {
      user.value = await getAccount()
      status.value = 'authenticated'
    } catch {
      status.value = 'anonymous'
    }
  }

  /**
   * 구글이 준 ID 토큰으로 로그인을 끝낸다.
   *
   * 토큰을 **받아오는 일은 여기서 하지 않는다** — 구글이 그린 버튼을 사용자가 눌러야만
   * 나오는 값이라, 화면(LoginPrompt)이 받아서 넘겨준다(lib/google.ts 의 설명).
   *
   * 성공/실패를 boolean 으로 돌려준다. 호출부가 "로그인된 다음"으로 이어가야 하는데,
   * 예외로 알리면 화면마다 try 를 두르게 되기 때문이다.
   */
  async function login(idToken: string): Promise<boolean> {
    try {
      await loginWithGoogle(idToken)
      // 로그인 응답의 user 는 AccountResponse 보다 좁다(provider·role·createdAt 이 없다).
      // 화면이 기대하는 건 넓은 쪽이므로 곧바로 /api/me 로 채운다.
      user.value = await getAccount()
      status.value = 'authenticated'
      hadSession.value = true
      return true
    } catch {
      notice.error('로그인에 실패했어요')
      status.value = 'anonymous'
      return false
    }
  }

  /**
   * 로그아웃.
   *
   * 서버 호출이 실패해도(네트워크 단절·이미 만료된 세션) **로컬 상태는 반드시 지운다.**
   * 예외를 그대로 올리면 아래 세 줄이 실행되지 않아 로그아웃을 눌러도 로그인한 채로
   * 남는다 — 사용자가 나가려는데 나갈 수 없는 게 서버 쿠키가 조금 더 사는 것보다 나쁘다.
   * 남은 refresh 쿠키는 만료되거나 다음 로그인이 덮는다(접근 토큰은 apiLogout 이 지운다).
   */
  async function logout(): Promise<void> {
    // 실패를 삼키는 건 호출부를 편하게 하려는 게 아니다 — 여기서 예외가 올라가면
    // 아래 정리가 통째로 건너뛰어지고, 화면은 '로그아웃 실패'를 보여줄 수단도 없다.
    await apiLogout().catch(() => {})
    // 이걸 빼면 다음 로그인 때 구글이 같은 계정으로 말없이 다시 들여보낸다 —
    // 계정을 바꾸려고 로그아웃한 사용자가 갇힌다.
    forgetGoogleSession()
    // 공용 기기에서 앞사람이 뭘 봤는지 다음 사람에게 보이지 않게 한다.
    recentlyViewed.clear()
    user.value = null
    hadSession.value = false
    status.value = 'anonymous'
  }

  /** 닉네임 설정·변경. 2~15자 — 서버가 거절하면 ApiError 가 그대로 올라간다. */
  async function updateNickname(nickname: string): Promise<void> {
    user.value = await patchNickname(nickname)
  }

  return {
    user,
    status,
    isAuthenticated,
    needsProfile,
    canUseApi,
    settled,
    whenSettled,
    canLogin,
    restore,
    login,
    logout,
    updateNickname,
  }
})
