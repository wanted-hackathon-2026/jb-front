<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter, RouterView } from 'vue-router'
import BaseToast from '@/components/BaseToast.vue'
import LoginPrompt from '@/components/LoginPrompt.vue'
import RecommendationToast from '@/components/RecommendationToast.vue'
import { useLoginPromptStore } from '@/stores/login-prompt'
import { useNoticeStore } from '@/stores/notice'
import { useRecommendationStore } from '@/stores/recommendation'
import { useSheetStore } from '@/stores/sheet'

// 여기서 스토어가 깨어나며 진행 중이던 추천 작업의 '이어받기'가 돈다.
// 라우트 이동과 무관하게 살아 있어야 해서 App 이 소유한다.
const reco = useRecommendationStore()
const router = useRouter()
const route = useRoute()
const sheet = useSheetStore()
const notice = useNoticeStore()
// 로그인 유도 팝업은 여기 한 벌만 둔다 — 띄우는 곳(지도 FAB·매물 카드·매물 상세)이
// 여럿이라 화면마다 두면 같은 마크업이 계속 는다.
const loginPrompt = useLoginPromptStore()

/**
 * 완료 배너가 앉을 자리.
 *
 * 시트가 접혀 있으면 그 위에 얹는다(시안 3번 프레임) — 맨 아래에 두면 시트의
 * 세그먼트 컨트롤을 덮는다. 시트를 끝까지 올리면 그 높이가 목록 한가운데가 되므로
 * 그때는 화면 맨 아래로 내려온다. 시트가 없는 화면도 맨 아래다.
 */
const bannerBottom = computed(() =>
  route.name === 'map' && sheet.state === 'peek'
    ? 'calc(var(--sheet-peek) + 1rem)'
    : 'calc(1rem + env(safe-area-inset-bottom))',
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

  <!-- 전환 이름 네 가지는 main.css '열고 닫기 모션' 에 정의돼 있다. -->
  <Transition name="overlay">
    <LoginPrompt
      v-if="loginPrompt.open"
      :redirect="loginPrompt.redirect"
      @close="loginPrompt.close"
      @done="loginPrompt.done"
    />
  </Transition>

  <!--
    실패 알림. **화면 위쪽**에 둔다 — 아래는 시트·완료 배너·FAB 가 이미 쓰는 자리라
    겹치면 서로를 가린다. 여러 건이면 쌓이고, 각자 따로 사라진다.
  -->
  <!--
    여러 장이 쌓이므로 TransitionGroup 이다 — 한 장이 사라질 때 남은 장이 제자리를
    찾아가는 것(toast-move)까지 같이 움직인다. v-if 를 떼고 늘 그려도 되는 건
    비었을 때 pointer-events-none 인 빈 상자만 남기 때문이다.
  -->
  <TransitionGroup
    name="toast"
    tag="div"
    class="safe-top pointer-events-none fixed inset-x-0 top-0 z-60 mx-auto flex max-w-shell flex-col gap-2 px-4 pt-2"
  >
    <BaseToast
      v-for="n in notice.notices"
      :key="n.id"
      class="pointer-events-auto"
      :message="n.message"
      :tone="n.tone"
      @dismiss="notice.dismiss(n.id)"
    />
  </TransitionGroup>

  <!-- 셸 폭 안에서만 뜨도록 max-w-shell 로 묶는다 — 데스크톱에서 화면 전체로 퍼지지 않게. -->
  <Transition name="rise">
    <div
      v-if="reco.arrived"
      class="pointer-events-none fixed inset-x-0 z-50 mx-auto flex max-w-shell justify-center px-4 transition-[bottom] duration-300"
      :style="{ bottom: bannerBottom }"
    >
      <RecommendationToast
        class="pointer-events-auto"
        :job="reco.arrived"
        @open="open(reco.arrived.id)"
      />
    </div>
  </Transition>
</template>
