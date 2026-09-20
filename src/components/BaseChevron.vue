<script setup lang="ts">
import { computed } from 'vue'

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
 *
 * 크기는 높이로 받는다(기본 15px = 뒤로 가기 에셋). 글자 옆에 붙는 자리는 더 작다 —
 * 마이페이지의 이름 줄은 시안이 5×10 이라 `:size="10"` 으로 부른다. 폭은 에셋 비율
 * (8:15)로 따라가므로 부르는 쪽이 두 수를 맞출 일이 없다.
 */
const props = withDefaults(defineProps<{ direction?: 'left' | 'right'; size?: number }>(), {
  direction: 'left',
  size: 15,
})

/** 에셋 비율 8:15 를 지킨다 — 높이만 주면 폭이 따라온다. */
const box = computed(() => ({
  height: `${props.size}px`,
  width: `${(props.size * 8) / 15}px`,
}))
</script>

<template>
  <svg
    viewBox="0 0 8 15"
    class="shrink-0"
    :class="direction === 'right' && 'rotate-180'"
    :style="box"
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
