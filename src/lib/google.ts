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

/** 사용자가 로그인을 그만뒀을 때. 오류 화면을 띄울 일이 아니라 조용히 넘어갈 일이다. */
export class GoogleSignInCancelled extends Error {
  constructor(reason: string) {
    super(`구글 로그인이 완료되지 않았다: ${reason}`)
  }
}

/**
 * One Tap 으로 ID 토큰을 받는다.
 *
 * ⚠️ One Tap 은 브라우저·쿠키 설정에 따라 **뜨지 않을 수 있다**(서드파티 쿠키 차단 등).
 *    그때는 GoogleSignInCancelled 로 떨어진다. 로그인 화면이 생기면 이 함수 대신
 *    `google.accounts.id.renderButton` 으로 실제 버튼을 그리는 쪽이 정석이고,
 *    이건 UI 가 없는 지금 스토어가 호출할 수 있게 둔 진입점이다.
 */
export function promptGoogleIdToken(): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    loadGoogleIdentity()
      .then(() => {
        google.accounts.id.initialize({
          client_id: CLIENT_ID as string,
          callback: (response) => {
            if (response.credential) resolve(response.credential)
            else reject(new GoogleSignInCancelled('credential 이 비어 있다'))
          },
        })
        google.accounts.id.prompt((notification) => {
          // 성공은 위 callback 으로만 온다. 여기서는 '안 떴다/건너뛰었다'만 처리한다.
          if (notification.isNotDisplayed()) {
            reject(
              new GoogleSignInCancelled(notification.getNotDisplayedReason?.() ?? '표시되지 않음'),
            )
          } else if (notification.isSkippedMoment()) {
            reject(new GoogleSignInCancelled(notification.getSkippedReason?.() ?? '건너뜀'))
          }
        })
      })
      .catch(reject)
  })
}
