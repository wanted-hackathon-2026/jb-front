/** ⚠️ 가짜 장소 검색. 키가 있으면 `@/lib/api/places` 가 카카오 Places 로 붙는다. */
import type { PlaceSuggestion } from '@/types/domain'
import type { ReverseGeocoded } from '@/lib/api/places'

const PLACES: PlaceSuggestion[] = [
  {
    id: 'p1',
    name: '신림동',
    address: '서울특별시 관악구 신림동',
    x: 126.9297,
    y: 37.4843,
    lines: ['2호선', '신림선'],
  },
  {
    id: 'p2',
    name: '신림역',
    address: '서울특별시 관악구 신림동',
    x: 126.9298,
    y: 37.4842,
    lines: ['2호선', '신림선'],
  },
  { id: 'p3', name: '신림면', address: '강원특별자치도 원주시 신림면', x: 128.1419, y: 37.2196 },
  { id: 'p4', name: '광신중학교', address: '서울특별시 관악구 신림동', x: 126.9271, y: 37.4869 },
  { id: 'p5', name: '난우중학교', address: '서울특별시 관악구 신림동', x: 126.9339, y: 37.4795 },
  {
    id: 'p6',
    name: '홍대입구역',
    address: '서울특별시 마포구 동교동',
    x: 126.9239,
    y: 37.5572,
    lines: ['2호선', '경의중앙선', '공항철도'],
  },
  { id: 'p7', name: '서강대학교', address: '서울특별시 마포구 백범로', x: 126.941, y: 37.551 },
  {
    id: 'p8',
    name: '강남파이낸스센터',
    address: '서울특별시 강남구 역삼동',
    x: 127.0276,
    y: 37.5006,
  },
  {
    id: 'p9',
    name: '한양대학교 서울캠퍼스',
    address: '서울특별시 성동구 사근동',
    x: 127.0446,
    y: 37.5573,
  },
  {
    id: 'p10',
    name: '신논현역',
    address: '서울특별시 강남구 논현동',
    x: 127.025,
    y: 37.5045,
    lines: ['9호선', '신분당선'],
  },
]

export async function searchPlaces(keyword: string): Promise<PlaceSuggestion[]> {
  await new Promise((r) => setTimeout(r, 180))
  const q = keyword.trim()
  if (!q) return []
  return PLACES.filter((p) => p.name.includes(q) || p.address.includes(q))
}

/**
 * ⚠️ 가짜 역지오코딩. 좌표를 격자로 나눠 고정된 주소를 돌려준다.
 * 지번만 있는 지점(도로명 없음)도 한 칸 섞어 둔다 — 실제 지도에도 그런 좌표가 있고,
 * 거점 등록이 그때 막혀야 하므로 목에서도 재현돼야 한다.
 */
const MOCK_ADDRESSES: ReverseGeocoded[] = [
  { address: '서울 강남구 테헤란로 152', isRoad: true },
  { address: '서울 강남구 역삼동 736-17', isRoad: false },
  { address: '서울 서초구 서초대로 411', isRoad: true },
  { address: '서울 마포구 양화로 45', isRoad: true },
  { address: '서울 성동구 왕십리로 222', isRoad: true },
]

export async function coordToAddress(x: number, y: number): Promise<ReverseGeocoded> {
  await new Promise((r) => setTimeout(r, 150))
  const i = Math.abs(Math.round(x * 100) + Math.round(y * 100)) % MOCK_ADDRESSES.length
  return MOCK_ADDRESSES[i]
}
