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

export const CLUSTER_STYLES = [
  {
    width: '44px',
    height: '44px',
    // 클러스터 배지는 SDK 가 지도 오버레이 레이어에 직접 만든다. 여기에 CSS 변수를 쓰면
    // 해석되는 맥락이 우리 컴포넌트 트리 밖이라 조용히 실패할 수 있어 값을 그대로 적는다.
    background: '#3bd5c4',
    borderRadius: '22px',
    color: '#fff',
    textAlign: 'center',
    lineHeight: '44px',
    fontSize: '14px',
    fontWeight: '700',
    boxShadow: '0 2px 6px rgb(15 23 42 / 0.2)',
  },
]
