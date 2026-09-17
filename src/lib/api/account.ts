/**
 * 내 계정. 출처: AccountController.java:14 `/api/me` (jb-backend a2ee567)
 * 명세: docs/specs/my-account-and-favorites.md (jb-backend)
 * 둘 다 인증 필요 — 토큰이 없으면 401 INVALID_ACCESS_TOKEN 이다.
 */
import type { AccountResponse } from '@/types/backend'
import { ApiError, request } from './http'
import { ERROR_CODE } from '@/types/backend'

export const getAccount = () => request<AccountResponse>('/api/me')

/** 닉네임이 이미 쓰이고 있을 때. 사용자에게 다른 이름을 권해야 하는 유일한 경우다. */
export class NicknameTakenError extends Error {
  constructor() {
    super('이미 사용 중인 닉네임이에요')
  }
}

/**
 * 닉네임 변경. 2~15자이고 서버가 앞뒤 공백을 strip 한 뒤 검증한다.
 * 닉네임이 곧 `profileCompleted` 라, 첫 설정이 온보딩 완료 표시를 겸한다.
 *
 * **닉네임은 사용자 간 중복을 허용하지 않는다.** 남이 쓰는 이름이면 409 이고,
 * 자기 닉네임을 그대로 다시 저장하는 건 성공한다.
 */
export async function updateNickname(nickname: string): Promise<AccountResponse> {
  try {
    return await request<AccountResponse>('/api/me', {
      method: 'PATCH',
      body: JSON.stringify({ nickname }),
    })
  } catch (e) {
    if (e instanceof ApiError && e.code === ERROR_CODE.NICKNAME_ALREADY_EXISTS) {
      throw new NicknameTakenError()
    }
    throw e
  }
}
