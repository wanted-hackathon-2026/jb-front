<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { CLUSTER_STYLES, loadKakaoMaps } from '@/lib/kakao'
import type { Anchor, Listing } from '@/types/domain'

const props = defineProps<{
  listings: Listing[]
  anchors: Anchor[]
  /** 도달권 원의 기준이 되는 분 단위 이동시간 */
  maxMinutes: number
}>()

const emit = defineEmits<{ pick: [{ x: number; y: number }] }>()

const el = ref<HTMLElement>()
const failed = ref(false)

let map: kakao.maps.Map | null = null
let clusterer: kakao.maps.MarkerClusterer | null = null
let circles: kakao.maps.Circle[] = []
let pinMarker: kakao.maps.Marker | null = null

/** 지도에서 찍은 위치를 표시한다. 매물 마커와 달리 클러스터에 넣지 않는다. */
function dropPin(latlng: kakao.maps.LatLng) {
  if (!pinMarker) pinMarker = new kakao.maps.Marker({ position: latlng })
  else pinMarker.setPosition(latlng)
  pinMarker.setMap(map)
}

/**
 * 도달권 반경은 시각적 근사다. 실제 도달 가능 영역(등시선)은 대중교통 경로를 풀어야
 * 나오므로(README '역할 분담' — 백엔드 몫) 여기서는 분당 거리로 환산한 원만 그린다.
 *
 * ⚠️ 분당 500m(=시속 30km)로 두니 기본값 30분이 반경 15km 가 되어, 지름 30km 짜리 원이
 * 화면(가로 1.5km 남짓)을 통째로 덮었다. 원이 원으로 보이지도 않고 지도만 민트색으로
 * 물들었다. 도보 속도(분당 약 67m)로 낮춰 동네 스케일에 맞춘다.
 */
const METERS_PER_MINUTE = 67
/** 이동시간 슬라이더는 0분까지 내려간다 — 반경 0 이면 원이 안 보이고 화면 맞추기도 한 점으로 무너진다. */
const MIN_RADIUS = 200
const radiusOf = (minutes: number) => Math.max(MIN_RADIUS, minutes * METERS_PER_MINUTE)

/** 원 색은 브랜드 토큰을 그대로 읽는다 — 색을 여기 박아두면 팔레트가 바뀔 때 혼자 남는다. */
const brandColor = () =>
  getComputedStyle(document.documentElement).getPropertyValue('--color-brand-500').trim() ||
  '#5ac5b3'

function drawListings() {
  if (!map || !clusterer) return
  clusterer.clear()
  clusterer.addMarkers(
    props.listings.map((l) => new kakao.maps.Marker({ position: new kakao.maps.LatLng(l.y, l.x) })),
  )
}

function drawAnchors(fit = false) {
  if (!map) return
  circles.forEach((c) => c.setMap(null))
  const color = brandColor()
  circles = props.anchors.map((a) => {
    const circle = new kakao.maps.Circle({
      center: new kakao.maps.LatLng(a.y, a.x),
      radius: radiusOf(props.maxMinutes),
      strokeWeight: 2,
      strokeColor: color,
      strokeOpacity: 1,
      strokeStyle: 'dashed',
      fillColor: color,
      fillOpacity: 0.1,
    })
    circle.setMap(map)
    return circle
  })
  if (fit) fitToCircles()
}

/**
 * 거점이 바뀌면 원 전체가 보이도록 화면을 맞춘다. 원만 그리고 시점을 그대로 두면
 * 원이 화면 밖으로 넘쳐 '지도가 민트색으로 물든' 것처럼 보인다.
 * 이동시간 슬라이더를 움직일 때는 맞추지 않는다 — 드래그 중에 지도가 계속 튄다.
 */
function fitToCircles() {
  if (!map || !circles.length) return
  const bounds = new kakao.maps.LatLngBounds()
  circles.forEach((c) => {
    const b = c.getBounds()
    bounds.extend(b.getSouthWest())
    bounds.extend(b.getNorthEast())
  })
  map.setBounds(bounds)
}

onMounted(async () => {
  try {
    await loadKakaoMaps()
  } catch {
    failed.value = true
    return
  }
  const first = props.anchors[0]
  map = new kakao.maps.Map(el.value!, {
    center: new kakao.maps.LatLng(first?.y ?? 37.5006, first?.x ?? 127.0276),
    level: 5,
  })
  clusterer = new kakao.maps.MarkerClusterer({
    map,
    averageCenter: true,
    minLevel: 4,
    disableClickZoom: false,
    styles: CLUSTER_STYLES,
  })
  drawListings()
  drawAnchors(true)

  kakao.maps.event.addListener(map, 'click', (e: kakao.maps.event.MouseEvent) => {
    const latlng = e.latLng
    dropPin(latlng)
    emit('pick', { x: latlng.getLng(), y: latlng.getLat() })
  })
})

watch(() => props.listings, drawListings)
// 거점이 바뀔 때만 시점을 맞춘다. 이동시간은 원 크기만 다시 그린다.
watch(
  () => props.anchors,
  () => drawAnchors(true),
  { deep: true },
)
watch(
  () => props.maxMinutes,
  () => drawAnchors(false),
)

onBeforeUnmount(() => {
  circles.forEach((c) => c.setMap(null))
  pinMarker?.setMap(null)
  clusterer?.clear()
})
</script>

<template>
  <div class="absolute inset-0">
    <div ref="el" class="jb-map size-full" />
    <p v-if="failed" class="absolute inset-x-0 top-1/2 text-center text-sm text-slate-500">
      지도를 불러오지 못했어요. 카카오 개발자 사이트에 도메인이 등록됐는지 확인해 주세요.
    </p>
  </div>
</template>

<style scoped>
/*
  카카오는 원·선 같은 벡터 오버레이를 지도 전체를 덮는 <svg> 하나로 그린다. 그 SVG 가
  포인터 이벤트를 받는 바람에, 원 위에서 하는 핀치 줌·드래그가 지도에 닿지 않았다
  (원이 화면을 덮고 있으니 사실상 지도 전체에서 제스처가 먹지 않았다).
  그릴 뿐 만질 일은 없으니 이벤트를 꺼 둔다 — 마커·클러스터는 DOM 요소라 영향이 없다.
*/
.jb-map :deep(svg) {
  pointer-events: none;
}
</style>
