/**
 * 내 계정. 출처: AccountController.java:14 `/api/me` (jb-backend a2ee567)
 * 둘 다 인증 필요 — 토큰이 없으면 401 INVALID_ACCESS_TOKEN 이다.
 */
import type { AccountResponse } from '@/types/backend'
import { request } from './http'

export const getAccount = () => request<AccountResponse>('/api/me')

/**
 * 닉네임 변경. 2~15자이고 서버가 공백을 strip 한 뒤 검증한다.
 * 닉네임이 곧 `profileCompleted` 라, 첫 설정이 온보딩 완료 표시를 겸한다.
 */
export const updateNickname = (nickname: string) =>
  request<AccountResponse>('/api/me', {
    method: 'PATCH',
    body: JSON.stringify({ nickname }),
  })
