/**
 * Cloudflare Worker — 정적 파일을 서빙하고 `/api/*` 만 백엔드로 넘긴다.
 *
 * **왜 필요한가.** 이게 없으면 `/api/*` 가 SPA fallback 에 걸려 `index.html` 을 돌려주고,
 * 프론트는 그 HTML 을 JSON 으로 파싱하려다 실패한다(배포에서 로그인·거점·찜이 죽던 원인).
 *
 * 프록시로 두면 브라우저에겐 **같은 오리진**이라 셋이 한 번에 풀린다:
 * 1. 백엔드가 HTTP 라 HTTPS 페이지에서 직접 못 부르는 문제 — 여기서는 서버 대 서버라 무관
 * 2. CORS — 같은 오리진이면 규칙 자체가 발동하지 않는다
 * 3. refresh 쿠키가 SameSite=Lax 라 교차 사이트에 안 실리는 문제
 *
 * 개발의 Vite 프록시(vite.config.ts)와 같은 역할이다. 둘의 동작을 맞춰 둬야
 * "로컬에선 되는데 배포에선 안 되는" 일이 안 생긴다.
 */

const API_PREFIX = '/api/'

export default {
  async fetch(request, env) {
    const url = new URL(request.url)

    if (!url.pathname.startsWith(API_PREFIX)) {
      // 정적 파일·SPA 라우트. 에셋 바인딩이 알아서 index.html 로 떨어뜨린다.
      return env.ASSETS.fetch(request)
    }

    const target = new URL(url.pathname + url.search, env.API_ORIGIN)

    /*
     * Origin 을 그대로 넘긴다. 배포 도메인이 백엔드의 AUTH_ALLOWED_ORIGINS 에 이미
     * 들어 있어서 위장할 이유가 없다(개발 프록시는 localhost:5173 이 목록에 없어서
     * 어쩔 수 없이 바꿔 보낸다 — 그 차이가 여기 주석으로 남을 만한 부분이다).
     *
     * redirect: 'manual' — 3xx 를 Worker 가 삼키지 않고 브라우저에 그대로 전달한다.
     */
    const response = await fetch(target, {
      method: request.method,
      headers: request.headers,
      body: request.body,
      redirect: 'manual',
    })

    /*
     * 응답을 그대로 흘려보내되 헤더를 복사 가능한 형태로 다시 싼다.
     * Set-Cookie 가 여기서 살아 있어야 refresh 토큰이 브라우저에 자리잡는다.
     */
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers,
    })
  },
}
