<script setup lang="ts">
/**
 * `removeLabel` 은 × 버튼의 스크린리더 이름이다 — 기본값이 '거점 삭제'인 이유는
 * 이 칩이 거의 거점 목록에 쓰이기 때문이고, 검색 조건처럼 지우는 대상이 다르면
 * 부르는 쪽이 바로잡는다("… 거점 삭제"는 실제로 거점을 지운다는 뜻이 되어 버린다).
 */
withDefaults(defineProps<{ label: string; removable?: boolean; removeLabel?: string }>(), {
  removeLabel: '거점 삭제',
})
defineEmits<{ remove: [] }>()
</script>

<template>
  <span
    class="inline-flex h-9 shrink-0 items-center gap-1 rounded-full border border-brand-500 bg-white pl-3 text-sm font-medium text-brand-500"
    :class="removable ? 'pr-1' : 'pr-3'"
  >
    {{ label }}
    <button
      v-if="removable"
      type="button"
      class="grid size-7 place-items-center rounded-full text-brand-500"
      :aria-label="`${label} ${removeLabel}`"
      @click="$emit('remove')"
    >
      <svg viewBox="0 0 16 16" class="size-3.5" aria-hidden="true">
        <path d="M2 2l12 12M14 2L2 14" stroke="currentColor" stroke-width="2" fill="none" />
      </svg>
    </button>
  </span>
</template>
