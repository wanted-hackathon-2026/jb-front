<script setup lang="ts">
/**
 * 한 지점만 보여주는 이미지 지도. 누르면 카카오맵으로 넘어간다.
 *
 * 움직이는 지도(`kakao.maps.Map`)가 아니라 `StaticMap` 인 게 핵심이다. 이 블록이 놓이는
 * 상세는 세로로 긴 스크롤 화면이라, 드래그되는 지도를 얹으면 **아래로 넘기려는 손가락을
 * 지도가 먹는다** — 사용자는 스크롤하려는데 지도만 패닝된다. 이미지 지도는 제스처를
 * 아예 받지 않아서 블록 전체가 그냥 하나의 큰 버튼이 된다.
 *
 * 링크가 `<a>` 인 것도 일부러다. window.open 으로 열면 길게 눌러 주소를 복사하거나
 * 새 탭으로 여는, 링크라면 당연한 것들이 전부 사라진다.
 */
import { onMounted, ref, watch } from 'vue'
import { kakaoMapLink, listingMarker, loadKakaoMaps } from '@/lib/kakao'

const props = withDefaults(
  defineProps<{
    /** 경도(lng) */
    x: number
    /** 위도(lat) */
    y: number
    /** 카카오맵에서 이 지점에 붙을 이름 */
    label: string
    /** 카카오의 확대 수준. **작을수록 가깝다**(1 이 가장 가까이) */
    level?: number
  }>(),
  // 4 면 블록(440×160) 에 큰길과 골목이 같이 들어온다. 지도 탭의 첫 화면(5)보다 한 칸
  // 가깝다 — 여기서 알고 싶은 건 동네가 아니라 '이 건물이 어디 끼어 있나'다.
  { level: 4 },
)

/**
 * SDK 를 못 받았을 때. 부모가 절을 통째로 접으라고 알린다 — 빈 회색 상자에 제목만
 * 남겨두면 지도가 '아직 뜨는 중'인지 '안 뜨는'지 구분이 안 된다.
 */
const emit = defineEmits<{ unavailable: [] }>()

const el = ref<HTMLElement>()
let staticMap: kakao.maps.StaticMap | null = null

onMounted(async () => {
  try {
    await loadKakaoMaps()
  } catch {
    emit('unavailable')
    return
  }
  if (!el.value) return
  staticMap = new kakao.maps.StaticMap(el.value, {
    center: new kakao.maps.LatLng(props.y, props.x),
    level: props.level,
    /*
     * 기본 마커(파란 물방울)를 끄고 우리 점을 위에 얹는다 — StaticMap 의 marker 는
     * 위치와 tooltip 만 받고 이미지는 못 바꾼다. 지도 중심이 곧 이 지점이라
     * 정중앙에 두면 좌표에 정확히 앉는다.
     */
    marker: false,
  })
})

/**
 * 같은 인스턴스가 다른 매물을 맡을 수 있다 — 상세는 라우트만 바뀌고 재사용되는 화면이다
 * (ListingDetailPage 의 load). 다시 만들지 않고 중심만 옮긴다.
 */
watch(
  () => [props.x, props.y],
  () => staticMap?.setCenter(new kakao.maps.LatLng(props.y, props.x)),
)
</script>

<template>
  <a
    :href="kakaoMapLink(label, y, x)"
    target="_blank"
    rel="noopener"
    :aria-label="`${label} 위치를 카카오맵에서 보기`"
    class="relative block h-40 overflow-hidden rounded-2xl bg-slate-100"
  >
    <div ref="el" class="size-full" aria-hidden="true" />

    <!-- 매물 위치. 지도 핀과 같은 그림이라 지도 탭에서 보던 점이 여기 그대로 있다. -->
    <img
      :src="listingMarker().src"
      width="18"
      height="18"
      alt=""
      aria-hidden="true"
      class="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
    />

    <!--
      누를 수 있다는 표시. 이미지 지도는 만져도 반응이 없어서, 이 말이 없으면 그냥
      그림으로 읽히고 아무도 누르지 않는다.
    -->
    <span
      class="pointer-events-none absolute bottom-2 right-2 rounded-full bg-white/95 px-2.5 py-1 text-xs font-semibold text-slate-700 shadow-[0_1px_3px_rgba(15,23,42,0.18)]"
      aria-hidden="true"
    >
      카카오맵에서 보기
    </span>
  </a>
</template>
