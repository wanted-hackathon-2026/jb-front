<script setup lang="ts">
import { RouterView } from 'vue-router'
</script>

<template>
  <!--
    앱 셸. 모바일에서는 흰 배경이 화면을 가득 채우고 그림자는 화면 밖으로 잘려 보이지 않는다.
    데스크톱에서는 body 의 회색 바탕 위에 480px 흰 카드가 떠 있는 형태가 된다.
  -->
  <div
    class="mx-auto flex min-h-dvh max-w-shell flex-col bg-white shadow-[0_0_1.5rem_rgba(15,23,42,0.08)]"
  >
    <RouterView />
  </div>
</template>
