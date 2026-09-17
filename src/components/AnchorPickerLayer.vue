<script setup lang="ts">
import BasePostcodeLayer from '@/components/BasePostcodeLayer.vue'
import { addressToCoord } from '@/lib/api/geocode'
import { resolveAddress } from '@/lib/postcode'
import { useAnchorsStore } from '@/stores/anchors'

/**
 * 우편번호 위젯으로 고른 주소를 **거점으로** 등록한다.
 * 위젯을 띄우는 일 자체는 BasePostcodeLayer 가 맡는다 — 여기는 거점 쪽 해석만 한다.
 */
const emit = defineEmits<{ close: [] }>()

const anchors = useAnchorsStore()

async function pick(data: PostcodeResult) {
  // 이름은 건물명을 쓴다. 주소를 그대로 칩에 넣으면 좁은 화면에서 한 줄을 다 먹고,
  // 자체 검색 화면(신논현역)과 표기가 어긋나 교체 시 화면이 흔들린다.
  const name = data.buildingName || data.address
  // 도로명이 비어 오는 경우가 있어 auto* 로 메운다. 지번으로 떨어지면 백엔드 지오코딩이
  // 실패하므로(VWorld type=road) 도로명을 최대한 살린다.
  const address = resolveAddress(data).roadAddress || data.address
  try {
    const { x, y } = await addressToCoord(address)
    anchors.add({ id: `postcode_${data.zonecode}_${name}`, name, address, x, y })
  } finally {
    // 무슨 일이 있어도 레이어는 닫는다 — 열린 채 멈추면 빠져나갈 길이 없다.
    emit('close')
  }
}
</script>

<template>
  <BasePostcodeLayer title="거점 검색" @select="pick" @close="emit('close')" />
</template>
