<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { loadPostcode } from '@/lib/postcode'

/**
 * 카카오 우편번호 위젯을 앱 셸 안에 레이어로 띄운다.
 * 팝업(`open()`)은 모바일에서 새 창이라 차단되거나 UX 가 나쁘다 — `embed()` 를 쓴다.
 *
 * 고른 주소를 **그대로 올려보내기만 한다.** 거점으로 쓸지 매물 주소로 쓸지는
 * 부르는 쪽이 정한다 — 그래서 이 컴포넌트는 도메인을 모른다(Base 접두사의 기준).
 */
withDefaults(defineProps<{ title?: string }>(), { title: '주소 검색' })
const emit = defineEmits<{ select: [PostcodeResult]; close: [] }>()

const host = ref<HTMLElement>()
const failed = ref(false)

onMounted(async () => {
  try {
    await loadPostcode()
  } catch {
    failed.value = true
    return
  }
  new daum.Postcode({
    oncomplete: (data) => emit('select', data),
    width: '100%',
    height: '100%',
    // 바꿀 수 있는 건 색뿐이다 — 레이아웃·타이포·구조는 카카오가 고정한다.
    // 기본 파란색만이라도 브랜드 색으로 맞춰 이질감을 줄인다.
    theme: {
      bgColor: '#ffffff',
      searchBgColor: '#ffffff',
      contentBgColor: '#ffffff',
      pageBgColor: '#f8fafc',
      textColor: '#334155',
      queryTextColor: '#0f172a',
      postcodeTextColor: '#00c8b3',
      emphTextColor: '#00a494',
      outlineColor: '#e2e8f0',
    },
  }).embed(host.value!, { autoClose: false })
})
</script>

<template>
  <div class="fixed inset-0 z-50 bg-slate-900/40">
    <!-- data-panel: 배경은 페이드, 이 판은 아래에서 올라온다(main.css '열고 닫기 모션'). -->
    <div class="mx-auto flex h-full max-w-shell flex-col bg-white" data-panel>
      <header
        class="safe-top flex shrink-0 items-center justify-between border-b border-slate-100 px-2 py-3"
      >
        <h2 class="pl-3 font-bold text-slate-900">{{ title }}</h2>
        <button
          type="button"
          class="grid size-11 place-items-center text-slate-600"
          aria-label="닫기"
          @click="emit('close')"
        >
          <svg
            viewBox="0 0 24 24"
            class="size-6"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <path d="M5 5l14 14M19 5L5 19" stroke-linecap="round" />
          </svg>
        </button>
      </header>

      <p v-if="failed" class="px-5 py-16 text-center text-sm text-slate-400">
        주소 검색을 불러오지 못했어요. 잠시 후 다시 시도해 주세요.
      </p>
      <!-- 위젯이 iframe 을 여기에 끼운다. 하단 "Powered by kakao" 로고를 가리지 않도록 높이를 넉넉히 준다. -->
      <div v-else ref="host" class="min-h-0 flex-1" />
    </div>
  </div>
</template>
