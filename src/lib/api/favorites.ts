/**
 * 찜. 출처: FavoriteController.java:14 `/api/me/favorites` (jb-backend a2ee567)
 * 명세: docs/specs/my-account-and-favorites.md (jb-backend)
 *
 * ⚠️ 아직 화면이 없다. 백엔드 계약대로 만들어만 두고, 찜 UI 가 생기면 그대로 쓴다.
 *
 * 반환 타입이 `types/backend.ts` 의 Favorite* 그대로인 건 의도다 — 프론트의
 * `Listing`(domain.ts)은 목을 굴리려고 만든 추측형이고, 이쪽은 실재하는 계약이다.
 * 둘을 섞으면 어느 쪽이 사실인지 알 수 없게 된다. 화면이 생길 때 매핑을 정한다.
 *
 * **찜은 로그인 전용이다.** 비로그인 세션 개념이 favorite 에는 없다(user_id NOT NULL).
 * 지금 앱의 하트 세 군데(지도 FAB·카드·상세)는 로그인 없이 눌리므로, 붙일 때
 * 로그인 유도 경로가 함께 필요하다.
 */
import type { FavoriteCreated, FavoriteDetailed, FavoritePage } from '@/types/backend'
import { request } from './http'

/**
 * 목록. page 는 0부터, size 는 1~100 (기본 20). **최신 등록 순**으로 내려온다.
 * 빈 목록은 `content: []`, `totalElements: 0`, `totalPages: 0`, `last: true` 다 —
 * totalPages 가 1 이 아니라 0 이므로 페이지 계산에서 조심한다.
 */
export const listFavorites = (page = 0, size = 20) =>
  request<FavoritePage>(`/api/me/favorites?page=${page}&size=${size}`)

/**
 * 단건. 매물 전체 정보(좌표·층수·설명까지)가 붙어 온다.
 * 내가 찜한 적 없으면 404 `FAVORITE_NOT_FOUND`.
 */
export const getFavorite = (propertyId: string) =>
  request<FavoriteDetailed>(`/api/me/favorites/${propertyId}`)

/**
 * 찜하기. 201 Created.
 *
 * 실패 분기가 둘이고 사용자에게 할 말이 다르다:
 * - 404 `PROPERTY_NOT_FOUND` — 매물이 없다(목록이 낡았을 수 있다)
 * - 409 `FAVORITE_ALREADY_EXISTS` — 이미 찜했다. 동시 요청도 한 건만 저장되고
 *   나머지가 이걸 받으므로, 연타는 오류가 아니라 '이미 됨'으로 처리하면 된다.
 */
export const addFavorite = (propertyId: string) =>
  request<FavoriteCreated>('/api/me/favorites', {
    method: 'POST',
    body: JSON.stringify({ propertyId }),
  })

/**
 * 찜 해제. 204 No Content — 본문이 없다.
 * **멱등이다.** 없는 찜을 지워도 204 라서 404 를 따로 처리할 필요가 없다.
 */
export const removeFavorite = (propertyId: string) =>
  request<void>(`/api/me/favorites/${propertyId}`, { method: 'DELETE' })
