<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import BasePostcodeLayer from '@/components/BasePostcodeLayer.vue'
import { ApiError } from '@/lib/api/http'
import { createProperty } from '@/lib/api/properties'
import { resolveAddress } from '@/lib/postcode'
import { useAuthStore } from '@/stores/auth'
import { ERROR_CODE, type LeaseType, type PropertyCreateRequest } from '@/types/backend'

/**
 * 매물 등록(관리자 전용).
 *
 * 서비스 동선에 얹힌 화면이 아니라 **데이터를 넣는 도구**다. 등록한 매물을 다시 읽는
 * 엔드포인트가 아직 없어서(`PropertyController` 에 POST 하나뿐) 앱의 목록·상세에는
 * 나타나지 않는다. 그래서 메뉴에 진입점을 두지 않고 주소로만 들어온다.
 */
const auth = useAuthStore()
const router = useRouter()

/**
 * 관리자가 아니면 되돌려 보낸다. `status` 가 확정된 뒤에만 판단하는 이유는
 * NicknamePage 와 같다 — 복원 중(idle·restoring)에는 로그인 여부를 아직 모른다.
 *
 * 이건 동선 정리일 뿐 보안 장치가 아니다. 서버는 JWT 가 아니라 **DB 의 현재 role** 을
 * 다시 읽어 판단하므로(PropertyAdminAuthorizationManager), 화면이 통과시켜도 403 이
 * 날 수 있다. 그래서 아래 submit 에서 403 을 따로 다룬다.
 */
watch(
  () => [auth.status, auth.user?.role] as const,
  ([status, role]) => {
    if (status === 'anonymous') router.replace({ name: 'map' })
    else if (status === 'authenticated' && role !== 'ADMIN') router.replace({ name: 'map' })
  },
  { immediate: true },
)

/* ── 주소 ─────────────────────────────────────────────────────────────── */

/**
 * 주소 네 칸은 **위젯이 준 값만** 쓴다. 손으로 고치게 두면 도로명이 아닌 값이 들어가
 * 서버 지오코딩이 실패하고(ADDRESS_NOT_GEOCODABLE), sggCode 는 숫자 5자리라 애초에
 * 사람이 외워서 넣을 값이 아니다.
 */
const picked = ref<PostcodeResult | null>(null)
const pickerOpen = ref(false)

/** 빈 도로명·지번을 auto* 로 메운 값. 화면과 전송이 같은 값을 본다. */
const address = computed(() => (picked.value ? resolveAddress(picked.value) : null))

function onPick(data: PostcodeResult) {
  picked.value = data
  // 건물명이 없는 주소가 있다. 그때는 비워 두고 직접 받는다 — name 은 필수다.
  if (data.buildingName) name.value = data.buildingName
  pickerOpen.value = false
  error.value = null
}

/* ── 입력 ─────────────────────────────────────────────────────────────── */

const name = ref('')
const propertyType = ref('')
const leaseType = ref<LeaseType>('MONTHLY')
const deposit = ref<number | null>(null)
const monthlyRent = ref<number | null>(null)
const exclusiveArea = ref<number | null>(null)
const floor = ref<number | null>(null)
const totalFloors = ref<number | null>(null)
const buildYear = ref<number | null>(null)
const direction = ref('')
const description = ref('')

const isJeonse = computed(() => leaseType.value === 'JEONSE')

// 전세는 월세가 0이어야 저장된다(@AssertTrue + DB CHECK). 화면에서 먼저 맞춰 둬야
// 사용자가 값을 넣어놓고 400 을 받는 일이 없다.
watch(isJeonse, (jeonse) => {
  if (jeonse) monthlyRent.value = 0
  else if (monthlyRent.value === 0) monthlyRent.value = null
})

const valid = computed(() => {
  // 도로명이 없으면 서버가 좌표를 못 찾는다 — 저장 자체가 불가능하다.
  if (!address.value?.roadAddress) return false
  // 지번(address)도 @NotBlank 다. 지하철역처럼 지번이 여럿인 주소는 jibunAddress 가
  // 비어 오는데(실측: 신논현역), 그때 autoJibunAddress 로 메워진다. 둘 다 비면 못 보낸다.
  if (!address.value.jibunAddress) return false
  if (!name.value.trim() || !propertyType.value.trim()) return false
  if (deposit.value === null || deposit.value < 0) return false
  if (monthlyRent.value === null || monthlyRent.value < 0) return false
  // 서버의 교차 검증과 같은 규칙이다.
  return isJeonse.value ? monthlyRent.value === 0 : monthlyRent.value > 0
})

/* ── 저장 ─────────────────────────────────────────────────────────────── */

const saving = ref(false)
const error = ref<string | null>(null)
/** 방금 저장된 매물. 좌표는 서버가 찾아 넣은 값이라 여기서만 확인할 수 있다. */
const saved = ref<{ id: string; latitude: number; longitude: number } | null>(null)

/** 빈 문자열을 null 로 접는다 — direction 은 공백만 있는 값을 서버가 거절한다. */
const orNull = (v: string) => (v.trim() ? v.trim() : null)

function reset() {
  picked.value = null
  name.value = ''
  propertyType.value = ''
  deposit.value = null
  monthlyRent.value = isJeonse.value ? 0 : null
  exclusiveArea.value = null
  floor.value = null
  totalFloors.value = null
  buildYear.value = null
  direction.value = ''
  description.value = ''
}

async function submit() {
  if (!valid.value || saving.value) return
  const resolved = address.value!
  saving.value = true
  error.value = null
  saved.value = null

  const body: PropertyCreateRequest = {
    name: name.value.trim(),
    address: resolved.jibunAddress,
    roadAddress: resolved.roadAddress,
    sggCode: picked.value!.sigunguCode,
    umdName: resolved.umdName,
    propertyType: propertyType.value.trim(),
    leaseType: leaseType.value,
    deposit: deposit.value!,
    monthlyRent: monthlyRent.value!,
    exclusiveArea: exclusiveArea.value,
    floor: floor.value,
    totalFloors: totalFloors.value,
    buildYear: buildYear.value,
    direction: orNull(direction.value),
    description: orNull(description.value),
  }

  try {
    const created = await createProperty(body)
    saved.value = { id: created.id, latitude: created.latitude, longitude: created.longitude }
    reset()
  } catch (e) {
    // 서버 detail 은 개발·운영 확인용이라 그대로 띄우지 않는다. code 로만 분기한다.
    error.value = messageOf(e)
  } finally {
    saving.value = false
  }
}

function messageOf(e: unknown): string {
  if (!(e instanceof ApiError)) return '저장하지 못했어요. 잠시 후 다시 시도해 주세요'
  if (e.code === ERROR_CODE.ADDRESS_NOT_GEOCODABLE) {
    return '이 주소의 좌표를 찾지 못했어요. 주소를 다시 선택해 주세요'
  }
  if (e.code === ERROR_CODE.GEOCODING_UNAVAILABLE) {
    return '주소 좌표 변환 서비스가 응답하지 않아요. 잠시 후 다시 시도해 주세요'
  }
  if (e.status === 403) return '이 계정에는 매물 등록 권한이 없어요'
  if (e.status === 400) return '입력한 값을 서버가 거절했어요. 금액·면적·층을 확인해 주세요'
  return '저장하지 못했어요. 잠시 후 다시 시도해 주세요'
}
</script>

<template>
  <main class="flex min-h-0 flex-1 flex-col bg-slate-50">
    <header
      class="safe-top flex shrink-0 items-center gap-1 border-b border-slate-100 bg-white px-2 py-3"
    >
      <button
        type="button"
        class="grid size-10 shrink-0 place-items-center text-slate-700"
        aria-label="뒤로"
        @click="router.back()"
      >
        <svg viewBox="0 0 24 24" class="size-6" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M15 5l-7 7 7 7" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
      </button>
      <h1 class="pl-1 font-bold text-slate-900">매물 등록</h1>
    </header>

    <form class="min-h-0 flex-1 overflow-y-auto px-4 pb-10" @submit.prevent="submit">
      <!-- 주소 -->
      <section class="mt-4 rounded-2xl bg-white p-4">
        <div class="flex items-center justify-between">
          <h2 class="font-bold text-slate-900">주소</h2>
          <button
            type="button"
            class="min-h-11 rounded-full border border-slate-200 px-4 text-sm font-semibold text-slate-700"
            @click="pickerOpen = true"
          >
            {{ picked ? '다시 검색' : '주소 검색' }}
          </button>
        </div>

        <dl v-if="picked" class="mt-3 flex flex-col gap-2 text-sm">
          <div class="flex gap-3">
            <dt class="w-16 shrink-0 text-slate-400">도로명</dt>
            <dd class="min-w-0 flex-1 text-slate-800">
              {{ address?.roadAddress || '이 주소에는 도로명이 없어요' }}
            </dd>
          </div>
          <div class="flex gap-3">
            <dt class="w-16 shrink-0 text-slate-400">지번</dt>
            <dd class="min-w-0 flex-1 text-slate-800">
              {{ address?.jibunAddress || '이 주소에는 지번이 없어요' }}
            </dd>
          </div>
          <div class="flex gap-3">
            <dt class="w-16 shrink-0 text-slate-400">법정동</dt>
            <dd class="min-w-0 flex-1 text-slate-800">
              {{ address?.umdName }}
              <span class="text-slate-400">· 시군구 {{ picked.sigunguCode }}</span>
            </dd>
          </div>
        </dl>
        <p v-else class="mt-3 text-sm text-slate-400">
          좌표는 서버가 도로명주소로 찾습니다. 주소를 검색해서 선택해 주세요.
        </p>
      </section>

      <!-- 기본 정보 -->
      <section class="mt-3 rounded-2xl bg-white p-4">
        <h2 class="font-bold text-slate-900">기본 정보</h2>

        <label class="mt-3 block text-sm text-slate-500" for="name">이름</label>
        <input
          id="name"
          v-model="name"
          type="text"
          maxlength="100"
          placeholder="건물명 또는 매물 이름"
          class="mt-1 h-12 w-full rounded-xl border border-slate-200 px-3 outline-none focus:border-brand-500"
        />

        <label class="mt-3 block text-sm text-slate-500" for="property-type">매물 종류</label>
        <input
          id="property-type"
          v-model="propertyType"
          type="text"
          maxlength="20"
          placeholder="예: 분리형 원룸"
          class="mt-1 h-12 w-full rounded-xl border border-slate-200 px-3 outline-none focus:border-brand-500"
        />

        <p class="mt-4 text-sm text-slate-500">거래 유형</p>
        <div class="mt-1 flex gap-2">
          <button
            v-for="opt in [
              { value: 'MONTHLY' as LeaseType, label: '월세' },
              { value: 'JEONSE' as LeaseType, label: '전세' },
            ]"
            :key="opt.value"
            type="button"
            class="h-11 flex-1 rounded-full border text-sm font-semibold"
            :class="
              leaseType === opt.value
                ? 'border-brand-500 bg-brand-500 text-white'
                : 'border-slate-200 bg-white text-slate-600'
            "
            :aria-pressed="leaseType === opt.value"
            @click="leaseType = opt.value"
          >
            {{ opt.label }}
          </button>
        </div>

        <div class="mt-3 flex gap-3">
          <div class="min-w-0 flex-1">
            <label class="block text-sm text-slate-500" for="deposit">보증금(만원)</label>
            <input
              id="deposit"
              v-model.number="deposit"
              type="number"
              min="0"
              inputmode="numeric"
              class="mt-1 h-12 w-full rounded-xl border border-slate-200 px-3 outline-none focus:border-brand-500"
            />
          </div>
          <div class="min-w-0 flex-1">
            <label class="block text-sm text-slate-500" for="rent">월세(만원)</label>
            <input
              id="rent"
              v-model.number="monthlyRent"
              type="number"
              min="0"
              inputmode="numeric"
              :disabled="isJeonse"
              class="mt-1 h-12 w-full rounded-xl border border-slate-200 px-3 outline-none focus:border-brand-500 disabled:bg-slate-50 disabled:text-slate-400"
            />
          </div>
        </div>
        <p v-if="isJeonse" class="mt-1 text-xs text-slate-400">전세는 월세가 0이어야 합니다.</p>
      </section>

      <!-- 선택 항목 -->
      <section class="mt-3 rounded-2xl bg-white p-4">
        <h2 class="font-bold text-slate-900">
          추가 정보 <span class="text-sm font-normal text-slate-400">선택</span>
        </h2>

        <div class="mt-3 flex gap-3">
          <div class="min-w-0 flex-1">
            <label class="block text-sm text-slate-500" for="area">전용면적(㎡)</label>
            <input
              id="area"
              v-model.number="exclusiveArea"
              type="number"
              min="0"
              step="0.01"
              inputmode="decimal"
              class="mt-1 h-12 w-full rounded-xl border border-slate-200 px-3 outline-none focus:border-brand-500"
            />
          </div>
          <div class="min-w-0 flex-1">
            <label class="block text-sm text-slate-500" for="build-year">준공년도</label>
            <input
              id="build-year"
              v-model.number="buildYear"
              type="number"
              min="1"
              inputmode="numeric"
              class="mt-1 h-12 w-full rounded-xl border border-slate-200 px-3 outline-none focus:border-brand-500"
            />
          </div>
        </div>

        <div class="mt-3 flex gap-3">
          <div class="min-w-0 flex-1">
            <label class="block text-sm text-slate-500" for="floor">층</label>
            <input
              id="floor"
              v-model.number="floor"
              type="number"
              inputmode="numeric"
              class="mt-1 h-12 w-full rounded-xl border border-slate-200 px-3 outline-none focus:border-brand-500"
            />
          </div>
          <div class="min-w-0 flex-1">
            <label class="block text-sm text-slate-500" for="total-floors">총 층수</label>
            <input
              id="total-floors"
              v-model.number="totalFloors"
              type="number"
              min="1"
              inputmode="numeric"
              class="mt-1 h-12 w-full rounded-xl border border-slate-200 px-3 outline-none focus:border-brand-500"
            />
          </div>
        </div>

        <label class="mt-3 block text-sm text-slate-500" for="direction">방향</label>
        <input
          id="direction"
          v-model="direction"
          type="text"
          maxlength="10"
          placeholder="예: 남향"
          class="mt-1 h-12 w-full rounded-xl border border-slate-200 px-3 outline-none focus:border-brand-500"
        />

        <label class="mt-3 block text-sm text-slate-500" for="description">설명</label>
        <textarea
          id="description"
          v-model="description"
          rows="3"
          class="mt-1 w-full rounded-xl border border-slate-200 p-3 outline-none focus:border-brand-500"
        />
      </section>

      <!-- 결과. 토스트가 아니라 폼 안에 남긴다 — 방금 넣은 좌표를 확인해야 한다. -->
      <p v-if="error" class="mt-3 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">
        {{ error }}
      </p>
      <p v-if="saved" class="mt-3 rounded-xl bg-brand-50 px-4 py-3 text-sm text-brand-500">
        등록됐어요 · 좌표 {{ saved.latitude.toFixed(5) }}, {{ saved.longitude.toFixed(5) }}
        <span class="block text-xs text-brand-500/70">{{ saved.id }}</span>
      </p>

      <button
        type="submit"
        class="mt-4 h-14 w-full rounded-full bg-brand-500 text-base font-bold text-white disabled:opacity-40"
        :disabled="!valid || saving"
      >
        {{ saving ? '등록 중…' : '등록' }}
      </button>
    </form>

    <BasePostcodeLayer
      v-if="pickerOpen"
      title="매물 주소 검색"
      @select="onPick"
      @close="pickerOpen = false"
    />
  </main>
</template>
