<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import ScoreDonut from '@/components/ui/ScoreDonut.vue'
import { getListing } from '@/lib/api/listings'
import { formatCommute, formatPrice } from '@/lib/format'
import type { Listing } from '@/types/domain'

const props = defineProps<{ id: string }>()

const router = useRouter()
const listing = ref<Listing | null>(null)
const failed = ref(false)
const saved = ref(false)

onMounted(async () => {
  try {
    listing.value = await getListing(props.id)
  } catch {
    failed.value = true
  }
})
</script>

<template>
  <main class="flex flex-1 flex-col bg-white">
    <!-- 히어로. 이미지가 아직 없어 회색 자리표시자로 둔다. -->
    <div class="relative aspect-[4/3] shrink-0 bg-slate-300">
      <button
        type="button"
        class="safe-top absolute left-1 top-1 grid size-11 place-items-center text-white"
        aria-label="뒤로"
        @click="router.back()"
      >
        <svg viewBox="0 0 24 24" class="size-6" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M15 5l-7 7 7 7" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
      </button>

      <button
        type="button"
        class="safe-top absolute right-1 top-1 grid size-11 place-items-center text-white"
        :aria-label="saved ? '관심 매물에서 빼기' : '관심 매물로 저장'"
        :aria-pressed="saved"
        @click="saved = !saved"
      >
        <svg
          viewBox="0 0 24 24"
          class="size-6"
          :fill="saved ? 'currentColor' : 'none'"
          stroke="currentColor"
          stroke-width="2"
        >
          <path
            d="M12 20s-7-4.5-7-9a4 4 0 017-2.6A4 4 0 0119 11c0 4.5-7 9-7 9z"
            stroke-linejoin="round"
          />
        </svg>
      </button>

      <!-- 이미지 매수 인디케이터. 실제 이미지가 붙으면 "1 / N" 이 들어갈 자리다. -->
      <span class="absolute bottom-3 right-3 h-6 w-11 rounded-full bg-slate-900/60" />
    </div>

    <p v-if="failed" class="px-5 py-16 text-center text-sm text-slate-400">매물을 찾을 수 없어요</p>

    <p v-else-if="!listing" class="px-5 py-16 text-center text-sm text-slate-400">불러오는 중…</p>

    <template v-else>
      <section class="flex items-start gap-4 px-5 py-5">
        <div class="min-w-0 flex-1">
          <h1 class="font-bold text-slate-900">
            {{ formatPrice(listing.dealType, listing.deposit, listing.rent) }}
          </h1>
          <p class="text-sm text-slate-600">
            {{ listing.roomType }} · {{ listing.areaPyeong }}평 · {{ listing.floor }}층
          </p>
          <p class="text-sm text-slate-400">{{ listing.address }}</p>
          <p v-if="listing.commutes.length" class="text-sm font-semibold text-brand-500">
            {{
              formatCommute(
                listing.commutes[0].minutes,
                listing.commutes[0].transfers,
                listing.commutes[0].walkMinutes,
              )
            }}
          </p>
          <p v-else class="text-sm font-semibold text-brand-500">
            {{ listing.lines.join(' · ') }}
          </p>
        </div>

        <ScoreDonut v-if="listing.score !== null" :score="listing.score" :size="90" />
      </section>
    </template>
  </main>
</template>
