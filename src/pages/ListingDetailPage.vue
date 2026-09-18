<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import BaseAiIcon from '@/components/BaseAiIcon.vue'
import BaseSkeleton from '@/components/BaseSkeleton.vue'
import BaseScoreDonut from '@/components/BaseScoreDonut.vue'
import RouteTimeline from '@/components/RouteTimeline.vue'
import { getListing, getRecommendedListing } from '@/lib/api/listings'
import { lifestyleLabel } from '@/lib/lifestyle'
import { formatCommute, formatMoney, formatPrice } from '@/lib/format'
import { shareLink } from '@/lib/share'
import { useAuthStore } from '@/stores/auth'
import { useFavoritesStore } from '@/stores/favorites'
import { useLoginPromptStore } from '@/stores/login-prompt'
import { useNoticeStore } from '@/stores/notice'
import type { Listing } from '@/types/domain'

const props = defineProps<{
  id: string
  /** 추천 결과에서 들어왔다면 그 추천의 id. 주변 매물에서 들어오면 없다. */
  recommendationId?: string
}>()

const router = useRouter()
const route = useRoute()
const auth = useAuthStore()
const favorites = useFavoritesStore()
const loginPrompt = useLoginPromptStore()
const notice = useNoticeStore()

const listing = ref<Listing | null>(null)
const failed = ref(false)

/**
 * 저장 여부는 스토어가 들고 있다 — 이 화면이 직접 들면 **이미 저장한 매물을 다시 열었을 때
 * '저장하기'라고 적혀 있다.** 목록 카드의 하트와 같은 값을 봐야 하는 것도 같은 이유다.
 */
const saved = computed(() => favorites.has(props.id))

/**
 * 저장(찜)은 **로그인 전용이다** — 서버의 favorite 에는 비로그인 개념이 없다
 * (user_id NOT NULL, lib/api/favorites.ts). 비로그인으로 누르면 눌린 것처럼 보였다가
 * 서버에 아무것도 남지 않으므로, 상태를 바꾸기 전에 로그인부터 받는다.
 *
 * 로그인이 끝나면 사용자가 원래 누른 대로 저장까지 이어간다 — 팝업을 닫고 다시
 * 누르게 하면 같은 동작을 두 번 시키는 것이다.
 *
 * ⚠️ 아직 서버에 보내지 않는다. 이 기기에만 남는다(stores/favorites.ts).
 */
function toggleSave() {
  if (!auth.isAuthenticated) {
    loginPrompt.require({ redirect: route.fullPath, then: () => favorites.add(props.id) })
    return
  }
  favorites.toggle(props.id)
}

/**
 * 공유하는 주소는 **지금 보고 있는 주소가 아니라** 맥락 없는 /listings/:id 다.
 * 추천 맥락 주소(/recommendations/:recId/...)는 내 조건으로 만든 내 추천이라,
 * 남이 열면 볼 수 없거나(백엔드가 추천을 사용자별로 가진다) 내 거점·가중치가 묻어난다.
 * 매물의 항구적인 주소는 이쪽 하나뿐이다.
 */
const shareUrl = computed(
  () =>
    new URL(
      router.resolve({ name: 'listing-detail', params: { id: props.id } }).href,
      location.origin,
    ).href,
)

/**
 * OS 공유 시트로 넘긴다 — 카카오톡·메시지가 그 안에 있어서 채널을 따로 붙이지 않는다.
 * 시트가 없는 환경에서만 링크 복사로 떨어지고, 그때는 화면이 안 바뀌므로 토스트로 알린다.
 * 시트를 그냥 닫은 경우는 아무 말도 하지 않는다 — 사용자가 취소한 것이다.
 */
async function share() {
  const result = await shareLink({
    url: shareUrl.value,
    title: listing.value ? `${price.value} · ${listing.value.address}` : '자취방정식',
    text: listing.value ? `${price.value} · ${listing.value.address}` : undefined,
  })
  if (result === 'copied') notice.success('링크를 복사했어요')
  if (result === 'failed') notice.error('공유하지 못했어요. 주소창의 링크를 복사해 주세요')
}

/**
 * 갤러리에서 보고 있는 장(1부터). 버튼이 아니라 손가락으로 미는 UI라 **스크롤 위치가
 * 정본**이다 — 따로 세지 않고 위치에서 되읽는다.
 */
const photoIndex = ref(1)
const photoTrack = ref<HTMLElement>()
function onPhotoScroll(e: Event) {
  const track = e.target as HTMLElement
  if (!track.clientWidth) return
  photoIndex.value = Math.round(track.scrollLeft / track.clientWidth) + 1
}

/** 점을 눌러도 넘어간다. 미는 것과 같은 스크롤이라 카운터는 저절로 따라온다. */
function goToPhoto(n: number) {
  const track = photoTrack.value
  if (!track) return
  track.scrollTo({ left: n * track.clientWidth, behavior: 'smooth' })
}

/**
 * 사진이 하나라도 못 뜨면 갤러리를 접고 회색 자리표시자로 돌아간다. 목 사진은
 * 외부(picsum)에서 오므로 오프라인에선 전부 실패한다 — 깨진 이미지를 늘어놓느니
 * 사진이 붙기 전 모습이 낫다. 한 장이 실패하면 나머지도 같은 처지라 통째로 판단한다.
 */
const photosFailed = ref(false)

const price = computed(() =>
  listing.value
    ? formatPrice(listing.value.dealType, listing.value.deposit, listing.value.rent)
    : '',
)

/** 매물 정보 표. 값이 없을 수 있는 줄은 '없음'까지 말한다 — 빈칸은 모른다는 뜻이 된다. */
const infoRows = computed(() => {
  const l = listing.value
  if (!l) return []
  return [
    { label: '층', value: `${l.floor}층 / 전체 ${l.totalFloors}층` },
    { label: '향', value: `${l.direction}향` },
    {
      label: '관리비',
      value: l.maintenanceFee ? `월 ${formatMoney(l.maintenanceFee)}만원` : '없음',
    },
    { label: '입주', value: l.moveInDate },
    { label: '주차', value: l.parking ? '가능' : '불가' },
    { label: '엘리베이터', value: l.elevator ? '있음' : '없음' },
  ]
})

const commute = computed(() => {
  const c = listing.value?.commutes[0]
  return c ? formatCommute(c.minutes, c.transfers, c.walkMinutes) : null
})

/**
 * 같은 컴포넌트가 두 라우트(/listings/:id, /recommendations/:recId/listings/:id)를 맡는다.
 * onMounted 로만 받아오면 라우트만 바뀌고 인스턴스가 재사용될 때 옛 매물이 남는다.
 */
async function load() {
  listing.value = null
  failed.value = false
  try {
    // 맥락이 있으면 점수·순위·이동 동선이 함께 오는 쪽으로 묻는다.
    listing.value = props.recommendationId
      ? await getRecommendedListing(props.recommendationId, props.id)
      : await getListing(props.id)
  } catch {
    failed.value = true
  }
}

watch(() => [props.id, props.recommendationId], load, { immediate: true })
</script>

<template>
  <main class="relative flex min-h-0 flex-1 flex-col bg-white">
    <div class="min-h-0 flex-1 overflow-y-auto">
      <!-- 히어로. 사진이 없거나 못 뜨면 회색 자리표시자가 그대로 보인다. -->
      <div class="relative aspect-[4/3] shrink-0 bg-[#c7c7c7]">
        <!--
          가로로 미는 갤러리. 한 장씩 맞물리게(snap) 두면 어중간하게 걸친 상태가 없어
          카운터와 화면이 항상 같은 말을 한다. 버튼은 이 뒤에 오므로 사진 위에 얹힌다.
        -->
        <div
          v-if="listing?.photos.length && !photosFailed"
          ref="photoTrack"
          class="flex size-full snap-x snap-mandatory overflow-x-auto"
          @scroll.passive="onPhotoScroll"
        >
          <img
            v-for="(src, n) in listing.photos"
            :key="src"
            :src="src"
            :alt="`매물 사진 ${n + 1}`"
            :loading="n === 0 ? 'eager' : 'lazy'"
            class="size-full shrink-0 snap-center object-cover"
            @error="photosFailed = true"
          />
        </div>
        <!--
          시안에는 받침판이 없다 — 아이콘만 사진 위에 얹힌다(측정: 아이콘 주변이 전부
          사진색). 밝은 사진에서 흰 아이콘이 묻힐 수 있어 그림자로만 버틴다.
        -->
        <button
          type="button"
          class="safe-top absolute left-3 top-3 grid size-10 place-items-center text-white drop-shadow-[0_1px_2px_rgba(15,23,42,0.45)]"
          aria-label="뒤로"
          @click="router.back()"
        >
          <svg
            viewBox="0 0 24 24"
            class="size-6"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <path d="M15 5l-7 7 7 7" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
        </button>

        <!--
          공유. 시안 에셋(public/share.svg)을 그대로 쓴다. 색이 흰색으로 박혀 있는데
          여기선 항상 사진 위 흰 아이콘이라 상관없다 — 그림자는 버튼 쪽 drop-shadow 가 준다.
          저장(찜)은 하단 고정 바에 있다.
        -->
        <button
          type="button"
          class="safe-top absolute right-3 top-3 grid size-10 place-items-center text-white drop-shadow-[0_1px_2px_rgba(15,23,42,0.45)]"
          aria-label="이 매물 공유하기"
          @click="share"
        >
          <img src="/share.svg" width="25" height="25" alt="" aria-hidden="true" />
        </button>

        <!--
          좌우 화살표. **마우스가 있는 기기에만** 뜬다(pointer: fine).

          스크롤 스냅은 드래그로 안 움직여서, 손가락이 없으면 사진을 넘길 방법이 점뿐이다.
          반대로 터치 기기에서는 미는 게 자연스럽고 화살표가 사진만 가린다.
          이 앱은 모바일 전용이지만(README) 화면을 확인하는 자리는 대개 데스크톱이다.
        -->
        <button
          v-for="step in listing && listing.photos.length > 1 && !photosFailed ? [-1, 1] : []"
          :key="step"
          type="button"
          class="absolute top-1/2 hidden size-11 -translate-y-1/2 place-items-center text-white drop-shadow-[0_1px_2px_rgba(15,23,42,0.45)] disabled:opacity-30 [@media(pointer:fine)]:grid"
          :class="step < 0 ? 'left-1' : 'right-1'"
          :disabled="step < 0 ? photoIndex === 1 : photoIndex === listing!.photos.length"
          :aria-label="step < 0 ? '이전 사진' : '다음 사진'"
          @click="goToPhoto(photoIndex - 1 + step)"
        >
          <svg
            viewBox="0 0 24 24"
            class="size-7"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <path
              :d="step < 0 ? 'M15 5l-7 7 7 7' : 'M9 5l7 7-7 7'"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
        </button>

        <!--
          장수만큼 찍는 점. 사진이 몇 장인지 배지의 숫자보다 먼저 눈에 들어오고,
          한 장뿐이면(=넘길 게 없으면) 아예 뜨지 않는다.

          점은 8px 인데 버튼은 44px 다 — 손가락으로 누를 것이라 시안의 점 크기를
          그대로 두고 잡히는 영역만 키운다(README '모바일 전용 설계').
          그림자는 밝은 사진 위에서 흰 점이 묻히지 않게 — 이 화면의 아이콘들과 같은 처지다.
        -->
        <div
          v-if="listing && listing.photos.length > 1 && !photosFailed"
          class="absolute inset-x-0 bottom-0 flex justify-center drop-shadow-[0_1px_2px_rgba(15,23,42,0.45)]"
        >
          <button
            v-for="(src, n) in listing.photos"
            :key="src"
            type="button"
            class="grid h-11 w-4 place-items-center"
            :aria-label="`${n + 1}번째 사진 보기`"
            :aria-current="n + 1 === photoIndex"
            @click="goToPhoto(n)"
          >
            <span
              class="size-2 rounded-full transition-colors"
              :class="n + 1 === photoIndex ? 'bg-white' : 'bg-white/50'"
            />
          </button>
        </div>

        <span
          v-if="listing?.photos.length && !photosFailed"
          class="absolute bottom-3 right-3 rounded-full bg-black/55 px-2.5 py-1 text-xs font-medium text-white"
        >
          {{ photoIndex }} / {{ listing.photos.length }}
        </span>
      </div>

      <div v-if="failed" class="px-5 py-16 text-center">
        <p class="font-semibold text-slate-900">매물을 찾을 수 없어요</p>
        <p class="mt-1 text-sm text-slate-500">내려간 매물이거나, 잠시 연결이 끊겼을 수 있어요</p>
        <!-- 문구만 두면 뒤로 가기 말고는 길이 없다. 대개는 다시 부르면 된다. -->
        <button
          type="button"
          class="mt-5 h-11 rounded-full bg-brand-500 px-6 text-sm font-semibold text-white"
          @click="load"
        >
          다시 시도
        </button>
      </div>

      <!--
        로딩 골격. 본문과 같은 절 구성(가격·주소 + 도넛 / 구분선 / 2칸 요약)으로 깔아
        매물이 도착해도 화면이 움직이지 않게 한다. 히어로는 이미 회색이라 그대로 둔다.
      -->
      <template v-else-if="!listing">
        <p class="sr-only" role="status">매물을 불러오는 중</p>
        <div aria-hidden="true">
          <section class="flex items-start gap-4 px-5 pb-5 pt-6">
            <div class="min-w-0 flex-1 pt-1">
              <BaseSkeleton class="h-7 w-40" />
              <BaseSkeleton class="mt-2.5 h-4 w-3/4" />
            </div>
            <BaseSkeleton class="size-20 shrink-0 rounded-full!" />
          </section>

          <hr class="mx-5 border-slate-100" />

          <section class="grid grid-cols-2 gap-3 px-5 pt-5">
            <BaseSkeleton class="h-23 rounded-2xl!" />
            <BaseSkeleton class="h-23 rounded-2xl!" />
          </section>

          <section class="flex flex-col gap-2.5 px-5 pt-7">
            <BaseSkeleton class="h-5 w-24" />
            <BaseSkeleton class="h-4 w-full" />
            <BaseSkeleton class="h-4 w-5/6" />
          </section>
        </div>
      </template>

      <template v-else>
        <section class="flex items-start gap-4 px-5 pb-5 pt-6">
          <div class="min-w-0 flex-1">
            <p
              v-if="listing.rank !== null && listing.rank <= 3"
              class="mb-2 inline-block rounded-full bg-brand-50 px-2.5 py-1 text-xs font-semibold text-brand-500"
            >
              추천 {{ listing.rank }}순위
            </p>
            <h1 class="truncate text-2xl font-bold text-slate-900">{{ price }}</h1>
            <!-- 관리비는 가격 바로 옆에 붙어야 하는 돈이다 — 따로 두면 아래 표까지 내려가야 안다. -->
            <p class="mt-1 truncate text-sm text-slate-500">
              {{ listing.address }}
              <span v-if="listing.maintenanceFee">
                · 관리비 {{ formatMoney(listing.maintenanceFee) }}만원
              </span>
            </p>
          </div>

          <BaseScoreDonut v-if="listing.score !== null" :score="listing.score" :size="80" />
        </section>

        <hr class="mx-5 border-slate-100" />

        <!--
          AI 요약. 추천 결과에서 들어왔을 때만 있다 — 주변 매물 상세에는 요약을 만들
          근거(어떤 조건으로 추천됐는지)가 없다.
          테두리는 아이콘과 같은 그라디언트를 쓴다 — 시안 에셋 값(#00C8B3 → #019DFD)이고,
          점수 구간의 파랑(--color-accent-500)과는 다른 색이다.
        -->
        <section v-if="listing.aiSummary" class="px-5 pt-5">
          <div
            class="rounded-lg bg-linear-to-r/srgb from-[#00C8B3] to-[#019DFD] p-px shadow-[0_1px_3px_rgba(15,23,42,0.08)]"
          >
            <!-- 안쪽은 흰색이 아니라 옅은 민트다(시안 실측 #f2fffe). -->
            <div class="flex items-start gap-2.5 rounded-[7px] bg-[#f2fffe] p-2.5">
              <BaseAiIcon :size="28" />
              <p class="min-w-0 flex-1 text-sm leading-relaxed text-slate-800">
                {{ listing.aiSummary }}
              </p>
            </div>
          </div>
        </section>

        <section class="grid grid-cols-2 gap-3 px-5 pt-5">
          <div class="rounded-2xl bg-slate-100 px-4 py-5 text-center">
            <p class="text-xs font-semibold text-slate-500">전용/공급면적</p>
            <p class="mt-1 text-lg font-semibold text-slate-900">
              {{ listing.areaPyeong }}평 / {{ listing.supplyPyeong }}평
            </p>
          </div>
          <div class="rounded-2xl bg-slate-100 px-4 py-5 text-center">
            <p class="text-xs font-semibold text-slate-500">구조/욕실 수</p>
            <p class="mt-1 truncate text-lg font-semibold text-slate-900">
              {{ listing.roomType }} / {{ listing.bathrooms }}개
            </p>
          </div>
        </section>

        <section class="px-5 pt-7">
          <h2 class="font-bold text-slate-900">매물 정보</h2>
          <p class="mt-2 text-sm leading-relaxed text-slate-600">{{ listing.description }}</p>

          <!--
            라벨 폭을 고정해 값이 한 줄에 맞춰 선다. 320px 에서도 라벨 80px + 여백을 빼면
            값에 190px 이 남아 '3층 / 전체 15층'이 접히지 않는다(README '대응 화면 폭').
          -->
          <dl class="mt-4 flex flex-col gap-2.5 text-sm">
            <div v-for="row in infoRows" :key="row.label" class="flex gap-3">
              <dt class="w-20 shrink-0 text-slate-500">{{ row.label }}</dt>
              <dd class="min-w-0 flex-1 font-medium text-slate-800">{{ row.value }}</dd>
            </div>
          </dl>

          <ul v-if="listing.options.length" class="mt-4 flex flex-wrap gap-2">
            <li
              v-for="option in listing.options"
              :key="option"
              class="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-600"
            >
              {{ option }}
            </li>
          </ul>

          <!-- 등록번호·등록일은 매물을 특정할 때만 쓰는 값이라 절 끝에 작게 둔다. -->
          <p class="mt-4 text-xs text-slate-400">
            등록번호 {{ listing.listingNo }} · {{ listing.postedDaysAgo }}일 전 등록
          </p>
        </section>

        <section v-if="listing.route.length" class="px-5 pt-7">
          <h2 class="font-bold text-slate-900">
            이동 동선
            <span class="ml-1 text-sm font-normal text-slate-400">최적 경로 기준</span>
          </h2>
          <p v-if="commute" class="mb-4 mt-1 font-bold text-brand-500">{{ commute }}</p>
          <RouteTimeline :legs="listing.route" />
        </section>

        <!--
          축별 평가. aiSummary 와 같이 추천 맥락에서만 오는 값이라, 주변 매물 상세에서는
          배열이 비어 절이 통째로 빠진다.
        -->
        <section v-if="listing.lifestyleInsights.length" class="px-5 pb-8 pt-7">
          <h2 class="font-bold text-slate-900">라이프스타일</h2>
          <ul class="mt-4 flex flex-col gap-6">
            <li v-for="item in listing.lifestyleInsights" :key="item.key" class="flex gap-4">
              <BaseScoreDonut :score="item.score" :label="lifestyleLabel(item.key)" :size="76" />
              <div class="min-w-0 flex-1 pt-1.5">
                <p class="font-bold text-slate-900">{{ item.title }}</p>
                <p class="mt-1 text-sm leading-relaxed text-slate-500">{{ item.body }}</p>
              </div>
            </li>
          </ul>
        </section>
      </template>
    </div>

    <!-- 하단 고정 바. 목록으로 돌아가지 않고도 저장할 수 있어야 한다. -->
    <div
      v-if="listing"
      class="safe-bottom flex shrink-0 items-center gap-4 border-t border-slate-100 px-5 py-3"
    >
      <p class="min-w-0 flex-1 truncate font-bold text-slate-900">{{ price }}</p>
      <!-- 반경은 시안 실측 5px. 높이는 44 로 둔다 — 시안은 38 이지만 터치 타깃 최소치다. -->
      <button
        type="button"
        class="h-11 shrink-0 rounded-md px-8 font-semibold transition-colors"
        :class="saved ? 'bg-brand-50 text-brand-500' : 'bg-brand-500 text-white'"
        :aria-pressed="saved"
        @click="toggleSave"
      >
        {{ saved ? '저장된 매물' : '매물 저장하기' }}
      </button>
    </div>
  </main>
</template>
