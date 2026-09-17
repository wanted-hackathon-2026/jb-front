<script setup lang="ts">
/**
 * 목록이 비었을 때 그 자리에 놓는 안내.
 *
 * **오류 자리가 아니다.** 여기는 "서버가 200 을 줬는데 내용이 없다" 는 정상 상태다 —
 * 둘을 같은 모양으로 보여주면 사용자가 실패를 '원래 없는 것'으로 오해한다.
 *
 * 빈 상태에는 **다음에 할 일**이 있어야 한다. 문구만 두면 사용자가 막다른 길에 선다.
 */
defineProps<{
  /** 무엇이 없는지. 한 줄로 단정하게. */
  title: string
  /** 어떻게 하면 채워지는지. */
  hint?: string
  /** 다음 행동. 없으면 버튼을 그리지 않는다. */
  actionLabel?: string
}>()

defineEmits<{ action: [] }>()
</script>

<template>
  <div class="flex flex-col items-center px-8 py-16 text-center">
    <!-- 옅은 원 안의 아이콘. 빈 화면이 '고장'이 아니라 '아직'임을 눈으로 먼저 알린다. -->
    <span class="grid size-16 place-items-center rounded-full bg-slate-100" aria-hidden="true">
      <slot name="icon">
        <svg
          viewBox="0 0 24 24"
          class="size-7 text-slate-300"
          fill="none"
          stroke="currentColor"
          stroke-width="1.8"
        >
          <rect x="3.5" y="5" width="17" height="14" rx="2.5" />
          <path d="M3.5 9.5h17" stroke-linecap="round" />
        </svg>
      </slot>
    </span>

    <p class="mt-4 font-semibold text-slate-700">{{ title }}</p>
    <p v-if="hint" class="mt-1.5 text-sm leading-normal text-slate-400">{{ hint }}</p>

    <button
      v-if="actionLabel"
      type="button"
      class="mt-5 h-11 rounded-full border border-slate-200 px-5 text-sm font-semibold text-slate-700"
      @click="$emit('action')"
    >
      {{ actionLabel }}
    </button>
  </div>
</template>
