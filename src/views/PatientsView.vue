<script setup>
import { ref, computed } from 'vue'
import { X, RotateCcw, Mars, Venus, ChevronRight } from 'lucide-vue-next'
import {
  filterDefs, summary, processStatus, conditionTypes, conditionNote, ageGroups, genders,
} from '../mocks/analysis.js'

/*
 * 환자 분석 (Figma 127:9495).
 *
 * 차트의 accent는 '선택 상태'다 — 지금 걸려 있는 필터가 어느 구간을 잡았는지 보여준다.
 * 그래서 칩을 지우면 그 차원의 강조가 사라진다. 집계 숫자는 백엔드가 다시 내려줄 값이라
 * 지금은 그대로 남는다.
 */
const active = ref(filterDefs.map((f) => f.id))

const activeFilters = computed(() => filterDefs.filter((f) => active.value.includes(f.id)))

function removeFilter(id) {
  active.value = active.value.filter((f) => f !== id)
}

function reset() {
  active.value = []
}

/* 그 차원에 걸린 필터가 이 구간을 잡고 있는가 */
function isPicked(dimension, key) {
  return activeFilters.value.some((f) => f.dimension === dimension && f.keys.includes(key))
}

/*
 * 막대 길이. 최대값이 트랙의 90%를 차지하고 나머지는 그에 비례한다.
 * Figma 실측(프로세스 82→72 / 진단 23→20 / 연령 68→89)이 모두 이 규칙과 1px 안에서 맞는다.
 * 아주 작은 값이 선으로 뭉개지지 않게 최소 길이를 둔다 — 4명 막대가 그 경우다.
 */
const HEADROOM = 0.9
const MIN_RATIO = 0.08

function barRatio(count, list) {
  const max = Math.max(...list.map((d) => d.count))
  return Math.max(MIN_RATIO, (count / max) * HEADROOM)
}

/* 성별은 분포가 아니라 비율이다. 둘이 합쳐 트랙을 채운다 */
const genderTotal = computed(() => genders.reduce((sum, g) => sum + g.count, 0))
const femaleRatio = computed(
  () => genders.find((g) => g.key === '여').count / genderTotal.value,
)
</script>

<template>
  <div class="flex flex-1 flex-col justify-center gap-2 py-4">
    <!-- 필터 결과 수. 환자 목록으로 들어가는 자리다 (목록 화면 미구현) -->
    <button
      class="flex shrink-0 items-center gap-3 rounded-lg border border-border-default bg-surface-card py-4 pl-8 pr-3 text-left active:bg-surface-card-pressed"
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

    <!-- 적용된 필터. 탭하면 그 조건이 풀린다 -->
    <div class="flex shrink-0 items-center gap-2 rounded-lg border border-border-default bg-surface-card px-4 py-1">
      <div class="flex flex-1 flex-wrap items-center gap-2">
        <button
          v-for="filter in activeFilters"
          :key="filter.id"
          class="flex h-11 items-center"
          @click="removeFilter(filter.id)"
        >
          <span
            class="flex h-8 items-center gap-1 rounded-2xl border border-border-selected bg-selected-bg py-2 pl-3 pr-2 text-label font-medium text-interactive-default"
          >
            {{ filter.label }}
            <X :size="12" class="shrink-0" />
          </span>
        </button>
        <p v-if="!activeFilters.length" class="text-label text-text-secondary">
          적용된 필터가 없습니다
        </p>
      </div>
      <button
        class="flex h-11 shrink-0 items-center justify-center gap-1 py-2 text-label font-medium text-text-secondary active:text-text-primary"
        :disabled="!activeFilters.length"
        :class="activeFilters.length ? '' : 'text-text-disabled'"
        @click="reset"
      >
        <span>초기화</span>
        <RotateCcw :size="12" class="shrink-0" />
      </button>
    </div>

    <!-- 프로세스 상태 · 진단 유형 -->
    <div class="flex shrink-0 items-stretch gap-2">
      <section class="flex flex-1 flex-col rounded-lg border border-border-default bg-surface-card px-3 py-2">
        <h2 class="text-title-sm font-semibold text-text-primary">프로세스 상태</h2>
        <div
          v-for="row in processStatus"
          :key="row.key"
          class="flex h-11 items-center justify-center gap-3"
        >
          <span
            class="w-[50px] shrink-0 text-label font-medium"
            :class="isPicked('process', row.key) ? 'text-text-primary' : 'text-text-secondary'"
          >
            {{ row.key }}
          </span>
          <!--
            트랙은 두 카드에서 같은 폭이어야 한다. flex로 늘리면 라벨 폭(50 vs 60)만큼
            트랙이 갈라져 카드 사이의 막대 길이를 비교할 수 없게 된다.
          -->
          <span class="h-4 w-[125px] shrink-0 overflow-hidden rounded-sm bg-chart-bar-track">
            <span
              class="block h-full rounded-sm"
              :class="isPicked('process', row.key) ? 'bg-chart-bar-selected' : 'bg-chart-bar-default'"
              :style="{ width: `${barRatio(row.count, processStatus) * 100}%` }"
            ></span>
          </span>
          <span
            class="w-[35px] shrink-0 text-right text-label font-medium"
            :class="isPicked('process', row.key) ? 'text-text-primary' : 'text-text-secondary'"
          >
            {{ row.count }}명
          </span>
        </div>
      </section>

      <section class="flex flex-1 flex-col rounded-lg border border-border-default bg-surface-card px-3 py-2">
        <h2 class="text-title-sm font-semibold text-text-primary">진단 유형</h2>
        <div
          v-for="row in conditionTypes"
          :key="row.key"
          class="flex h-11 items-center justify-center gap-3"
        >
          <span
            class="w-[60px] shrink-0 text-label font-medium"
            :class="isPicked('condition', row.key) ? 'text-text-primary' : 'text-text-secondary'"
          >
            {{ row.key }}
          </span>
          <!--
            트랙은 두 카드에서 같은 폭이어야 한다. flex로 늘리면 라벨 폭(50 vs 60)만큼
            트랙이 갈라져 카드 사이의 막대 길이를 비교할 수 없게 된다.
          -->
          <span class="h-4 w-[125px] shrink-0 overflow-hidden rounded-sm bg-chart-bar-track">
            <span
              class="block h-full rounded-sm"
              :class="isPicked('condition', row.key) ? 'bg-chart-bar-selected' : 'bg-chart-bar-default'"
              :style="{ width: `${barRatio(row.count, conditionTypes) * 100}%` }"
            ></span>
          </span>
          <span
            class="w-[35px] shrink-0 text-right text-label font-medium"
            :class="isPicked('condition', row.key) ? 'text-text-primary' : 'text-text-secondary'"
          >
            {{ row.count }}명
          </span>
        </div>
        <!-- 동반이환이 무엇을 겹친 것인지 밝힌다 -->
        <p class="pl-0.5 text-caption text-text-disabled">{{ conditionNote }}</p>
      </section>
    </div>

    <!-- 연령대 · 성별 -->
    <div class="flex shrink-0 items-stretch gap-2">
      <section class="flex flex-1 flex-col gap-2 rounded-lg border border-border-default bg-surface-card px-3 py-2">
        <h2 class="text-title-sm font-semibold text-text-primary">연령대</h2>
        <div class="flex items-center justify-center gap-3 py-1">
          <div
            v-for="group in ageGroups"
            :key="group.key"
            class="flex w-11 shrink-0 flex-col items-center justify-center gap-1 p-1"
          >
            <span
              class="text-center text-label font-medium"
              :class="isPicked('age', group.key) ? 'text-text-primary' : 'text-text-secondary'"
            >
              {{ group.count }}명
            </span>
            <!-- 세로 막대는 아래에서 자란다 -->
            <span class="flex h-[99px] w-4 flex-col justify-end overflow-hidden rounded-sm bg-chart-bar-track">
              <span
                class="w-full rounded-sm"
                :class="isPicked('age', group.key) ? 'bg-chart-bar-selected' : 'bg-chart-bar-default'"
                :style="{ height: `${barRatio(group.count, ageGroups) * 100}%` }"
              ></span>
            </span>
            <span
              class="whitespace-nowrap text-center text-label font-medium"
              :class="isPicked('age', group.key) ? 'text-text-primary' : 'text-text-secondary'"
            >
              {{ group.key }}
            </span>
          </div>
        </div>
      </section>

      <section class="flex w-[142px] shrink-0 flex-col gap-3 rounded-lg border border-border-default bg-surface-card px-3 py-2">
        <h2 class="text-title-sm font-semibold text-text-primary">성별</h2>

        <div class="flex flex-col items-center gap-1">
          <div class="flex items-start justify-center gap-3">
            <span
              v-for="g in genders"
              :key="g.key"
              class="flex size-11 items-center justify-center rounded-full"
              :class="isPicked('gender', g.key)
                ? 'bg-chart-bar-selected text-text-on-accent'
                : 'bg-chart-bar-track text-text-secondary'"
            >
              <component :is="g.key === '남' ? Mars : Venus" :size="24" />
            </span>
          </div>
          <div class="flex gap-11 text-label font-medium">
            <span
              v-for="g in genders"
              :key="g.key"
              :class="isPicked('gender', g.key) ? 'text-text-primary' : 'text-text-secondary'"
            >
              {{ g.key }}
            </span>
          </div>
        </div>

        <!-- 분포가 아니라 비율이다. 둘이 합쳐 트랙을 채운다 -->
        <div class="flex flex-col items-center gap-px">
          <span class="flex h-8 w-full justify-end overflow-hidden rounded-sm bg-chart-bar-track">
            <span
              class="h-full rounded-sm"
              :class="isPicked('gender', '여') ? 'bg-chart-bar-selected' : 'bg-chart-bar-default'"
              :style="{ width: `${femaleRatio * 100}%` }"
            ></span>
          </span>
          <div class="flex w-full gap-7 text-caption">
            <span
              class="flex-1"
              :class="isPicked('gender', '남') ? 'text-text-primary' : 'text-text-secondary'"
            >
              {{ genders[0].count }}명
            </span>
            <span
              class="flex-1 text-right"
              :class="isPicked('gender', '여') ? 'text-text-primary' : 'text-text-secondary'"
            >
              {{ genders[1].count }}명
            </span>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>
