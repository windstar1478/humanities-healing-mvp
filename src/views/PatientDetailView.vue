<script setup>
import { ref, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  ChevronLeft, ChevronRight, ChevronDown, ChevronUp, Check, Play, User,
  ArrowUp, ArrowDown,
} from 'lucide-vue-next'
import { patients } from '../mocks/patients.js'
import {
  PROCESS_STEPS, stepIndexOf, SESSION_TOTAL, SESSION_CURRENT,
  processHistory, CURRENT_VERSION,
  keyMetrics, metricPoints, metricSeries, metricScale,
} from '../mocks/process.js'

/*
 * 환자 상세 (Figma 130:3152 · 148:5384).
 *
 * 전체 환자 리스트와 마찬가지로 우측 환자 패널을 쓰지 않는다 — 본문이 929다.
 * 상단(환자 정보 + 프로세스 스테퍼)은 탭과 무관하게 늘 같고, 하단 카드만 탭으로 바뀐다.
 */
const route = useRoute()
const router = useRouter()

const patient = computed(() => patients.find((p) => p.id === route.params.id) ?? null)

/*
 * 스테퍼 노드는 상태만 표시한다 — 완료는 체크, 진행 중은 accent fill,
 * 대기는 빈 점선 원. 순서 숫자는 쓰지 않는다.
 */
const currentStep = computed(() => (patient.value ? stepIndexOf(patient.value) : 0))

/* 프로세스가 끝났거나 중단됐으면 '진행 중'인 단계가 없다 */
const isRunning = computed(() => patient.value?.process === '진행 중')

/* 프로세스 이름은 진단을 따른다 — 게임과몰입 환자에게 PTSD_v1.0이 붙으면 안 된다 */
const processName = (version) => `${patient.value.condition}_${version}`

function stepState(index) {
  /* 아직 시작하지 않았으면 완료된 단계가 하나도 없다 */
  if (patient.value.process === '시작 전') return 'waiting'
  if (!isRunning.value) return index <= currentStep.value ? 'done' : 'waiting'
  if (index < currentStep.value) return 'done'
  return index === currentStep.value ? 'current' : 'waiting'
}

const stepStateLabel = { done: '완료', current: '진행 중', waiting: '대기' }

const TABS = [
  { id: 'history', label: '프로세스 히스토리' },
  { id: 'metrics', label: '핵심 지표' },
  { id: 'memo', label: '개인 메모' },
]
const tab = ref('history')

/* 진행 중인 이력만 펼쳐 둔다 */
const openHistory = ref(processHistory.find((h) => h.state === '진행 중')?.id ?? null)

/* ── 추이 그래프 ──────────────────────────────────────────────────
 * 값과 눈금이 한 좌표계를 쓰도록 SVG로 그린다.
 * 절대 좌표로 점을 찍으면 데이터가 바뀔 때 눈금과 어긋난다.
 */
const selectedMetric = ref(keyMetrics[0].id)
const activeMetric = computed(() => keyMetrics.find((m) => m.id === selectedMetric.value))
const series = computed(() => metricSeries[selectedMetric.value] ?? [])

const PLOT = { width: 1000, height: 200 }
const scaleTop = metricScale[0]
const scaleBottom = metricScale[metricScale.length - 1]

/* 열 중앙에 점을 찍는다. x축 라벨과 같은 칸을 쓴다 */
const columnWidth = PLOT.width / metricPoints.length
const xAt = (index) => columnWidth * (index + 0.5)
const yAt = (value) =>
  ((scaleTop - value) / (scaleTop - scaleBottom)) * PLOT.height

const linePath = computed(() =>
  series.value.map((v, i) => `${i ? 'L' : 'M'}${xAt(i)},${yAt(v)}`).join(' '),
)

function goBack() {
  router.push({ path: '/patients/list' })
}
</script>

<template>
  <div v-if="patient" class="flex flex-1 flex-col gap-2 py-4">
    <!-- 환자 정보 -->
    <section class="flex h-[66px] shrink-0 items-center gap-2 rounded-lg border border-border-default bg-surface-card px-3 py-2.5">
      <span class="flex size-10 shrink-0 items-center justify-center rounded-full bg-surface-container text-text-secondary">
        <User :size="24" />
      </span>
      <span class="flex min-w-0 flex-1 flex-col">
        <span class="truncate text-title-sm font-semibold text-text-primary">{{ patient.name }}</span>
        <span class="truncate text-label font-medium text-text-secondary">
          {{ patient.condition }}
          <span class="text-caption font-normal">&nbsp;{{ patient.age }}·{{ patient.sex }}</span>
        </span>
      </span>
      <button
        class="flex h-11 w-[81px] shrink-0 items-center justify-center gap-1 rounded-lg text-label font-medium text-text-secondary active:bg-surface-pressed"
        @click="goBack"
      >
        <ChevronLeft :size="12" class="shrink-0" />
        <span>전체 환자</span>
      </button>
    </section>

    <!-- 프로세스 스테퍼 -->
    <section class="flex shrink-0 flex-col gap-2.5 rounded-lg border border-border-default bg-surface-card px-3 py-2">
      <p class="flex items-center gap-1 text-text-secondary">
        <span class="text-caption">프로세스:</span>
        <span class="text-label font-medium">{{ processName(CURRENT_VERSION) }}</span>
      </p>

      <div class="flex justify-center">
        <div class="flex w-[666px] items-start">
          <template v-for="(step, i) in PROCESS_STEPS" :key="i">
            <!-- 연결선. 지나온 구간은 실선, 앞으로 갈 구간은 점선 -->
            <span
              v-if="i > 0"
              class="mt-6 w-6 shrink-0"
              :class="stepState(i) === 'waiting'
                ? 'border-t border-dashed border-text-disabled'
                : 'h-px bg-border-default'"
            ></span>

            <span class="flex w-[91px] shrink-0 flex-col items-center gap-2">
              <span
                class="flex size-12 items-center justify-center rounded-full"
                :class="{
                  'bg-surface-canvas text-text-primary': stepState(i) === 'done',
                  'bg-interactive-default text-text-on-accent': stepState(i) === 'current',
                  'border-2 border-dashed border-border-default': stepState(i) === 'waiting',
                }"
              >
                <Check v-if="stepState(i) === 'done'" :size="24" />
                <Play v-else-if="stepState(i) === 'current'" :size="20" fill="currentColor" />
              </span>

              <!-- 원과 라벨을 잇는 짧은 눈금. 대기 단계에서는 자리만 지킨다 -->
              <span
                class="h-px w-[25px]"
                :class="{
                  'bg-border-default': stepState(i) === 'done',
                  'bg-border-selected': stepState(i) === 'current',
                  'invisible': stepState(i) === 'waiting',
                }"
              ></span>

              <span class="flex flex-col items-center gap-1">
                <span
                  class="whitespace-nowrap px-2.5 text-label font-medium"
                  :class="{
                    'text-text-primary': stepState(i) === 'done',
                    'text-interactive-default': stepState(i) === 'current',
                    'text-text-disabled': stepState(i) === 'waiting',
                  }"
                >
                  {{ step }}
                </span>
                <span
                  class="whitespace-nowrap px-2.5 text-count"
                  :class="{
                    'text-text-secondary': stepState(i) === 'done',
                    'text-text-primary': stepState(i) === 'current',
                    'text-text-disabled': stepState(i) === 'waiting',
                  }"
                >
                  {{ stepStateLabel[stepState(i)] }}
                </span>
              </span>
            </span>
          </template>
        </div>
      </div>

      <div class="flex items-center border-t border-border-default pt-2">
        <span class="flex min-w-0 flex-1 flex-col gap-0.5">
          <span class="text-caption text-text-secondary">
            현재 단계: {{ Math.min(currentStep + 1, PROCESS_STEPS.length) }}/{{ PROCESS_STEPS.length }}
          </span>
          <span class="text-label font-medium text-text-primary">
            {{ PROCESS_STEPS[currentStep] }}
            <template v-if="isRunning && PROCESS_STEPS[currentStep] === '프로그램 수행'">
              — {{ SESSION_TOTAL }}회차 중 {{ SESSION_CURRENT }}회차 진행 중
            </template>
            <template v-else-if="!isRunning"> — {{ patient.process }}</template>
          </span>
        </span>
        <button
          v-if="isRunning"
          class="flex h-11 w-[170px] shrink-0 items-center justify-center gap-1 rounded-2xl text-body text-text-primary active:bg-surface-pressed"
        >
          <span class="truncate">{{ PROCESS_STEPS[currentStep] }} 이어하기</span>
          <ChevronRight :size="12" class="shrink-0" />
        </button>
      </div>
    </section>

    <!-- 탭 카드 -->
    <section class="flex min-h-0 flex-1 flex-col gap-2.5 overflow-hidden rounded-lg border border-border-default bg-surface-card px-3 py-2">
      <div class="flex shrink-0 items-center gap-4 border-b border-border-default">
        <button
          v-for="item in TABS"
          :key="item.id"
          class="flex h-11 items-center justify-center py-1 text-label"
          :class="tab === item.id
            ? 'border-b border-border-selected font-bold text-interactive-default'
            : 'font-medium text-text-secondary'"
          @click="tab = item.id"
        >
          {{ item.label }}
        </button>
      </div>

      <!-- 프로세스 히스토리 -->
      <div v-if="tab === 'history'" class="flex min-h-0 flex-1 flex-col gap-2.5 overflow-y-auto">
        <div v-for="entry in processHistory" :key="entry.id" class="shrink-0">
          <button
            class="flex h-11 w-full items-center gap-2.5 rounded-lg border px-2"
            :class="openHistory === entry.id
              ? 'border-border-default bg-selected-bg'
              : 'border-border-default bg-surface-field'"
            @click="openHistory = openHistory === entry.id ? null : entry.id"
          >
            <component
              :is="openHistory === entry.id ? ChevronUp : ChevronDown"
              :size="16"
              class="shrink-0 text-text-primary"
            />
            <span class="shrink-0 text-label font-medium text-text-primary">
              {{ processName(entry.id) }}
            </span>
            <span class="min-w-0 flex-1 text-left text-count text-text-secondary">{{ entry.state }}</span>
            <span
              class="shrink-0 text-count"
              :class="openHistory === entry.id ? 'text-text-primary' : 'text-text-secondary'"
            >
              {{ entry.period }}
            </span>
          </button>

          <div
            v-if="openHistory === entry.id"
            class="-mt-px flex gap-2.5 rounded-lg border border-border-default p-3"
          >
            <template v-if="entry.entries.length">
              <span class="flex shrink-0 flex-col justify-center gap-3 text-count text-text-secondary">
                <span v-for="line in entry.entries" :key="line.date">{{ line.date }}</span>
              </span>
              <span class="w-px shrink-0 bg-border-default"></span>
              <span class="flex flex-col justify-center gap-2.5 text-caption text-text-disabled">
                <span v-for="line in entry.entries" :key="line.date">
                  <template v-if="line.label">
                    {{ line.label }}:
                    <span :class="line.warning ? 'text-indicator-warning' : 'text-text-secondary'">
                      {{ line.version ? processName(line.version) : line.value }}
                    </span>
                  </template>
                  <template v-else>{{ line.text }}</template>
                </span>
              </span>
            </template>
            <p v-else class="text-caption text-text-disabled">기록이 없습니다</p>
          </div>
        </div>
      </div>

      <!-- 핵심 지표 -->
      <div v-else-if="tab === 'metrics'" class="flex min-h-0 flex-1 flex-col gap-2.5 overflow-y-auto">
        <!-- 카드를 누르면 아래 그래프가 그 지표로 바뀐다 -->
        <div class="flex shrink-0 items-end gap-3">
          <button
            v-for="metric in keyMetrics"
            :key="metric.id"
            class="flex flex-1 flex-col items-start gap-1 rounded-lg border px-2 py-0.5 text-left"
            :class="selectedMetric === metric.id
              ? 'border-border-selected bg-selected-bg'
              : 'border-border-default'"
            @click="selectedMetric = metric.id"
          >
            <span class="w-full truncate text-label font-medium text-text-secondary">{{ metric.label }}</span>
            <span class="flex w-full items-center gap-[5px]">
              <span class="text-title-lg font-semibold text-text-primary">{{ metric.value }}</span>
              <span class="flex items-center text-body text-text-secondary">
                <component
                  :is="metric.delta < 0 ? ArrowDown : ArrowUp"
                  :size="15"
                  class="shrink-0"
                />
                {{ Math.abs(metric.delta) }}
              </span>
            </span>
          </button>
        </div>

        <div class="flex min-h-0 shrink-0 flex-col gap-2.5 rounded-lg border border-border-default p-2">
          <p class="flex items-end gap-2.5 text-text-primary">
            <span class="text-title-sm font-semibold">{{ activeMetric.label }}</span>
            <span v-if="series.length" class="text-caption">
              사전 {{ series[0] }} / 현재 {{ series[series.length - 1] }}
            </span>
          </p>

          <!-- Figma에 추이가 있는 지표는 우울·불안 하나뿐이다 -->
          <p v-if="!series.length" class="py-10 text-center text-body text-text-disabled">
            추이 데이터가 없습니다
          </p>

          <!-- 눈금과 점이 같은 좌표계를 쓴다 -->
          <div v-if="series.length" class="flex gap-1">
            <span class="flex w-[18px] shrink-0 flex-col justify-between py-[6px] text-right text-count text-border-default">
              <span v-for="mark in metricScale" :key="mark">{{ mark }}</span>
            </span>
            <div class="relative h-[129px] min-w-0 flex-1">
              <svg
                class="size-full"
                :viewBox="`0 0 ${PLOT.width} ${PLOT.height}`"
                preserveAspectRatio="none"
              >
                <line
                  v-for="mark in metricScale"
                  :key="mark"
                  x1="0"
                  :y1="yAt(mark)"
                  :x2="PLOT.width"
                  :y2="yAt(mark)"
                  class="stroke-border-default"
                  vector-effect="non-scaling-stroke"
                  stroke-width="1"
                />
                <path
                  :d="linePath"
                  fill="none"
                  class="stroke-text-primary"
                  vector-effect="non-scaling-stroke"
                  stroke-width="1.5"
                />
              </svg>

              <!--
                점과 값은 SVG 밖에 얹는다. preserveAspectRatio="none"이라
                안에 그리면 원이 타원으로 찌그러지고 글자도 늘어난다.
              -->
              <span
                v-for="(value, i) in series"
                :key="i"
                class="pointer-events-none absolute"
                :style="{ left: `${(xAt(i) / PLOT.width) * 100}%`, top: `${(yAt(value) / PLOT.height) * 100}%` }"
              >
                <span class="absolute size-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-text-primary"></span>
                <span class="absolute -translate-x-1/2 -translate-y-[18px] text-count text-text-primary">
                  {{ value }}
                </span>
              </span>
            </div>
          </div>

          <!-- 값 라벨과 x축은 SVG 밖에 둔다. 세로로 늘려도 글자가 찌그러지지 않는다 -->
          <div v-if="series.length" class="flex pl-[22px]">
            <span
              v-for="(label, i) in metricPoints"
              :key="label"
              class="flex-1 text-center text-count"
              :class="series[i] !== undefined ? 'text-text-primary' : 'text-text-disabled'"
            >
              {{ label }}
            </span>
          </div>
        </div>
      </div>

      <!-- 개인 메모. Figma 디자인이 아직 없다 -->
      <div v-else class="flex min-h-0 flex-1 items-center justify-center">
        <p class="text-body text-text-disabled">개인 메모는 아직 준비 중입니다</p>
      </div>
    </section>
  </div>

  <div v-else class="flex flex-1 items-center justify-center">
    <p class="text-body text-text-secondary">환자를 찾을 수 없습니다</p>
  </div>
</template>
