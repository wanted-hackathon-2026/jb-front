/** ⚠️ 가짜 장소 검색. 카카오 키워드 장소 검색 API 로 교체 대상. */
import type { PlaceSuggestion } from '@/types/domain'

const PLACES: PlaceSuggestion[] = [
  { id: 'p1', name: '신림동', address: '서울특별시 관악구 신림동', lines: ['2호선', '신림선'] },
  { id: 'p2', name: '신림역', address: '서울특별시 관악구 신림동', lines: ['2호선', '신림선'] },
  { id: 'p3', name: '신림면', address: '강원특별자치도 원주시 신림면' },
  { id: 'p4', name: '광신중학교', address: '서울특별시 관악구 신림동' },
  { id: 'p5', name: '난우중학교', address: '서울특별시 관악구 신림동' },
  {
    id: 'p6',
    name: '홍대입구역',
    address: '서울특별시 마포구 동교동',
    lines: ['2호선', '경의중앙선', '공항철도'],
  },
  { id: 'p7', name: '서강대학교', address: '서울특별시 마포구 백범로' },
  { id: 'p8', name: '강남파이낸스센터', address: '서울특별시 강남구 역삼동' },
  { id: 'p9', name: '한양대학교 서울캠퍼스', address: '서울특별시 성동구 사근동' },
  {
    id: 'p10',
    name: '신논현역',
    address: '서울특별시 강남구 논현동',
    lines: ['9호선', '신분당선'],
  },
]

export async function searchPlaces(keyword: string): Promise<PlaceSuggestion[]> {
  await new Promise((r) => setTimeout(r, 180))
  const q = keyword.trim()
  if (!q) return []
  return PLACES.filter((p) => p.name.includes(q) || p.address.includes(q))
}
