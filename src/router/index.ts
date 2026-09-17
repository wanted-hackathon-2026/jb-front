import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'map',
    component: () => import('@/pages/MapPage.vue'),
    meta: { title: '지도' },
  },
  {
    path: '/listings/:id',
    name: 'listing-detail',
    component: () => import('@/pages/ListingDetailPage.vue'),
    props: true,
    meta: { title: '매물 상세' },
  },
  /**
   * 추천 맥락이 붙은 상세. 같은 매물이라도 어느 추천 기준이냐에 따라 점수·순위·이동
   * 동선이 달라진다 — 맥락 없는 /listings/:id 는 그 값들을 아예 싣지 않는다.
   * 백엔드도 같은 이유로 엔드포인트를 둘로 나눠 뒀다(lib/api/listings.ts).
   */
  {
    path: '/recommendations/:recommendationId/listings/:id',
    name: 'recommendation-listing',
    component: () => import('@/pages/ListingDetailPage.vue'),
    props: true,
    meta: { title: '매물 상세' },
  },
  {
    path: '/recommendations/:recommendationId',
    name: 'recommendation-result',
    component: () => import('@/pages/RecommendationResultPage.vue'),
    props: true,
    meta: { title: '추천 결과' },
  },
  {
    path: '/my',
    name: 'my',
    component: () => import('@/pages/MyPage.vue'),
    meta: { title: '마이' },
  },
  {
    /**
     * 닉네임 설정. 가입 직후 반드시 거치는 화면이라 마이페이지 하위가 아니라
     * 최상위에 둔다 — 로그인 팝업이 어느 화면에서 떴든 여기로 보낸다.
     */
    path: '/nickname',
    name: 'nickname',
    component: () => import('@/pages/NicknamePage.vue'),
    meta: { title: '닉네임 설정' },
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
