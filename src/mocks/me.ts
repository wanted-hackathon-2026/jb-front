/** ⚠️ 가짜 마이페이지 데이터. 백엔드 연동 시 이 파일을 통째로 삭제한다. */
import type { Listing, SearchHistoryEntry } from '@/types/domain'
import { getNearbyListings } from './listings'

/** 관심 매물 — 목록 앞쪽 몇 건을 찜해둔 것으로 둔다. */
export async function getMockFavorites(): Promise<Listing[]> {
  const all = await getNearbyListings()
  return all.slice(0, 6)
}

/** 최근 본 매물 — 관심 매물과 겹치되 순서가 다르다(본 순서). */
export async function getMockRecentlyViewed(): Promise<Listing[]> {
  const all = await getNearbyListings()
  return [all[3], all[0], all[7], all[1], all[9], all[4]].filter(Boolean)
}

export async function getMockSearchHistory(): Promise<SearchHistoryEntry[]> {
  await new Promise((r) => setTimeout(r, 180))
  return [
    {
      id: 'h2',
      createdAt: '2026-09-16T10:12:00+09:00',
      anchorNames: ['신도림역', '구로디지털단지'],
      deposit: [5000, 10000],
      rent: [0, 40],
      transport: 'transit',
      maxMinutes: 30,
      lifestyle: { sunlight: 45, quietness: 62, safety: 73, infrastructure: 93 },
      recommendationId: null,
    },
    {
      id: 'h1',
      createdAt: '2026-08-21T19:40:00+09:00',
      anchorNames: ['신도림역', '구로디지털단지'],
      deposit: [5000, 10000],
      rent: [0, 40],
      transport: 'transit',
      maxMinutes: 30,
      lifestyle: { sunlight: 45, quietness: 62, safety: 73, infrastructure: 93 },
      recommendationId: null,
    },
  ]
}
