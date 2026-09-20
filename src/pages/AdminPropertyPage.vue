<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import BasePostcodeLayer from '@/components/BasePostcodeLayer.vue'
import { ApiError } from '@/lib/api/http'
import { createProperty, uploadPropertyImages } from '@/lib/api/properties'
import { resolveAddress } from '@/lib/postcode'
import { useAuthStore } from '@/stores/auth'
import {
  ERROR_CODE,
  PROPERTY_DIRECTIONS,
  PROPERTY_TYPES,
  PROPERTY_IMAGE_MAX_BYTES,
  PROPERTY_IMAGE_MAX_COUNT,
  PROPERTY_IMAGE_TYPES,
  type PropertyImage,
  type LeaseType,
  type PropertyCreateRequest,
} from '@/types/backend'

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
const supplyArea = ref<number | null>(null)
const bathroomCount = ref<number | null>(null)
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

/**
 * 숫자 칸 입력. **`v-model.number` 를 쓰지 않는다.**
 *
 * Vue 의 `.number` 는 `parseFloat` 가 NaN 이면 **원본 문자열을 그대로 둔다**
 * (`@vue/shared` 의 `looseToNumber`). 그래서 값을 지우면 `number | null` 이라고
 * 적어 둔 ref 에 `''` 가 앉는데, 타입이 거짓말을 하니 컴파일러도 못 잡는다.
 *
 * 그대로 보내면 서버가 400 이다 — 금액·층은 정수 토큰만 받는다
 * (PropertyIntegerDeserializer.java: 문자열이면 handleUnexpectedToken).
 * 빈 칸은 '값을 안 넣었다'는 뜻이므로 여기서 null 로 접는다.
 */
const numberFields = {
  deposit,
  monthlyRent,
  exclusiveArea,
  supplyArea,
  floor,
  bathroomCount,
  totalFloors,
  buildYear,
}

function onNumber(field: keyof typeof numberFields, e: Event) {
  const raw = (e.target as HTMLInputElement).value.trim()
  const n = Number(raw)
  numberFields[field].value = raw === '' || Number.isNaN(n) ? null : n
}

function reset() {
  picked.value = null
  name.value = ''
  propertyType.value = ''
  deposit.value = null
  monthlyRent.value = isJeonse.value ? 0 : null
  exclusiveArea.value = null
  supplyArea.value = null
  bathroomCount.value = null
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
    supplyArea: supplyArea.value,
    floor: floor.value,
    bathroomCount: bathroomCount.value,
    totalFloors: totalFloors.value,
    buildYear: buildYear.value,
    direction: orNull(direction.value),
    description: orNull(description.value),
  }

  try {
    const created = await createProperty(body)
    saved.value = { id: created.id, latitude: created.latitude, longitude: created.longitude }
    images.value = []
    imageError.value = null
    reset()
  } catch (e) {
    // 서버 detail 은 개발·운영 확인용이라 그대로 띄우지 않는다. code 로만 분기한다.
    error.value = messageOf(e)
  } finally {
    saving.value = false
  }
}

/* ── 사진 ─────────────────────────────────────────────────────────────── */

/**
 * 사진은 **등록이 끝난 뒤**에만 올릴 수 있다. 경로에 매물 id 가 들어가서
 * (`POST /api/properties/{id}/images`) 한 번에 보낼 방법이 없다.
 *
 * 그래서 이 화면은 두 걸음이다 — 등록하면 폼이 비워지고, 그 자리에 방금 만든 매물의
 * 사진 칸이 뜬다. 사진 없이 끝내도 되고(목록에서 썸네일이 비어 보일 뿐이다),
 * '새 매물 등록'을 누르면 다음 매물로 넘어간다.
 */
const images = ref<PropertyImage[]>([])
const uploading = ref(false)
const imageError = ref<string | null>(null)

const remaining = computed(() => PROPERTY_IMAGE_MAX_COUNT - images.value.length)

/** 서버가 거절할 게 뻔한 파일을 먼저 걸러 준다 — 왕복을 기다릴 이유가 없다. */
function rejectReason(files: File[]): string | null {
  if (!files.length) return null
  if (files.length > remaining.value) {
    return `사진은 매물당 ${PROPERTY_IMAGE_MAX_COUNT}장까지예요. ${remaining.value}장 더 올릴 수 있어요`
  }
  const big = files.find((f) => f.size > PROPERTY_IMAGE_MAX_BYTES)
  if (big) return `"${big.name}" 이 10MB 를 넘어요`
  const wrong = files.find((f) => !PROPERTY_IMAGE_TYPES.includes(f.type as never))
  if (wrong) return `"${wrong.name}" 은 JPEG·PNG·WEBP 가 아니에요`
  return null
}

async function onFiles(e: Event) {
  const input = e.target as HTMLInputElement
  const files = [...(input.files ?? [])]
  // 같은 파일을 다시 고를 수 있게 비운다 — 안 그러면 change 가 안 울린다.
  input.value = ''
  if (!files.length || !saved.value) return

  const reason = rejectReason(files)
  if (reason) {
    imageError.value = reason
    return
  }

  uploading.value = true
  imageError.value = null
  try {
    // 응답은 방금 올린 것만이 아니라 그 매물의 사진 전체다 — 그대로 덮으면 된다.
    images.value = (await uploadPropertyImages(saved.value.id, files)).images
  } catch (e) {
    imageError.value = imageMessageOf(e)
  } finally {
    uploading.value = false
  }
}

function imageMessageOf(e: unknown): string {
  if (!(e instanceof ApiError)) return '사진을 올리지 못했어요. 잠시 후 다시 시도해 주세요'
  if (e.code === ERROR_CODE.PROPERTY_IMAGE_TOO_LARGE) return '10MB 가 넘는 사진이 있어요'
  if (e.code === ERROR_CODE.UNSUPPORTED_PROPERTY_IMAGE_TYPE) {
    // 확장자만 바꾼 파일이 여기로 온다 — 서버는 내용을 본다.
    return 'JPEG·PNG·WEBP 만 올릴 수 있어요. 확장자만 바꾼 파일도 거절돼요'
  }
  if (e.code === ERROR_CODE.INVALID_PROPERTY_IMAGE) {
    return `사진은 매물당 ${PROPERTY_IMAGE_MAX_COUNT}장까지예요`
  }
  if (e.code === ERROR_CODE.PROPERTY_IMAGE_STORAGE_FAILED) {
    return '서버가 사진을 저장하지 못했어요. 잠시 후 다시 시도해 주세요'
  }
  if (e.code === ERROR_CODE.PROFILE_INCOMPLETE) return '닉네임을 먼저 설정해 주세요'
  if (e.status === 403) return '이 계정에는 매물 등록 권한이 없어요'
  return '사진을 올리지 못했어요. 잠시 후 다시 시도해 주세요'
}

/** 다음 매물로. 사진 칸을 접고 폼을 처음 상태로 되돌린다. */
function startNew() {
  saved.value = null
  images.value = []
  imageError.value = null
  error.value = null
}

function messageOf(e: unknown): string {
  if (!(e instanceof ApiError)) return '저장하지 못했어요. 잠시 후 다시 시도해 주세요'
  if (e.code === ERROR_CODE.ADDRESS_NOT_GEOCODABLE) {
    return '이 주소의 좌표를 찾지 못했어요. 주소를 다시 선택해 주세요'
  }
  if (e.code === ERROR_CODE.GEOCODING_UNAVAILABLE) {
    return '주소 좌표 변환 서비스가 응답하지 않아요. 잠시 후 다시 시도해 주세요'
  }
  // 403 이 두 가지다. 등록 경로가 allOf(닉네임, 관리자)로 묶여 있어서
  // (jb-backend e11ac1a), 권한은 있는데 닉네임만 없는 관리자도 여기로 온다.
  // 둘을 뭉뚱그리면 "권한이 없다"고 잘못 말하게 된다.
  if (e.code === ERROR_CODE.PROFILE_INCOMPLETE) return '닉네임을 먼저 설정해 주세요'
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
        class="grid size-11 shrink-0 place-items-center text-slate-700"
        aria-label="뒤로"
        @click="router.back()"
      >
        <svg viewBox="0 0 24 24" class="size-6" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M15 5l-7 7 7 7" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
      </button>
      <h1 class="font-bold text-slate-900">매물 등록</h1>
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
        <!--
          **자유 입력이 아니다.** 추천이 이 값을 정확히 일치로 거르기 때문에
          (PropertyRepository 의 `p.propertyType in :propertyTypes`), '분리형 원룸'처럼
          적어 두면 '원룸'을 고른 사용자에게 이 매물이 영영 안 잡힌다.
          필터 화면과 같은 PROPERTY_TYPES 를 쓴다.
        -->
        <select
          id="property-type"
          v-model="propertyType"
          class="mt-1 h-12 w-full rounded-xl border border-slate-200 bg-white px-3 outline-none focus:border-brand-500"
        >
          <option value="" disabled>선택해 주세요</option>
          <option v-for="t in PROPERTY_TYPES" :key="t" :value="t">{{ t }}</option>
        </select>

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

          목록을 접어 두지 않고 펼친다. 여섯 개뿐이라 한눈에 들어오고, 바로 아래 거래
          유형과 같은 모양이라 고르는 방식이 화면 안에서 하나로 읽힌다 — 네이티브
          select 는 기기마다 다른 창을 띄워(iOS 는 휠) 이 화면에서만 딴 앱처럼 보였다.
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
              :value="deposit"
              @input="onNumber('deposit', $event)"
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
              :value="monthlyRent"
              @input="onNumber('monthlyRent', $event)"
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
              :value="exclusiveArea"
              @input="onNumber('exclusiveArea', $event)"
              type="number"
              min="0"
              step="0.01"
              inputmode="decimal"
              class="mt-1 h-12 w-full rounded-xl border border-slate-200 px-3 outline-none focus:border-brand-500"
            />
          </div>
          <div class="min-w-0 flex-1">
            <label class="block text-sm text-slate-500" for="supply-area">공급면적(㎡)</label>
            <input
              id="supply-area"
              :value="supplyArea"
              @input="onNumber('supplyArea', $event)"
              type="number"
              min="0"
              step="0.01"
              inputmode="decimal"
              class="mt-1 h-12 w-full rounded-xl border border-slate-200 px-3 outline-none focus:border-brand-500"
            />
          </div>
        </div>

        <div class="mt-3 flex gap-3">
          <div class="min-w-0 flex-1">
            <label class="block text-sm text-slate-500" for="build-year">준공년도</label>
            <input
              id="build-year"
              :value="buildYear"
              @input="onNumber('buildYear', $event)"
              type="number"
              min="1"
              inputmode="numeric"
              class="mt-1 h-12 w-full rounded-xl border border-slate-200 px-3 outline-none focus:border-brand-500"
            />
          </div>
          <div class="min-w-0 flex-1">
            <label class="block text-sm text-slate-500" for="bathroom-count">욕실 수</label>
            <input
              id="bathroom-count"
              :value="bathroomCount"
              @input="onNumber('bathroomCount', $event)"
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
              :value="floor"
              @input="onNumber('floor', $event)"
              type="number"
              inputmode="numeric"
              class="mt-1 h-12 w-full rounded-xl border border-slate-200 px-3 outline-none focus:border-brand-500"
            />
          </div>
          <div class="min-w-0 flex-1">
            <label class="block text-sm text-slate-500" for="total-floors">총 층수</label>
            <input
              id="total-floors"
              :value="totalFloors"
              @input="onNumber('totalFloors', $event)"
              type="number"
              min="1"
              inputmode="numeric"
              class="mt-1 h-12 w-full rounded-xl border border-slate-200 px-3 outline-none focus:border-brand-500"
            />
          </div>
        </div>

        <!--
          자유 입력이 아니라 목록이다. 서버가 아는 여덟 개를 벗어나면 채광 추정이
          조용히 빠지는데(등록은 201 로 성공한다) 화면에는 아무 표시도 나지 않는다.
        -->
        <p class="mt-5 text-sm text-slate-500">방향</p>
        <div class="mt-3 flex flex-wrap gap-2" role="group" aria-label="방향">
          <!--
            '선택 안 함' 을 칩으로 남긴다. 고른 칩을 다시 눌러 끄는 방식은 화면에
            드러나지 않아, 잘못 고른 사람이 되돌릴 길을 못 찾는다.
          -->
          <button
            v-for="d in ['', ...PROPERTY_DIRECTIONS]"
            :key="d"
            type="button"
            class="h-11 rounded-full border px-4 text-sm font-semibold transition-colors"
            :class="
              direction === d
                ? 'border-brand-500 bg-brand-500 text-white'
                : 'border-slate-200 bg-white text-slate-600'
            "
            :aria-pressed="direction === d"
            @click="direction = d"
          >
            {{ d || '선택 안 함' }}
          </button>
        </div>
        <p class="mt-3 text-xs text-slate-400">
          방향·층·총 층수가 <strong class="font-semibold">모두</strong> 있어야 채광이 계산돼요.
        </p>

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
      <!--
        등록이 끝나야 사진을 올릴 수 있다 — 경로에 매물 id 가 들어가서(POST
        /api/properties/{id}/images) 한 번에 보낼 방법이 없다. 그래서 두 걸음이다.
      -->
      <section v-if="saved" class="mt-3 rounded-2xl bg-brand-50 p-4">
        <p class="text-sm font-semibold text-brand-500">
          등록됐어요 · 좌표 {{ saved.latitude.toFixed(5) }}, {{ saved.longitude.toFixed(5) }}
        </p>
        <p class="mt-0.5 text-xs break-all text-brand-500/70">{{ saved.id }}</p>

        <h2 class="mt-4 text-sm font-bold text-slate-900">
          사진
          <span class="font-normal text-slate-400">
            {{ images.length }} / {{ PROPERTY_IMAGE_MAX_COUNT }}
          </span>
        </h2>

        <!-- 올린 순서가 곧 표시 순서다. 첫 장이 목록의 대표 사진이 된다. -->
        <ul v-if="images.length" class="mt-2 flex flex-wrap gap-2">
          <li v-for="(img, i) in images" :key="img.id" class="relative">
            <img
              :src="img.url"
              :alt="`사진 ${i + 1}`"
              class="size-20 rounded-xl bg-slate-200 object-cover"
            />
            <span
              v-if="i === 0"
              class="absolute bottom-1 left-1 rounded-full bg-slate-900/70 px-1.5 text-[11px] text-white"
            >
              대표
            </span>
          </li>
        </ul>

        <!--
          input 을 label 로 감싼다 — 파일 선택 버튼의 기본 모양은 브라우저마다 달라서
          터치 타깃(44px)을 맞출 수 없다.
        -->
        <label
          class="mt-3 flex h-12 w-full items-center justify-center rounded-full border border-brand-500/40 bg-white text-sm font-semibold text-brand-500"
          :class="(uploading || remaining <= 0) && 'pointer-events-none opacity-40'"
        >
          <input
            type="file"
            class="sr-only"
            multiple
            :accept="PROPERTY_IMAGE_TYPES.join(',')"
            :disabled="uploading || remaining <= 0"
            @change="onFiles"
          />
          {{
            uploading
              ? '올리는 중…'
              : remaining <= 0
                ? '사진을 다 채웠어요'
                : `사진 추가 (${remaining}장 더)`
          }}
        </label>

        <p v-if="imageError" class="mt-2 text-sm text-red-500">{{ imageError }}</p>
        <p v-else class="mt-2 text-xs text-slate-400">
          JPEG · PNG · WEBP, 한 장에 10MB 까지. 사진 없이 끝내도 돼요.
        </p>

        <button
          type="button"
          class="mt-3 h-11 w-full text-sm font-semibold text-slate-500"
          @click="startNew"
        >
          새 매물 등록
        </button>
      </section>

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
