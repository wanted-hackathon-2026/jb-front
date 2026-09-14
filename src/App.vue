<script setup lang="ts">
import { useRouter, RouterView } from 'vue-router'
import RecommendationToast from '@/components/RecommendationToast.vue'
import { useRecommendationStore } from '@/stores/recommendation'

// 여기서 스토어가 깨어나며 진행 중이던 추천 작업의 '이어받기'가 돈다.
// 라우트 이동과 무관하게 살아 있어야 해서 App 이 소유한다.
const reco = useRecommendationStore()
const router = useRouter()

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
    class="mx-auto flex h-dvh max-w-shell flex-col overflow-hidden bg-white shadow-[0_0_1.5rem_rgba(15,23,42,0.08)]"
  >
    <RouterView />
  </div>

  <RecommendationToast
    v-if="reco.arrived"
    :job="reco.arrived"
    @open="open(reco.arrived.id)"
    @close="reco.arrived = null"
  />
</template>
