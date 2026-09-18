<script setup lang="ts">
/**
 * 돌아가는 고리. 버튼 안이나 문구 옆에 놓여 "받는 중"을 말한다.
 *
 * 스켈레톤과 쓰임이 다르다. 스켈레톤은 **화면에 들어올 내용**의 자리를 잡는 것이고,
 * 이건 **누른 동작**이 진행 중이라는 표시다 — 자리를 잡을 내용이 없다.
 *
 * 색은 currentColor 를 따른다. 버튼 글자색과 저절로 같아져서 자리마다 색을 줄 필요가 없다.
 */
withDefaults(defineProps<{ size?: number }>(), { size: 18 })
</script>

<template>
  <svg
    :width="size"
    :height="size"
    viewBox="0 0 24 24"
    class="animate-spin shrink-0"
    fill="none"
    aria-hidden="true"
  >
    <!-- 옅은 고리 전체 + 진한 1/4 토막. 토막만 있으면 뭐가 도는지 안 읽힌다. -->
    <circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="2.5" stroke-opacity="0.3" />
    <path
      d="M21 12a9 9 0 0 0-9-9"
      stroke="currentColor"
      stroke-width="2.5"
      stroke-linecap="round"
    />
  </svg>
</template>
