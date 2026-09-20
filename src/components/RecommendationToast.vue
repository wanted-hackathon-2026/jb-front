<script setup lang="ts">
import BaseChevron from '@/components/BaseChevron.vue'
import type { Job } from '@/stores/recommendation'

/**
 * 시안 39-2442 의 완료 배너. 라우트와 무관하게 떠야 해서 App.vue 에 마운트한다.
 * 위치(시트 위로 띄울지)는 App.vue 가 정하고, 여기서는 생김새만 책임진다.
 */
defineProps<{ job: Job }>()
defineEmits<{ open: [] }>()
</script>

<template>
  <!--
    배너 전체가 결과로 들어가는 버튼이다. 시안에 닫기(×)가 없어서 두지 않았다 —
    탭해서 결과를 보는 것이 유일한 소멸 경로다.
  -->
  <button
    type="button"
    class="flex w-full items-center gap-3 rounded-card bg-linear-to-r/srgb from-brand-500 to-accent-500 p-4 text-left text-white shadow-lg"
    @click="$emit('open')"
  >
    <span class="min-w-0 flex-1">
      <span class="block text-lg font-bold">방정식 풀이 완료</span>
      <span class="block truncate text-sm text-white/90">AI가 조건에 맞는 매물을 찾았어요</span>
    </span>
    <BaseChevron direction="right" />
  </button>
</template>
