/**
 * 카카오 우편번호 서비스 전역 타입. 공식 타입 패키지가 없어 직접 둔다.
 * 필드는 실제 응답에서 확인한 것만 좁게 선언한다.
 */
interface PostcodeResult {
  /** 우편번호 5자리 */
  zonecode: string
  /** 사용자가 고른 형태의 주소 */
  address: string
  /**
   * ⚠️ **빈 문자열일 수 있다.** 연관 주소에서 '선택 안함'을 고르거나 지번만 있는
   * 결과를 고르면 비고, 대응하는 값이 autoRoadAddress 로 온다(공식 가이드).
   * 매물·거점 등록의 좌표는 도로명으로만 찾으므로 반드시 auto* 로 메워야 한다.
   */
  roadAddress: string
  jibunAddress: string
  /** roadAddress 가 비었을 때 서비스가 매칭해 주는 도로명 주소 */
  autoRoadAddress: string
  /** jibunAddress 가 비었을 때의 지번 주소 */
  autoJibunAddress: string
  /** 건물명. 역·대학·빌딩이 여기 들어온다 — 거점 이름으로 쓴다. */
  buildingName: string
  /** 법정동/법정리 이름. 리 단위 주소면 여기가 '리'고 읍/면은 bname1 에 온다. */
  bname: string
  /** 법정리의 읍/면 이름. 동 단위 주소에서는 빈 문자열이다. */
  bname1: string
  /**
   * 시군구 행정구역 코드 **숫자 5자리**. 우편번호(zonecode)와 다른 값이다.
   * 매물 등록의 `sggCode` 가 이 형식을 요구한다(PropertyCreateRequest.java).
   */
  sigunguCode: string
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
