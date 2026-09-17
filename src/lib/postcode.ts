/**
 * 카카오 우편번호 서비스 로더.
 *
 * 이름은 카카오지만 카카오맵 SDK 와 인증 체계를 공유하지 않는다 — 앱 키도, 도메인
 * 등록도, 쿼터도 없다. 그래서 로더가 스크립트 한 장을 붙이는 게 전부다.
 * 거점을 고를 때만 쓰는 기능이라 index.html 에 박지 않고 필요할 때 부른다.
 */
const SRC = 'https://t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js'

let promise: Promise<void> | null = null

export function loadPostcode(): Promise<void> {
  if (promise) return promise
  promise = new Promise<void>((resolve, reject) => {
    const el = document.createElement('script')
    el.src = SRC
    el.async = true
    el.onload = () => resolve()
    el.onerror = () => {
      promise = null // 실패는 캐시하지 않는다 — 다음 시도에서 다시 붙여본다.
      reject(new Error('우편번호 서비스 로드 실패'))
    }
    document.head.appendChild(el)
  })
  return promise
}

/**
 * 위젯 결과에서 **저장에 쓸 주소**를 뽑는다.
 *
 * `roadAddress`·`jibunAddress` 는 사용자가 무엇을 골랐느냐에 따라 한쪽이 빈 문자열로
 * 온다(공식 가이드 — '선택 안함'이거나 한쪽만 있는 주소). 그때 서비스가 매칭해 주는
 * 값이 `auto*` 에 담겨 오므로 그걸로 메운다.
 *
 * 이게 중요한 이유: 백엔드는 **도로명주소로만** 좌표를 찾는다(VWorld `type=road`).
 * 빈 값이나 지번을 보내면 저장 자체가 거절된다(ADDRESS_NOT_GEOCODABLE).
 */
export function resolveAddress(data: PostcodeResult) {
  return {
    roadAddress: data.roadAddress || data.autoRoadAddress || '',
    jibunAddress: data.jibunAddress || data.autoJibunAddress || '',
    /** 읍/면 아래 '리'까지 있는 주소는 둘을 붙여야 어느 동네인지 드러난다. */
    umdName: [data.bname1, data.bname].filter(Boolean).join(' '),
  }
}
