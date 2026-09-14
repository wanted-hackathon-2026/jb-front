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
  <main class="flex min-h-0 flex-1 flex-col overflow-y-auto bg-white">
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
        <svg viewBox="0 0 19 17" class="size-6" :fill="saved ? 'white' : 'none'" aria-hidden="true">
          <path
            d="M16.2374 8.69124L9.15777 15.65L2.0781 8.69124C1.61113 8.24026 1.24331 7.69821 0.997792 7.09922C0.752274 6.50023 0.634382 5.85727 0.651539 5.21084C0.668696 4.56441 0.820531 3.92851 1.09748 3.34318C1.37443 2.75784 1.7705 2.23576 2.26075 1.80981C2.75099 1.38386 3.32479 1.06326 3.94601 0.868202C4.56724 0.673146 5.22242 0.607859 5.87032 0.676451C6.51821 0.745044 7.14478 0.94603 7.71057 1.26675C8.27635 1.58748 8.76909 2.02099 9.15777 2.54C9.54813 2.02476 10.0414 1.59503 10.6068 1.27771C11.1722 0.960393 11.7975 0.76231 12.4436 0.695861C13.0897 0.629412 13.7426 0.696028 14.3616 0.891539C14.9805 1.08705 15.5521 1.40725 16.0407 1.83209C16.5292 2.25694 16.9241 2.77728 17.2007 3.36056C17.4772 3.94384 17.6295 4.5775 17.648 5.22187C17.6665 5.86625 17.5507 6.50747 17.308 7.10541C17.0653 7.70335 16.7008 8.24514 16.2374 8.69686"
            stroke="white"
            stroke-width="1.3"
            stroke-linecap="round"
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
