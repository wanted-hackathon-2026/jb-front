/**
 * 매물 등록. 출처: PropertyController.java:15 `POST /api/properties` (jb-backend a2ee567)
 *
 * **관리자 전용이다.** AuthConfig.java:63 이 이 경로에만 PropertyAdminAuthorizationManager
 * 를 걸어 두는데, 그 매니저는 JWT 의 role 클레임이 아니라 **DB 의 현재 role 을 다시 읽는다**
 * ("Read the current database role, not the potentially stale JWT role claim").
 * 그래서 프론트가 보는 role(`GET /api/me`)과 서버 판단이 어긋날 수 있고,
 * 화면 가드는 어디까지나 동선 정리용이다 — 실패 처리는 여전히 필요하다(403).
 *
 * 등록한 매물을 **다시 읽을 방법은 아직 없다.** 조회 엔드포인트가 없어서
 * (`PropertyController` 에 POST 하나뿐) 앱의 목록·상세는 그대로 목을 본다.
 */
import type { PropertyCreateRequest, PropertyResponse } from '@/types/backend'
import { request } from './http'

export function createProperty(body: PropertyCreateRequest): Promise<PropertyResponse> {
  return request<PropertyResponse>('/api/properties', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}
