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
 * 나오므로, 여기서는 분당 500m 로 환산한 원만 그린다.
 */
const radiusOf = (minutes: number) => minutes * 500

function drawListings() {
  if (!map || !clusterer) return
  clusterer.clear()
  clusterer.addMarkers(
    props.listings.map((l) => new kakao.maps.Marker({ position: new kakao.maps.LatLng(l.y, l.x) })),
  )
}

function drawAnchors() {
  if (!map) return
  circles.forEach((c) => c.setMap(null))
  circles = props.anchors.map((a) => {
    const circle = new kakao.maps.Circle({
      center: new kakao.maps.LatLng(a.y, a.x),
      radius: radiusOf(props.maxMinutes),
      strokeWeight: 2,
      strokeColor: '#00c8b3',
      strokeOpacity: 1,
      strokeStyle: 'dashed',
      fillColor: '#00c8b3',
      fillOpacity: 0.1,
    })
    circle.setMap(map)
    return circle
  })
  // 첫 거점으로 시점을 옮긴다 — 거점을 등록했는데 딴 데를 보고 있으면 혼란스럽다.
  const first = props.anchors[0]
  if (first) map.setCenter(new kakao.maps.LatLng(first.y, first.x))
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
  drawAnchors()

  kakao.maps.event.addListener(map, 'click', (e: kakao.maps.event.MouseEvent) => {
    const latlng = e.latLng
    dropPin(latlng)
    emit('pick', { x: latlng.getLng(), y: latlng.getLat() })
  })
})

watch(() => props.listings, drawListings)
watch([() => props.anchors, () => props.maxMinutes], drawAnchors, { deep: true })

onBeforeUnmount(() => {
  circles.forEach((c) => c.setMap(null))
  pinMarker?.setMap(null)
  clusterer?.clear()
})
</script>

<template>
  <div class="absolute inset-0">
    <div ref="el" class="size-full" />
    <p v-if="failed" class="absolute inset-x-0 top-1/2 text-center text-sm text-slate-500">
      지도를 불러오지 못했어요. 카카오 개발자 사이트에 도메인이 등록됐는지 확인해 주세요.
    </p>
  </div>
</template>
