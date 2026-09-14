<script setup lang="ts">
/**
 * 카카오맵 JS SDK 연동 전 자리표시자.
 * SDK 를 붙일 때 이 컴포넌트만 교체하면 된다 — 클러스터 배지는 MarkerClusterer,
 * 점선 원은 kakao.maps.Circle 로 대응된다.
 */
defineProps<{ showRadius?: boolean }>()
const emit = defineEmits<{ pick: [{ x: number; y: number }] }>()

/** 키 없이도 핀 흐름을 확인할 수 있게, 클릭 위치를 서울 근방 좌표로 흉내낸다. */
function onClick(e: MouseEvent) {
  const r = (e.currentTarget as HTMLElement).getBoundingClientRect()
  emit('pick', {
    x: 127.0 + ((e.clientX - r.left) / r.width - 0.5) * 0.08,
    y: 37.52 - ((e.clientY - r.top) / r.height - 0.5) * 0.06,
  })
}

const clusters = [
  { n: 12, top: '12%', left: '62%' },
  { n: 10, top: '32%', left: '22%' },
  { n: 35, top: '48%', left: '54%' },
  { n: 8, top: '58%', left: '30%' },
  { n: 17, top: '72%', left: '66%' },
]
</script>

<template>
  <div class="absolute inset-0 bg-[#eef1ea]" @click="onClick">
    <!-- 지도 질감 대신 옅은 격자. 실제 타일이 아님을 숨기지 않는다. -->
    <div
      class="absolute inset-0 opacity-60"
      style="
        background-image:
          linear-gradient(to right, rgb(0 0 0 / 0.05) 1px, transparent 1px),
          linear-gradient(to bottom, rgb(0 0 0 / 0.05) 1px, transparent 1px);
        background-size: 48px 48px;
      "
    />

    <div
      v-if="showRadius"
      class="absolute left-1/2 top-1/2 size-56 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-dashed border-brand-500 bg-brand-500/10"
    />

    <span
      v-for="c in clusters"
      :key="c.n"
      class="absolute grid size-11 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-brand-400 text-sm font-bold text-white shadow"
      :style="{ top: c.top, left: c.left }"
    >
      {{ c.n }}
    </span>

    <p class="absolute bottom-3 left-1/2 -translate-x-1/2 text-xs text-slate-500">
      지도 SDK 연동 전 자리표시자
    </p>
  </div>
</template>
