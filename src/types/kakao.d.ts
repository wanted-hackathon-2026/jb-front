/// <reference types="kakao.maps.d.ts" />

// SDK 는 전역 스크립트로 들어온다. autoload=false 로 넣기 때문에 로더에서
// window.kakao.maps.load() 를 부를 수 있어야 한다.
declare global {
  interface Window {
    kakao: typeof kakao
  }
}

export {}
