<script setup lang="ts">
import ScoreDonut from '@/components/ui/ScoreDonut.vue'
import { formatCommute, formatPrice } from '@/lib/format'
import type { Listing } from '@/types/domain'

defineProps<{ listing: Listing }>()
</script>

<template>
  <article class="flex gap-3 py-4">
    <div class="relative size-20 shrink-0 overflow-hidden rounded-xl bg-slate-200">
      <button
        type="button"
        class="absolute bottom-1 left-1 grid size-7 place-items-center text-white/90"
        aria-label="관심 매물로 저장"
      >
        <svg viewBox="0 0 24 24" class="size-5" fill="none" stroke="currentColor" stroke-width="2">
          <path
            d="M12 20s-7-4.5-7-9a4 4 0 017-2.6A4 4 0 0119 11c0 4.5-7 9-7 9z"
            stroke-linejoin="round"
          />
        </svg>
      </button>
    </div>

    <div class="min-w-0 flex-1">
      <p class="truncate font-bold text-slate-900">
        {{ formatPrice(listing.dealType, listing.deposit, listing.rent) }}
      </p>
      <p class="truncate text-sm text-slate-600">
        {{ listing.roomType }} · {{ listing.areaPyeong }}평 · {{ listing.floor }}층
      </p>
      <p class="truncate text-sm text-slate-500">{{ listing.address }}</p>
      <p v-if="listing.commutes.length" class="truncate text-sm font-medium text-brand-600">
        {{
          formatCommute(
            listing.commutes[0].minutes,
            listing.commutes[0].transfers,
            listing.commutes[0].walkMinutes,
          )
        }}
      </p>
      <p v-else class="truncate text-sm font-medium text-brand-600">
        {{ listing.lines.join(' · ') }}
      </p>
    </div>

    <ScoreDonut v-if="listing.score !== null" :score="listing.score" />
  </article>
</template>
