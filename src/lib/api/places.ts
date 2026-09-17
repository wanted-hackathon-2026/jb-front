import { hasKakaoKey, loadKakaoMaps } from '@/lib/kakao'
import {
  coordToAddress as mockCoordToAddress,
  searchPlaces as searchMockPlaces,
} from '@/mocks/places'
import type { PlaceSuggestion } from '@/types/domain'

/**
 * 장소 검색. 카카오 키가 있으면 실제 Places 검색으로, 없으면 목으로 떨어진다.
 * 호출부(SearchPage)는 어느 쪽인지 몰라도 된다.
 */
export async function searchPlaces(keyword: string): Promise<PlaceSuggestion[]> {
  const q = keyword.trim()
  if (!q) return []
  if (!hasKakaoKey) return searchMockPlaces(q)

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
 */
export async function coordToAddress(x: number, y: number): Promise<ReverseGeocoded> {
  if (!hasKakaoKey) return mockCoordToAddress(x, y)

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
