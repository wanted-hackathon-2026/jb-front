import { ref } from 'vue'
import { defineStore } from 'pinia'
import { localId } from '@/lib/id'

/**
 * 화면을 막지 않고 잠깐 띄우는 알림.
 *
 * **어디에 쓰나** — 화면만 봐서는 일어난 줄 모르는 일을 알릴 때다. 거점 저장이 서버에서
 * 거절당하는 경우가 대표적이고(화면에는 이미 추가돼 보이는데 서버에는 없다), 링크 복사처럼
 * 성공해도 화면이 안 바뀌는 동작도 같은 이유로 여기 온다.
 *
 * **어디에 쓰지 않나** — 목록이 통째로 비거나 화면이 제 구실을 못 하는 실패는 토스트가
 * 아니라 **그 자리에 인라인으로** 보여준다(마이페이지 관심 매물이 그렇게 한다).
 * 토스트는 사라지므로, 사라지면 안 되는 정보를 담으면 안 된다.
 */

/**
 * 자동으로 사라지기까지. 오류는 읽을 시간이 필요해서 넉넉히 주고, 성공은 이미 아는 일을
 * 확인해 줄 뿐이라 짧게 끊는다.
 */
const DISMISS_MS = { error: 5_000, success: 2_500 } as const

export type NoticeTone = keyof typeof DISMISS_MS

export interface Notice {
  id: string
  message: string
  tone: NoticeTone
}

export const useNoticeStore = defineStore('notice', () => {
  const notices = ref<Notice[]>([])
  const timers = new Map<string, ReturnType<typeof setTimeout>>()

  function dismiss(id: string) {
    notices.value = notices.value.filter((n) => n.id !== id)
    const timer = timers.get(id)
    if (timer) {
      clearTimeout(timer)
      timers.delete(id)
    }
  }

  function push(message: string, tone: NoticeTone) {
    const id = localId('notice')
    notices.value.push({ id, message, tone })
    timers.set(
      id,
      setTimeout(() => dismiss(id), DISMISS_MS[tone]),
    )
    return id
  }

  /**
   * 실패를 알린다. 같은 문구가 연달아 와도 **따로 쌓는다** — 거점을 두 번 등록해서
   * 두 번 실패했다면 그건 두 번 일어난 일이고, 하나로 합치면 두 번째가 무시된 것처럼 보인다.
   */
  const error = (message: string) => push(message, 'error')

  /**
   * 눈에 안 보이는 성공을 알린다. 링크 복사처럼 **화면이 아무것도 안 바뀌는** 동작이
   * 대상이다 — 저장 버튼처럼 결과가 화면에 남는 동작은 토스트를 띄우지 않는다.
   */
  const success = (message: string) => push(message, 'success')

  return { notices, error, success, dismiss }
})
