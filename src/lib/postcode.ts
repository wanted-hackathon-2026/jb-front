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
