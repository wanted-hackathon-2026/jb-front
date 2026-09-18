<script setup lang="ts">
import { computed, ref } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import BaseScoreDonut from '@/components/BaseScoreDonut.vue'
import { formatCommute, formatPrice } from '@/lib/format'
import { useAuthStore } from '@/stores/auth'
import { useFavoritesStore } from '@/stores/favorites'
import { useLoginPromptStore } from '@/stores/login-prompt'
import type { Listing } from '@/types/domain'

const props = defineProps<{
  listing: Listing
  /** 추천 결과 목록에서 왔다면 그 추천의 id. 주변 매물 목록에서는 없다. */
  recommendationId?: string
  /** 찜한 매물인지. 마이페이지 '관심 매물' 탭은 전부 채워진 하트로 나온다. */
  saved?: boolean
}>()

const route = useRoute()
const auth = useAuthStore()
const favorites = useFavoritesStore()
const loginPrompt = useLoginPromptStore()

/**
 * 찜 상태는 스토어가 들고 있다(stores/favorites.ts) — 카드마다 따로 들면 상세에서
 * 저장하고 돌아왔을 때 하트가 비어 있다.
 *
 * `saved` 프롭은 **서버가 알려준 초깃값**이다(마이페이지 '관심 매물'). 로컬에 한 번
 * 심어 두면 그 뒤로는 스토어 하나만 보면 된다.
 *
 * 저장은 로그인 전용이라 먼저 로그인을 받는다 — 비로그인으로 누르면 눌린 것처럼
 * 보였다가 서버에 아무것도 남지 않는다.
 */
if (props.saved) favorites.add(props.listing.id)
const isSaved = computed(() => favorites.has(props.listing.id))

function toggleSave() {
  if (!auth.isAuthenticated) {
    loginPrompt.require({ redirect: route.fullPath, then: () => favorites.add(props.listing.id) })
    return
  }
  favorites.toggle(props.listing.id)
}

/**
 * 썸네일이 못 뜨면 회색 자리표시자로 돌아간다. 깨진 이미지 아이콘을 보여주느니
 * 사진이 붙기 전 모습이 낫다 — 목 사진은 외부(picsum)에서 오므로 오프라인에선 늘 실패한다.
 */
const photoFailed = ref(false)

/** 맥락이 있으면 추천 상세로, 없으면 매물 상세로 보낸다. */
const detailRoute = computed(() =>
  props.recommendationId
    ? {
        name: 'recommendation-listing',
        params: { recommendationId: props.recommendationId, id: props.listing.id },
      }
    : { name: 'listing-detail', params: { id: props.listing.id } },
)
</script>

<template>
  <article class="relative flex gap-3 py-4">
    <!--
      카드 전체를 링크로 덮는다(stretched link). <a> 안에 <button> 을 넣으면 중첩된
      인터랙티브 요소가 되어 접근성이 깨지므로, 링크를 겹쳐 깔고 찜 버튼만 위로 올린다.
    -->
    <RouterLink
      :to="detailRoute"
      class="absolute inset-0 z-10 rounded-xl"
      :aria-label="`${formatPrice(listing.dealType, listing.deposit, listing.rent)} 상세 보기`"
    />

    <!--
      썸네일. 회색 바탕은 사진이 오기 전(또는 못 올 때)의 자리표시자다.
      찜 하트가 사진 위에 얹히므로 밝은 사진에서 묻히지 않게 그림자를 준다 —
      상세 화면의 뒤로·공유 아이콘과 같은 처지다(ListingDetailPage 의 같은 주석).
    -->
    <div class="relative size-20 shrink-0 overflow-hidden rounded-xl bg-slate-200">
      <!-- 목록은 한 화면에 여럿이라 lazy 로 둔다. 첫 장이 대표 사진이다. -->
      <img
        v-if="listing.photos.length && !photoFailed"
        :src="listing.photos[0]"
        alt=""
        loading="lazy"
        class="size-full object-cover"
        @error="photoFailed = true"
      />
      <button
        type="button"
        class="absolute bottom-1 left-1 z-20 grid size-7 place-items-center text-white/90 drop-shadow-[0_1px_2px_rgba(15,23,42,0.45)]"
        :aria-label="isSaved ? '관심 매물에서 빼기' : '관심 매물로 저장'"
        :aria-pressed="isSaved"
        @click="toggleSave"
      >
        <svg
          viewBox="0 0 19 17"
          class="size-5"
          :fill="isSaved ? 'var(--color-brand-500)' : 'none'"
          aria-hidden="true"
        >
          <path
            d="M16.2376 8.69124L9.15789 15.65L2.07823 8.69124C1.61126 8.24026 1.24343 7.69821 0.997914 7.09922C0.752396 6.50023 0.634504 5.85727 0.651661 5.21084C0.668818 4.56441 0.820653 3.92851 1.0976 3.34318C1.37456 2.75784 1.77062 2.23576 2.26087 1.80981C2.75111 1.38386 3.32491 1.06326 3.94613 0.868202C4.56736 0.673146 5.22255 0.607859 5.87044 0.676451C6.51834 0.745044 7.1449 0.94603 7.71069 1.26675C8.27647 1.58748 8.76921 2.02099 9.15789 2.54C9.54825 2.02476 10.0416 1.59503 10.607 1.27771C11.1724 0.960393 11.7977 0.76231 12.4437 0.695861C13.0898 0.629412 13.7428 0.696028 14.3617 0.891539C14.9806 1.08705 15.5523 1.40725 16.0408 1.83209C16.5293 2.25694 16.9242 2.77728 17.2008 3.36056C17.4774 3.94384 17.6296 4.5775 17.6481 5.22187C17.6666 5.86625 17.5508 6.50747 17.3081 7.10541C17.0654 7.70335 16.701 8.24514 16.2376 8.69686"
            :stroke="isSaved ? 'var(--color-brand-500)' : '#99A1AF'"
            stroke-width="1.3"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
      </button>
    </div>

    <div class="min-w-0 flex-1">
      <p class="truncate font-bold text-slate-900">
        {{ formatPrice(listing.dealType, listing.deposit, listing.rent) }}
      </p>
      <!--
        부제·주소·노선은 12px 다. 시안 실측은 11px 인데 한글 가독성 하한(12px) 아래라
        한 단계만 올려 맞췄다 — 가격(16px)과의 위계는 시안과 같은 폭으로 벌어진다.
      -->
      <p class="truncate text-xs text-slate-600">
        {{ listing.roomType }} · {{ listing.areaPyeong }}평 · {{ listing.floor }}층
      </p>
      <p class="truncate text-xs text-slate-500">{{ listing.address }}</p>
      <p v-if="listing.commutes.length" class="truncate text-xs font-medium text-brand-500">
        {{
          formatCommute(
            listing.commutes[0].minutes,
            listing.commutes[0].transfers,
            listing.commutes[0].walkMinutes,
          )
        }}
      </p>
      <p v-else class="truncate text-xs font-medium text-brand-500">
        {{ listing.lines.join(' · ') }}
      </p>
    </div>

    <BaseScoreDonut v-if="listing.score !== null" :score="listing.score" />
  </article>
</template>
