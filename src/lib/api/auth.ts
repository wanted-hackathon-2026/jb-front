/**
 * 인증. 구글 ID 토큰을 백엔드에 넘기면 우리 access token 으로 바꿔 준다.
 *
 * 엔드포인트 출처: AuthController.java:41,49,63 (jb-backend a2ee567)
 *
 * refresh token 은 프론트가 만지지 않는다 — httpOnly `refresh_token` 쿠키로만
 * 오간다. 재발급·세션 복원은 전송 계층(lib/api/http.ts 의 `reissue`)의 일이다.
 */
import type { LoginResponse } from '@/types/backend'
import { request, setAccessToken } from './http'

/**
 * 구글 로그인. 백엔드가 idToken 의 서명·발급자·audience 를 직접 검증한다
 * (GoogleJwtIdentityVerifier.java) — audience 는 백엔드의 GOOGLE_CLIENT_ID 라,
 * 프론트와 백엔드가 **같은 구글 클라이언트 ID** 를 써야 통과한다.
 */
export async function loginWithGoogle(idToken: string): Promise<LoginResponse> {
  const res = await request<LoginResponse>('/api/auth/login/google', {
    method: 'POST',
    body: JSON.stringify({ idToken }),
  })
  setAccessToken(res.accessToken)
  return res
}

/**
 * 로그아웃. 서버가 refresh 세션을 지우고 쿠키를 만료시킨다(204).
 * 서버 호출이 실패해도 로컬 토큰은 버린다 — 사용자가 누른 건 '로그아웃'이다.
 */
export async function logout(): Promise<void> {
  try {
    await request<void>('/api/logout', { method: 'POST' })
  } finally {
    setAccessToken(null)
  }
}

export { reissue } from './http'
