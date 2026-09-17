<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { renderGoogleButton } from '@/lib/google'
import { useAuthStore } from '@/stores/auth'

/**
 * 로그인해야 쓸 수 있는 기능을 눌렀을 때 뜨는 팝업.
 *
 * **로그인의 유일한 입구다.** 구글이 그린 버튼을 사용자가 직접 눌러야 ID 토큰이 나와서,
 * 코드가 임의로 로그인 창을 열 수 없다(lib/google.ts). 그래서 어느 경로로 왔든 이 팝업을
 * 거친다.
 *
 * 로그인이 끝나면 `done` 을 낸다. 단, **닉네임이 없는 계정은 여기서 닉네임 화면으로
 * 보낸다** — 신규 가입자는 항상 그 상태이고, 닉네임을 정하기 전에는 다른 API 가
 * 막히게 되어 있다(google-oauth-login.md §3).
 */
const props = defineProps<{
  /** 무엇이 막혔는지 한 줄로. "관심 매물은" 처럼 조사까지 붙여 넘긴다. */
  what: string
  /** 로그인·닉네임 설정이 끝난 뒤 돌아올 경로. 닉네임 화면에 그대로 넘긴다. */
  redirect?: string
}>()

const emit = defineEmits<{ close: []; done: [] }>()

const auth = useAuthStore()
const router = useRouter()

const buttonEl = ref<HTMLElement>()
const busy = ref(false)
/** 구글 SDK 를 못 불러왔다. 네트워크·차단기 등 우리가 어쩔 수 없는 사유다. */
const sdkFailed = ref(false)

async function onToken(idToken: string) {
  busy.value = true
  try {
    if (!(await auth.login(idToken))) return // 사유는 토스트로 나갔다
    if (auth.needsProfile) {
      emit('close')
      router.push({ name: 'nickname', query: props.redirect ? { redirect: props.redirect } : {} })
      return
    }
    emit('done')
  } finally {
    busy.value = false
  }
}

onMounted(async () => {
  if (!auth.canLogin || !buttonEl.value) return
  try {
    await renderGoogleButton(buttonEl.value, onToken)
  } catch {
    sdkFailed.value = true
  }
})
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
          구글이 직접 그리는 버튼이라 우리 스타일을 입히지 않는다. 비어 있는 동안 자리가
          무너지지 않게 최소 높이를 준다.
        -->
        <div v-if="auth.canLogin && !sdkFailed" class="mt-5 flex min-h-11 justify-center">
          <div ref="buttonEl" class="w-full max-w-[400px]" />
        </div>

        <!-- 눌러도 아무 일이 없는 버튼을 두느니 이유를 밝힌다. -->
        <p v-else class="mt-5 text-sm text-slate-400">
          {{ sdkFailed ? '구글 로그인을 불러오지 못했어요' : '지금은 로그인을 사용할 수 없어요' }}
        </p>

        <p v-if="busy" class="mt-3 text-sm text-slate-400">로그인 중…</p>

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
