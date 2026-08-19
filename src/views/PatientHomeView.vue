<script setup>
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { LogOut, FileText, ArrowRight, Check, User } from 'lucide-vue-next'
import { session, signOut, COUNSELOR } from '../authState.js'
import { patients } from '../mocks/patients.js'
import { processFor } from '../mocks/processLibrary.js'
import { surveys, responseOf, answeredCount } from '../mocks/surveys.js'
import { stepIndexOf, historyOf, keyMetricsOf, metricPoints, completionOf } from '../mocks/process.js'
import { sessionProgress } from '../mocks/progress.js'
import { findProgram } from '../mocks/programs.js'
import { visitsOf } from '../scheduleState.js'
import { dayLabel } from '../mocks/schedule.js'

/*
 * 환자용 첫 화면. **Figma 디자인이 없어 임의로 만든 것이다.**
 * 구버전 웹 화면의 구성(변화 그래프 · 설문 할 일 · 치유 기록)만 참고했고,
 * 값과 규칙은 전부 이 앱의 것을 따른다.
 *
 * **환자가 보는 화면이라 상담사용과 세 가지가 다르다.**
 *  1. 셸이 없다 — 좌측 네비로 다른 환자에게 갈 길이 있으면 안 된다
 *  2. 판정·진단 용어를 앞세우지 않는다. 점수와 등급은 상담사가 설명할 몫이고,
 *     여기서는 '무엇을 해야 하는지'와 '어디까지 왔는지'만 보여준다
 *  3. 할 일이 제일 크다. 이 화면에 온 이유가 대개 설문 작성이다
 *
 * 값은 전부 원본에서 읽는다 — 설문은 `surveys.js`, 회차는 수행 기록,
 * 이력은 `process.js`다. 환자용 목업을 따로 두면 상담사 화면과 갈라진다.
 */
const router = useRouter()

const patient = computed(() => patients.find((p) => p.id === session.patientId) ?? null)

const step = computed(() => (patient.value ? stepIndexOf(patient.value) : 0))

/*
 * 지금 작성할 설문. 감정평가 단계일 때만 있다 —
 * 다른 단계에서는 환자가 할 일이 없고, 없는 일을 지어내지 않는다.
 */
const phase = computed(() => (step.value >= 4 ? 'post' : 'pre'))

const surveyItems = computed(() => {
  if (!patient.value) return []
  if (step.value !== 1 && step.value !== 4) return []
  const process = processFor(patient.value)
  const source = (process?.steps ?? []).find((s) => s.name.includes(phase.value === 'post' ? '사후' : '사전'))
  return (source?.items ?? []).map((item) => {
    const survey = surveys[item.code]
    const response = responseOf(patient.value.id, phase.value, item.code)
    const answered = response ? answeredCount(survey, response.answers) : 0
    return {
      survey,
      done: !!response?.done,
      /* 손을 댔지만 끝내지 않은 것은 '이어서'다. 미착수와 구분돼야 이어서 연다 */
      partial: !response?.done && answered > 0,
      answered,
    }
  })
})

const remaining = computed(() => surveyItems.value.filter((row) => !row.done).length)

/* 할 일이 먼저다. 완료한 것이 위에 쌓이면 남은 설문이 아래로 밀린다 */
const surveyRows = computed(() =>
  [...surveyItems.value].sort((a, b) => Number(a.done) - Number(b.done)),
)

/*
 * 회차를 아직 지나지 않았으면 그릴 선이 없다. 그 자리에 **다음 만남**을 둔다 —
 * 환자가 이 화면에서 알고 싶은 다른 하나이고, 지어낸 값이 아니라 일정에서 온다.
 */
const nextVisit = computed(() => {
  const key = patient.value ? visitsOf(patient.value.name).next : null
  return key ? dayLabel(key) : null
})

function openSurvey(row) {
  router.push({ path: `/survey/${patient.value.id}/${phase.value}/${row.survey.code}` })
}

/* ── 변화 그래프 ────────────────────────────────────────────────
 * 상담사 화면의 핵심 지표와 **같은 함수**를 쓴다. 환자에게만 다른 값을
 * 보여주면 상담 자리에서 두 화면이 어긋난다.
 */
const sessions = computed(() => (patient.value ? sessionProgress(patient.value) : null))

const pointCount = computed(() => {
  if (step.value < 3) return 1
  if (step.value > 3) return metricPoints.length
  return Math.min(metricPoints.length, 1 + (sessions.value?.done ?? 0))
})

const metrics = computed(() => (patient.value ? keyMetricsOf(patient.value, pointCount.value) : []))
const picked = ref('depression')
const active = computed(() => metrics.value.find((m) => m.id === picked.value) ?? metrics.value[0] ?? null)
const series = computed(() => active.value?.series ?? [])

const PLOT = { width: 1000, height: 200 }
const SPAN = 100
const STEPS = 5

/* 눈금은 데이터를 가운데 두고 잡는다. 상담사 화면과 같은 규칙이다 */
const scale = computed(() => {
  if (!series.value.length) return []
  const middle = (Math.min(...series.value) + Math.max(...series.value)) / 2
  const unit = SPAN / STEPS
  const bottom = Math.round((middle - SPAN / 2) / unit) * unit
  return Array.from({ length: STEPS + 1 }, (_, i) => bottom + SPAN - i * unit)
})

const top = computed(() => scale.value[0] ?? 0)
const bottom = computed(() => scale.value[scale.value.length - 1] ?? 0)
const columnWidth = PLOT.width / metricPoints.length
const xAt = (i) => columnWidth * (i + 0.5)
const yAt = (v) => ((top.value - v) / (top.value - bottom.value)) * PLOT.height
const linePath = computed(() => series.value.map((v, i) => `${i ? 'L' : 'M'}${xAt(i)},${yAt(v)}`).join(' '))

/*
 * 그래프만 두면 선이 내려간 것이 좋은 일인지 알 수 없다.
 * **개선·악화로 판정하지 않는다** — 지표마다 좋아지는 방향이 다르고(회복탄력성은
 * 높을수록, 우울은 낮을수록) 해석은 상담사가 할 몫이다. 얼마나 달라졌는지만 적는다.
 */
const changeText = computed(() => {
  if (series.value.length < 2) return null
  const first = series.value[0]
  const last = series.value[series.value.length - 1]
  const gap = Math.abs(last - first)
  if (!gap) return `처음과 같습니다 · ${first}`
  return `처음 ${first} · 지금 ${last} (${gap}점 ${last > first ? '높아짐' : '낮아짐'})`
})

/* ── 치유 기록 ──────────────────────────────────────────────────
 * 프로세스 이력을 그대로 읽는다. 진행률은 진행 중일 때만 계산한다 —
 * 끝난 것은 100%이고, 지어낼 값이 없다.
 */
const program = computed(() => (patient.value ? findProgram(patient.value.programId) : null))

const records = computed(() => {
  if (!patient.value) return []
  const name = (id) => `${patient.value.condition}_${id}`
  return [...historyOf(patient.value)].reverse().map((entry) => {
    const running = entry.state === '진행 중'
    return {
      id: entry.id,
      /* 제목은 언제나 프로세스 이름이다. 진행 중만 프로그램명으로 바뀌면 규칙이 섞인다 */
      title: name(entry.id),
      period: entry.period.trim(),
      state: running ? '진행 중' : '종료',
      running,
      /* 진행률은 지나온 단계 수다. 회차만 세면 처방 전 단계가 0%로 남는다 */
      percent: running ? Math.round((step.value / 6) * 100) : 100,
      detail: running
        ? [program.value?.name, sessions.value && `${sessions.value.total}회차 중 ${sessions.value.done}회 완료`]
          .filter(Boolean).join(' · ')
        : entry.entries[entry.entries.length - 1]?.value ?? '',
    }
  })
})

const ended = computed(() => (patient.value ? completionOf(patient.value) : null))

function leave() {
  signOut()
  router.replace('/login')
}
</script>

<template>
  <div v-if="patient" class="flex h-dvh flex-col gap-3 bg-surface-canvas p-6">
    <!-- 머리. 누구의 화면인지와 나가는 길만 둔다 -->
    <header class="flex h-14 shrink-0 items-center gap-3 rounded-2xl border border-border-default bg-surface-card px-4">
      <span class="flex size-9 shrink-0 items-center justify-center rounded-full border border-border-default bg-surface-field text-text-secondary">
        <User :size="20" />
      </span>
      <span class="flex min-w-0 flex-col">
        <span class="truncate text-body font-medium">{{ patient.name }} 님</span>
        <span class="truncate text-count text-text-secondary">
          담당 {{ COUNSELOR.name }} · {{ COUNSELOR.hospital }}
        </span>
      </span>
      <span class="flex-1"></span>
      <button
        class="flex h-11 shrink-0 items-center gap-1 rounded-lg border border-border-default px-3 text-label font-medium text-text-secondary active:bg-surface-pressed"
        @click="leave"
      >
        <LogOut :size="16" class="shrink-0" />로그아웃
      </button>
    </header>

    <div class="flex h-[292px] shrink-0 gap-3">
      <!-- 변화 그래프. 지표는 칩으로 바꾼다 -->
      <section class="flex min-w-0 flex-1 flex-col rounded-2xl border border-border-default bg-surface-card px-4 py-3">
        <div class="flex shrink-0 items-center gap-2">
          <h2 class="whitespace-nowrap text-title-sm font-semibold">마음의 변화</h2>
          <p class="min-w-0 flex-1 truncate text-count text-text-secondary">
            프로그램을 지나오며 달라진 정도입니다
          </p>
          <span v-if="sessions" class="shrink-0 text-label font-medium text-text-secondary">
            {{ sessions.total }}회차 중 {{ sessions.done }}회 완료
          </span>
        </div>

        <!-- 얼마나 달라졌는지. 좋고 나쁨은 적지 않는다 -->
        <div v-if="changeText" class="mt-1 shrink-0 text-label text-text-secondary">
          <span class="font-medium text-text-primary">{{ active?.label }}</span> {{ changeText }}
        </div>

        <div class="mt-2 flex shrink-0 flex-wrap gap-1">
          <button
            v-for="metric in metrics"
            :key="metric.id"
            class="flex h-8 items-center rounded-full border px-3 text-label"
            :class="picked === metric.id
              ? 'border-border-selected bg-selected-bg text-text-primary active:bg-selected-bg-pressed'
              : 'border-border-default text-text-secondary active:bg-surface-pressed'"
            @click="picked = metric.id"
          >
            {{ metric.label }}
          </button>
        </div>

        <!-- 아직 회차를 지나지 않았으면 그릴 선이 없다. 없는 값을 그리지 않는다 -->
        <div v-if="series.length < 2" class="flex min-h-0 flex-1 flex-col items-center justify-center gap-1">
          <p class="text-label text-text-secondary">회차를 진행하면 변화가 그려집니다</p>
          <p v-if="nextVisit" class="text-body font-medium">다음 만남 · {{ nextVisit }}</p>
          <p v-else class="text-count text-text-disabled">다음 일정은 상담사가 잡아 드립니다</p>
        </div>

        <template v-else>
          <div class="mt-2 flex min-h-0 flex-1 gap-1">
            <span class="flex w-[22px] shrink-0 flex-col justify-between py-[6px] text-right text-count text-border-default">
              <span v-for="mark in scale" :key="mark">{{ mark }}</span>
            </span>
            <div class="relative min-w-0 flex-1">
              <!-- 눈금과 점이 같은 좌표계를 쓴다 -->
              <svg class="size-full" :viewBox="`0 0 ${PLOT.width} ${PLOT.height}`" preserveAspectRatio="none">
                <line
                  v-for="mark in scale"
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
              <!-- 점과 값은 SVG 밖에 얹는다. 안에 그리면 원이 찌그러진다 -->
              <span
                v-for="(value, i) in series"
                :key="i"
                class="pointer-events-none absolute"
                :style="{ left: `${(xAt(i) / PLOT.width) * 100}%`, top: `${(yAt(value) / PLOT.height) * 100}%` }"
              >
                <span class="absolute size-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-text-primary"></span>
                <span class="absolute -translate-x-1/2 -translate-y-[18px] text-count">{{ value }}</span>
              </span>
            </div>
          </div>

          <div class="mt-1 flex shrink-0 pl-[26px]">
            <span
              v-for="(label, i) in metricPoints"
              :key="label"
              class="flex-1 text-center text-count"
              :class="series[i] !== undefined ? 'text-text-secondary' : 'text-text-disabled'"
            >
              {{ label }}
            </span>
          </div>
        </template>
      </section>

      <!-- 할 일. 이 화면에 온 이유가 대개 이것이라 오른쪽 위에 고정으로 둔다 -->
      <section class="flex w-[340px] shrink-0 flex-col rounded-2xl border border-border-default bg-surface-card px-4 py-3">
        <div class="flex shrink-0 items-center gap-2">
          <h2 class="whitespace-nowrap text-title-sm font-semibold">작성할 설문</h2>
          <span class="flex-1"></span>
          <span
            v-if="remaining"
            class="flex h-5 items-center rounded-full bg-surface-inverse px-2 text-count text-text-inverse"
          >
            {{ remaining }}개 남음
          </span>
          <span v-else class="text-count text-text-secondary">모두 완료</span>
        </div>

        <div v-if="surveyItems.length" class="mt-2 flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto">
          <div
            v-for="row in surveyRows"
            :key="row.survey.code"
            class="flex shrink-0 items-center gap-2 rounded-lg border border-border-default px-3 py-2"
            :class="row.done ? 'bg-surface-recessed' : ''"
          >
            <FileText :size="16" class="shrink-0 text-text-secondary" />
            <span class="flex min-w-0 flex-1 flex-col">
              <span class="truncate text-label font-medium">{{ row.survey.name }}</span>
              <span class="truncate text-count text-text-secondary">
                {{ row.survey.questions.length }}문항
                <template v-if="row.partial"> · {{ row.answered }}문항 작성함</template>
              </span>
            </span>
            <!-- 끝낸 설문은 다시 열지 않는다. 되돌리는 것은 상담사가 할 일이다 -->
            <span
              v-if="row.done"
              class="flex h-9 shrink-0 items-center gap-1 rounded-lg px-3 text-label text-text-secondary"
            >
              <Check :size="16" class="shrink-0" />완료
            </span>
            <button
              v-else
              class="flex h-11 shrink-0 items-center"
              @click="openSurvey(row)"
            >
              <span class="flex h-9 items-center gap-1 rounded-lg bg-surface-inverse px-3 text-label text-text-inverse active:bg-surface-inverse-pressed">
                {{ row.partial ? '이어서' : '시작' }}
                <ArrowRight :size="16" class="shrink-0" />
              </span>
            </button>
          </div>
        </div>

        <!-- 할 일이 없을 때. 빈 상자만 남으면 고장으로 읽힌다 -->
        <div v-else class="flex min-h-0 flex-1 flex-col items-center justify-center gap-1 text-center">
          <p class="text-label text-text-secondary">지금 작성할 설문이 없습니다</p>
          <p class="text-count text-text-disabled">필요할 때 상담사가 안내해 드립니다</p>
        </div>
      </section>
    </div>

    <!-- 치유 기록. 지나온 프로그램과 지금 하고 있는 것 -->
    <section class="flex min-h-0 flex-1 flex-col rounded-2xl border border-border-default bg-surface-card px-4 py-3">
      <div class="flex shrink-0 items-center gap-2">
        <h2 class="whitespace-nowrap text-title-sm font-semibold">치유 기록</h2>
        <span class="flex-1"></span>
        <span class="text-count text-text-secondary">총 {{ records.length }}개</span>
      </div>

      <div class="mt-2 flex min-h-0 flex-1 flex-col overflow-y-auto">
        <div
          v-for="record in records"
          :key="record.id"
          class="flex shrink-0 items-center gap-3 border-b border-border-subtle py-3 last:border-b-0"
        >
          <span class="flex w-[300px] shrink-0 flex-col">
            <span class="truncate text-label font-medium">{{ record.title }}</span>
            <span class="truncate text-count text-text-secondary">{{ record.detail }}</span>
          </span>
          <span class="w-[190px] shrink-0 text-count text-text-secondary">{{ record.period }}</span>
          <span
            class="flex h-6 w-[64px] shrink-0 items-center justify-center rounded-full text-count"
            :class="record.running
              ? 'bg-selected-bg text-interactive-default'
              : 'bg-surface-field text-text-secondary'"
          >
            {{ record.state }}
          </span>
          <span class="flex min-w-0 flex-1 items-center gap-2">
            <span class="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-chart-bar-track">
              <span class="block h-full rounded-full bg-chart-bar-strong" :style="{ width: `${record.percent}%` }"></span>
            </span>
            <span class="w-8 shrink-0 text-right text-count text-text-secondary">{{ record.percent }}%</span>
          </span>
        </div>
      </div>

      <p v-if="ended" class="shrink-0 border-t border-border-subtle pt-2 text-count text-text-secondary">
        {{ ended.at }}에 프로그램이 마무리되었습니다
      </p>
    </section>
  </div>

  <!-- 코드는 맞지만 명단에 없는 경우. 막다른 화면으로 두지 않는다 -->
  <div v-else class="flex h-dvh flex-col items-center justify-center gap-4 bg-surface-canvas p-6">
    <p class="text-body text-text-secondary">기록을 찾을 수 없습니다</p>
    <button
      class="flex h-11 items-center gap-1 rounded-lg border border-border-default px-3 text-body text-text-secondary active:bg-surface-pressed"
      @click="leave"
    >
      <LogOut :size="16" class="shrink-0" />로그아웃
    </button>
  </div>
</template>
