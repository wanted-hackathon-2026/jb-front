<script setup lang="ts">
import { computed, ref, useTemplateRef } from 'vue'
import { onClickOutside, onKeyStroke } from '@vueuse/core'

/** 가중치·이동시간용 단일 슬라이더. 값 스케일은 1~100 이 기본이다. */
const props = withDefaults(
  defineProps<{
    modelValue: number
    label: string
    icon?: string
    /** 물음표 아이콘을 눌렀을 때 뜨는 설명. 없으면 아이콘도 안 나온다. */
    hint?: string
    /**
     * 라벨과 값을 화면에서 감추고 트랙만 남긴다. 값을 다른 곳에 이미 적어둔 자리에 쓴다
     * (시안의 거점 이동시간: '최대 30분' 이 칩 줄 오른쪽에 있다).
     * 지우는 게 아니라 감추는 것이다 — 스크린리더는 여전히 label 로 이 슬라이더를 읽는다.
     */
    bare?: boolean
    min?: number
    max?: number
    step?: number
    valueText?: string
  }>(),
  { min: 1, max: 100, step: 1 },
)
const emit = defineEmits<{ 'update:modelValue': [number] }>()

const hintOpen = ref(false)
const hintRoot = useTemplateRef<HTMLElement>('hintRoot')

// 말풍선은 닫는 버튼이 없다 — 바깥을 누르거나 Esc 로 닫는다.
onClickOutside(hintRoot, () => (hintOpen.value = false))
onKeyStroke('Escape', () => (hintOpen.value = false))

const pct = computed(() => ((props.modelValue - props.min) / (props.max - props.min)) * 100)
const onInput = (e: Event) =>
  emit('update:modelValue', Number((e.target as HTMLInputElement).value))
</script>

<template>
  <div>
    <div class="flex items-center gap-3">
      <span
        v-if="!bare"
        class="flex w-24 shrink-0 items-center gap-1 text-sm font-medium text-slate-700"
      >
        <span v-if="icon" aria-hidden="true">{{ icon }}</span
        ><!-- 라벨 칸에 최소 폭을 준다. 시안의 축 이름은 전부 두 글자라 물음표가 저절로
             한 줄에 서지만, 여기는 '조용함' 이 섞여 있어 그냥 두면 그 줄만 튀어나온다. -->
        <span class="min-w-11">{{ label }}</span>
        <!--
          설명 아이콘 + 아이콘 오른쪽에 붙는 말풍선.
          눌러야 뜻이 나오는 자리라 장식이 아니라 버튼이다 — 모바일에는 hover 가 없어서
          title 속성으로 두면 영영 읽을 수 없다.
          버튼과 말풍선을 한 래퍼에 담아, 래퍼 바깥을 누르면 닫히게 한다(버튼 자신은
          토글이라 바깥 판정에서 자연히 빠진다).
        -->
        <span v-if="hint" ref="hintRoot" class="relative flex shrink-0 items-center">
          <button
            type="button"
            class="grid size-6 place-items-center text-[#cecece]"
            :aria-label="`${label} 설명`"
            :aria-expanded="hintOpen"
            @click="hintOpen = !hintOpen"
          >
            <svg viewBox="0 0 10 10" class="size-3.5" fill="none" aria-hidden="true">
              <circle cx="5" cy="5" r="4.5" fill="white" stroke="currentColor" />
              <path
                d="M4.42483 5.95013C4.43215 5.09434 4.69589 4.83154 5.15743 4.56873C5.47245 4.38679 5.70688 4.15768 5.70688 3.82075C5.70688 3.4434 5.39186 3.20081 4.98893 3.20081C4.62263 3.20081 4.27098 3.41644 4.249 3.86792H3.33325C3.35523 2.96496 4.09516 2.5 4.99626 2.5C5.98527 2.5 6.66658 3.00539 6.66658 3.80728C6.66658 4.3531 6.36622 4.71024 5.89003 4.97305C5.46512 5.20889 5.2893 5.44474 5.28197 5.95013V6.01078H4.42483V5.95013ZM4.87904 7.5C4.56402 7.5 4.30761 7.26415 4.30761 6.97439C4.30761 6.69137 4.56402 6.45553 4.87904 6.45553C5.17941 6.45553 5.44314 6.69137 5.44314 6.97439C5.44314 7.26415 5.17941 7.5 4.87904 7.5Z"
                fill="currentColor"
              />
            </svg>
          </button>

          <span
            v-if="hintOpen"
            role="tooltip"
            class="absolute left-full top-1/2 z-30 ml-2 w-max max-w-[calc(min(100vw,var(--spacing-shell))-7.75rem)] -translate-y-1/2 text-pretty rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs font-normal leading-relaxed text-slate-600 shadow-lg"
          >
            <!--
              꼬리. 시트도 흰색이라 말풍선이 묻히지 않으려면 테두리가 필요한데,
              꼬리에도 같은 테두리를 이어 줘야 한다 — 왼쪽을 향하는 두 변에만 건다.
            -->
            <span
              class="absolute -left-[5px] top-1/2 size-2 -translate-y-1/2 rotate-45 border-b border-l border-slate-200 bg-white"
              aria-hidden="true"
            />
            {{ hint }}
          </span>
        </span>
      </span>
      <div class="weight relative h-6 flex-1">
        <div class="absolute inset-x-0 top-1/2 h-1 -translate-y-1/2 rounded-full bg-slate-200" />
        <div
          class="absolute left-0 top-1/2 h-1 -translate-y-1/2 rounded-full bg-brand-500"
          :style="{ width: `${pct}%` }"
        />
        <input
          type="range"
          :min="min"
          :max="max"
          :step="step"
          :value="modelValue"
          :aria-label="label"
          @input="onInput"
        />
      </div>
      <!-- 값 칸은 네 글자('상관없음')가 한 줄에 들어가는 폭이다. 320px 에서
           라벨 96 + 값 64 + 여백 24 를 빼면 트랙에 96px 이 남는다. -->
      <span v-if="!bare" class="w-16 shrink-0 text-right text-sm font-semibold text-slate-900">
        {{ valueText ?? modelValue }}
      </span>
    </div>
  </div>
</template>

<style scoped>
.weight input {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  margin: 0;
  background: none;
  appearance: none;
}
.weight input::-webkit-slider-thumb {
  appearance: none;
  width: 1.25rem;
  height: 1.25rem;
  border-radius: 9999px;
  background: #fff;
  border: 2px solid var(--color-brand-500);
  box-shadow: 0 1px 3px rgb(15 23 42 / 0.2);
  cursor: pointer;
}
.weight input::-moz-range-thumb {
  width: 1.25rem;
  height: 1.25rem;
  border: 2px solid var(--color-brand-500);
  border-radius: 9999px;
  background: #fff;
  cursor: pointer;
}
</style>
