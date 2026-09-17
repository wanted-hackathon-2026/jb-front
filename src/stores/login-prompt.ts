import { ref } from 'vue'
import { defineStore } from 'pinia'

/**
 * 로그인해야 할 수 있는 동작 앞에 세우는 팝업.
 *
 * 화면마다 팝업을 하나씩 두지 않는 이유: 로그인을 요구하는 자리가 지도 FAB·매물 카드·
 * 매물 상세처럼 흩어져 있어서, 각자 ref 와 마크업을 들고 있으면 같은 코드가 계속 는다.
 * 상태는 여기 두고 App 이 한 벌만 그린다.
 */
export const useLoginPromptStore = defineStore('login-prompt', () => {
  const open = ref(false)
  /** 로그인·닉네임 설정이 끝난 뒤 돌아올 경로. 신규 가입자는 닉네임 화면을 거친다. */
  const redirect = ref<string>()

  /**
   * 로그인이 끝나면 이어서 할 일 — 사용자가 원래 누른 것이다.
   * 상태가 아니라 클로저에 두는 이유는 화면이 그릴 값이 아니기 때문이다.
   */
  let resume: (() => void) | undefined

  /** 로그인이 필요한 동작 앞에서 부른다. `then` 은 로그인에 성공했을 때만 돈다. */
  function require(options: { redirect?: string; then?: () => void } = {}) {
    redirect.value = options.redirect
    resume = options.then
    open.value = true
  }

  /** 사용자가 '다음에 할게요'로 닫았다 — 하려던 일은 하지 않는다. */
  function close() {
    open.value = false
    resume = undefined
  }

  function done() {
    const go = resume
    close()
    go?.()
  }

  return { open, redirect, require, close, done }
})
