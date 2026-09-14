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
  return { state }
})
