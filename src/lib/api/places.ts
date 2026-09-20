import { loadKakaoMaps } from '@/lib/kakao'
import type { PlaceSuggestion } from '@/types/domain'

/**
 * 장소 검색.
 *
 * 카카오 키가 없으면 `loadKakaoMaps()` 가 거절한다 — 예전엔 목으로 떨어뜨렸지만 목을
 * 걷어냈다. **호출부는 실패를 다뤄야 한다**(SearchPage 의 failed). 못 받아온 것을
 * '결과 없음' 으로 보여주면 사용자가 멀쩡히 있는 주소를 없다고 믿는다.
 */
export async function searchPlaces(keyword: string): Promise<PlaceSuggestion[]> {
  const q = keyword.trim()
  if (!q) return []

  await loadKakaoMaps()
  const places = new kakao.maps.services.Places()

  return new Promise((resolve) => {
    places.keywordSearch(q, (data, status) => {
      if (status !== kakao.maps.services.Status.OK) return resolve([])
      resolve(
        data.map((d) => ({
          id: d.id,
          name: d.place_name,
          // 도로명이 없는 장소가 있어 지번 주소로 떨어뜨린다.
          address: d.road_address_name || d.address_name,
          x: Number(d.x),
          y: Number(d.y),
        })),
      )
    })
  })
}

/**
 * 역지오코딩 결과.
 *
 * `isRoad` 를 따로 싣는 이유: 거점은 **도로명 주소여야** 서버가 좌표를 찾는다
 * (백엔드가 VWorld 를 `type=road` 로 부른다). 지번으로 떨어진 주소를 그대로 보내면
 * 저장이 거절되는데(ADDRESS_NOT_GEOCODABLE), 문자열만 넘기면 호출부가 그걸 미리
 * 구분할 방법이 없어 사용자가 등록 버튼을 누른 뒤에야 실패를 본다.
 */
export interface ReverseGeocoded {
  address: string
  /** 도로명 주소면 true. 지번으로 떨어졌거나 주소를 못 찾았으면 false. */
  isRoad: boolean
}

/**
 * 좌표 → 주소(역지오코딩). 지도에서 핀을 찍었을 때 그 자리의 주소를 얻는다.
 * 도로명 주소가 없는 좌표(산·공터 등)가 있어 지번으로 떨어뜨린다.
 *
 * 키가 없거나 SDK 가 안 붙으면 **거절한다** — 호출부가 실패를 다뤄야 한다(MapPage).
 */
export async function coordToAddress(x: number, y: number): Promise<ReverseGeocoded> {
  await loadKakaoMaps()
  const geocoder = new kakao.maps.services.Geocoder()

  return new Promise((resolve) => {
    geocoder.coord2Address(x, y, (result, status) => {
      if (status !== kakao.maps.services.Status.OK || !result.length) {
        return resolve({ address: '주소를 찾을 수 없는 위치예요', isRoad: false })
      }
      const first = result[0]
      const road = first.road_address?.address_name
      return resolve(
        road
          ? { address: road, isRoad: true }
          : { address: first.address.address_name, isRoad: false },
      )
    })
  })
}
