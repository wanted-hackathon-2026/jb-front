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

/**
 * 거점 삭제. 204 No Content 를 기대한다.
 *
 * ⚠️ **a2ee567 시점 백엔드에는 아직 없다.** 경로는 구현이 아니라 API 정의
 * (`docs/api정의.png`)에서 왔고, 정의의 단수형 `/api/workplace` 대신 이미 구현된
 * 등록·조회와 같은 복수형으로 맞췄다.
 *
 * 없는 거점을 지울 때 204(찜처럼 멱등)인지 404 인지는 확답이 없다. 호출부가 404 를
 * '이미 지워진 것'으로 받아 넘기므로 어느 쪽이든 동작한다(stores/anchors.ts) —
 * 구현 전인 지금도 미매핑 경로가 404 라서 삭제가 로컬에만 남는 예전 동작 그대로다.
 */
export const deleteWorkplace = (id: string) =>
  request<void>(`/api/workplaces/${id}`, { method: 'DELETE' })
