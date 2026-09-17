<script setup lang="ts">
/**
 * 잠깐 떴다 사라지는 알림 한 장. 무엇에 대한 알림인지는 모른다 — 문구를 받아 그릴 뿐이다.
 * 띄울 자리와 사라지는 시점은 부르는 쪽이 정한다(App.vue · stores/notice.ts).
 *
 * tone 은 아이콘만 바꾼다. 배경까지 초록·빨강으로 가르지 않는 건, 색만으로 성패를
 * 구분하면 색각 이상에서 같은 카드가 되기 때문이다 — 모양이 다른 아이콘이 그 몫을 한다.
 */
withDefaults(defineProps<{ message: string; tone?: 'error' | 'success' }>(), { tone: 'error' })
defineEmits<{ dismiss: [] }>()
</script>

<template>
  <!--
    role="alert" 이라 스크린리더가 바로 읽는다. 오류는 지금 알아야 하는 정보라
    aria-live="polite" 로 미루지 않는다.
  -->
  <div
    role="alert"
    class="flex w-full items-start gap-2 rounded-card bg-slate-900/95 p-4 text-white shadow-lg"
  >
    <svg
      viewBox="0 0 24 24"
      class="mt-0.5 size-5 shrink-0"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="9" />
      <template v-if="tone === 'success'">
        <path d="M8 12.2l2.8 2.8L16 9.8" stroke-linecap="round" stroke-linejoin="round" />
      </template>
      <template v-else>
        <path d="M12 7.5v5" stroke-linecap="round" />
        <circle cx="12" cy="16" r="0.75" fill="currentColor" stroke="none" />
      </template>
    </svg>

    <p class="min-w-0 flex-1 text-sm">{{ message }}</p>

    <!-- 자동으로 사라지지만, 가리는 게 거슬릴 때 즉시 치울 수 있어야 한다. -->
    <button
      type="button"
      class="-m-2 grid size-9 shrink-0 place-items-center text-white/70"
      aria-label="알림 닫기"
      @click="$emit('dismiss')"
    >
      <svg
        viewBox="0 0 24 24"
        class="size-4"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        aria-hidden="true"
      >
        <path d="M6 6l12 12M18 6L6 18" stroke-linecap="round" />
      </svg>
    </button>
  </div>
</template>
