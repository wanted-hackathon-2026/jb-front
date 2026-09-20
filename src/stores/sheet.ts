import { ref } from 'vue'
import { defineStore } from 'pinia'

/**
 * 지도 바텀시트가 얼마나 올라와 있는지.
 *
 * MapPage 안의 ref 로 두면 App.vue 의 완료 배너가 이 값을 볼 수 없다 — 배너는 라우트와
 * 무관하게 떠야 해서 셸 바깥(App)에 살고, 시트를 피해 앉으려면 지금 시트가 접혔는지
 * 펼쳐졌는지를 알아야 한다. 두 곳이 같이 보는 값이라 스토어로 뺀다.
 */
export type SheetTab = 'listings' | 'filters'

/**
 * 첫 화면에서 골라져 있는 탭.
 *
 * 'AI 추천' 이다 — 이 서비스가 파는 것은 조건을 걸어 점수를 받는 쪽이고, 주변 매물은
 * 시트 뒤 지도에 이미 보인다. 시트를 올리면 곧장 조건을 만질 수 있다.
 *
 * 첫 진입 안내가 끝날 때도 이 값으로 되돌린다(WelcomeOverlay) — 두 곳이 따로 적어 두면
 * 안내를 본 사람과 건너뛴 사람의 첫 화면이 달라진다.
 */
export const DEFAULT_SHEET_TAB: SheetTab = 'filters'

export const useSheetStore = defineStore('sheet', () => {
  const state = ref<'peek' | 'full'>('peek')
  /** 시트 안에서 어느 탭을 보고 있는지. */
  const tab = ref<SheetTab>(DEFAULT_SHEET_TAB)
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
