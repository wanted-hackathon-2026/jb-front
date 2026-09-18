<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import {
  CLUSTER_MIN_LEVEL,
  CLUSTER_STYLES,
  LISTING_MARKER,
  PICKED_MARKER,
  loadKakaoMaps,
} from '@/lib/kakao'
import type { Anchor, Listing } from '@/types/domain'

const props = defineProps<{
  listings: Listing[]
  anchors: Anchor[]
  /** 도달권 원의 기준이 되는 분 단위 이동시간 */
  maxMinutes: number
  /**
   * 지도에서 고른 지점. 핀은 이 값의 그림이다 — null 이면 거둔다.
   * 클릭 때 여기서 바로 찍지 않고 부모를 한 번 거치는 이유가 이것이다.
   * 명령형으로 찍어두면 주소 팝업을 닫아도 핀만 지도에 남는다.
   */
  picked: { x: number; y: number } | null
}>()

const emit = defineEmits<{ pick: [{ x: number; y: number }] }>()

const el = ref<HTMLElement>()
const failed = ref(false)

/**
 * 카카오는 level 이 작을수록 확대다(1 이 가장 가까이). 범위 밖 값을 넣으면 SDK 가 조용히
 * 무시하므로, 끝에 닿으면 버튼을 잠근다 — 눌리는데 아무 일도 안 나는 상태를 만들지 않는다.
 */
const MIN_LEVEL = 1
const MAX_LEVEL = 14
const INITIAL_LEVEL = 5
const level = ref(INITIAL_LEVEL)

function zoomBy(step: number) {
  if (!map) return
  const current = map.getLevel()
  const next = Math.min(MAX_LEVEL, Math.max(MIN_LEVEL, current + step))
  if (next === current) return
  // 애니메이션은 레벨 차가 2 이하일 때만 먹는다(SDK 제약). 한 칸씩만 움직이니 항상 해당된다.
  map.setLevel(next, { animate: true })
}

// 버튼은 MapPage 의 FAB 컬럼에 있다 — 지도 위 오버레이의 세로 위치를 한 곳에서 계산하기
// 위해서다(MapPage 의 '오버레이 스택' 주석). 지도 인스턴스는 여기 있으므로 조작만 넘긴다.
defineExpose({
  zoomIn: () => zoomBy(-1),
  zoomOut: () => zoomBy(1),
  canZoomIn: computed(() => level.value > MIN_LEVEL),
  canZoomOut: computed(() => level.value < MAX_LEVEL),
})

let map: kakao.maps.Map | null = null
let clusterer: kakao.maps.MarkerClusterer | null = null
let circles: kakao.maps.Circle[] = []
/** 거점 이름표(시안의 '주요 거점 1' 말풍선). 원과 함께 다시 그린다. */
let anchorLabels: kakao.maps.CustomOverlay[] = []
let pinMarker: kakao.maps.Marker | null = null

/** 지도에서 찍은 위치를 표시한다. 매물 마커와 달리 클러스터에 넣지 않는다. */
function drawPin() {
  if (!map) return
  if (!props.picked) return pinMarker?.setMap(null)
  const latlng = new kakao.maps.LatLng(props.picked.y, props.picked.x)
  if (!pinMarker) {
    pinMarker = new kakao.maps.Marker({
      position: latlng,
      image: new kakao.maps.MarkerImage(
        PICKED_MARKER.src,
        new kakao.maps.Size(PICKED_MARKER.width, PICKED_MARKER.height),
        { offset: new kakao.maps.Point(PICKED_MARKER.anchor.x, PICKED_MARKER.anchor.y) },
      ),
    })
  } else pinMarker.setPosition(latlng)
  pinMarker.setMap(map)
}

/**
 * 도달권 반경은 시각적 근사다. 실제 도달 가능 영역(등시선)은 대중교통 경로를 풀어야
 * 나오므로(README '역할 분담' — 백엔드 몫) 여기서는 분당 거리로 환산한 원만 그린다.
 *
 * ⚠️ 분당 500m(=시속 30km)로 두니 기본값 30분이 반경 15km 가 되어, 지름 30km 짜리 원이
 * 화면(가로 1.5km 남짓)을 통째로 덮었다. 원이 원으로 보이지도 않고 지도만 민트색으로
 * 물들었다.
 *
 * 지금 값(25)은 도보 속도(분당 약 67m)보다도 느리다 — 일부러 그렇다. 아래 fitToCircles 가
 * 원에 맞춰 화면을 잡으므로 원은 반경과 무관하게 늘 화면을 채우고, 반경이 실제로 정하는 건
 * '원이 얼마나 크냐'가 아니라 '지도가 얼마나 확대되냐'다. 67 로 두면 기본값 30분에서
 * 반경 2km 라 구 단위까지 축소돼 골목이 안 보였다. 25 로 낮춰 시안과 같은 동네 스케일
 * (30분 → 반경 750m)로 맞춘다. 실제 도달권은 백엔드 몫이라 여기 숫자에 이동 의미는 없다.
 */
const METERS_PER_MINUTE = 25
/** 이동시간 슬라이더는 0분까지 내려간다 — 반경 0 이면 원이 안 보이고 화면 맞추기도 한 점으로 무너진다. */
const MIN_RADIUS = 200
const radiusOf = (minutes: number) => Math.max(MIN_RADIUS, minutes * METERS_PER_MINUTE)

/** 원 색은 브랜드 토큰을 그대로 읽는다 — 색을 여기 박아두면 팔레트가 바뀔 때 혼자 남는다. */
const brandColor = () =>
  getComputedStyle(document.documentElement).getPropertyValue('--color-brand-500').trim() ||
  '#00c8b3'

function drawListings() {
  if (!map || !clusterer) return
  clusterer.clear()
  clusterer.addMarkers(
    props.listings.map(
      (l) =>
        new kakao.maps.Marker({
          position: new kakao.maps.LatLng(l.y, l.x),
          image: new kakao.maps.MarkerImage(
            LISTING_MARKER.src,
            new kakao.maps.Size(LISTING_MARKER.size, LISTING_MARKER.size),
          ),
        }),
    ),
  )
}

function drawAnchors(fit = false) {
  if (!map) return
  circles.forEach((c) => c.setMap(null))
  anchorLabels.forEach((o) => o.setMap(null))
  const color = brandColor()

  anchorLabels = props.anchors.map((a, i) => {
    // SDK 가 문자열로 붙이는 DOM 이라 Tailwind 클래스가 아니라 인라인 스타일을 쓴다.
    const el = document.createElement('div')
    // 번호는 여럿일 때만 뜻이 있다 — 하나뿐인데 '1'이 붙으면 더 있을 것처럼 보인다.
    el.textContent = props.anchors.length > 1 ? `주요 거점 ${i + 1}` : '주요 거점'
    el.style.cssText =
      'padding:3px 10px;border-radius:9999px;background:#fff;color:#0f172a;' +
      'font-size:12px;font-weight:700;white-space:nowrap;' +
      'box-shadow:0 1px 4px rgb(15 23 42 / .2)'
    const overlay = new kakao.maps.CustomOverlay({
      position: new kakao.maps.LatLng(a.y, a.x),
      content: el,
      yAnchor: 1.6,
      zIndex: 2,
    })
    overlay.setMap(map)
    return overlay
  })

  circles = props.anchors.map((a) => {
    const circle = new kakao.maps.Circle({
      center: new kakao.maps.LatLng(a.y, a.x),
      radius: radiusOf(props.maxMinutes),
      strokeWeight: 2,
      strokeColor: color,
      strokeOpacity: 1,
      // 'dashed' 는 대시가 짧아 멀리서 보면 실선에 가깝게 뭉친다. 시안의 성긴 파선은
      // longdash 다 — 원이 크고 곡률이 완만해서 대시가 길어야 파선으로 읽힌다.
      strokeStyle: 'longdash',
      /*
        시안의 채움은 그라데이션이지만 여기선 단색이다. Circle 의 fillColor 가 색 하나만
        받아서, 그라데이션을 내려면 벡터 오버레이를 버리고 CustomOverlay(DOM)로 가야 한다.
        실제로 해 봤더니 카카오가 줌 애니메이션 동안 CustomOverlay 를 통째로 숨겨서
        원이 304ms 사라졌다 나타났다 — 화면의 절반을 차지하는 요소라 눈에 띈다.
        줌은 자주 쓰는 동작이라 그 대가를 치르지 않기로 했다.
      */
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

/**
 * 지도 위 핀치가 페이지 확대로 새는 걸 막는다.
 *
 * iOS 사파리는 접근성을 이유로 viewport 의 maximum-scale 을 무시한다 — index.html 에
 * 적혀 있어도 두 손가락을 대면 페이지가 확대된다. 평소엔 카카오가 touchmove 를
 * preventDefault 해서 브라우저까지 가지 않지만, 손가락 하나가 지도 밖(시트 경계·상단 바
 * 여백)에 걸치는 순간 카카오는 그 제스처를 모르고 사파리가 페이지를 확대해 버린다.
 * 셸이 position:fixed 라 확대된 채로 굳으면 되돌리기도 번거롭다.
 *
 * **지도 위에서만** 막는다. 시트·목록·상세의 글자는 확대할 수 있어야 하므로 document
 * 에 걸지 않는다. 지도는 자체 줌(핀치·버튼)이 있어 브라우저 확대가 할 일이 없다.
 * 리스너는 이 엘리먼트에 붙으므로 언마운트될 때 같이 사라진다.
 */
function blockPageZoom(target: HTMLElement) {
  for (const type of ['gesturestart', 'gesturechange', 'gestureend']) {
    target.addEventListener(type, (e) => e.preventDefault(), { passive: false })
  }
}

onMounted(async () => {
  blockPageZoom(el.value!)
  try {
    await loadKakaoMaps()
  } catch {
    failed.value = true
    return
  }
  const first = props.anchors[0]
  map = new kakao.maps.Map(el.value!, {
    center: new kakao.maps.LatLng(first?.y ?? 37.5006, first?.x ?? 127.0276),
    level: INITIAL_LEVEL,
  })
  // 줌 한계를 지도에 못박는다. SDK 기본 상한에 기대면 버튼이 잠기는 지점과 지도가 실제로
  // 멈추는 지점이 어긋나, 끝에서 눌러도 아무 일이 안 일어나는 버튼이 된다.
  map.setMinLevel(MIN_LEVEL)
  map.setMaxLevel(MAX_LEVEL)
  // 레벨은 버튼 말고 핀치·더블탭·클러스터 클릭·setBounds 로도 바뀐다 — 한 곳에서 받는다.
  kakao.maps.event.addListener(map, 'zoom_changed', () => {
    level.value = map!.getLevel()
  })
  clusterer = new kakao.maps.MarkerClusterer({
    map,
    averageCenter: true,
    // 축소된 상태에서는 숫자 배지로 묶고, 확대하면 낱개 점으로 푼다(lib/kakao.ts).
    // 0 으로 두면 끝까지 확대해도 배지가 남아 어느 건물에 있는 매물인지 알 수 없다.
    minLevel: CLUSTER_MIN_LEVEL,
    // 2건 이상만 배지로 묶는다. 1 로 두면 '1' 만 적힌 배지가 지도를 덮는다 —
    // 시안의 8·10·35 는 여러 건이 뭉친 숫자지 낱개가 아니다.
    minClusterSize: 2,
    disableClickZoom: false,
    styles: CLUSTER_STYLES,
  })
  drawListings()
  drawAnchors(true)

  kakao.maps.event.addListener(map, 'click', (e: kakao.maps.event.MouseEvent) => {
    emit('pick', { x: e.latLng.getLng(), y: e.latLng.getLat() })
  })
  drawPin()
})

watch(() => props.listings, drawListings)
watch(() => props.picked, drawPin)
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
  anchorLabels.forEach((o) => o.setMap(null))
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
