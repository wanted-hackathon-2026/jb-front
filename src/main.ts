import { createApp } from 'vue'
import { createPinia } from 'pinia'

import App from '@/App.vue'
import { router } from '@/router'
import { useAuthStore } from '@/stores/auth'
import '@/assets/main.css'

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
app.use(router)

// 새로고침 후 로그인 상태 복원. refresh 쿠키가 살아 있으면 조용히 다시 로그인되고,
// 없으면 anonymous 로 끝난다(로그인한 적 없는 사용자의 정상 경로다).
// 화면을 막지 않으려고 기다리지 않는다 — 결과는 스토어 상태로만 반영된다.
void useAuthStore(pinia).restore()

app.mount('#app')
