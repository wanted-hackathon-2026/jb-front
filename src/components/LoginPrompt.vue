<script setup lang="ts">
import { ref } from 'vue'
import { useAuthStore } from '@/stores/auth'

/**
 * 로그인해야 쓸 수 있는 기능을 눌렀을 때 뜨는 유도 팝업.
 *
 * 로그인 자체를 여기서 끝낸다(`auth.login()`). 부르는 쪽은 "무엇을 하려다 막혔는지"만
 * 넘기고, 성공하면 `done` 을 받아 원래 가려던 곳으로 보내면 된다.
 *
 * 모달 생김새는 MapPage 의 추천 완료 모달과 같은 규격이다(시안 39-2267).
 */
defineProps<{
  /** 무엇이 막혔는지. "관심 매물은" 처럼 조사까지 붙여 넘긴다. */
  what: string
}>()

const emit = defineEmits<{ close: []; done: [] }>()

const auth = useAuthStore()
const busy = ref(false)

async function login() {
  busy.value = true
  try {
    await auth.login()
    // 실패·취소면 status 가 그대로라 팝업을 닫지 않는다 — 사유는 토스트로 나간다.
    if (auth.isAuthenticated) emit('done')
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <div
    class="fixed inset-0 z-50 grid place-items-center bg-black/50"
    role="dialog"
    aria-modal="true"
    aria-labelledby="login-prompt-title"
  >
    <!-- fixed 라 뷰포트 기준이다. max-w-shell 로 묶어야 데스크톱에서 안 퍼진다. -->
    <div class="w-full max-w-shell p-6">
      <div class="rounded-card bg-white p-5 text-center">
        <p id="login-prompt-title" class="text-lg font-bold text-slate-900">
          로그인 후 이용할 수 있어요
        </p>
        <p class="mt-4 leading-normal text-slate-500">
          {{ what }} 로그인한 계정에 저장돼요.<br />간편하게 시작해 보세요 :)
        </p>

        <!--
          구글 클라이언트 ID 가 없으면 로그인 자체가 불가능하다. 눌러도 아무 일이 없는
          버튼을 두느니 이유를 밝히고 막는다.
        -->
        <p v-if="!auth.canLogin" class="mt-4 text-sm text-slate-400">
          지금은 로그인을 사용할 수 없어요
        </p>

        <button
          type="button"
          class="mt-5 h-15 w-full rounded-full bg-brand-500 text-lg font-semibold text-white disabled:opacity-40"
          :disabled="busy || !auth.canLogin"
          @click="login"
        >
          {{ busy ? '로그인 중…' : '로그인' }}
        </button>
        <button
          type="button"
          class="mt-2 h-12 w-full text-sm font-semibold text-slate-500"
          @click="emit('close')"
        >
          다음에 할게요
        </button>
      </div>
    </div>
  </div>
</template>
