import { ref } from 'vue'
import { defineStore } from 'pinia'

/**
 * 지도 바텀시트가 얼마나 올라와 있는지.
 *
 * MapPage 안의 ref 로 두면 App.vue 의 완료 배너가 이 값을 볼 수 없다 — 배너는 라우트와
 * 무관하게 떠야 해서 셸 바깥(App)에 살고, 시트를 피해 앉으려면 지금 시트가 접혔는지
 * 펼쳐졌는지를 알아야 한다. 두 곳이 같이 보는 값이라 스토어로 뺀다.
 */
export const useSheetStore = defineStore('sheet', () => {
  const state = ref<'peek' | 'full'>('peek')
  /** 시트 안에서 어느 탭을 보고 있는지. 지금 지도에 보이는 것부터 보여준다. */
  const tab = ref<'listings' | 'filters'>('listings')
  /**
   * 첫 진입 안내가 '추천을 받은 뒤'를 설명하는 동안만 참.
   *
   * 안내 3단계는 결과 화면을 설명하는데, 첫 방문에는 거점도 추천도 없어서 목록에
   * 점수가 없다. 설명만 점수 얘기를 하고 화면엔 없으면 어긋나므로, 그 동안만 점수가
   * 붙은 목록을 보여준다. 안내가 끝나면 원래대로 돌아간다.
   */
  const previewScored = ref(false)
  /** 첫 진입 안내가 'AI가 찾는 중' 화면을 설명하는 동안만 참. 가짜 진행 표시를 띄운다. */
  const previewProgress = ref(false)
  return { state, tab, previewScored, previewProgress }
})
