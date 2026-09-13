<script setup lang="ts">
defineProps<{ label: string; removable?: boolean }>()
defineEmits<{ remove: [] }>()
</script>

<template>
  <span
    class="inline-flex h-9 shrink-0 items-center gap-1 rounded-full border border-brand-500 bg-white pl-3 text-sm font-medium text-brand-700"
    :class="removable ? 'pr-1' : 'pr-3'"
  >
    {{ label }}
    <button
      v-if="removable"
      type="button"
      class="grid size-7 place-items-center rounded-full text-brand-600"
      :aria-label="`${label} 거점 삭제`"
      @click="$emit('remove')"
    >
      <svg viewBox="0 0 16 16" class="size-3.5" aria-hidden="true">
        <path d="M2 2l12 12M14 2L2 14" stroke="currentColor" stroke-width="2" fill="none" />
      </svg>
    </button>
  </span>
</template>
