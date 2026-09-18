<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import BaseSpinner from './BaseSpinner.vue'
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
    <!--
      fixed 라 뷰포트 기준이다. max-w-shell 로 묶어야 데스크톱에서 안 퍼진다.
      data-panel 은 배경과 따로 움직이라는 표식이다(main.css '열고 닫기 모션').
    -->
    <div class="w-full max-w-shell p-6" data-panel>
      <div class="rounded-card bg-white px-5 pt-9 pb-4 text-center">
        <!--
          로고는 public/ 에 둔다 — 스플래쉬(index.html)가 번들보다 먼저 같은 파일을
          쓰기 때문이다. 비율이 고정이라 width/height 를 박아 로딩 중 밀림을 막는다.

          src 를 바인딩으로 쓰는 이유: 정적 속성으로 두면 vue 플러그인이 이를 import 로
          바꿔 번들에 넣으려 들고, public/ 파일은 번들 대상이 아니라 빌드가 깨진다.
        -->
        <img :src="'/logo.svg'" width="207" height="41" alt="자취방정식" class="mx-auto w-36" />

        <!--
          팝업이 왜 떴는지부터 말한다 — 사용자는 저장을 누르려다 막힌 참이라, 권유보다
          '막힌 이유'가 먼저 궁금하다. 어느 자리에서 떴든 같은 문장이라 한 줄로 둔다.
          다만 읽는 순서일 뿐 주인공은 아니라서, 크기는 아래 문장에 양보한다.
        -->
        <p id="login-prompt-title" class="mt-7 text-sm text-slate-500">
          로그인이 필요한 기능이에요
        </p>
        <!--
          권유 문장. WelcomeOverlay 의 헤드라인과 같은 조판이다
          (text-xl / leading-snug / break-keep / text-balance).

          <br> 로 줄을 끊지 않는다 — 끊어 두면 '로그인하시고'(6자)와 뒤 문장(19자)처럼
          길이가 따로 노는 두 줄이 가운데 정렬 아래 들쭉날쭉해 보이고, 320px 에서는
          긴 줄이 어차피 한 번 더 접힌다. 폭에 맞춰 균등하게 나누는 일은 text-balance
          에 맡기고, 한국어가 낱말 가운데서 끊기는 것만 break-keep 으로 막는다.
        -->
        <p class="mt-2 text-xl leading-snug font-bold break-keep text-balance text-slate-900">
          나한테 딱 맞는 자취방정식을 완성해 보세요
        </p>

        <!--
          구글이 직접 그리는 버튼이라 우리 스타일을 입히지 않는다. 비어 있는 동안 자리가
          무너지지 않게 최소 높이를 준다.
        -->
        <div v-if="auth.canLogin && !sdkFailed" class="mt-7 flex min-h-11 justify-center">
          <div ref="buttonEl" class="w-full max-w-[400px]" />
        </div>

        <!-- 눌러도 아무 일이 없는 버튼을 두느니 이유를 밝힌다. -->
        <p v-else class="mt-7 text-sm text-slate-400">
          {{ sdkFailed ? '구글 로그인을 불러오지 못했어요' : '지금은 로그인을 사용할 수 없어요' }}
        </p>

        <p v-if="busy" class="mt-3 flex items-center justify-center gap-2 text-sm text-slate-400">
          <BaseSpinner :size="16" />
          로그인 중…
        </p>

        <button
          type="button"
          class="mt-1 h-12 w-full text-sm font-semibold text-slate-500"
          @click="emit('close')"
        >
          다음에 할게요
        </button>
      </div>
    </div>
  </div>
</template>
