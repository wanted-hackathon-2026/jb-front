<script setup lang="ts">
/**
 * 로딩 중 자리를 잡아두는 회색 덩어리. 무엇을 기다리는지는 모른다 — 크기·모양은
 * 쓰는 쪽이 클래스로 준다(`<BaseSkeleton class="h-4 w-24" />`).
 *
 * '불러오는 중…' 한 줄 대신 이걸 쓰는 이유는 **자리**다. 글자 한 줄은 도착할 내용과
 * 높이가 달라서 데이터가 오는 순간 화면이 튀고, 기다리는 동안 무엇이 올지도 알 수 없다.
 * 골격을 미리 깔면 기다리는 동안 이미 화면의 모양이 정해져 있고 시프트도 없다.
 *
 * 숨쉬기(animate-pulse)는 prefers-reduced-motion 에서 main.css 가 일괄로 끈다.
 *
 * ⚠️ 모서리를 바꾸려면 `rounded-full!` 처럼 **!** 를 붙여야 한다. 아래 rounded-md 와
 * 호출부의 클래스가 같은 요소에 나란히 붙는데, 둘 다 유틸리티 한 겹이라 우선순위가
 * 같고 그때는 스타일시트에 늦게 나온 쪽이 이긴다 — 실제로 점수 도넛 자리가
 * rounded-full 을 주고도 사각형으로 나왔다.
 */
</script>

<template>
  <span class="block animate-pulse rounded-md bg-slate-200" />
</template>
