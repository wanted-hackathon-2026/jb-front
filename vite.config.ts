import { fileURLToPath, URL } from 'node:url'

import tailwindcss from '@tailwindcss/vite'
import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vite'

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
  },
})
