/**
 * Google Identity Services 로더. 카카오맵과 같은 사정이다 — npm 패키지가 아니라
 * 전역 스크립트라서 필요한 시점에 한 번만 붙인다(lib/kakao.ts 와 같은 모양).
 *
 * 여기서 얻는 건 **ID 토큰** 하나다. 그걸 백엔드에 넘기면 우리 access token 으로
 * 바꿔 준다(lib/api/auth.ts). 프론트가 구글 API 를 직접 부를 일은 없다.
 */

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined

/**
 * 키가 없으면 로그인 기능이 통째로 꺼진다 — 카카오 키가 없을 때 지도가 자리표시자로
 * 가는 것과 같은 방식이다. 키 없이도 앱은 (비로그인으로) 돌아가야 한다.
 *
 * ⚠️ 이 값은 백엔드의 GOOGLE_CLIENT_ID 와 **같아야** 한다. 백엔드가 ID 토큰의
 *    audience 를 자기 값으로 검증하기 때문에(GoogleJwtIdentityVerifier.java:41),
 *    다르면 로그인이 401 INVALID_GOOGLE_IDENTITY_TOKEN 으로 떨어진다.
 */
export const hasGoogleClientId = Boolean(CLIENT_ID)

const SRC = 'https://accounts.google.com/gsi/client'

let promise: Promise<void> | null = null

export function loadGoogleIdentity(): Promise<void> {
  if (!CLIENT_ID) return Promise.reject(new Error('VITE_GOOGLE_CLIENT_ID 가 없다'))
  if (promise) return promise

  promise = new Promise<void>((resolve, reject) => {
    const el = document.createElement('script')
    el.src = SRC
    el.async = true
    el.defer = true
    el.onerror = () => {
      promise = null // 실패는 캐시하지 않는다 — 다음 시도에서 다시 붙여본다.
      reject(new Error('구글 로그인 SDK 로드 실패'))
    }
    el.onload = () => resolve()
    document.head.appendChild(el)
  })
  return promise
}

/**
 * 구글 버튼을 그린다. 여기서 받은 ID 토큰을 백엔드에 넘기면 우리 토큰이 된다.
 *
 * **왜 One Tap 이 아니라 버튼인가** — One Tap(`prompt()`)은 서드파티 쿠키가 막힌
 * 브라우저에서 아예 뜨지 않는다. 그러면 사용자는 로그인을 눌렀는데 아무 일도 일어나지
 * 않는 걸 겪고, 코드에는 '취소'로 기록된다. 구글이 직접 그리는 버튼은 그런 조건에
 * 영향받지 않아서, 로그인 경로는 이쪽 하나로 둔다.
 *
 * 그 대신 **프로그램이 임의로 로그인 창을 열 수는 없다** — 구글이 그린 버튼을 사용자가
 * 직접 눌러야 한다. 그래서 로그인은 항상 '버튼이 있는 화면'을 거친다(LoginPrompt).
 */
export async function renderGoogleButton(
  el: HTMLElement,
  onToken: (idToken: string) => void,
): Promise<void> {
  if (!CLIENT_ID) throw new Error('VITE_GOOGLE_CLIENT_ID 가 없다')
  await loadGoogleIdentity()

  google.accounts.id.initialize({
    client_id: CLIENT_ID,
    callback: (response) => {
      if (response.credential) onToken(response.credential)
    },
    // 저장된 계정으로 말없이 로그인되면 사용자가 자기가 누른 적 없는 로그인을 당한다.
    auto_select: false,
  })

  // 구글은 너비를 px 숫자로만 받고 200~400 을 벗어나면 무시한다. 320px 기기에서도
  // 넘치지 않게 실제 자리 너비에 맞춰 잘라 넣는다.
  const width = Math.max(200, Math.min(400, el.clientWidth || 280))
  google.accounts.id.renderButton(el, {
    type: 'standard',
    theme: 'outline',
    size: 'large',
    shape: 'pill',
    text: 'signin_with',
    logo_alignment: 'center',
    locale: 'ko',
    width,
  })
}

/** 저장된 계정으로 자동 로그인되지 않게 한다. 로그아웃할 때 같이 부른다. */
export function forgetGoogleSession(): void {
  if (window.google) google.accounts.id.disableAutoSelect()
}
