<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useStorage } from '@vueuse/core'
import { useRouter } from 'vue-router'
import BaseChip from '@/components/BaseChip.vue'
import BaseBottomSheet from '@/components/BaseBottomSheet.vue'
import BaseSegmentedControl from '@/components/BaseSegmentedControl.vue'
import FilterPanel from '@/components/FilterPanel.vue'
import ListingList from '@/components/ListingList.vue'
import RecommendationProgress from '@/components/RecommendationProgress.vue'
import WelcomeOverlay from '@/components/WelcomeOverlay.vue'
import AnchorPickerLayer from '@/components/AnchorPickerLayer.vue'
import { ANCHOR_PICKER } from '@/lib/picker'
import MapPlaceholder from '@/components/MapPlaceholder.vue'
import MapView from '@/components/MapView.vue'
import { hasKakaoKey } from '@/lib/kakao'
import { useFiltersStore } from '@/stores/filters'
import { useRecommendationStore } from '@/stores/recommendation'
import { useSheetStore } from '@/stores/sheet'
import { coordToAddress } from '@/lib/api/places'
import { getNearbyListings, getScoredListings } from '@/mocks/listings'
import { MAX_ANCHORS, useAnchorsStore } from '@/stores/anchors'
import { useAuthStore } from '@/stores/auth'
import { useLoginPromptStore } from '@/stores/login-prompt'
import type { Listing } from '@/types/domain'

const router = useRouter()
const anchors = useAnchorsStore()
const auth = useAuthStore()
const filters = useFiltersStore()
const reco = useRecommendationStore()
const sheet = useSheetStore()

/**
 * 첫 방문 안내. 한 번 닫으면 localStorage 에 남아 새로고침해도 다시 뜨지 않는다.
 * 스토어를 거치지 않는 이유는 이 값을 볼 곳이 이 화면 하나뿐이어서다.
 */
const onboarded = useStorage('jb:onboarded:v1', false)
const listings = ref<Listing[]>([])
const loading = ref(true)

const TABS = [
  // 검색 필터가 먼저다 — 조건을 정하고 결과를 보는 순서가 화면에도 드러나게 한다.
  { value: 'filters' as const, label: '검색 필터' },
  { value: 'listings' as const, label: '주변 매물' },
]

/**
 * 로그인 팝업이 떠 있나. 떠 있으면 로그인 후 어디로 보낼지도 같이 들고 있는다.
 *
 * 프로필 FAB 도 팝업을 거친다. 구글이 그린 버튼을 사용자가 직접 눌러야 하므로
 * **코드가 로그인 창을 바로 열 수 없기 때문**이다(lib/google.ts).
 */
const loginPrompt = useLoginPromptStore()

const goMyPage = () => router.push({ name: 'my' })
const goFavorites = () => router.push({ name: 'my', query: { tab: 'favorites' } })

/** 프로필 FAB — 로그인했으면 마이페이지로, 아니면 로그인부터. */
function openProfile() {
  if (auth.isAuthenticated) return goMyPage()
  loginPrompt.require({ redirect: '/my', then: goMyPage })
}

/** 관심 매물 FAB — 찜은 로그인 전용이다(`user_id NOT NULL`). */
function openFavorites() {
  if (auth.isAuthenticated) return goFavorites()
  loginPrompt.require({ redirect: '/my?tab=favorites', then: goFavorites })
}

async function load() {
  loading.value = true
  listings.value =
    anchors.hasAnchors || sheet.previewScored
      ? await getScoredListings()
      : await getNearbyListings()
  loading.value = false
}

onMounted(load)
// 거점이 바뀌면 점수 유무가 달라진다 — 목록을 다시 받는다.
watch(() => anchors.anchors.length, load)
// 안내가 '추천 받은 뒤'를 설명하는 동안에는 점수가 붙은 목록으로 바꿔 보여준다.
watch(() => sheet.previewScored, load)

/** 진행 표시는 가장 최근 요청 하나만 보여준다 — 여러 개를 쌓으면 지도를 다 덮는다. */
const runningJob = computed(() => reco.pending.at(-1) ?? null)

/**
 * 첫 진입 안내가 'AI가 찾는 중' 을 설명하는 동안에는 가짜 작업으로 진행 표시를 띄운다.
 * 추천을 실제로 돌리지 않고도 그 화면이 어떻게 생겼는지 보여줘야 해서다.
 */
const shownJob = computed(() =>
  sheet.previewProgress
    ? { id: 'tour-preview', status: 'PROCESSING' as const, createdAt: Date.now() }
    : runningJob.value,
)

/**
 * 거점 고르기 진입점. 두 방식 모두 anchors.add() 로 끝나므로 여기서만 갈린다
 * (features/anchors/picker.ts 의 상수 한 줄로 되돌릴 수 있다).
 */
const pickerOpen = ref(false)

function openAnchorPicker() {
  if (ANCHOR_PICKER === 'postcode') pickerOpen.value = true
  else router.push({ name: 'search' })
}

/**
 * 지도에서 찍은 지점 — 주소를 확인한 뒤 거점으로 등록할지 고른다.
 *
 * `isRoad` 를 같이 들고 있는다. 도로명이 없는 좌표(공터·산·도로 한복판)는 지번으로
 * 떨어지는데, 서버는 도로명으로만 좌표를 찾으므로 그런 지점은 애초에 등록할 수 없다.
 * 누른 뒤에 실패를 보여주는 대신 **버튼을 잠그고 이유를 먼저 말한다.**
 */
const picked = ref<{ x: number; y: number; address: string; isRoad: boolean } | null>(null)
const picking = ref(false)

async function onPick(coord: { x: number; y: number }) {
  picking.value = true
  picked.value = { ...coord, address: '', isRoad: false }
  const found = await coordToAddress(coord.x, coord.y)
  // 주소를 기다리는 동안 다른 지점을 찍었으면 늦게 온 응답은 버린다.
  if (picked.value?.x === coord.x && picked.value?.y === coord.y) {
    picked.value = { ...coord, ...found }
  }
  picking.value = false
}

/**
 * 추천 요청. 모달은 시트 안이 아니라 페이지 루트에 둔다 — BaseBottomSheet 가 transform 을
 * 쓰기 때문에 그 안의 `fixed` 는 뷰포트가 아니라 시트를 기준으로 잡힌다.
 */
const submitting = ref(false)
const started = ref(false)

async function requestRecommendation() {
  submitting.value = true
  try {
    await reco.request({
      anchors: anchors.anchors.map(({ name, address, x, y }) => ({ name, address, x, y })),
      weights: { ...filters.lifestyle },
      maxMinutes: filters.maxMinutes,
    })
    started.value = true
    sheet.state = 'peek'
  } finally {
    submitting.value = false
  }
}

function addPickedAnchor() {
  if (!picked.value || !picked.value.isRoad) return
  const { x, y, address } = picked.value
  anchors.add({ id: `pin_${x}_${y}`, name: address, address, x, y })
  picked.value = null
}
</script>

<template>
  <!-- --sheet-full / --sheet-peek 는 main.css 의 :root 에 있다(완료 배너도 같은 값을 본다). -->
  <main class="relative flex-1 overflow-hidden">
    <!-- 키가 없으면 자리표시자로 돈다. 키를 넣는 순간 실제 지도로 바뀐다. -->
    <MapView
      v-if="hasKakaoKey"
      :listings="listings"
      :anchors="anchors.anchors"
      :max-minutes="filters.maxMinutes"
      @pick="onPick"
    />
    <MapPlaceholder v-else :show-radius="anchors.hasAnchors" @pick="onPick" />

    <!-- 상단 검색 바. 거점이 있으면 칩이 들어차고, 없으면 placeholder 가 보인다. -->
    <!-- 상단 여백 14px 은 시안에서 실측한 값이다(좌우는 아래 주석의 광학 정렬을 따른다). -->
    <div class="safe-top absolute inset-x-0 top-0 z-30 p-3 pt-3.5">
      <!--
        좌우 여백을 맞춘다. 오른쪽은 바 안쪽 여백 8px + 아이콘 버튼(40px) 안에서
        아이콘(20px)이 가운데 놓이며 생기는 10px = 18px 이다.
        왼쪽도 8px + 내용 들여쓰기 10px 로 같은 18px 을 만든다.
      -->
      <div data-tour="anchors" class="flex items-center gap-2 rounded-full bg-white p-2 shadow-md">
        <div class="flex flex-1 items-center gap-2 overflow-x-auto pl-2.5">
          <template v-if="anchors.hasAnchors">
            <BaseChip
              v-for="a in anchors.anchors"
              :key="a.id"
              :label="a.name"
              removable
              @remove="anchors.remove(a.id)"
            />
            <!-- 시안 프레임 1: 거점이 있을 때는 칩 옆의 이 버튼이 검색으로 가는 길이다. -->
            <button
              v-if="anchors.canAddMore"
              type="button"
              class="inline-flex h-9 shrink-0 items-center rounded-full border border-slate-200 px-3 text-sm font-medium text-slate-600"
              @click="openAnchorPicker"
            >
              + 거점 추가
            </button>
          </template>
          <!-- 거점이 없으면 바 전체가 검색으로 들어가는 버튼이다(돋보기만으로는 표적이 너무 작다). -->
          <button
            v-else
            type="button"
            class="min-h-11 flex-1 truncate text-left text-slate-400"
            @click="openAnchorPicker"
          >
            직장, 학교, 자주 가는 곳 검색
          </button>
        </div>
        <button
          type="button"
          class="grid size-10 shrink-0 place-items-center rounded-full text-slate-600"
          aria-label="거점 검색"
          @click="openAnchorPicker"
        >
          <svg
            viewBox="0 0 24 24"
            class="size-5"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <circle cx="11" cy="11" r="7" />
            <path d="M20 20l-4-4" stroke-linecap="round" />
          </svg>
        </button>
      </div>
    </div>

    <!--
      지도 위 오버레이 스택. FAB 까지 같은 flex 컬럼에 넣어두면 진행 표시·핀 카드가
      늘었다 줄었다 해도 bottom 값을 손으로 계산할 필요가 없다.
    -->
    <div class="absolute inset-x-4 bottom-[calc(var(--sheet-peek)+1rem)] z-20 flex flex-col gap-3">
      <div class="flex flex-col items-end gap-3">
        <button
          type="button"
          class="grid size-12 place-items-center rounded-full bg-white shadow-md"
          aria-label="마이"
          @click="openProfile"
        >
          <!-- 시안 export. width/height 는 떼고 viewBox 만 남겨 size-6 로 제어한다. -->
          <svg viewBox="0 0 20 19" class="size-6" fill="none" aria-hidden="true">
            <path
              d="M10 11.9189C11.3433 11.9189 12.6863 12.0816 14.0293 12.4053C15.2046 12.6886 16.3792 13.0947 17.5527 13.625L18.0547 13.8594C18.6204 14.1372 19.0688 14.5268 19.4014 15.0283C19.7347 15.5286 19.9003 16.0639 19.9004 16.6357V17.5098C19.9003 17.9055 19.7669 18.2335 19.502 18.501C19.2368 18.7666 18.9103 18.9004 18.5156 18.9004H1.48535C1.09093 18.9003 0.76411 18.7665 0.499023 18.5C0.233894 18.2333 0.100505 17.9048 0.0996094 17.5088V16.6357C0.0996838 16.0639 0.265247 15.5286 0.597656 15.0283C0.931215 14.5268 1.3787 14.1362 1.94336 13.8584C3.28575 13.2113 4.6289 12.728 5.97168 12.4053C7.31373 12.0816 8.65668 11.9189 10 11.9189ZM10 0.0996094C11.1601 0.100564 12.1455 0.510295 12.9619 1.33008C13.7783 2.14985 14.1855 3.14088 14.1855 4.30859C14.1855 5.47622 13.7783 6.46738 12.9619 7.28711C12.1455 8.10676 11.16 8.51565 10 8.5166C8.84002 8.51754 7.85447 8.10868 7.03809 7.28711C6.22163 6.4654 5.8145 5.47426 5.81445 4.30859C5.81445 3.14287 6.22162 2.15182 7.03809 1.33008C7.8545 0.508406 8.83995 0.0986734 10 0.0996094Z"
              fill="#777777"
              stroke="white"
              stroke-width="0.2"
            />
          </svg>
        </button>
        <button
          type="button"
          data-tour="saved"
          class="grid size-12 place-items-center rounded-full bg-white shadow-md"
          aria-label="관심 매물"
          @click="openFavorites"
        >
          <svg viewBox="0 0 17 15" class="size-6" fill="none" aria-hidden="true">
            <path
              d="M7.89484 14.7579C8.0653 14.9249 8.27839 15 8.5 15C8.72161 15 8.9347 14.9165 9.10516 14.7579L15.4977 8.4962C17.5008 6.53421 17.5008 3.44511 15.4977 1.47477C13.5374 -0.428777 10.5115 -0.487219 8.5 1.3078C6.48847 -0.487219 3.46265 -0.437126 1.50226 1.47477C-0.500752 3.44511 -0.500752 6.53421 1.50226 8.4962L7.89484 14.7579Z"
              fill="#777777"
            />
          </svg>
        </button>
      </div>

      <!-- 시안 39-1780. 모달이 떠 있는 동안엔 감춘다 — 시안 1번 프레임에는 진행 바가 없고,
           같은 말을 모달과 두 번 하게 된다. -->
      <RecommendationProgress v-if="shownJob && !started" :job="shownJob" data-tour="progress" />

      <!-- 지도에서 찍은 위치의 주소 확인 -->
      <div v-if="picked" class="rounded-xl bg-white p-4 shadow-lg">
        <p class="text-xs text-slate-500">선택한 위치</p>
        <p class="mt-0.5 font-semibold text-slate-900">
          {{ picking ? '주소를 확인하는 중…' : picked.address }}
        </p>
        <p v-if="!picking && !picked.isRoad" class="mt-1 text-sm text-red-500">
          도로명 주소가 없는 위치예요. 건물 쪽을 찍거나 검색으로 골라 주세요
        </p>
        <div class="mt-3 flex gap-2">
          <button
            type="button"
            class="h-11 flex-1 rounded-full border border-slate-200 text-sm font-semibold text-slate-600"
            @click="picked = null"
          >
            닫기
          </button>
          <button
            type="button"
            class="h-11 flex-1 rounded-full bg-brand-500 text-sm font-semibold text-white disabled:opacity-40"
            :disabled="picking || !picked.isRoad || !anchors.canAddMore"
            @click="addPickedAnchor"
          >
            {{ anchors.canAddMore ? '거점으로 추가' : `거점은 최대 ${MAX_ANCHORS}곳` }}
          </button>
        </div>
      </div>
    </div>

    <!--
      시안 39-2267 — 요청 직후. 기다리지 않고 나가도 된다는 걸 알려주는 게 핵심이다.
      시트 밖에 둔다: BaseBottomSheet 가 transform 을 쓰기 때문에 그 안의 fixed 는
      뷰포트가 아니라 시트를 기준으로 잡힌다.
    -->
    <div
      v-if="started"
      class="fixed inset-0 z-50 grid place-items-center bg-black/50"
      role="dialog"
      aria-modal="true"
    >
      <!-- 카드는 셸 폭 안에서 좌우 24px 을 남기고 꽉 찬다(시안 실측). fixed 라
           뷰포트 기준으로 잡히므로 max-w-shell 로 한 번 묶어줘야 데스크톱에서 안 퍼진다. -->
      <div class="w-full max-w-shell p-6">
        <div class="rounded-card bg-white p-5 text-center">
          <p class="text-lg font-bold text-slate-900">나만의 방정식이 생성됐어요 ✅</p>
          <p class="mt-5 leading-normal text-slate-500">
            AI가 조건에 딱 맞는 매물을 검색하고 있어요!<br />완료되면 바로 알려드릴게요 :)
          </p>
          <button
            type="button"
            class="mt-5 h-15 w-full rounded-full bg-brand-500 text-lg font-semibold text-white"
            @click="started = false"
          >
            확인
          </button>
        </div>
      </div>
    </div>

    <AnchorPickerLayer v-if="pickerOpen" @close="pickerOpen = false" />

    <!-- 첫 진입 안내. 뒤의 모달과 z-index 가 같아 DOM 순서상 이쪽이 위에 온다. -->
    <WelcomeOverlay v-if="!onboarded" @close="onboarded = true" />

    <BaseBottomSheet v-model="sheet.state" data-tour="sheet">
      <!--
        접힌 상태에서 탭을 누르면 시트도 함께 펼친다. 고른 탭의 내용이 접힌 채로 있으면
        눌러도 아무 일이 안 일어난 것처럼 보인다.
        v-model 이 아니라 클릭으로 받는 이유: 이미 선택된 탭을 다시 눌러도 펼쳐져야 하는데
        그때는 값이 안 바뀌어 update 가 오지 않는다.
      -->
      <div class="flex shrink-0 justify-center pb-3" @click="sheet.state = 'full'">
        <BaseSegmentedControl v-model="sheet.tab" :options="TABS" data-tour="tabs" />
      </div>

      <div v-if="sheet.tab === 'filters'" class="min-h-0 flex-1 overflow-y-auto">
        <FilterPanel :submitting="submitting" @submit="requestRecommendation" />
      </div>
      <!-- 목록은 자기 스크롤 영역을 직접 가진다(정렬 헤더는 고정되어야 한다). -->
      <ListingList v-else class="min-h-0 flex-1" :listings="listings" :loading="loading" />
    </BaseBottomSheet>
  </main>
</template>
