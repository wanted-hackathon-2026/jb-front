<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { SORT_LABELS, type SortKey } from '@/lib/listing-sort'

defineProps<{ options: SortKey[]; active: SortKey }>()
const emit = defineEmits<{ choose: [SortKey]; close: [] }>()

const panel = ref<HTMLElement | null>(null)

/**
 * 열고 닫는 애니메이션은 이 컴포넌트가 직접 쥔다.
 *
 * 부모는 v-if 로 이 컴포넌트를 통째로 붙였다 떼는데, 그러면 사라지는 애니메이션이
 * 돌 틈이 없다(언마운트가 먼저다). 그래서 닫기 요청을 받으면 먼저 내려보내고,
 * transform 전환이 끝난 뒤에야 부모에게 알려 언마운트되게 한다.
 */
const shown = ref(false)
let pending: (() => void) | null = null

function dismiss(done: () => void) {
  if (pending) return // 연달아 누른 경우 — 첫 요청만 살린다
  pending = done
  shown.value = false
}

function onPanelTransitionEnd(e: TransitionEvent) {
  // 속성 이름으로 거르지 않는다 — Tailwind v4 의 translate-y-* 는 transform 이 아니라
  // CSS translate 속성으로 나가서 propertyName 이 'translate' 로 온다.
  if (e.target !== panel.value || shown.value) return
  pending?.()
  pending = null
}

const onKey = (e: KeyboardEvent) => {
  if (e.key === 'Escape') dismiss(() => emit('close'))
}

onMounted(() => {
  document.addEventListener('keydown', onKey)
  panel.value?.focus()
  // 시작 상태(화면 아래)가 한 프레임 그려진 뒤에 켜야 전환이 돈다.
  requestAnimationFrame(() => (shown.value = true))
})
onBeforeUnmount(() => document.removeEventListener('keydown', onKey))
</script>

<template>
  <!--
    body 로 뺀다. 이 시트는 BaseBottomSheet(transform) 안쪽에서 열리는데, transform 을 쓰는
    조상이 있으면 그 안의 fixed 는 뷰포트가 아니라 조상을 기준으로 잡힌다.
  -->
  <Teleport to="body">
    <div
      class="fixed inset-0 z-50 bg-black/50 transition-opacity duration-200 ease-out"
      :class="shown ? 'opacity-100' : 'opacity-0'"
      @click="dismiss(() => emit('close'))"
    />
    <div
      ref="panel"
      class="safe-bottom fixed inset-x-0 bottom-0 z-50 mx-auto max-w-shell rounded-t-card bg-white pb-2 outline-none transition-transform duration-300 ease-out"
      :class="shown ? 'translate-y-0' : 'translate-y-full'"
      role="dialog"
      aria-modal="true"
      aria-label="정렬 기준"
      tabindex="-1"
      @transitionend="onPanelTransitionEnd"
    >
      <p class="px-5 pb-1 pt-4 text-sm font-semibold text-slate-500">정렬</p>
      <button
        v-for="key in options"
        :key="key"
        type="button"
        class="flex min-h-14 w-full items-center justify-between px-5 text-left"
        :class="key === active ? 'font-bold text-brand-700' : 'text-slate-700'"
        :aria-pressed="key === active"
        @click="dismiss(() => emit('choose', key))"
      >
        {{ SORT_LABELS[key] }}
        <!-- 선택 상태를 색만으로 알리지 않는다 — 체크 표시를 같이 둔다. -->
        <svg
          v-if="key === active"
          viewBox="0 0 20 20"
          class="size-5"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          aria-hidden="true"
        >
          <path d="M4 10.5l4 4 8-9" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
      </button>
    </div>
  </Teleport>
</template>
