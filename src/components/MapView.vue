<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import {
  ANCHOR_LABEL,
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
 * 지금 값(20)은 도보 속도(분당 약 67m)보다도 느리다 — 일부러 그렇다. 67 로 두면 기본값
 * 30분에서 반경 2km 라 구 단위까지 축소돼 골목이 안 보였다. 시안과 같은 동네 스케일
 * (30분 → 반경 600m)로 맞춘다. 실제 도달권은 백엔드 몫이라 여기 숫자에 이동 의미는 없다.
 *
 * 화면에서 원이 커지고 작아지는 것도 사실상 이 값이 정한다. fitToCircles 가 원에 맞춰
 * 화면을 잡지만 카카오의 줌은 단계가 2배씩이라 딱 맞게 잡히지 않는다 — 한 단계 안에서
 * 남는 여백이 곧 원과 화면 가장자리 사이의 숨 쉴 틈이다. 25(750m)일 때는 그 틈이 거의
 * 없어 원이 폭을 꽉 채웠다.
 */
const METERS_PER_MINUTE = 20
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

  anchorLabels = props.anchors.map((a) => {
    const overlay = new kakao.maps.CustomOverlay({
      position: new kakao.maps.LatLng(a.y, a.x),
      // 시안 말풍선 그대로다(lib/kakao.ts). 꼬리 끝이 거점에 닿도록 앵커를 그 점에 맞춘다.
      content: ANCHOR_LABEL.html,
      xAnchor: ANCHOR_LABEL.xAnchor,
      yAnchor: ANCHOR_LABEL.yAnchor,
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
      // 실제 파선 간격은 syncRingDash 가 둘레에 맞춰 다시 잡는다. 여기 값은 그게
      // 못 먹었을 때의 바탕이다 — 'dashed' 는 대시가 짧아 멀리서 실선처럼 뭉치고,
      // 시안의 성긴 파선은 longdash 다.
      strokeStyle: 'longdash',
      /*
        여기 단색은 **바탕**이다. 화면에 실제로 보이는 채움은 아래 <style> 이 시안의
        그라데이션(#jb-ring-fill)으로 덮는다 — Circle 의 fillColor 는 색을 하나만 받는다.

        그라데이션 때문에 벡터 오버레이를 버리고 CustomOverlay(DOM)로 가는 길도 있었지만
        가지 않았다. 카카오가 줌 애니메이션 동안 CustomOverlay 를 통째로 숨겨서 원이
        304ms 사라졌다 나타난다 — 화면의 절반을 차지하는 요소라 눈에 띈다.
      */
      fillColor: color,
      fillOpacity: 0.1,
    })
    circle.setMap(map)
    return circle
  })
  if (fit) fitToCircles()
  ensureRingGradient()
  syncRingDash()
}

/**
 * 시안의 채움을 **카카오가 만든 SVG 안에** 심는다.
 *
 * Circle 의 fillColor 는 색을 하나만 받으므로 채움은 CSS 로 덮는데, 그러려면 그라데이션
 * 정의가 어딘가에 있어야 한다. 처음엔 컴포넌트 템플릿에 따로 <svg> 를 두고 그걸
 * 가리켰다 — 크롬에서는 칠해지고 **웹킷에서는 대비색(단색)이 칠해졌다.** 페인트 서버를
 * 다른 SVG 뿌리에서 찾아오는 건 브라우저마다 지키는 정도가 다르다.
 *
 * 같은 뿌리 안이면 그런 재량이 없다. 그래서 카카오의 <defs> 에 직접 넣는다.
 * 하필 <defs> 인 이유는 거기가 안전해서다 — SDK 는 오버레이를 지울 때 svg 의 자식을
 * **첫 번째만 남기고** 걷어내는데, 그 첫 자식이 이 <defs> 다.
 *
 * 방사형인 게 핵심이다. 거점(=원의 중심)이 가장 진하고 밖으로 갈수록 옅어진다 —
 * 도달권은 가장자리로 갈수록 '덜 확실한' 영역이라 색도 그렇게 빠져야 한다.
 * 경계상자 비율(objectBoundingBox)이 기본이라 지름 50% 가 곧 원의 테두리다. 그래서
 * 위치를 따로 주지 않는다(기본값 cx·cy·r = 50%) — 마지막 색이 파선 위에 정확히 앉는다.
 *
 * 색·진하기는 스코프 CSS 가 준다(아래 <style>). 여기서 만든 노드에는 스코프 표식이
 * 안 붙지만 :deep() 으로 집으므로 상관없다.
 */
const SVG_NS = 'http://www.w3.org/2000/svg'
const RING_STOPS = [
  ['0', 'jb-ring-core'],
  ['0.5', 'jb-ring-mid'],
  ['1', 'jb-ring-edge'],
]
function ensureRingGradient() {
  const svg = el.value?.querySelector<SVGSVGElement>('svg:not(.jb-anchor-label)')
  const defs = svg?.querySelector('defs')
  if (!defs || defs.querySelector('#jb-ring-fill')) return
  const gradient = document.createElementNS(SVG_NS, 'radialGradient')
  gradient.setAttribute('id', 'jb-ring-fill')
  for (const [offset, cls] of RING_STOPS) {
    const stop = document.createElementNS(SVG_NS, 'stop')
    stop.setAttribute('offset', offset)
    stop.setAttribute('class', cls)
    gradient.append(stop)
  }
  defs.append(gradient)
}

/**
 * 파선 한 칸을 둘레에 비례시킨다 — 배율이 달라도 같은 파선으로 보이게.
 *
 * 카카오의 strokeStyle 은 px 로 고정된 dasharray 다(longdash = strokeWeight 2 기준
 * 선 14px + 공백 8px). 반경은 미터라 축소하면 원이 작아지는데 대시는 그대로라,
 * 줌아웃할수록 대시 하나가 둘레의 큰 몫을 차지해 '점이 굵어진' 것처럼 보였다.
 * 둘레를 늘 같은 수로 쪼개면 원이 커지든 작아지든 파선의 결이 같다.
 *
 * SDK 가 path 의 style 속성에 직접 박으므로 CSS 변수 + !important 로 덮는다(아래
 * <style>). 원을 다시 그리지 않아도 되는 게 덤이다 — 줌마다 지우고 새로 만들면
 * 깜빡인다.
 */
const RING_DASHES = 64
function syncRingDash() {
  if (!map || !circles.length || !el.value) return
  const projection = map.getProjection()
  const bounds = circles[0].getBounds()
  const west = projection.containerPointFromCoords(bounds.getSouthWest()).x
  const east = projection.containerPointFromCoords(bounds.getNorthEast()).x
  // 원의 bounds 는 정사각형이라 x 폭이 곧 지름이다. 둘레 = π × 지름.
  const step = (Math.PI * Math.abs(east - west)) / RING_DASHES
  el.value.style.setProperty('--ring-dash', `${step * 0.64} ${step * 0.36}`)
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
    syncRingDash()
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

/*
  거점 원의 파선 간격. 값은 syncRingDash 가 줌에 맞춰 넣는다 — SDK 가 path 에 style 을
  인라인으로 박으므로 !important 로만 덮인다. 대비값 14 8 은 longdash(7·4 × strokeWeight
  2)와 같은 수라, 변수가 비어도 지금 모양 그대로다.

  거점 말풍선도 SVG 라 여기 걸리면 글자가 점선이 된다 — 그래서 빼 둔다(lib/kakao.ts).

  ⚠️ 도형 이름을 넓게 잡은 건 SDK 를 못 믿어서다. 지금 버전(4.5.26)은 원을 <ellipse> 로
  그리는데 선·다각형은 <path> 다. path 만 집었다가 규칙이 통째로 헛돌았다 — 선택자가
  빗나가도 화면은 종전 모양 그대로라 아무도 모른다.
*/
.jb-map :deep(svg:not(.jb-anchor-label) :is(ellipse, circle, path)) {
  stroke-dasharray: var(--ring-dash, 14 8) !important;
  /*
    채움을 ensureRingGradient 가 심은 그라데이션으로 돌린다. 뒤의 색은 그 참조가 못 살
    때의 대비값이고,
    진하기도 여기서 준다 — 그래야 SDK 에 넘긴 fillColor·fillOpacity 가 종전 그대로
    남아, 이 규칙이 통째로 빠져도 지금까지의 단색 원으로 돌아간다.
  */
  fill: url(#jb-ring-fill) var(--color-brand-500) !important;
  fill-opacity: 0.4 !important;
}

/*
  ensureRingGradient 가 심은 그라데이션의 색. 하나의 민트로 **진하기만** 떨어뜨린다 —
  색까지 같이 돌리면 원 안에서 색이 두 개로 읽혀 도달권이 두 구역처럼 보인다.

  세 단계인 건 시안이 가운데에서 한 번 머물다 떨어지기 때문이다. 시안 캡처에서 중심
  거리별 감쇠를 재면 R 기준 107 → 88 → 80 → 62 → 43 → 27(중심 → 테두리)인데,
  두 단계로 곧게 이으면 가운데가 얇아진다. 0.5 지점에 하나 더 두면 여섯 지점이
  ±5 안에서 맞는다.
*/
.jb-map :deep(.jb-ring-core) {
  stop-color: var(--color-brand-500);
  stop-opacity: 1;
}

.jb-map :deep(.jb-ring-mid) {
  stop-color: var(--color-brand-500);
  stop-opacity: 0.8;
}

.jb-map :deep(.jb-ring-edge) {
  stop-color: var(--color-brand-500);
  stop-opacity: 0.25;
}
</style>
