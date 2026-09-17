/**
 * Google Identity Services 전역 타입. 공식 타입 패키지를 받지 않고, 실제로 쓰는
 * 것만 좁게 선언한다(postcode.d.ts 와 같은 방식).
 *
 * 우리가 필요한 건 하나뿐이다 — 백엔드에 넘길 **ID 토큰**(credential).
 * 액세스 토큰·스코프를 다루는 OAuth2 쪽 API 는 쓰지 않으므로 선언하지 않는다.
 */
interface GoogleCredentialResponse {
  /** 구글이 서명한 JWT. 이걸 그대로 POST /api/auth/login/google 에 넘긴다. */
  credential: string
  select_by?: string
}

interface GooglePromptNotification {
  /** One Tap 이 아예 뜨지 못했다(쿠키 차단·미지원 브라우저 등). */
  isNotDisplayed: () => boolean
  /** 떴지만 건너뛰었다(이전에 닫았던 이력 등). */
  isSkippedMoment: () => boolean
  /** 사용자가 닫았거나 로그인으로 끝났다. */
  isDismissedMoment: () => boolean
  getNotDisplayedReason?: () => string
  getSkippedReason?: () => string
  getDismissedReason?: () => string
}

declare const google: {
  accounts: {
    id: {
      initialize: (config: {
        client_id: string
        callback: (response: GoogleCredentialResponse) => void
        auto_select?: boolean
        cancel_on_tap_outside?: boolean
      }) => void
      prompt: (listener?: (notification: GooglePromptNotification) => void) => void
      renderButton: (el: HTMLElement, options: Record<string, unknown>) => void
      cancel: () => void
      disableAutoSelect: () => void
    }
  }
}

interface Window {
  google: typeof google
}
