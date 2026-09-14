import { hasKakaoKey, loadKakaoMaps } from '@/lib/kakao'

/**
 * 주소 → 좌표.
 *
 * ⚠️ 임시다. 우편번호 서비스가 좌표를 주지 않아서 지도에 핀·도달권 원을 그리려면
 * 어딘가에서 변환이 필요한데, 백엔드가 `POST /api/workplace` 에서 juso 로 채우기로
 * 하면 **이 파일을 지운다**. 카카오 응답은 저장 금지라 프론트 표시용으로만 쓴다.
 *
 * 키가 없으면 0,0 을 돌려준다 — 지도가 자리표시자로 도는 환경에서는 좌표가 무의미하다.
 */
export async function addressToCoord(address: string): Promise<{ x: number; y: number }> {
  if (!hasKakaoKey) return { x: 0, y: 0 }

  // 좌표는 부가 정보다. 지오코딩이 실패해도 거점 등록 자체를 막으면 안 된다
  // (도메인 미등록 환경에서 SDK 로드가 실패해 등록이 통째로 죽는 것을 확인했다).
  try {
    await loadKakaoMaps()
  } catch {
    return { x: 0, y: 0 }
  }
  const geocoder = new kakao.maps.services.Geocoder()

  return new Promise((resolve) => {
    geocoder.addressSearch(address, (result, status) => {
      if (status !== kakao.maps.services.Status.OK || !result.length) {
        return resolve({ x: 0, y: 0 })
      }
      resolve({ x: Number(result[0].x), y: Number(result[0].y) })
    })
  })
}
