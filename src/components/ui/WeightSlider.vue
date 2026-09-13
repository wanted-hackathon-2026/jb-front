<script setup lang="ts">
import { computed } from 'vue'

/** 가중치·이동시간용 단일 슬라이더. 값 스케일은 1~100 이 기본이다. */
const props = withDefaults(
  defineProps<{
    modelValue: number
    label: string
    icon?: string
    min?: number
    max?: number
    step?: number
    valueText?: string
  }>(),
  { min: 1, max: 100, step: 1 },
)
const emit = defineEmits<{ 'update:modelValue': [number] }>()

const pct = computed(() => ((props.modelValue - props.min) / (props.max - props.min)) * 100)
const onInput = (e: Event) =>
  emit('update:modelValue', Number((e.target as HTMLInputElement).value))
</script>

<template>
  <div class="flex items-center gap-3">
    <span class="flex w-24 shrink-0 items-center gap-1.5 text-sm font-medium text-slate-700">
      <span v-if="icon" aria-hidden="true">{{ icon }}</span
      >{{ label }}
    </span>
    <div class="weight relative h-6 flex-1">
      <div class="absolute inset-x-0 top-1/2 h-1 -translate-y-1/2 rounded-full bg-slate-200" />
      <div
        class="absolute left-0 top-1/2 h-1 -translate-y-1/2 rounded-full bg-brand-500"
        :style="{ width: `${pct}%` }"
      />
      <input
        type="range"
        :min="min"
        :max="max"
        :step="step"
        :value="modelValue"
        :aria-label="label"
        @input="onInput"
      />
    </div>
    <span class="w-12 shrink-0 text-right text-sm font-semibold text-slate-900">
      {{ valueText ?? modelValue }}
    </span>
  </div>
</template>

<style scoped>
.weight input {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  margin: 0;
  background: none;
  appearance: none;
}
.weight input::-webkit-slider-thumb {
  appearance: none;
  width: 1.25rem;
  height: 1.25rem;
  border-radius: 9999px;
  background: #fff;
  border: 2px solid var(--color-brand-500);
  box-shadow: 0 1px 3px rgb(15 23 42 / 0.2);
  cursor: pointer;
}
.weight input::-moz-range-thumb {
  width: 1.25rem;
  height: 1.25rem;
  border: 2px solid var(--color-brand-500);
  border-radius: 9999px;
  background: #fff;
  cursor: pointer;
}
</style>
