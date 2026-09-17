/**
 * 카카오맵 SDK 는 npm 패키지가 아니라 전역 스크립트다. SPA 에서는 필요한 시점에
 * 한 번만 넣고, autoload=false + kakao.maps.load() 로 초기화 완료를 기다려야 한다.
 * (이 순서를 건너뛰면 `kakao.maps.LatLng is not a constructor` 로 터진다.)
 */

const APP_KEY = import.meta.env.VITE_KAKAO_MAP_KEY as string | undefined

/** 키가 없으면 지도 대신 자리표시자로 간다 — 키 없이도 앱이 돌아가야 한다. */
export const hasKakaoKey = Boolean(APP_KEY)

let promise: Promise<void> | null = null

export function loadKakaoMaps(): Promise<void> {
  if (!APP_KEY) return Promise.reject(new Error('VITE_KAKAO_MAP_KEY 가 없다'))
  if (promise) return promise

  promise = new Promise<void>((resolve, reject) => {
    const el = document.createElement('script')
    el.src =
      `//dapi.kakao.com/v2/maps/sdk.js?appkey=${APP_KEY}` +
      `&autoload=false&libraries=services,clusterer`
    el.async = true
    el.onerror = () => {
      promise = null // 실패는 캐시하지 않는다 — 다음 시도에서 다시 붙여본다.
      reject(new Error('카카오맵 SDK 로드 실패'))
    }
    el.onload = () => window.kakao.maps.load(() => resolve())
    document.head.appendChild(el)
  })
  return promise
}

/** 클러스터 배지를 시안의 민트로 덮는다. SDK 기본값은 파란 원이라 그냥 두면 안 맞는다. */
/**
 * 단건 매물 마커.
 *
 * 클러스터가 1건짜리까지 삼키게 두면 지도가 '1' 만 적힌 배지로 덮인다(시안의 8·10·35 는
 * 여러 건이 뭉친 숫자다). 그래서 2건 이상만 배지로 묶고, 단건은 이 점으로 찍는다 —
 * 기본 파란 물방울 핀은 시안의 색 언어와 어긋난다.
 */
const DOT = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 18 18">
  <circle cx="9" cy="9" r="6" fill="#00c8b3" stroke="#fff" stroke-width="2.5"/>
</svg>`
export const LISTING_MARKER = {
  src: `data:image/svg+xml;utf8,${encodeURIComponent(DOT)}`,
  size: 18,
}

/**
 * 지도를 눌러 고른 지점.
 *
 * 매물은 여러 개가 흩뿌려지는 점이지만 이건 '지금 여기' 하나라 핀이 맞다 — 모양이
 * 달라서 고른 지점이 매물 틈에 묻히지 않는다. 기본 마커를 쓰면 파란 물방울이라
 * 색 언어도 어긋난다.
 *
 * 시안 에셋(Asset 4)을 벡터로 옮겨 그렸다. 원본은 957×1361 PNG 를 감싼 SVG 라 23px 로
 * 쓰기에 27KB 는 과하고 색이 비트맵에 박혀 팔레트를 따라오지 못한다. 치수는 원본에서
 * 실측했다 — 원 중심 (13.6, 9.5) r 9.4, 바늘 끝 (1.4, 32.4).
 */
const PIN = `<svg xmlns="http://www.w3.org/2000/svg" width="23" height="33" viewBox="0 0 23 33" fill="none">
  <path d="M9.6 17.6 1.4 32.4" stroke="#616161" stroke-width="2.2" stroke-linecap="round"/>
  <circle cx="13.6" cy="9.5" r="9.4" fill="#00c8b3"/>
  <path d="M15.9 2.8A7.2 7.2 0 0 1 21.2 9.9" stroke="#fff" stroke-width="2.2" stroke-linecap="round"/>
</svg>`

export const PICKED_MARKER = {
  src: `data:image/svg+xml;utf8,${encodeURIComponent(PIN)}`,
  width: 23,
  height: 33,
  /**
   * 좌표에 닿는 지점. 핀은 **중심이 아니라 바늘 끝**이 위치다 — 이걸 안 주면 이미지
   * 중앙이 좌표에 놓여 핀이 누른 곳보다 위로 밀려 꽂힌다.
   */
  anchor: { x: 1, y: 32 },
}

/**
 * 클러스터로 묶기 시작하는 지도 레벨. 카카오의 레벨은 **클수록 멀리 본다** —
 * 이 값 이상(=더 축소된 상태)에서만 숫자 배지가 되고, 더 확대하면 낱개 점으로 풀린다.
 *
 * 기본 레벨이 5 라 첫 화면은 배지로 시작하고, 한두 번 확대하면 점이 드러난다.
 * 점이 되는 순간의 밀도가 화면에서 읽히는지가 이 숫자의 기준이다.
 */
export const CLUSTER_MIN_LEVEL = 4

/**
 * 배지가 커지는 구간. 묶인 개수가 10 미만 / 10~29 / 30 이상 순으로 아래 styles 와
 * 짝을 이룬다 — 시안에서 35 가 12 보다 확연히 큰 것이 이 규칙이다.
 */
export const CLUSTER_STEPS = [10, 30]

/**
 * 클러스터 배지는 SDK 가 지도 오버레이 레이어에 직접 만든다. 여기에 CSS 변수를 쓰면
 * 해석되는 맥락이 우리 컴포넌트 트리 밖이라 조용히 실패할 수 있어 값을 그대로 적는다.
 */
const badge = (size: number, fontSize: number) => ({
  width: `${size}px`,
  height: `${size}px`,
  background: '#00c8b3',
  borderRadius: `${size / 2}px`,
  color: '#fff',
  textAlign: 'center',
  lineHeight: `${size}px`,
  fontSize: `${fontSize}px`,
  fontWeight: '700',
  boxShadow: '0 2px 6px rgb(15 23 42 / 0.2)',
})

export const CLUSTER_STYLES = [badge(44, 14), badge(52, 16), badge(60, 18)]
