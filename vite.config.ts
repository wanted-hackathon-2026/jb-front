import { fileURLToPath, URL } from 'node:url'

import tailwindcss from '@tailwindcss/vite'
import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vite'

/**
 * 개발 중 붙는 백엔드. 스웨거: http://43.203.149.41/swagger-ui/index.html
 * 로컬 백엔드를 띄웠다면 http://localhost:8080 으로 바꾼다(jb-backend README).
 */
const API_TARGET = 'http://43.203.149.41'

export default defineConfig({
  plugins: [vue(), tailwindcss()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    port: 5173,
    // 카카오 개발자 콘솔에 http://localhost:5173 을 등록해두고 쓴다. 포트가 점유됐을 때
    // Vite 기본 동작대로 5174 로 옮겨가면 등록한 도메인과 어긋나 지도가 조용히 안 뜬다.
    // 도망가지 말고 실패하게 둬서 원인이 바로 드러나게 한다.
    strictPort: true,
    proxy: {
      /**
       * 개발용 API 프록시. 브라우저에게는 `/api/…` 가 같은 오리진이 되고, Vite 가
       * 서버 쪽에서 배포 백엔드로 넘긴다.
       *
       * 왜 프록시냐 — 백엔드의 CORS 허용 오리진에 localhost:5173 이 없다.
       * 실측(2026-09-17): localhost:3000 과 43.203.149.41 만 통과하고 나머지는
       * 403 "Invalid CORS request". jb-backend 는 이 레포에서 읽기 전용이라
       * (CLAUDE.md) 허용 목록을 우리가 늘릴 수 없다.
       *
       * 덤으로 refresh token 쿠키 문제도 같이 풀린다. 쿠키가 SameSite=Lax 라
       * 교차 사이트 fetch 에는 실려 가지 않는데, 프록시를 거치면 같은 오리진이라
       * 정상적으로 오간다.
       */
      '/api': {
        target: API_TARGET,
        changeOrigin: true,
        /**
         * Origin 헤더까지 허용된 값으로 바꾼다. changeOrigin 은 Host 만 손대기
         * 때문에, 이게 없으면 브라우저가 붙인 `Origin: http://localhost:5173` 이
         * 그대로 전달돼 백엔드가 403 으로 되돌린다(같은 오리진 POST 도 Origin 을
         * 보낸다 — GET 만 안 보낸다).
         */
        headers: { Origin: API_TARGET },
      },
    },
  },
})
