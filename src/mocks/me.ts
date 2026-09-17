/**
 * ⚠️ 가짜 마이페이지 데이터.
 *
 * **관심 매물은 여기서 빠졌다** — `/api/me/favorites` 가 실재해서 실제 API 로 갈아탔다
 * (`lib/api/me.ts`). 남은 둘은 대응 엔드포인트가 없어서 아직 목이다:
 * '최근 본 매물'은 조회 이력을 서버가 쌓을지부터 정해야 하고, '이전 기록'은
 * 추천 API 자체가 없다. 각각 엔드포인트가 생기면 하나씩 지운다.
 */
import type { Listing, SearchHistoryEntry } from '@/types/domain'
import { getNearbyListings } from './listings'

/** 최근 본 매물 — 본 순서대로 섞어 둔다. */
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
      anchorNames: ['신도림역'],
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
      anchorNames: ['구로디지털단지'],
      deposit: [5000, 10000],
      rent: [0, 40],
      transport: 'transit',
      maxMinutes: 30,
      lifestyle: { sunlight: 45, quietness: 62, safety: 73, infrastructure: 93 },
      recommendationId: null,
    },
  ]
}
