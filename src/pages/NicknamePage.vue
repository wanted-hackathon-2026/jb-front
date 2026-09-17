<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { NicknameTakenError } from '@/lib/api/account'
import { useAuthStore } from '@/stores/auth'
import { NICKNAME_MAX, NICKNAME_MIN } from '@/types/backend'

/**
 * 닉네임 설정·변경.
 *
 * 신규 가입자는 **반드시** 여기를 거친다 — 구글이 주는 이름을 닉네임으로 쓰지 않아서
 * 가입 직후 닉네임이 없고, 닉네임이 없으면 다른 API 가 막히게 되어 있다
 * (google-oauth-login.md §3). 이미 닉네임이 있는 사용자의 '변경' 화면도 겸한다.
 */
const auth = useAuthStore()
const router = useRouter()
const route = useRoute()

/** 끝나고 돌아갈 곳. 없으면 지도로 — 이 앱의 시작점이다. */
const redirect = computed(() => (route.query.redirect as string | undefined) || '/')

/**
 * 로그인하지 않은 채로 주소를 직접 치고 들어올 수 있다. 그 상태로 저장하면 401 이라
 * 아무것도 못 하는 화면이 되므로 되돌려 보낸다.
 *
 * `status` 를 보는 이유는 복원 때문이다 — 새로고침 직후에는 아직 'idle'·'restoring'
 * 이라 로그인 여부를 모른다. **확정된 뒤에만** 판단한다.
 */
watch(
  () => auth.status,
  (s) => {
    if (s === 'anonymous') router.replace({ name: 'map' })
  },
  { immediate: true },
)

const nickname = ref(auth.user?.nickname ?? '')
const saving = ref(false)
const error = ref<string | null>(null)

/** 서버가 앞뒤 공백을 떼고 검사하므로 여기서도 같은 기준으로 센다. */
const trimmed = computed(() => nickname.value.trim())
const valid = computed(
  () => trimmed.value.length >= NICKNAME_MIN && trimmed.value.length <= NICKNAME_MAX,
)

// 세션 복원이 늦게 끝나면 user 가 나중에 채워진다. 사용자가 이미 고쳐 쓰고 있는 중이면
// 덮지 않는다 — 비어 있을 때만 현재 닉네임을 넣어준다.
watch(
  () => auth.user?.nickname,
  (current) => {
    if (current && !nickname.value) nickname.value = current
  },
)

/** 처음 정하는 사람과 바꾸러 온 사람에게 할 말이 다르다. */
const isFirstTime = computed(() => !auth.user?.profileCompleted)

async function submit() {
  if (!valid.value || saving.value) return
  saving.value = true
  error.value = null
  try {
    await auth.updateNickname(trimmed.value)
    router.replace(redirect.value)
  } catch (e) {
    error.value =
      e instanceof NicknameTakenError
        ? e.message
        : '닉네임을 저장하지 못했어요. 잠시 후 다시 시도해 주세요'
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <main class="flex flex-1 flex-col bg-white">
    <header class="safe-top shrink-0">
      <!--
        처음 정하는 중이면 뒤로 갈 곳이 없다. 로그인은 끝났는데 닉네임이 없는 상태로
        빠져나가면 다른 화면이 전부 막히므로(PROFILE_INCOMPLETE) 되돌아가는 길을 두지 않는다.
      -->
      <button
        v-if="!isFirstTime"
        type="button"
        class="grid size-11 place-items-center text-slate-700"
        aria-label="뒤로"
        @click="router.back()"
      >
        <svg viewBox="0 0 24 24" class="size-6" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M15 5l-7 7 7 7" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
      </button>
      <div v-else class="h-11" aria-hidden="true" />
    </header>

    <div class="flex min-h-0 flex-1 flex-col px-5 pt-6">
      <h1 class="text-2xl leading-snug font-bold text-slate-900">
        {{ isFirstTime ? '어떻게 불러드릴까요?' : '닉네임 변경' }}
      </h1>
      <p class="mt-2 text-sm leading-normal text-slate-500">
        {{ NICKNAME_MIN }}~{{ NICKNAME_MAX }}자로 정해 주세요.<br />
        다른 사람이 쓰는 닉네임은 사용할 수 없어요.
      </p>

      <!-- form 으로 감싸야 모바일 키보드의 '완료'로 제출된다. -->
      <form class="mt-7" @submit.prevent="submit">
        <label class="sr-only" for="nickname">닉네임</label>
        <input
          id="nickname"
          v-model="nickname"
          type="text"
          class="h-13 w-full rounded-xl border border-slate-200 px-4 text-base outline-none focus:border-brand-500"
          :class="error && 'border-red-400'"
          placeholder="닉네임 입력"
          :maxlength="NICKNAME_MAX"
          autocomplete="nickname"
          enterkeyhint="done"
          :aria-invalid="Boolean(error)"
          aria-describedby="nickname-help"
          @input="error = null"
        />

        <p id="nickname-help" class="mt-2 min-h-5 text-sm">
          <span v-if="error" class="text-red-500">{{ error }}</span>
          <span v-else class="text-slate-400">{{ trimmed.length }} / {{ NICKNAME_MAX }}</span>
        </p>

        <button
          type="submit"
          class="mt-4 h-14 w-full rounded-full bg-brand-500 text-lg font-semibold text-white disabled:opacity-40"
          :disabled="!valid || saving"
        >
          {{ saving ? '저장 중…' : isFirstTime ? '시작하기' : '저장' }}
        </button>
      </form>
    </div>
  </main>
</template>
