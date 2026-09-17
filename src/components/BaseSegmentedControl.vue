<script setup lang="ts" generic="T extends string">
/**
 * 라벨은 13px 이다. 상속되는 16px 을 그대로 두면 알약 안 글자가 시안보다 4px 커서
 * 컨트롤이 화면을 압도한다(시안 실측 12px 에서 한 눈금 올린 값).
 */
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
      class="flex h-10 items-center gap-1 rounded-full px-5 text-[13px] font-bold transition-colors"
      :class="modelValue === opt.value ? 'bg-brand-500 text-white' : 'text-slate-500'"
      @click="$emit('update:modelValue', opt.value)"
    >
      <!-- 라벨 앞에 아이콘을 붙이는 쪽이 있다(지도의 'AI 추천'). 이 컴포넌트는 그게
           무엇인지 모른 채 자리만 내준다. -->
      <slot :option="opt">{{ opt.label }}</slot>
    </button>
  </div>
</template>
