<script setup lang="ts">
/**
 * 꺾쇠. 시안 에셋 그대로다(8×15, 선 1.3).
 *
 * 크기를 컴포넌트가 들고 있는 것이 이 아이콘의 요점이다 — 세로로 긴 그림이라
 * `size-6` 같은 정사각 클래스로 부르면 15px 짜리가 24px 로 늘어나 선만 굵어 보이고,
 * 자리마다 다른 수를 넣으면 화면을 옮길 때 굵기가 바뀐다. 뒤로 가기 여섯 곳과
 * '들어간다' 를 가리키는 세 곳이 같은 그림을 쓰도록 여기서 한 번만 정한다
 * (헤더의 자리 규칙은 README '모바일 전용 설계').
 *
 * 오른쪽은 같은 path 를 180° 돌린다 — 좌우 대칭이라 모양이 같고, path 를 두 벌 두면
 * 다음에 한쪽만 고쳐질 자리가 생긴다.
 *
 * 색만 currentColor 를 따른다 — 헤더에서는 검정, 사진 위·완료 배너에서는 흰색이다.
 */
withDefaults(defineProps<{ direction?: 'left' | 'right' }>(), { direction: 'left' })
</script>

<template>
  <svg
    viewBox="0 0 8 15"
    class="h-[15px] w-2 shrink-0"
    :class="direction === 'right' && 'rotate-180'"
    fill="none"
    aria-hidden="true"
  >
    <path
      d="M7.1499 13.65L0.649902 7.15002L7.1499 0.650024"
      stroke="currentColor"
      stroke-width="1.3"
      stroke-linecap="round"
      stroke-linejoin="round"
    />
  </svg>
</template>
