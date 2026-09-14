/**
 * 카카오 우편번호 서비스 전역 타입. 공식 타입 패키지가 없어 직접 둔다.
 * 필드는 실제 응답에서 확인한 것만 좁게 선언한다.
 */
interface PostcodeResult {
  /** 우편번호 5자리 */
  zonecode: string
  /** 사용자가 고른 형태의 주소 */
  address: string
  roadAddress: string
  jibunAddress: string
  /** 건물명. 역·대학·빌딩이 여기 들어온다 — 거점 이름으로 쓴다. */
  buildingName: string
  /** 법정동 */
  bname: string
}

interface PostcodeEmbedOptions {
  autoClose?: boolean
  /** 미리 채워둘 검색어 */
  q?: string
}

interface PostcodeInstance {
  embed: (el: HTMLElement, opts?: PostcodeEmbedOptions) => void
  open: () => void
}

declare const daum: {
  Postcode: new (opts: {
    oncomplete: (data: PostcodeResult) => void
    onclose?: (state: string) => void
    width?: string
    height?: string
    /** 색상만 바꿀 수 있다. 레이아웃·폰트는 고정이다. */
    theme?: Partial<
      Record<
        | 'bgColor'
        | 'searchBgColor'
        | 'contentBgColor'
        | 'pageBgColor'
        | 'textColor'
        | 'queryTextColor'
        | 'postcodeTextColor'
        | 'emphTextColor'
        | 'outlineColor',
        string
      >
    >
  }) => PostcodeInstance
}
