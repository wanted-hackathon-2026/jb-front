/**
 * ⚠️ 가짜 추천 작업. 백엔드 연동 시 삭제한다.
 *
 * 생성 시각을 localStorage 에 남겨 경과 시간으로 상태를 만든다. 메모리에만 두면
 * 새로고침에 사라져서 이 기능의 핵심(“나갔다 와도 결과가 있다”)을 확인할 수 없다.
 */
import type { RecommendationStatus } from '@/lib/api/recommendation'

const KEY = 'jb:mock-reco:v1'
const PROCESSING_AFTER = 3_000
const COMPLETED_AFTER = 12_000

type MockJobs = Record<string, number>

const read = (): MockJobs => {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? '{}') as MockJobs
  } catch {
    return {}
  }
}

export function createMockJob() {
  const id = crypto.randomUUID()
  const jobs = read()
  jobs[id] = Date.now()
  localStorage.setItem(KEY, JSON.stringify(jobs))
  return {
    recommendationId: id,
    status: 'PENDING' as RecommendationStatus,
    result: null,
    estimatedSeconds: 12,
  }
}

export function readMockJob(id: string): { status: RecommendationStatus } | null {
  const createdAt = read()[id]
  if (!createdAt) return null
  const elapsed = Date.now() - createdAt
  if (elapsed < PROCESSING_AFTER) return { status: 'PENDING' }
  if (elapsed < COMPLETED_AFTER) return { status: 'PROCESSING' }
  return { status: 'COMPLETED' }
}
