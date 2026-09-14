<script setup lang="ts" generic="T extends string">
defineProps<{ modelValue: T; options: { value: T; label: string }[] }>()
defineEmits<{ 'update:modelValue': [T] }>()
</script>

<template>
  <div class="inline-flex rounded-full bg-slate-100 p-1" role="tablist">
    <button
      v-for="opt in options"
      :key="opt.value"
      type="button"
      role="tab"
      :aria-selected="modelValue === opt.value"
      class="h-9 rounded-full px-4 text-sm font-semibold transition-colors"
      :class="modelValue === opt.value ? 'bg-brand-500 text-white' : 'text-slate-500'"
      @click="$emit('update:modelValue', opt.value)"
    >
      {{ opt.label }}
    </button>
  </div>
</template>
