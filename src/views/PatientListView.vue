<script setup>
import { ref, reactive, computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  Search, Funnel, ChevronDown, ArrowUpDown, RotateCcw, X, SearchX, Dot, ChevronRight, Check,
} from 'lucide-vue-next'
import { patients } from '../mocks/patients.js'
import { dimensions } from '../mocks/analysis.js'
import { statusOf } from '../mocks/process.js'
import { daysFrom } from '../mocks/schedule.js'
import { visitsOf } from '../scheduleState.js'

/*
 * 전체 환자 리스트 (Figma 127:8671 / 빈 상태 130:2792).
 *
 * 이 화면은 우측 환자 패널을 쓰지 않는다 — 리스트가 그 일을 더 넓게 한다.
 * 라우트 meta.fullWidth가 셸에서 패널을 걷는다.
 *
 * 필터는 쿼리로 들고 온다. 환자 분석의 KPI를 누르면 그때 걸려 있던 칩이
 * 그대로 넘어온다. 그래야 '128명'을 누른 결과가 128명이다.
 */
const route = useRoute()
const router = useRouter()

const byId = Object.fromEntries(dimensions.map((d) => [d.id, d]))

/* 쿼리 → 필터. 값에 쉼표가 없으므로 쉼표로 잇는다 */
function readQuery() {
  return Object.fromEntries(
    dimensions.map((d) => {
      const raw = route.query[d.id]
      const values = raw ? String(raw).split(',') : []
      /* 없는 구간 이름이 들어와도 무시한다 */
      return [d.id, d.keys.filter((key) => values.includes(key))]
    }),
  )
}

const filters = reactive(readQuery())
const query = ref('')

/* 필터가 바뀌면 주소도 따라간다. 새로고침·뒤로가기가 같은 결과를 낸다 */
watch(filters, () => {
  const next = {}
  dimensions.forEach((d) => {
    if (filters[d.id].length) next[d.id] = filters[d.id].join(',')
  })
  router.replace({ query: next })
})

const chips = computed(() =>
  dimensions
    .filter((d) => filters[d.id].length)
    .map((d) => ({
      id: d.id,
      label: d.chipLabel(d.keys.filter((key) => filters[d.id].includes(key))),
    })),
)

/* 진단은 동반이환일 때 무엇을 겹친 것인지 펼쳐 쓴다 */
const conditionLabel = (patient) =>
  patient.condition === '동반이환' ? byId.condition.note : patient.condition

const SORTS = [
  { key: 'name', label: '가나다순' },
  { key: 'recent', label: '최근 진료순' },
]
const sortKey = ref('name')
const sortLabel = computed(() => SORTS.find((s) => s.key === sortKey.value).label)

/* 열어 둔 팝오버. 한 번에 하나만 열린다 */
const openPanel = ref(null)

const matched = computed(() => {
  const text = query.value.trim()
  return patients.filter((patient) => {
    const passesFilters = dimensions.every((d) => {
      const picked = filters[d.id]
      return !picked.length || picked.includes(d.value(patient))
    })
    if (!passesFilters) return false
    if (!text) return true
    return patient.name.includes(text) || conditionLabel(patient).includes(text)
  })
})

const rows = computed(() => {
  const list = matched.value.map((patient) => {
    const { last, next } = visitsOf(patient.name)
    return { patient, last, next }
  })
  if (sortKey.value === 'name') {
    return [...list].sort((a, b) => a.patient.name.localeCompare(b.patient.name, 'ko'))
  }
  /* 진료가 없는 사람은 뒤로 보낸다 — 최근이라 할 것이 없다 */
  return [...list].sort((a, b) => {
    if (a.last === b.last) return 0
    if (!a.last) return 1
    if (!b.last) return -1
    return a.last < b.last ? 1 : -1
  })
})

/* 오늘 지나간 진료가 '0일 전'으로 읽히면 안 된다 — 작업 목록과 같은 상대 표기를 쓴다 */
function lastLabel(key) {
  if (!key) return null
  const diff = daysFrom(key)
  if (diff === 0) return '오늘'
  if (diff === -1) return '어제'
  return `${-diff}일 전`
}
/* 다음 일정은 월/일만 쓴다. 요일까지 넣으면 열이 좁다 */
const nextLabel = (key) => (key ? key.split('-').slice(1).map(Number).join('/') : null)

function toggle(dimensionId, key) {
  const picked = filters[dimensionId]
  const at = picked.indexOf(key)
  if (at === -1) picked.push(key)
  else picked.splice(at, 1)
}

function clearDimension(dimensionId) {
  filters[dimensionId] = []
}

function reset() {
  dimensions.forEach((d) => { filters[d.id] = [] })
}
</script>

<template>
  <div class="relative flex flex-1 flex-col gap-2 py-4">
    <!-- 검색 · 필터 · 정렬 -->
    <section class="flex shrink-0 flex-col gap-2 rounded-lg border border-border-default bg-surface-card px-6 py-4">
      <div class="flex items-center gap-3">
        <label class="flex h-11 flex-1 items-center gap-4 rounded-lg border border-border-default bg-surface-field px-3">
          <Search :size="20" class="shrink-0 text-text-disabled" />
          <input
            v-model="query"
            type="text"
            placeholder="이름 · 진단으로 검색"
            class="min-w-0 flex-1 bg-transparent text-body text-text-primary placeholder:text-text-disabled"
          />
        </label>

        <!-- 걸린 필터가 있으면 accent로 켜 둔다 — '선택 상태'에 해당한다 -->
        <button
          class="flex h-11 w-[92px] shrink-0 items-center gap-3 rounded-lg border border-border-default px-2 active:bg-surface-pressed"
          @click="openPanel = openPanel === 'filter' ? null : 'filter'"
        >
          <span
            class="flex shrink-0 items-center gap-1.5 whitespace-nowrap"
            :class="chips.length ? 'text-interactive-default' : 'text-text-secondary'"
          >
            <Funnel :size="16" class="shrink-0" />
            <span class="text-body">필터</span>
          </span>
          <ChevronDown :size="16" class="ml-auto shrink-0 text-text-secondary" />
        </button>

        <button
          class="flex h-11 w-[157px] shrink-0 items-center gap-3 rounded-lg border border-border-default px-2 active:bg-surface-pressed"
          @click="openPanel = openPanel === 'sort' ? null : 'sort'"
        >
          <span class="flex shrink-0 items-center gap-1.5 whitespace-nowrap text-text-secondary">
            <ArrowUpDown :size="16" class="shrink-0" />
            <span class="text-caption">정렬</span>
          </span>
          <span class="shrink-0 whitespace-nowrap text-body text-text-primary">{{ sortLabel }}</span>
          <ChevronDown :size="16" class="ml-auto shrink-0 text-text-secondary" />
        </button>
      </div>

      <!-- 적용된 필터 · 초기화 · 건수 -->
      <div class="flex items-center rounded-lg">
        <div class="flex flex-1 flex-wrap items-center gap-2">
          <button
            v-for="chip in chips"
            :key="chip.id"
            class="group flex h-11 items-center"
            @click="clearDimension(chip.id)"
          >
            <!-- 선택된 자리라 selected-bg-pressed로 눌러 accent를 잃지 않는다 -->
            <span class="flex h-8 items-center gap-1 rounded-2xl border border-border-selected bg-selected-bg py-2 pl-3 pr-2 text-label font-medium text-interactive-default group-active:bg-selected-bg-pressed">
              {{ chip.label }}
              <X :size="12" class="shrink-0" />
            </span>
          </button>
          <p v-if="!chips.length" class="text-label text-text-secondary">
            적용된 필터가 없습니다
          </p>
        </div>

        <div class="flex h-full shrink-0 items-center gap-3">
          <button
            class="flex h-11 items-center justify-center gap-1 py-2 text-label font-medium"
            :class="chips.length ? 'text-text-secondary active:text-text-primary' : 'text-text-disabled'"
            :disabled="!chips.length"
            @click="reset"
          >
            <span>초기화</span>
            <RotateCcw :size="12" class="shrink-0" />
          </button>
          <span class="h-[26px] w-px shrink-0 bg-border-default"></span>
          <span class="text-title-sm font-semibold text-text-primary">
            {{ matched.length }}<span class="text-body font-normal">명</span>
          </span>
        </div>
      </div>
    </section>

    <!-- 결과 -->
    <section
      v-if="rows.length"
      class="flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-border-default bg-surface-card px-6 py-2"
    >
      <!-- 헤더는 행과 같은 열 폭·간격을 쓴다. 어긋나면 표로 읽히지 않는다 -->
      <div class="flex shrink-0 gap-2.5 border-b border-border-strong pb-1 pr-11 text-body text-text-secondary">
        <span class="w-[245px] shrink-0">환자</span>
        <span class="w-[197px] shrink-0">프로세스 상태</span>
        <span class="w-[194px] shrink-0">마지막 진료</span>
        <span class="min-w-0 flex-1">다음 일정</span>
      </div>

      <!--
        행에 라운드를 주면 border-t 구분선 끝이 휘어 표의 가로선이 끊겨 보인다.
        눌렀을 때만 둥글어진다 (Figma의 pressed 변형)
      -->
      <div class="min-h-0 flex-1 overflow-y-auto">
        <button
          v-for="(row, i) in rows"
          :key="row.patient.id"
          class="flex h-14 w-full items-center gap-2.5 px-0.5 py-1 text-left active:rounded-lg active:bg-surface-pressed"
          :class="i > 0 ? 'border-t border-border-default' : ''"
          @click="router.push({ path: `/patients/detail/${row.patient.id}` })"
        >
          <span class="flex h-11 w-[245px] shrink-0 flex-col justify-center gap-0.5">
            <span class="truncate text-title-sm font-semibold text-text-primary">
              {{ row.patient.name }}
            </span>
            <span class="truncate text-label font-medium text-text-secondary">
              {{ conditionLabel(row.patient) }}
              <span class="text-caption font-normal">
                &nbsp;{{ row.patient.age }}·{{ row.patient.sex }}
              </span>
            </span>
          </span>

          <span class="flex w-[197px] shrink-0 flex-col text-caption text-text-secondary">
            <span class="truncate">{{ row.patient.process }}</span>
            <span class="truncate">{{ statusOf(row.patient) }}</span>
          </span>

          <span class="w-[194px] shrink-0 truncate text-caption text-text-secondary">
            {{ lastLabel(row.last) ?? '없음' }}
          </span>

          <!-- 다음 일정이 없는 것은 짚어준다. 잡아야 할 것이 남았다는 뜻이다 -->
          <span class="flex min-w-0 flex-1 items-center text-caption">
            <template v-if="row.next">
              <span class="truncate pl-2 text-text-secondary">{{ nextLabel(row.next) }}</span>
            </template>
            <template v-else>
              <Dot :size="24" class="-ml-1.5 shrink-0 text-indicator-warning" />
              <span class="truncate text-indicator-warning">없음</span>
            </template>
          </span>

          <span class="flex size-11 shrink-0 items-center justify-center text-text-disabled">
            <ChevronRight :size="24" />
          </span>
        </button>
      </div>
    </section>

    <!-- 조건에 맞는 환자가 없을 때 -->
    <section
      v-else
      class="flex min-h-0 flex-1 flex-col items-center justify-center gap-2 rounded-lg border border-border-default bg-surface-card px-6 py-2"
    >
      <SearchX :size="24" class="shrink-0 text-text-secondary" />
      <div class="flex flex-col items-center gap-2 pb-1">
        <p class="text-title-sm font-semibold text-text-primary">조건에 맞는 환자가 없습니다</p>
        <p class="text-body text-text-secondary">
          <template v-if="chips.length">
            {{ chips.map((c) => c.label).join(' · ') }} — {{ chips.length }}개 필터가 적용되어 있습니다
          </template>
          <template v-else>검색어와 맞는 환자가 없습니다</template>
        </p>
      </div>
      <button
        v-if="chips.length"
        class="flex h-11 items-center justify-center gap-1 rounded-lg border border-border-default p-2 text-label font-medium text-text-secondary active:bg-surface-pressed"
        @click="reset"
      >
        <span>초기화</span>
        <RotateCcw :size="12" class="shrink-0" />
      </button>
    </section>

    <!--
      필터 · 정렬 팝오버. 가벼운 콘텐츠라 외부 탭으로 닫고 history entry를 만들지 않는다.
      Figma에 열린 상태가 없어 초안이다.
    -->
    <div v-if="openPanel" class="fixed inset-0 z-40" @click="openPanel = null"></div>

    <div
      v-if="openPanel === 'sort'"
      class="absolute right-0 top-[68px] z-40 w-[157px] overflow-hidden rounded-lg border border-border-default bg-surface-card"
    >
      <button
        v-for="(option, i) in SORTS"
        :key="option.key"
        class="flex h-11 w-full items-center justify-between gap-2 px-3 text-left text-label"
        :class="[
          i > 0 ? 'border-t border-border-subtle' : '',
          sortKey === option.key
            ? 'bg-selected-bg active:bg-selected-bg-pressed'
            : 'active:bg-surface-pressed',
        ]"
        @click="sortKey = option.key; openPanel = null"
      >
        <span>{{ option.label }}</span>
        <Check v-if="sortKey === option.key" :size="16" class="shrink-0 text-text-secondary" />
      </button>
    </div>

    <div
      v-if="openPanel === 'filter'"
      class="absolute right-[165px] top-[68px] z-40 flex max-h-[420px] w-[220px] flex-col overflow-y-auto rounded-lg border border-border-default bg-surface-card"
    >
      <!--
        축과 축 사이는 구분선과 표면 차이로 나눈다. 라벨만 두면 어디까지가
        같은 축인지 읽히지 않아 '프로세스 상태'와 '진단 유형'이 한 덩어리로 보인다.
        머리는 필드 표면(surface-field)이라 항목 행(카드 표면)과 갈린다.
      -->
      <div v-for="(dimension, di) in dimensions" :key="dimension.id">
        <p
          class="bg-surface-field px-3 py-1.5 text-count font-medium text-text-secondary"
          :class="di > 0 ? 'border-y border-border-default' : 'border-b border-border-default'"
        >
          {{ dimension.title }}
        </p>
        <button
          v-for="key in dimension.keys"
          :key="key"
          class="flex h-11 w-full items-center justify-between gap-2 px-3 text-left text-label"
          :class="filters[dimension.id].includes(key)
            ? 'bg-selected-bg active:bg-selected-bg-pressed'
            : 'active:bg-surface-pressed'"
          @click="toggle(dimension.id, key)"
        >
          <span>{{ key }}</span>
          <Check
            v-if="filters[dimension.id].includes(key)"
            :size="16"
            class="shrink-0 text-text-secondary"
          />
        </button>
      </div>
    </div>
  </div>
</template>
