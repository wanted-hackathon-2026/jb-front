<script setup lang="ts">
/**
 * 목록 머리의 '총 N건 · 정렬' 줄.
 *
 * 세 목록이 같은 줄을 쓴다 — 지도의 주변 매물, 추천 결과, 마이페이지의 관심 매물.
 * 각자 그리면 '이상' 을 붙이는 규칙(아래 countLabel)이나 터치 표적 넓히는 여백처럼
 * 눈에 안 보이는 것들이 한 곳에서만 고쳐진다.
 *
 * 정렬이 없는 목록도 이 줄을 쓴다(options 를 비운다). 최근 본 매물처럼 **순서가 곧
 * 의미인** 목록은 줄 세우면 안 되지만 개수는 알아야 하고, 오른쪽 자리는 다른 조작에
 * 내준다(action 슬롯 — 거기 '전체 삭제'가 앉는다).
 */
import { computed, ref } from 'vue'
import BaseSkeleton from './BaseSkeleton.vue'
import ListingSortSheet from './ListingSortSheet.vue'
import { SORT_LABELS, type SortKey } from '@/lib/listing-sort'

const props = defineProps<{
  /** 몇 건인지. 서버가 전체 수를 알려주면 그 값, 아니면 목록 길이 — 부르는 쪽이 정한다. */
  count: number
  /**
   * 상한에서 잘린 목록인가.
   *
   * 지도 영역 조회도 찜 목록도 상한을 넘으면 잘라서 주는데 **잘렸다고 알려주는 필드가
   * 없다.** 그대로 '총 200건' 이라 적으면 딱 그만큼 있다는 거짓말이 되므로 '이상' 을 붙인다.
   */
  capped?: boolean
  /** 고를 수 있는 기준. 비우면 정렬 버튼을 두지 않는다. */
  options?: SortKey[]
  /** 로딩 중에도 같은 높이를 차지해야 한다 — 목록이 도착할 때 한 줄만큼 내려앉지 않게. */
  loading?: boolean
}>()

const emit = defineEmits<{ change: [] }>()

const sort = defineModel<SortKey>('sort', { default: 'score' })

/** 상한에 걸린 목록은 '총' 을 뗀다 — 그 영역의 전부가 아니라 받아온 만큼이다. */
const countLabel = computed(() => (props.capped ? `${props.count}건 이상` : `총 ${props.count}건`))

const picking = ref(false)
const trigger = ref<HTMLButtonElement | null>(null)

/** 시트를 닫을 땐 열었던 버튼으로 포커스를 돌려준다. */
function close() {
  picking.value = false
  trigger.value?.focus()
}

function choose(key: SortKey) {
  if (key !== sort.value) {
    sort.value = key
    // 순서가 통째로 바뀌므로 중간에 서 있으면 바뀐 1등을 못 본다. 스크롤을 가진 쪽이
    // 맨 위로 돌려놓아야 한다 — 이 줄은 목록 밖에 있어 그 영역을 모른다.
    emit('change')
  }
  close()
}
</script>

<template>
  <div class="flex shrink-0 items-center justify-between gap-2 px-5">
    <template v-if="loading">
      <BaseSkeleton class="h-4 w-16" />
      <span class="flex min-h-11 items-center"><BaseSkeleton class="h-4 w-20" /></span>
    </template>
    <template v-else>
      <p class="text-sm text-slate-500">{{ countLabel }}</p>

      <!-- 여백(-mr-2 px-2)으로 터치 표적을 44px 로 넓히고 오른쪽 정렬은 유지한다. -->
      <button
        v-if="options?.length"
        ref="trigger"
        data-tour="sort"
        type="button"
        class="-mr-2 flex min-h-11 items-center gap-1.5 px-2 text-sm text-slate-500"
        @click="picking = true"
      >
        <svg
          viewBox="0 0 20 20"
          class="size-[18px] shrink-0"
          fill="none"
          stroke="currentColor"
          stroke-width="1.6"
          aria-hidden="true"
        >
          <rect x="2.2" y="2.2" width="6.6" height="6.6" rx="1.4" />
          <rect x="2.2" y="11.2" width="6.6" height="6.6" rx="1.4" />
          <path
            d="M14 2.6v14.8M14 17.4l-2.6-2.8M14 17.4l2.6-2.8"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
        {{ SORT_LABELS[sort] }}
      </button>

      <!-- 정렬이 없는 목록의 오른쪽 자리. -->
      <slot name="action" />
    </template>

    <ListingSortSheet
      v-if="picking && options?.length"
      :options="options"
      :active="sort"
      @choose="choose"
      @close="close"
    />
  </div>
</template>
