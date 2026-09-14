<script setup lang="ts">
import type { Job } from '@/stores/recommendation'

/** 시안 39-2442 의 완료 배너. 라우트와 무관하게 떠야 해서 App.vue 에 마운트한다. */
defineProps<{ job: Job }>()
defineEmits<{ open: []; close: [] }>()
</script>

<template>
  <div class="pointer-events-none fixed inset-x-0 bottom-0 z-50 flex justify-center p-4">
    <div
      class="pointer-events-auto flex w-full max-w-shell items-center gap-3 rounded-xl bg-accent-500 p-4 text-white shadow-lg"
    >
      <button type="button" class="min-w-0 flex-1 text-left" @click="$emit('open')">
        <p class="font-bold">방정식 풀이 완료</p>
        <p class="truncate text-sm text-white/90">AI가 조건에 맞는 매물을 찾았어요</p>
      </button>
      <svg
        viewBox="0 0 24 24"
        class="size-5 shrink-0"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        aria-hidden="true"
      >
        <path d="M9 5l7 7-7 7" stroke-linecap="round" stroke-linejoin="round" />
      </svg>
      <button
        type="button"
        class="grid size-8 shrink-0 place-items-center rounded-full text-white/80"
        aria-label="알림 닫기"
        @click="$emit('close')"
      >
        <svg
          viewBox="0 0 16 16"
          class="size-3.5"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
        >
          <path d="M2 2l12 12M14 2L2 14" />
        </svg>
      </button>
    </div>
  </div>
</template>
