/**
 * 거점을 고르는 방식.
 *
 * 'postcode' — 카카오 우편번호 위젯(키 불필요, 주소 기반)
 * 'search'   — 자체 검색 화면(SearchPage, 시안 39-547/39-3580)
 *
 * 두 경로 모두 `anchors.add()` 로 끝나므로 이 상수 한 줄로 오갈 수 있다.
 * 우편번호 쪽이 별로면 'search' 로 되돌린다.
 */
export const ANCHOR_PICKER: 'postcode' | 'search' = 'postcode'
