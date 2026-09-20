<script setup lang="ts">
/**
 * 못 불러왔을 때 그 자리에 놓는 안내.
 *
 * **`BaseEmptyState` 와 일부러 다른 모양이다.** 빈 상태는 "서버가 200 을 줬는데 내용이
 * 없다"는 정상이고, 이쪽은 실패다. 둘을 같은 얼굴로 그리면 사용자가 실패를 '원래 없는
 * 것'으로 오해한다 — 지도에서 "조건에 맞는 매물이 없어요"가 뜨면 그 동네를 포기한다.
 *
 * **다시 시도 버튼은 뗄 수 없다.** 문구만 두면 새로고침 말고는 길이 없다.
 */
defineProps<{
  /** 무엇을 못 했는지. 서버 문구를 그대로 쓰지 않는다 — 개발 확인용이라 사용자에게 쓸 말이 아니다. */
  title: string
  /** 왜 그럴 수 있는지. 없으면 일반적인 안내를 쓴다. */
  hint?: string
}>()

defineEmits<{ retry: [] }>()
</script>

<template>
  <div class="px-5 py-16 text-center">
    <p class="font-semibold text-slate-900">{{ title }}</p>
    <p class="mt-1 text-sm text-slate-500">{{ hint ?? '잠시 후 다시 시도해 주세요' }}</p>
    <button
      type="button"
      class="mt-5 h-11 rounded-full bg-brand-500 px-6 text-sm font-semibold text-white"
      @click="$emit('retry')"
    >
      다시 시도
    </button>
  </div>
</template>
