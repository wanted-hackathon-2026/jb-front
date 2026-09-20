/**
 * 비로그인 사용자를 알아보는 토큰.
 *
 * 추천은 로그인 없이도 받을 수 있는데(jb-backend 9cd8ab2), 서버가 "이 추천이 누구
 * 것인가"를 알아야 결과를 돌려줄 수 있다. 로그인 사용자는 JWT 가 그 역할을 하고,
 * 비로그인은 이 토큰을 `X-Client-Session` 헤더로 보낸다.
 *
 * **비밀값이 아니다.** 서버는 이걸 sha256 으로 접어 보관하고(ClientSessionService),
 * 아는 사람은 그 추천을 볼 수 있다. 추천 결과 말고는 아무것도 열리지 않으므로
 * 그 정도 비밀성이면 충분하다 — 반대로 **남이 알면 내 추천을 볼 수 있다**는 뜻이라,
 * 로그에 찍거나 URL 에 싣지 않는다.
 *
 * 서버 쪽 수명은 30일이다. 이 기기에서 토큰이 사라지면 그 전에 받은 추천은
 * 다시 볼 수 없다 — 기록을 기기 밖으로 옮기려면 로그인이 필요하다.
 */
const KEY = 'jb:client-session:v1'

/**
 * 없으면 만들어서 돌려준다.
 *
 * `crypto.randomUUID` 는 보안 컨텍스트(https·localhost)에서만 있다. 없을 리 없는
 * 환경이지만, 없다고 추천 자체가 막히면 곤란해서 되는 대로 만든다 — 이 값의 역할은
 * '겹치지 않는 식별자'지 '추측 불가능한 비밀'이 아니다.
 */
export function clientSessionToken(): string {
  try {
    const saved = localStorage.getItem(KEY)
    if (saved) return saved
    const made = crypto.randomUUID?.() ?? `cs_${Date.now()}_${Math.random().toString(36).slice(2)}`
    localStorage.setItem(KEY, made)
    return made
  } catch {
    // 사파리 프라이빗 등 localStorage 가 막힌 경우. 이번 요청만 쓰는 값이라 결과를
    // 다시 볼 수는 없지만, 추천을 받는 것 자체는 된다.
    return crypto.randomUUID?.() ?? `cs_${Date.now()}_${Math.random().toString(36).slice(2)}`
  }
}
