/**
 * 찜. 출처: FavoriteController.java:14 `/api/me/favorites` (jb-backend a2ee567)
 *
 * ⚠️ 아직 화면이 없다. 백엔드 계약대로 만들어만 두고, 찜 UI 가 생기면 그대로 쓴다.
 *
 * 반환 타입이 `types/backend.ts` 의 Favorite* 그대로인 건 의도다 — 프론트의
 * `Listing`(domain.ts)은 목을 굴리려고 만든 추측형이고, 이쪽은 실재하는 계약이다.
 * 둘을 섞으면 어느 쪽이 사실인지 알 수 없게 된다. 화면이 생길 때 매핑을 정한다.
 */
import type { FavoriteCreated, FavoriteDetailed, FavoritePage } from '@/types/backend'
import { request } from './http'

/** 목록. page 는 0부터, size 는 1~100 (기본 20). */
export const listFavorites = (page = 0, size = 20) =>
  request<FavoritePage>(`/api/me/favorites?page=${page}&size=${size}`)

/** 단건. 매물 전체 정보(좌표·층수·설명까지)가 붙어 온다. */
export const getFavorite = (propertyId: string) =>
  request<FavoriteDetailed>(`/api/me/favorites/${propertyId}`)

/** 찜하기. 201 Created. */
export const addFavorite = (propertyId: string) =>
  request<FavoriteCreated>('/api/me/favorites', {
    method: 'POST',
    body: JSON.stringify({ propertyId }),
  })

/** 찜 해제. 204 No Content — 본문이 없다. */
export const removeFavorite = (propertyId: string) =>
  request<void>(`/api/me/favorites/${propertyId}`, { method: 'DELETE' })
