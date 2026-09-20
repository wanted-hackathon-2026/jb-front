/**
 * 거점(workplace). 프론트의 `Anchor` 가 서버에서는 이 이름이다.
 * 출처: WorkplaceController.java:28 `/api/workplaces` (jb-backend c0ff0f0)
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

/**
 * 거점 삭제. 204 No Content.
 *
 * **2026-09-20 에 실제로 생겼다**(jb-backend cc9af61). 그전에는 미매핑 404 로 떨어져
 * 삭제가 로컬에만 남았고, 그 흔적을 치우는 일회성 청산이 `stores/anchors.ts` 의
 * `flushRemoved` 다.
 *
 * 남의 거점을 지우려 하면 404 다 — 없는 것과 같은 취급이라 존재 여부가 새지 않는다.
 */
export const deleteWorkplace = (id: string) =>
  request<void>(`/api/workplaces/${id}`, { method: 'DELETE' })

/**
 * 거점 부분 수정. 보낸 필드만 바뀐다.
 *
 * 주소를 바꾸면 **서버가 좌표를 다시 찾는다** — 등록과 같은 지오코딩 경로라
 * 실패 코드도 같다(ADDRESS_NOT_GEOCODABLE · GEOCODING_UNAVAILABLE).
 * 이름만 바꾸면 지오코딩은 돌지 않는다.
 *
 * ⚠️ 아직 화면이 없다. 거점이 1개뿐이라 지우고 다시 넣는 것과 차이가 크지 않아서,
 * 이름 바꾸기 UI 가 생길 때 쓴다.
 */
export async function updateWorkplace(
  id: string,
  patch: { name?: string; roadAddress?: string },
): Promise<Anchor> {
  return toAnchor(
    await request<WorkplaceResponse>(`/api/workplaces/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(patch),
    }),
  )
}
