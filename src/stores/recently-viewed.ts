import { computed } from 'vue'
import { useStorage } from '@vueuse/core'
import { defineStore } from 'pinia'
import type { Listing, ListingSummary } from '@/types/domain'

/**
 * 최근 본 매물 — **이 기기에만 쌓인다.**
 *
 * 백엔드에 조회 이력을 담는 곳이 없다. 서버가 쌓게 하려면 "무엇을 봤는지"를 계정에
 * 남긴다는 결정이 먼저 필요한데, 그건 별도 판단이라 여기서 하지 않았다.
 * 나중에 서버로 옮기더라도 화면은 그대로 두고 이 스토어 안만 바꾸면 된다.
 *
 * **카드에 필요한 만큼만 통째로 담는다.** id 만 적어두면 마이페이지를 열 때마다
 * 20번을 따로 조회해야 한다(상세는 단건 조회뿐이다). 대신 값이 그때의 **스냅샷**이라
 * 가격이 바뀌면 낡은 값이 남는데, '최근 본'은 원래 그때 본 것을 보여주는 목록이고
 * 카드를 누르면 상세가 언제나 새로 받아 오므로 틀린 값이 이어지지는 않는다.
 */

/** 시안에 스크롤 한계가 없어 임의로 정한다. 20건이면 카드로 두어 화면이다. */
const LIMIT = 20

/** 카드가 실제로 쓰는 것만. 나머지를 담으면 저장소만 불린다. */
export type ViewedListing = ListingSummary

const pick = (l: Listing): ViewedListing => ({
  id: l.id,
  dealType: l.dealType,
  deposit: l.deposit,
  rent: l.rent,
  roomType: l.roomType,
  areaPyeong: l.areaPyeong,
  floor: l.floor,
  address: l.address,
  // 카드는 첫 장만 쓴다. 상세의 사진 전체를 담으면 20건에 수백 개가 쌓인다.
  photos: l.photos.slice(0, 1),
  lines: l.lines,
  commutes: l.commutes,
  /**
   * **점수는 담지 않는다.** 매칭 점수는 '그때 그 추천 조건' 기준이라(역할 분담: 산식은
   * 백엔드) 조건과 떼어놓으면 뜻이 없다. 추천 결과에서 열어본 매물만 점수를 들고 와
   * 같은 목록에서 어떤 카드엔 도넛이 있고 어떤 카드엔 없는 모습이 됐다.
   * 주변 매물·관심 매물 목록도 `score: null` 이다(lib/api/listings.ts·me.ts).
   */
  score: null,
})

export const useRecentlyViewedStore = defineStore('recently-viewed', () => {
  const stored = useStorage<ViewedListing[]>('jb:recently-viewed:v1', [])

  /**
   * 읽을 때 점수를 한 번 더 턴다. 점수를 담던 시절의 기록이 이미 브라우저에 쌓여 있어서다 —
   * 저장소 키를 올리면 지금 고치려는 도넛과 함께 사용자의 '최근 본' 목록까지 지워진다.
   */
  const items = computed<ViewedListing[]>(() =>
    stored.value.map((v) => (v.score === null ? v : { ...v, score: null })),
  )

  /** 상세를 열 때마다 부른다. 같은 매물을 다시 보면 **맨 앞으로 올라온다.** */
  function record(listing: Listing) {
    stored.value = [pick(listing), ...stored.value.filter((v) => v.id !== listing.id)].slice(
      0,
      LIMIT,
    )
  }

  /**
   * 로그아웃하면 비운다.
   *
   * 로그인 없이도 매물을 볼 수 있어서 '내 것'이라고 단정하긴 어렵지만, 공용 기기에서
   * 다음 사람에게 앞사람이 뭘 봤는지 보이는 쪽이 더 나쁘다. 거점 목록도 같은 이유로
   * 비운다(stores/anchors.ts).
   */
  const clear = () => {
    stored.value = []
  }

  return { items, count: computed(() => stored.value.length), record, clear }
})
