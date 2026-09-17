/**
 * 거점(workplace). 프론트의 `Anchor` 가 서버에서는 이 이름이다.
 * 출처: WorkplaceController.java:28 `/api/workplaces` (jb-backend a2ee567)
 *
 * 이름이 다른 만큼 필드도 다르다. 변환을 이 파일에 가둬서 스토어·화면은
 * 계속 `Anchor` 만 본다:
 *
 *   roadAddress ↔ address,  lat ↔ y,  lng ↔ x
 */
import type { Anchor } from '@/types/domain'
import type { WorkplaceResponse } from '@/types/backend'
import { request } from './http'

const toAnchor = (w: WorkplaceResponse): Anchor => ({
  id: w.id,
  name: w.name,
  address: w.roadAddress,
  x: w.lng,
  y: w.lat,
})

export async function listWorkplaces(): Promise<Anchor[]> {
  const rows = await request<WorkplaceResponse[]>('/api/workplaces')
  return rows.map(toAnchor)
}

/**
 * 거점 등록.
 *
 * **좌표를 보내지 않는다** — 서버가 VWorld 로 지오코딩해서 채운다
 * (WorkplaceService.java:39). 그래서 돌려받은 좌표가 정본이고, 프론트가 카카오로
 * 떠 둔 좌표는 버린다. 주소를 못 찾으면 400 ADDRESS_NOT_GEOCODABLE,
 * VWorld 가 죽어 있으면 502 GEOCODING_UNAVAILABLE 이다
 * (WorkplaceExceptionHandler.java).
 *
 * 지오코딩이 도로명 주소를 기대하므로 지번 주소(지도 핀 찍기 경로)는 실패할 수 있다.
 */
export async function createWorkplace(name: string, roadAddress: string): Promise<Anchor> {
  const created = await request<WorkplaceResponse>('/api/workplaces', {
    method: 'POST',
    body: JSON.stringify({ name, roadAddress }),
  })
  return toAnchor(created)
}

/*
 * 삭제 API 는 **없다.** 컨트롤러에 POST·GET 뿐이라 거점을 지워도 서버에는 남는다.
 * 스토어의 remove() 가 로컬에만 반영되는 이유가 이것이다(stores/anchors.ts).
 */
