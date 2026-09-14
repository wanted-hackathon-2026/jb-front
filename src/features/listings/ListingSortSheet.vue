<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { SORT_LABELS, type SortKey } from '@/lib/listing-sort'

defineProps<{ options: SortKey[]; active: SortKey }>()
const emit = defineEmits<{ choose: [SortKey]; close: [] }>()

const panel = ref<HTMLElement | null>(null)

const onKey = (e: KeyboardEvent) => {
  if (e.key === 'Escape') emit('close')
}

onMounted(() => {
  document.addEventListener('keydown', onKey)
  panel.value?.focus()
})
onBeforeUnmount(() => document.removeEventListener('keydown', onKey))
</script>

<template>
  <!--
    body 로 뺀다. 이 시트는 BottomSheet(transform) 안쪽에서 열리는데, transform 을 쓰는
    조상이 있으면 그 안의 fixed 는 뷰포트가 아니라 조상을 기준으로 잡힌다.
  -->
  <Teleport to="body">
    <div class="fixed inset-0 z-50 bg-black/50" @click="emit('close')" />
    <div
      ref="panel"
      class="safe-bottom fixed inset-x-0 bottom-0 z-50 mx-auto max-w-shell rounded-t-card bg-white pb-2 outline-none"
      role="dialog"
      aria-modal="true"
      aria-label="정렬 기준"
      tabindex="-1"
    >
      <p class="px-5 pb-1 pt-4 text-sm font-semibold text-slate-500">정렬</p>
      <button
        v-for="key in options"
        :key="key"
        type="button"
        class="flex min-h-14 w-full items-center justify-between px-5 text-left"
        :class="key === active ? 'font-bold text-brand-700' : 'text-slate-700'"
        :aria-pressed="key === active"
        @click="emit('choose', key)"
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
