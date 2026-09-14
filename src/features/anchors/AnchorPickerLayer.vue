<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { addressToCoord } from '@/lib/api/geocode'
import { loadPostcode } from '@/lib/postcode'
import { useAnchorsStore } from '@/stores/anchors'

/**
 * 카카오 우편번호 위젯을 앱 셸 안에 레이어로 띄운다.
 * 팝업(`open()`)은 모바일에서 새 창이라 차단되거나 UX 가 나쁘다 — `embed()` 를 쓴다.
 */
const emit = defineEmits<{ close: [] }>()

const anchors = useAnchorsStore()
const host = ref<HTMLElement>()
const failed = ref(false)

async function pick(data: PostcodeResult) {
  // 이름은 건물명을 쓴다. 주소를 그대로 칩에 넣으면 좁은 화면에서 한 줄을 다 먹고,
  // 자체 검색 화면(신논현역)과 표기가 어긋나 교체 시 화면이 흔들린다.
  const name = data.buildingName || data.address
  const address = data.roadAddress || data.address
  try {
    const { x, y } = await addressToCoord(address)
    anchors.add({ id: `postcode_${data.zonecode}_${name}`, name, address, x, y })
  } finally {
    // 무슨 일이 있어도 레이어는 닫는다 — 열린 채 멈추면 빠져나갈 길이 없다.
    emit('close')
  }
}

onMounted(async () => {
  try {
    await loadPostcode()
  } catch {
    failed.value = true
    return
  }
  new daum.Postcode({
    oncomplete: pick,
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
    <div class="mx-auto flex h-full max-w-shell flex-col bg-white">
      <header
        class="safe-top flex shrink-0 items-center justify-between border-b border-slate-100 px-2 py-3"
      >
        <h2 class="pl-3 font-bold text-slate-900">거점 검색</h2>
        <button
          type="button"
          class="grid size-10 place-items-center text-slate-600"
          aria-label="닫기"
          @click="$emit('close')"
        >
          <svg
            viewBox="0 0 24 24"
            class="size-5"
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
