<script setup lang="ts">
import { useRouter } from 'vue-router'

/**
 * 없는 주소.
 *
 * 이 화면이 없으면 RouterView 가 아무것도 그리지 않아 **흰 화면**이 된다. 오타나 낡은
 * 링크, 예전 형식의 북마크로 쉽게 닿는 자리라 아무 말도 없는 화면을 남겨 둘 수 없다.
 *
 * 조판은 매물 상세·추천 결과의 실패 화면과 같다(BaseErrorState). 그쪽을 그대로 쓰지
 * 않는 이유는 버튼이다 — 저기서 할 일은 '다시 시도'지만 여기서는 다시 시도할 것이
 * 없다. 없는 주소를 여러 번 불러 봐야 계속 없다.
 */
const router = useRouter()

/**
 * push 가 아니라 replace 다. 잘못 들어온 주소를 기록에 남기면 지도에서 뒤로 갈 때
 * 다시 이 화면으로 돌아온다.
 */
const goMap = () => router.replace({ name: 'map' })
</script>

<template>
  <main class="flex min-h-0 flex-1 flex-col items-center justify-center bg-white px-8 text-center">
    <p class="font-semibold text-slate-900">없는 주소예요</p>
    <p class="mt-1 text-sm text-slate-500">주소가 바뀌었거나, 잘못 입력한 것 같아요</p>
    <button
      type="button"
      class="mt-5 h-11 rounded-full bg-brand-500 px-6 text-sm font-semibold text-white"
      @click="goMap"
    >
      지도로 가기
    </button>
  </main>
</template>
