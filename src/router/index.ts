import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'map',
    component: () => import('@/pages/MapPage.vue'),
    meta: { title: '지도' },
  },
  {
    path: '/recommendations/:recommendationId',
    name: 'recommendation-result',
    component: () => import('@/pages/RecommendationResultPage.vue'),
    props: true,
    meta: { title: '추천 결과' },
  },
  {
    path: '/search',
    name: 'search',
    component: () => import('@/pages/SearchPage.vue'),
    meta: { title: '거점 검색' },
  },
]

export const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
  scrollBehavior: (_to, _from, saved) => saved ?? { top: 0 },
})

router.afterEach((to) => {
  const title = to.meta.title as string | undefined
  document.title = title ? `${title} · 자취방정식` : '자취방정식'
})
