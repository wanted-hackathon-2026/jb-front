/**
 * 링크 공유.
 *
 * **OS 공유 시트를 먼저 쓴다**(navigator.share). 카카오톡·메시지·에어드롭·메모가 전부
 * 그 안에 있어서, 우리가 채널을 하나씩 붙이는 것보다 넓고 기기 설정을 그대로 따른다.
 * 모바일 전용 앱이라 이 경로가 사실상 본선이다.
 *
 * 시트가 없는 환경(데스크톱 사파리 등)에서만 링크 복사로 떨어진다.
 *
 * ⚠️ 둘 다 **보안 컨텍스트(https·localhost)에서만** 동작한다. 그 밖에서는
 * navigator.share 도 navigator.clipboard 도 아예 없어서 'failed' 가 된다.
 */

export type ShareResult =
  /** OS 시트로 넘겼다. 어디로 보냈는지는 알 수 없다(브라우저가 알려주지 않는다). */
  | 'shared'
  /** 시트가 없어 링크를 클립보드에 넣었다. */
  | 'copied'
  /** 사용자가 시트를 닫았다. 실패가 아니라 취소다 — 알릴 일이 아니다. */
  | 'cancelled'
  | 'failed'

export interface ShareData {
  url: string
  title?: string
  text?: string
}

export async function shareLink(data: ShareData): Promise<ShareResult> {
  if (navigator.share) {
    try {
      await navigator.share(data)
      return 'shared'
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') return 'cancelled'
      // 취소가 아닌 실패는 삼키고 복사로 이어간다 — 사용자는 링크만 얻으면 된다.
    }
  }
  return copyText(data.url)
}

async function copyText(text: string): Promise<ShareResult> {
  if (!navigator.clipboard) return 'failed'
  try {
    await navigator.clipboard.writeText(text)
    return 'copied'
  } catch {
    return 'failed'
  }
}
