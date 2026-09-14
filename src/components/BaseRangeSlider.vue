<script setup lang="ts">
import { computed } from 'vue'

/**
 * 양끝 슬라이더. 네이티브 input[type=range] 두 개를 겹쳐서 쓴다 —
 * 직접 만든 드래그보다 키보드·스크린리더 대응이 공짜로 따라온다.
 */
const props = defineProps<{
  modelValue: [number, number]
  min: number
  max: number
  step: number
  label: string
}>()
const emit = defineEmits<{ 'update:modelValue': [[number, number]] }>()

const pct = (v: number) => ((v - props.min) / (props.max - props.min)) * 100
const fill = computed(() => ({
  left: `${pct(props.modelValue[0])}%`,
  right: `${100 - pct(props.modelValue[1])}%`,
}))

// 두 손잡이가 서로를 넘어가지 않게 막는다.
const setLow = (e: Event) => {
  const v = Number((e.target as HTMLInputElement).value)
  emit('update:modelValue', [Math.min(v, props.modelValue[1]), props.modelValue[1]])
}
const setHigh = (e: Event) => {
  const v = Number((e.target as HTMLInputElement).value)
  emit('update:modelValue', [props.modelValue[0], Math.max(v, props.modelValue[0])])
}
</script>

<template>
  <div class="range relative h-6">
    <div class="absolute inset-x-0 top-1/2 h-1 -translate-y-1/2 rounded-full bg-slate-200" />
    <div class="absolute top-1/2 h-1 -translate-y-1/2 rounded-full bg-brand-500" :style="fill" />
    <input
      type="range"
      :min="min"
      :max="max"
      :step="step"
      :value="modelValue[0]"
      :aria-label="`${label} 최소`"
      @input="setLow"
    />
    <input
      type="range"
      :min="min"
      :max="max"
      :step="step"
      :value="modelValue[1]"
      :aria-label="`${label} 최대`"
      @input="setHigh"
    />
  </div>
</template>

<style scoped>
/* 트랙은 위 div 로 그리고, 네이티브 입력은 손잡이만 남긴다. */
.range input {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  margin: 0;
  background: none;
  pointer-events: none;
  appearance: none;
}
.range input::-webkit-slider-thumb {
  pointer-events: auto;
  appearance: none;
  width: 1.25rem;
  height: 1.25rem;
  border-radius: 9999px;
  background: #fff;
  border: 2px solid var(--color-brand-500);
  box-shadow: 0 1px 3px rgb(15 23 42 / 0.2);
  cursor: pointer;
}
.range input::-moz-range-thumb {
  pointer-events: auto;
  width: 1.25rem;
  height: 1.25rem;
  border: 2px solid var(--color-brand-500);
  border-radius: 9999px;
  background: #fff;
  cursor: pointer;
}
</style>
