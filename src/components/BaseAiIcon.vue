<script setup lang="ts">
/**
 * AI 표식 — 그라디언트 원 + 반짝임.
 *
 * 그라디언트는 시안 에셋의 값 그대로다(왼쪽 #019DFD → 오른쪽 #00C8B3). 이 파랑은
 * --color-accent-500(#459bf7) 과 다른 색이라 토큰을 따로 두지 않고 여기 직접 적는다 —
 * 점수 구간의 파랑과 섞이면 한쪽을 고칠 때 다른 쪽이 조용히 따라 바뀐다.
 *
 * ⚠️ 반짝임 글리프는 시안을 보고 그린 근사치다. 디자이너가 내보낸 원본은 SVG 안에
 * 512×512 PNG 가 박힌 형태라 16px 로 쓰기엔 무겁고 색도 고정된다 — 원본이 필요하면
 * 이 path 만 갈아끼우면 된다.
 */
withDefaults(defineProps<{ size?: number }>(), { size: 28 })

/** 그라디언트 id 는 문서 전역이라, 한 화면에 둘 이상 놓여도 안 겹치게 만든다. */
const gradientId = `ai-icon-${Math.random().toString(36).slice(2, 9)}`
</script>

<template>
  <svg
    :width="size"
    :height="size"
    viewBox="0 0 28 28"
    fill="none"
    class="shrink-0"
    aria-hidden="true"
  >
    <defs>
      <linearGradient
        :id="gradientId"
        x1="28"
        y1="14"
        x2="0"
        y2="14"
        gradientUnits="userSpaceOnUse"
      >
        <stop stop-color="#00C8B3" />
        <stop offset="1" stop-color="#019DFD" />
      </linearGradient>
    </defs>

    <circle cx="14" cy="14" r="14" :fill="`url(#${gradientId})`" />

    <g fill="#fff">
      <path
        d="M12.2 6.8c.62 3.9 2.18 5.46 6.08 6.08-3.9.62-5.46 2.18-6.08 6.08-.62-3.9-2.18-5.46-6.08-6.08 3.9-.62 5.46-2.18 6.08-6.08z"
      />
      <path
        d="M19.4 16.2c.3 1.86 1.04 2.6 2.9 2.9-1.86.3-2.6 1.04-2.9 2.9-.3-1.86-1.04-2.6-2.9-2.9 1.86-.3 2.6-1.04 2.9-2.9z"
      />
      <path
        d="M19.1 6.2c.2 1.22.68 1.7 1.9 1.9-1.22.2-1.7.68-1.9 1.9-.2-1.22-.68-1.7-1.9-1.9 1.22-.2 1.7-.68 1.9-1.9z"
      />
    </g>
  </svg>
</template>
