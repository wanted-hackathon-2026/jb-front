/**
 * 로그인 상태.
 *
 * ⚠️ 아직 화면이 없다. 로그인 UI 는 나중에 붙이기로 했고, 지금은 이 스토어까지가
 *    전부다. 붙일 때 `login()` 을 버튼에 걸면 된다.
 *
 * 토큰은 여기 두지 않는다 — 전송 계층(lib/api/http.ts)이 메모리에 들고 있고,
 * 이 스토어는 '누가 로그인했나'만 안다. 새로고침 복원은 `restore()` 다.
 */
import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { useStorage } from '@vueuse/core'
import type { AccountResponse } from '@/types/backend'
import { getAccount, updateNickname as patchNickname } from '@/lib/api/account'
import { loginWithGoogle, logout as apiLogout, reissue } from '@/lib/api/auth'
import { GoogleSignInCancelled, hasGoogleClientId, promptGoogleIdToken } from '@/lib/google'

/**
 * idle: 아직 복원을 시도하지 않았다 (앱 시작 직후)
 * restoring: refresh 쿠키로 복원 중 — 이 동안은 비로그인이라고 단정하면 안 된다
 * authenticated / anonymous: 확정된 상태
 */
export type AuthStatus = 'idle' | 'restoring' | 'authenticated' | 'anonymous'

export const useAuthStore = defineStore('auth', () => {
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
  /** 마지막 실패 사유. 사용자가 그만둔 경우(취소)는 오류가 아니라 여기 담기지 않는다. */
  const error = ref<string | null>(null)

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

  /** 구글 로그인. 사용자가 One Tap 을 닫으면 조용히 원래 상태로 돌아간다. */
  async function login(): Promise<void> {
    error.value = null
    try {
      const idToken = await promptGoogleIdToken()
      const res = await loginWithGoogle(idToken)
      // 로그인 응답의 user 는 AccountResponse 보다 좁다(provider·role·createdAt 이 없다).
      // 화면이 기대하는 건 넓은 쪽이므로 곧바로 /api/me 로 채운다.
      user.value = await getAccount()
      status.value = 'authenticated'
      hadSession.value = true
      if (res.isNewUser) error.value = null
    } catch (e) {
      if (e instanceof GoogleSignInCancelled) return
      error.value = e instanceof Error ? e.message : '로그인에 실패했어요'
      status.value = 'anonymous'
    }
  }

  async function logout(): Promise<void> {
    await apiLogout()
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
    error,
    isAuthenticated,
    needsProfile,
    canLogin,
    restore,
    login,
    logout,
    updateNickname,
  }
})
