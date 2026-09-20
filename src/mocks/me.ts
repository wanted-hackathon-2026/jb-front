/**
 * ⚠️ 가짜 마이페이지 데이터.
 *
 * **'이전 기록' 하나만 남았다.** 관심 매물은 `/api/me/favorites` 로 갈아탔고
 * (`lib/api/me.ts`), 최근 본 매물은 이 기기에 쌓기로 했다
 * (`stores/recently-viewed.ts`). 이것도 추천 API 가 생기면 지운다.
 */
import type { SearchHistoryEntry } from '@/types/domain'

export async function getMockSearchHistory(): Promise<SearchHistoryEntry[]> {
  await new Promise((r) => setTimeout(r, 180))
  return [
    {
      id: 'h3',
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
      id: 'h2',
      createdAt: '2026-09-16T08:00:00+09:00',
      anchorNames: ['홍대입구역'],
      deposit: [3000, 8000],
      rent: [0, 50],
      transport: 'transit',
      maxMinutes: 40,
      lifestyle: { sunlight: 75, quietness: 87, safety: 48, infrastructure: 93 },
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
