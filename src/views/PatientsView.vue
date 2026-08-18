<script setup>
import { reactive, computed } from 'vue'
import { useRouter } from 'vue-router'
import { X, RotateCcw, Mars, Venus, ChevronRight } from 'lucide-vue-next'
import { patients } from '../mocks/patients.js'
import { chartDimensions as dimensions, initialFilters } from '../mocks/analysis.js'

/*
 * 환자 분석 (Figma 127:9495).
 *
 * 차트의 accent는 '선택 상태'다 — 지금 걸린 필터가 어느 구간을 잡았는지 보여준다.
 * 막대를 누르면 그 구간이 필터에 들고 나며, 칩을 누르면 그 축이 통째로 풀린다.
 *
 * 각 차트는 **자기 축을 뺀 나머지 필터**를 적용한 분포를 센다.
 * 그래야 강조된 구간의 합이 언제나 KPI와 같아진다 —
 * Figma에서 강조 구간이 전부 128명으로 떨어지던 것이 이 관계다.
 */
const filters = reactive(structuredClone(initialFilters))

const byId = Object.fromEntries(dimensions.map((d) => [d.id, d]))

function matches(patient, dimensionId) {
  const picked = filters[dimensionId]
  return !picked.length || picked.includes(byId[dimensionId].value(patient))
}

/* 자기 축만 빼고 거른 모집단 */
function population(exceptId) {
  return patients.filter((p) =>
    dimensions.every((d) => d.id === exceptId || matches(p, d.id)),
  )
}

/* 모든 축을 적용한 결과. KPI가 세는 것이다 */
const filtered = computed(() => patients.filter((p) => dimensions.every((d) => matches(p, d.id))))

const summary = computed(() => ({
  count: filtered.value.length,
  total: patients.length,
  percent: Math.round((filtered.value.length / patients.length) * 100),
}))

/*
 * 막대 길이. 최대값이 트랙의 90%를 차지하고 나머지는 그에 비례한다.
 * Figma 실측(프로세스 82→72 / 진단 23→20 / 연령 68→89)이 모두 이 규칙과 1px 안에서 맞는다.
 * 아주 작은 값이 선으로 뭉개지지 않게 최소 길이를 둔다.
 * 다만 0명은 최소 길이도 주지 않는다 — 없는 것을 있는 것처럼 그리면 안 된다.
 */
const HEADROOM = 0.9
const MIN_RATIO = 0.08

/* 축 하나의 구간별 집계 + 막대 비율 + 선택 여부 */
function seriesOf(dimensionId) {
  const dimension = byId[dimensionId]
  const pool = population(dimensionId)
  const rows = dimension.keys.map((key) => ({
    key,
    count: pool.filter((p) => dimension.value(p) === key).length,
    picked: filters[dimensionId].includes(key),
  }))
  const max = Math.max(...rows.map((r) => r.count))
  return rows.map((row) => ({
    ...row,
    ratio: row.count && max ? Math.max(MIN_RATIO, (row.count / max) * HEADROOM) : 0,
  }))
}

const series = computed(() =>
  Object.fromEntries(dimensions.map((d) => [d.id, seriesOf(d.id)])),
)

/* 성별만 분포가 아니라 비율이다. 둘이 합쳐 트랙을 채운다 */
const genderShare = computed(() => {
  const rows = series.value.gender
  const total = rows.reduce((sum, r) => sum + r.count, 0)
  return total ? rows[1].count / total : 0
})

/* 칩 라벨은 고른 순서가 아니라 축의 구간 순서를 따른다. 순서가 흔들리면 읽기 어렵다 */
const chips = computed(() =>
  dimensions
    .filter((d) => filters[d.id].length)
    .map((d) => ({
      id: d.id,
      label: d.chipLabel(d.keys.filter((key) => filters[d.id].includes(key))),
    })),
)

/* 막대 탭은 그 구간을 필터에 넣거나 뺀다 */
function toggle(dimensionId, key) {
  const picked = filters[dimensionId]
  const at = picked.indexOf(key)
  if (at === -1) picked.push(key)
  else picked.splice(at, 1)
}

/* 칩 탭은 그 축을 통째로 푼다 */
function clearDimension(dimensionId) {
  filters[dimensionId] = []
}

function reset() {
  dimensions.forEach((d) => { filters[d.id] = [] })
}

/*
 * KPI를 누르면 전체 환자 리스트로 간다. 지금 걸린 칩을 쿼리로 넘겨
 * '5명'을 누른 결과가 5명이 되게 한다.
 */
const router = useRouter()

function openList() {
  const query = {}
  dimensions.forEach((d) => {
    if (filters[d.id].length) query[d.id] = filters[d.id].join(',')
  })
  router.push({ path: '/patients/list', query })
}

const barClass = (picked) => (picked ? 'bg-chart-bar-selected' : 'bg-chart-bar-default')
const textClass = (picked) => (picked ? 'text-text-primary' : 'text-text-secondary')
</script>

<template>
  <div class="flex flex-1 flex-col justify-center gap-2 py-4">
    <!-- 필터 결과 수. 누르면 그 조건 그대로 전체 환자 리스트로 간다 -->
    <button
      class="flex shrink-0 items-center gap-3 rounded-lg border border-border-default bg-surface-card py-4 pl-8 pr-3 text-left active:bg-surface-pressed"
      @click="openList"
    >
      <span class="flex min-w-0 flex-1 flex-col">
        <span class="text-kpi font-bold text-text-primary">
          {{ summary.count }}<span class="text-title-sm font-semibold">명</span>
        </span>
        <span class="text-body text-text-primary">
          전체 {{ summary.total }}명 중 {{ summary.percent }}%
        </span>
      </span>
      <ChevronRight :size="24" class="shrink-0 self-start text-text-primary" />
    </button>

    <!-- 적용된 필터. 탭하면 그 축이 풀린다 -->
    <div class="flex shrink-0 items-center gap-2 rounded-lg border border-border-default bg-surface-card px-4 py-1">
      <div class="flex flex-1 flex-wrap items-center gap-2">
        <button
          v-for="chip in chips"
          :key="chip.id"
          class="flex h-11 items-center"
          @click="clearDimension(chip.id)"
        >
          <span
            class="flex h-8 items-center gap-1 rounded-2xl border border-border-selected bg-selected-bg py-2 pl-3 pr-2 text-label font-medium text-interactive-default"
          >
            {{ chip.label }}
            <X :size="12" class="shrink-0" />
          </span>
        </button>
        <p v-if="!chips.length" class="text-label text-text-secondary">
          적용된 필터가 없습니다
        </p>
      </div>
      <button
        class="flex h-11 shrink-0 items-center justify-center gap-1 py-2 text-label font-medium"
        :class="chips.length ? 'text-text-secondary active:text-text-primary' : 'text-text-disabled'"
        :disabled="!chips.length"
        @click="reset"
      >
        <span>초기화</span>
        <RotateCcw :size="12" class="shrink-0" />
      </button>
    </div>

    <!-- 프로세스 상태 · 진단 유형 -->
    <div class="flex shrink-0 items-stretch gap-2">
      <section
        v-for="dimension in [byId.process, byId.condition]"
        :key="dimension.id"
        class="flex flex-1 flex-col rounded-lg border border-border-default bg-surface-card px-3 py-2"
      >
        <h2 class="text-title-sm font-semibold text-text-primary">{{ dimension.title }}</h2>
        <!-- 행 전체가 탭 대상이다. 트랙의 빈 부분까지 포함한다 -->
        <button
          v-for="row in series[dimension.id]"
          :key="row.key"
          class="flex h-11 items-center justify-center gap-3 rounded-lg text-left active:bg-surface-pressed"
          @click="toggle(dimension.id, row.key)"
        >
          <span
            class="shrink-0 text-label font-medium"
            :class="textClass(row.picked)"
            :style="{ width: `${dimension.labelWidth}px` }"
          >
            {{ row.key }}
          </span>
          <!--
            트랙은 두 카드에서 같은 폭이어야 한다. flex로 늘리면 라벨 폭(50 vs 60)만큼
            트랙이 갈라져 카드 사이의 막대 길이를 비교할 수 없게 된다.
          -->
          <span class="h-4 w-[125px] shrink-0 overflow-hidden rounded-sm bg-chart-bar-track">
            <span
              class="block h-full rounded-sm transition-[width] duration-150 ease-standard"
              :class="barClass(row.picked)"
              :style="{ width: `${row.ratio * 100}%` }"
            ></span>
          </span>
          <span
            class="w-[35px] shrink-0 text-right text-label font-medium"
            :class="textClass(row.picked)"
          >
            {{ row.count }}명
          </span>
        </button>
        <p v-if="dimension.note" class="pl-0.5 text-caption text-text-disabled">
          {{ dimension.note }}
        </p>
      </section>
    </div>

    <!-- 연령대 · 성별 -->
    <div class="flex shrink-0 items-stretch gap-2">
      <section class="flex flex-1 flex-col gap-2 rounded-lg border border-border-default bg-surface-card px-3 py-2">
        <h2 class="text-title-sm font-semibold text-text-primary">연령대</h2>
        <div class="flex items-center justify-center gap-3 py-1">
          <!-- 세로 막대도 칸 전체가 탭 대상이다 -->
          <button
            v-for="row in series.age"
            :key="row.key"
            class="flex w-11 shrink-0 flex-col items-center justify-center gap-1 rounded-lg p-1 active:bg-surface-pressed"
            @click="toggle('age', row.key)"
          >
            <span class="text-center text-label font-medium" :class="textClass(row.picked)">
              {{ row.count }}명
            </span>
            <!-- 세로 막대는 아래에서 자란다 -->
            <span class="flex h-[99px] w-4 flex-col justify-end overflow-hidden rounded-sm bg-chart-bar-track">
              <span
                class="w-full rounded-sm transition-[height] duration-150 ease-standard"
                :class="barClass(row.picked)"
                :style="{ height: `${row.ratio * 100}%` }"
              ></span>
            </span>
            <span
              class="whitespace-nowrap text-center text-label font-medium"
              :class="textClass(row.picked)"
            >
              {{ row.key }}
            </span>
          </button>
        </div>
      </section>

      <section class="flex w-[142px] shrink-0 flex-col gap-3 rounded-lg border border-border-default bg-surface-card px-3 py-2">
        <h2 class="text-title-sm font-semibold text-text-primary">성별</h2>

        <!-- 칩과 막대가 모두 같은 필터를 건다 -->
        <div class="flex flex-col items-center gap-1">
          <div class="flex items-start justify-center gap-3">
            <button
              v-for="row in series.gender"
              :key="row.key"
              class="flex flex-col items-center gap-1"
              @click="toggle('gender', row.key)"
            >
              <span
                class="flex size-11 items-center justify-center rounded-full"
                :class="row.picked
                  ? 'bg-chart-bar-selected text-text-on-accent'
                  : 'bg-chart-bar-track text-text-secondary'"
              >
                <component :is="row.key === '남' ? Mars : Venus" :size="24" />
              </span>
              <span class="text-label font-medium" :class="textClass(row.picked)">
                {{ row.key }}
              </span>
            </button>
          </div>
        </div>

        <!-- 분포가 아니라 비율이다. 좌우가 각각 자기 성별을 건다 -->
        <div class="flex flex-col items-center gap-px">
          <span class="flex h-8 w-full overflow-hidden rounded-sm bg-chart-bar-track">
            <button
              class="h-full shrink-0"
              :style="{ width: `${(1 - genderShare) * 100}%` }"
              @click="toggle('gender', '남')"
            >
              <span
                v-if="series.gender[0].picked"
                class="block h-full rounded-sm bg-chart-bar-selected"
              ></span>
            </button>
            <button
              class="h-full flex-1"
              @click="toggle('gender', '여')"
            >
              <span
                class="block h-full rounded-sm"
                :class="series.gender[1].picked ? 'bg-chart-bar-selected' : 'bg-chart-bar-default'"
              ></span>
            </button>
          </span>
          <div class="flex w-full gap-7 text-caption">
            <span class="flex-1" :class="textClass(series.gender[0].picked)">
              {{ series.gender[0].count }}명
            </span>
            <span class="flex-1 text-right" :class="textClass(series.gender[1].picked)">
              {{ series.gender[1].count }}명
            </span>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>
