/**
 * 매물 등록. 출처: PropertyController.java:42 `POST /api/properties` (jb-backend 95a4463)
 *
 * **관리자 전용이다.** AuthConfig.java:69 이 이 경로에만 PropertyAdminAuthorizationManager
 * 를 걸어 두는데, 그 매니저는 JWT 의 role 클레임이 아니라 **DB 의 현재 role 을 다시 읽는다**
 * ("Read the current database role, not the potentially stale JWT role claim").
 * 그래서 프론트가 보는 role(`GET /api/me`)과 서버 판단이 어긋날 수 있고,
 * 화면 가드는 어디까지나 동선 정리용이다 — 실패 처리는 여전히 필요하다(403).
 *
 * 조회(`GET /api/properties/map`·`/{id}`)는 관리자 전용이 아니라 **공개**다 —
 * 그쪽은 `lib/api/listings.ts` 에 있다.
 */
import type {
  PropertyCreateRequest,
  PropertyImageUploadResponse,
  PropertyResponse,
} from '@/types/backend'
import { request } from './http'

export function createProperty(body: PropertyCreateRequest): Promise<PropertyResponse> {
  return request<PropertyResponse>('/api/properties', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

/**
 * 매물 사진 업로드. `POST /api/properties/{id}/images` (multipart)
 *
 * 매물이 **먼저 있어야 한다** — 등록과 한 번에 보낼 수 없어서 화면도 두 걸음으로 나뉜다.
 *
 * 응답은 방금 올린 것만이 아니라 **그 매물의 사진 전체**다. 순서(`displayOrder`)는
 * 서버가 매기고 **기존 사진 뒤에 이어 붙인다** — 첫 장(`0`)이 목록의 대표 사진이 된다.
 *
 * `Content-Type` 을 직접 넣지 않는다. FormData 는 브라우저가 boundary 까지 써야 해서
 * 우리가 덮으면 서버가 파트를 못 가른다(`lib/api/http.ts`).
 */
export function uploadPropertyImages(
  propertyId: string,
  files: File[],
): Promise<PropertyImageUploadResponse> {
  const form = new FormData()
  // 필드 이름이 `files` 로 고정이다(@RequestPart("files")).
  for (const f of files) form.append('files', f)
  return request<PropertyImageUploadResponse>(`/api/properties/${propertyId}/images`, {
    method: 'POST',
    body: form,
  })
}
