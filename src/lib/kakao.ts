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

/**
 * 카카오맵(앱 또는 웹)에서 한 지점을 여는 주소.
 *
 * 앱 스킴(`kakaomap://`)이 아닌 게 중요하다 — 스킴은 앱이 없으면 아무 일도 일어나지 않고,
 * 일어나지 않았다는 걸 알 방법도 없다. 이 주소는 앱이 있으면 앱으로 넘어가고 없으면
 * 웹 지도가 열린다.
 *
 * 인자 순서가 이 파일의 다른 곳(x, y)과 뒤집힌 건 카카오의 링크 규격이 그래서다 —
 * `이름,위도,경도` 를 쉼표로 끊어 읽는다. 그래서 이름은 반드시 인코딩한다
 * (`encodeURIComponent` 는 쉼표도 `%2C` 로 바꾸므로 이름 안의 쉼표가 좌표를 밀지 않는다).
 */
export const kakaoMapLink = (name: string, y: number, x: number) =>
  `https://map.kakao.com/link/map/${encodeURIComponent(name)},${y},${x}`

/** 클러스터 배지를 시안의 민트로 덮는다. SDK 기본값은 파란 원이라 그냥 두면 안 맞는다. */
/**
 * 단건 매물 마커.
 *
 * 클러스터가 1건짜리까지 삼키게 두면 지도가 '1' 만 적힌 배지로 덮인다(시안의 8·10·35 는
 * 여러 건이 뭉친 숫자다). 그래서 2건 이상만 배지로 묶고, 단건은 이 점으로 찍는다 —
 * 기본 파란 물방울 핀은 시안의 색 언어와 어긋난다.
 */
/**
 * 마커 한 변. 18 에서 키웠다 — 색면 지름이 9.5px 밖에 안 돼서, 도로·라벨·POI 가
 * 빼곡한 지도에서는 진한 민트조차 무늬에 묻혔다. 24 면 색면이 13px 이 된다.
 */
const DOT_SIZE = 24

/**
 * 테두리가 **두 겹**이다.
 *
 * 흰 테두리 하나만 두르면 밝은 지도에서 아무 일도 하지 않는다 — 카카오 기본 지도
 * 바탕과 흰색의 명도대비가 1.09, 도로(흰색) 위에서는 1.00 이라 윤곽이 말 그대로
 * 사라진다. 바깥에 어두운 실선을 한 겹 더 둘러 형태를 만든다.
 *
 * 흰 띠를 남기는 이유는 색면이 지도 무늬에 바로 닿지 않게 띄워 주기 때문이다.
 * 어두운 선만 쓰면 항공사진처럼 어두운 바탕에서 같은 문제가 반대로 생긴다 —
 * 두 겹이라 양쪽에서 산다.
 *
 * 어두운 색은 카드 썸네일 위 하트의 그림자와 같은 값이다(ListingCard) — '밝은 것
 * 위에 떠 있는 것'의 윤곽색을 이 앱에서 하나로 쓴다.
 */
const DOT = (
  fill: string,
) => `<svg xmlns="http://www.w3.org/2000/svg" width="${DOT_SIZE}" height="${DOT_SIZE}" viewBox="0 0 24 24">
  <circle cx="12" cy="12" r="10" fill="none" stroke="rgba(15,23,42,0.45)" stroke-width="1"/>
  <circle cx="12" cy="12" r="8" fill="${fill}" stroke="#fff" stroke-width="3"/>
</svg>`

/** 점수가 없는 매물(주변 매물 목록)의 색. 지금까지 모든 핀이 쓰던 그 민트다. */
export const LISTING_MARKER_COLOR = '#00c8b3'

/**
 * 단건 매물 마커. **색을 받는다** — 추천 결과는 점수대별 색으로 찍어 시트 목록의
 * 도넛과 같은 어휘를 쓴다(`lib/score.ts`). 색을 안 주면 지금까지의 민트 그대로다.
 *
 * `var(--…)` 는 못 쓴다. data URI 안의 SVG 는 페이지 CSS 를 보지 못해서, 부르는 쪽이
 * 토큰을 풀어 실제 색값을 넘겨야 한다(`scoreColorValue`).
 */
export const listingMarker = (fill: string = LISTING_MARKER_COLOR) => ({
  src: `data:image/svg+xml;utf8,${encodeURIComponent(DOT(fill))}`,
  size: DOT_SIZE,
})

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
 * 거점 말풍선('주요 거점'). 시안 SVG 를 그대로 쓴다 — 글자까지 패스로 박혀 있어서
 * 번호(`주요 거점 2`)는 붙일 수 없다. 거점은 한 곳뿐이라(stores/anchors.ts MAX_ANCHORS)
 * 지금은 번호가 할 일이 없다. 여러 곳을 받게 되면 글자가 있는 말풍선이 다시 필요하다.
 *
 * 클래스 이름은 장식이 아니다 — MapView 가 도달권 원의 파선을 `svg path` 로 덮기 때문에,
 * 그 규칙이 이 글자까지 점선으로 만들지 않도록 선택자에서 빼는 표식으로 쓴다.
 */
export const ANCHOR_LABEL = {
  html: `<svg class="jb-anchor-label" xmlns="http://www.w3.org/2000/svg" width="73" height="28" viewBox="0 0 73 28" fill="none" style="display:block">
  <rect width="73" height="22" rx="11" fill="white"/>
  <rect x="27" y="18.1924" width="13" height="13" transform="rotate(-45 27 18.1924)" fill="white"/>
  <path d="M25.398 11.2969V12.4922H21.2495V16.0781H19.773V12.4922H15.6714V11.2969H25.398ZM24.5308 5.97656V7.14844H21.4253C21.5718 8.19141 22.7495 9.24023 24.9409 9.50391L24.4019 10.6758C22.5269 10.4238 21.1851 9.62109 20.5464 8.51953C19.8902 9.62109 18.5601 10.4238 16.7027 10.6758L16.1519 9.50391C18.3081 9.24023 19.4976 8.19141 19.6675 7.14844H16.5503V5.97656H24.5308ZM35.5642 13.6055V14.8359H25.8025V13.6055H27.9822V10.9922C27.156 10.5 26.658 9.74414 26.658 8.80078C26.658 7.07812 28.3455 5.92969 30.6658 5.92969C32.9744 5.92969 34.6736 7.07812 34.6853 8.80078C34.6795 9.7207 34.1931 10.4707 33.3962 10.9688V13.6055H35.5642ZM30.6658 7.11328C29.1423 7.11328 28.1345 7.72266 28.1345 8.80078C28.1345 9.84375 29.1423 10.4883 30.6658 10.4883C32.1775 10.4883 33.197 9.84375 33.2087 8.80078C33.197 7.72266 32.1775 7.11328 30.6658 7.11328ZM29.4587 13.6055H31.8845V11.5312C31.5037 11.6074 31.0935 11.6484 30.6658 11.6484C30.238 11.6484 29.8337 11.6133 29.4587 11.5312V13.6055ZM47.4475 5.41406V16.0781H45.9592V10.7344H43.8381V9.51562H45.9592V5.41406H47.4475ZM43.8967 6.52734C43.8967 9.75 42.8538 12.375 39.1272 14.2266L38.3538 13.0547C41.0491 11.7246 42.1623 10.0312 42.3967 7.69922H38.8577V6.52734H43.8967ZM57.5786 5.41406V11.5781H56.0903V9.09375H54.4028V7.875H56.0903V5.41406H57.5786ZM57.5786 12.0234V15.9609H50.4067V12.0234H57.5786ZM51.9067 13.1953V14.7656H56.1138V13.1953H51.9067ZM54.7427 5.95312V7.16016H52.6216C52.645 8.37305 53.4009 9.66797 55.0708 10.2188L54.3325 11.4023C53.1489 11.0098 52.3345 10.2363 51.8716 9.26953C51.397 10.3359 50.5473 11.1855 49.2934 11.5898L48.5317 10.418C50.2544 9.86719 51.0571 8.50781 51.0981 7.16016H48.9536V5.95312H54.7427Z" fill="#7B7B7B"/>
</svg>`,
  /**
   * 좌표에 닿는 지점 = **꼬리 끝**. 회전한 사각형의 아래 꼭짓점이라 계산이 필요하다:
   * (27, 18.1924) 을 축으로 13×13 을 -45° 돌리면 끝점이 (36.19, 27.39) 다.
   * CustomOverlay 의 x/yAnchor 는 px 이 아니라 0~1 비율이라 폭·높이로 나눠 둔다.
   *
   * `display:block` 도 이 계산의 일부다. 인라인 SVG 는 글자 취급이라 아래에 베이스라인
   * 여백이 붙고, 카카오는 그 여백까지 포함한 높이에 비율을 곱해 꼬리가 거점보다 위로 뜬다.
   */
  xAnchor: 36.19 / 73,
  yAnchor: 27.39 / 28,
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
 * 클러스터 배지. **개수와 무관하게 한 크기다** — 시안의 배지 다섯 개(8·10·12·15·35)를
 * 재보니 전부 지름 45.7px, 숫자 18px 이었다. 한때 개수별로 키웠는데(44/52/60) 시안에
 * 없는 규칙이라 되돌린다. 커지는 건 숫자지 원이 아니다.
 *
 * SDK 가 지도 오버레이 레이어에 직접 만드는 DOM 이라 CSS 변수를 쓰면 해석되는 맥락이
 * 우리 컴포넌트 트리 밖이라 조용히 실패할 수 있다 — 값을 그대로 적는다.
 */
export const CLUSTER_STYLES = [
  {
    width: '46px',
    height: '46px',
    background: '#00c8b3',
    borderRadius: '23px',
    color: '#fff',
    textAlign: 'center',
    lineHeight: '46px',
    fontSize: '18px',
    fontWeight: '700',
    boxShadow: '0 2px 6px rgb(15 23 42 / 0.2)',
  },
]
