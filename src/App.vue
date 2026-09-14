<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter, RouterView } from 'vue-router'
import RecommendationToast from '@/components/RecommendationToast.vue'
import { useRecommendationStore } from '@/stores/recommendation'

// 여기서 스토어가 깨어나며 진행 중이던 추천 작업의 '이어받기'가 돈다.
// 라우트 이동과 무관하게 살아 있어야 해서 App 이 소유한다.
const reco = useRecommendationStore()
const router = useRouter()
const route = useRoute()

/**
 * 시안 3번 프레임 — 완료 배너는 바텀시트(peek) 위에 얹힌다. 화면 맨 아래에 두면
 * 시트의 세그먼트 컨트롤을 덮어버린다. 시트가 없는 다른 화면에서는 그냥 아래에 붙는다.
 */
const bannerBottom = computed(() =>
  route.name === 'map' ? 'calc(var(--sheet-peek) + 1rem)' : '1rem',
)

function open(id: string) {
  reco.arrived = null
  router.push({ name: 'recommendation-result', params: { recommendationId: id } })
}
</script>

<template>
  <!--
    앱 셸. 모바일에서는 흰 배경이 화면을 가득 채우고 그림자는 화면 밖으로 잘려 보이지 않는다.
    데스크톱에서는 body 의 회색 바탕 위에 480px 흰 카드가 떠 있는 형태가 된다.
  -->
  <div
    class="mx-auto flex h-full max-w-shell flex-col overflow-hidden bg-white shadow-[0_0_1.5rem_rgba(15,23,42,0.08)]"
  >
    <RouterView />
  </div>

  <!-- 셸 폭 안에서만 뜨도록 max-w-shell 로 묶는다 — 데스크톱에서 화면 전체로 퍼지지 않게. -->
  <div
    v-if="reco.arrived"
    class="pointer-events-none fixed inset-x-0 z-50 mx-auto flex max-w-shell justify-center px-4"
    :style="{ bottom: bannerBottom }"
  >
    <RecommendationToast
      class="pointer-events-auto"
      :job="reco.arrived"
      @open="open(reco.arrived.id)"
    />
  </div>
</template>
