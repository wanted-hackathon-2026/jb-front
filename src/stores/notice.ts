import { ref } from 'vue'
import { defineStore } from 'pinia'
import { localId } from '@/lib/id'

/**
 * 화면을 막지 않고 잠깐 띄우는 알림.
 *
 * **어디에 쓰나** — 사용자가 보고 있지 않은 곳에서 난 실패를 알릴 때다. 거점 저장이
 * 서버에서 거절당하는 경우가 대표적이다: 화면에는 이미 추가돼 보이는데 서버에는 없는
 * 상태라, 아무 말도 안 하면 조용히 갈라진다.
 *
 * **어디에 쓰지 않나** — 목록이 통째로 비거나 화면이 제 구실을 못 하는 실패는 토스트가
 * 아니라 **그 자리에 인라인으로** 보여준다(마이페이지 관심 매물이 그렇게 한다).
 * 토스트는 사라지므로, 사라지면 안 되는 정보를 담으면 안 된다.
 */

/** 자동으로 사라지기까지. 오류는 읽을 시간이 필요해서 넉넉히 준다. */
const DISMISS_MS = 5_000

export interface Notice {
  id: string
  message: string
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

  /**
   * 실패를 알린다. 같은 문구가 연달아 와도 **따로 쌓는다** — 거점을 두 번 등록해서
   * 두 번 실패했다면 그건 두 번 일어난 일이고, 하나로 합치면 두 번째가 무시된 것처럼 보인다.
   */
  function error(message: string) {
    const id = localId('notice')
    notices.value.push({ id, message })
    timers.set(
      id,
      setTimeout(() => dismiss(id), DISMISS_MS),
    )
    return id
  }

  return { notices, error, dismiss }
})
