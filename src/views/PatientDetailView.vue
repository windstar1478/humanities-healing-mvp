<script setup>
import { ref, computed, nextTick } from 'vue'
import { useRoute, useRouter, onBeforeRouteLeave } from 'vue-router'
import {
  ChevronLeft, ChevronRight, ChevronDown, ChevronUp, Check, Play, User,
  ArrowUp, ArrowDown, Plus, Search, Pencil, Trash2,
} from 'lucide-vue-next'
import { patients } from '../mocks/patients.js'
import {
  PROCESS_STEPS, stepIndexOf, stepStateOf, SESSION_TOTAL, SESSION_CURRENT,
  processHistory, historyOf, CURRENT_VERSION,
  keyMetricsOf, metricPoints, SCALE_SPAN, SCALE_STEPS,
} from '../mocks/process.js'
import { notesOf, addNote, updateNote, removeNote } from '../mocks/notes.js'
import UnsavedWarningModal from '../components/UnsavedWarningModal.vue'
import DeleteConfirmModal from '../components/DeleteConfirmModal.vue'
import InlineCallout from '../components/InlineCallout.vue'

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

/* 판정은 mocks/process.js 한 곳에 있다. 코어 프로세스의 컴팩트 스테퍼와 같은 규칙이다 */
function stepState(index) {
  return stepStateOf(patient.value, index)
}

/*
 * 프로세스로 들어가는 버튼. 화면의 주 행동이라 채움 버튼으로 둔다.
 *
 *   시작 전 → 프로세스 시작 (0단계)
 *   진행 중 → 이어하기 (지금 단계)
 *   중단    → 프로세스 재시작 (0단계). 중단된 프로세스는 이어붙이지 않고
 *             처음부터 다시 건다 — "할당 후 변경하려면 재시작해야 한다"는
 *             프로세스 시작의 확인 문구와 같은 이야기다
 *   완료    → 갈 곳이 없다. 비활성 버튼을 남기면 무엇을 채워야 열리는지 말할 수
 *             없고, 노드가 전부 완료라 되짚어 볼 길은 이미 열려 있다
 *
 * Figma 화면이 없는 초안이다.
 */
const processEntry = computed(() => {
  if (!patient.value) return null
  if (patient.value.process === '시작 전') return { label: '프로세스 시작', step: 0 }
  if (isRunning.value) return { label: '이어하기', step: currentStep.value }
  if (patient.value.process === '중단') return { label: '프로세스 재시작', step: 0 }
  return null
})

const stepStateLabel = { done: '완료', current: '진행 중', waiting: '대기' }

/*
 * 스테퍼 노드는 모두 누를 수 있다. 완료된 단계는 그 단계로 되돌아가 내용을 보는
 * 빠른 진입점이고, 진행 중 단계는 '이어하기'와 같은 곳으로 간다.
 *
 * 대기 단계만 갈 수 없다 — 아직 도달하지 않은 단계에 임의로 들어가면
 * 시스템 안정성이 깨진다(배치 유형에서 단계를 고르지 않는 것과 같은 이유).
 * 그래도 **누르면 이유를 말한다.** 아무 반응이 없으면 고장으로 읽힌다.
 */
const stepBlocked = ref(null)

function openStep(i, event) {
  if (stepState(i) === 'waiting') {
    const r = event.currentTarget.getBoundingClientRect()
    stepBlocked.value = {
      title: '아직 진행할 수 없는 단계입니다',
      detail: `${PROCESS_STEPS[currentStep.value]}을(를) 마치면 열립니다`,
      x: r.left + r.width / 2,
      y: r.bottom,
    }
    return
  }
  router.push({ path: `/process/${patient.value.id}/${i}` })
}

/* 콜아웃은 노드 아래에 붙이되 화면 밖으로 나가지 않게 가둔다 */
const stepBlockedStyle = computed(() => {
  if (!stepBlocked.value) return {}
  const WIDTH = 280
  const MARGIN = 24
  const { x, y } = stepBlocked.value
  return {
    left: `${Math.min(Math.max(MARGIN, x - WIDTH / 2), window.innerWidth - WIDTH - MARGIN)}px`,
    top: `${y + 8}px`,
  }
})

const TABS = [
  { id: 'history', label: '프로세스 히스토리' },
  { id: 'metrics', label: '핵심 지표' },
  { id: 'memo', label: '개인 메모' },
]
const tab = ref('history')

/* 이력은 환자별로 읽는다 — 재할당·재시작으로 닫힌 항목이 여기서 합쳐진다 */
const history = computed(() => (patient.value ? historyOf(patient.value) : processHistory))

/* 진행 중인 이력만 펼쳐 둔다 */
const openHistory = ref(processHistory.find((h) => h.state === '진행 중')?.id ?? null)

/* ── 추이 그래프 ──────────────────────────────────────────────────
 * 값과 눈금이 한 좌표계를 쓰도록 SVG로 그린다.
 * 절대 좌표로 점을 찍으면 데이터가 바뀔 때 눈금과 어긋난다.
 */
/*
 * 지표는 환자별로 만든다(mocks/process.js의 임의 규칙).
 * 점의 개수는 지나온 회차 수를 따른다 — 사전 한 점에 완료한 회차만큼 더한다.
 */
const metricPointCount = computed(() => {
  const step = currentStep.value
  if (step < 3) return 1
  if (step > 3) return metricPoints.length
  return Math.min(metricPoints.length, 1 + SESSION_CURRENT)
})

const keyMetrics = computed(() => keyMetricsOf(patient.value, metricPointCount.value))
const selectedMetric = ref('depression')
const activeMetric = computed(() => keyMetrics.value.find((m) => m.id === selectedMetric.value))
const series = computed(() => activeMetric.value?.series ?? [])

const PLOT = { width: 1000, height: 200 }

/*
 * 눈금은 데이터를 가운데 두고 20 폭으로 잡는다.
 * 지표마다 값의 범위가 달라 하나로 고정하면(우울 55~75) 감정 통제감 38이 밖으로 나간다.
 * 이 규칙으로 우울·불안은 Figma와 같은 55~75가 나온다.
 */
const metricScale = computed(() => {
  const values = series.value
  if (!values.length) return []
  const middle = (Math.min(...values) + Math.max(...values)) / 2
  const step = SCALE_SPAN / SCALE_STEPS
  const bottom = Math.round((middle - SCALE_SPAN / 2) / step) * step
  return Array.from({ length: SCALE_STEPS + 1 }, (_, i) => bottom + SCALE_SPAN - i * step)
})

const scaleTop = computed(() => metricScale.value[0] ?? 0)
const scaleBottom = computed(() => metricScale.value[metricScale.value.length - 1] ?? 0)

/* 열 중앙에 점을 찍는다. x축 라벨과 같은 칸을 쓴다 */
const columnWidth = PLOT.width / metricPoints.length
const xAt = (index) => columnWidth * (index + 0.5)
const yAt = (value) =>
  ((scaleTop.value - value) / (scaleTop.value - scaleBottom.value)) * PLOT.height

const linePath = computed(() =>
  series.value.map((v, i) => `${i ? 'L' : 'M'}${xAt(i)},${yAt(v)}`).join(' '),
)

/* ── 개인 메모 (Figma 188:5004 · 189:8675 · 190:8960) ─────────────
 * 오토세이브가 없다. 편집 중 이탈은 전부 미저장 경고를 거친다.
 */
const noteQuery = ref('')

const visibleNotes = computed(() => {
  const all = patient.value ? notesOf(patient.value.id) : []
  const q = noteQuery.value.trim()
  if (!q) return all
  /* 본문과 날짜 둘 다 본다 — 플레이스홀더가 '메모 내용 · 날짜로 검색'이다 */
  return all.filter((n) => n.body.includes(q) || n.date.includes(q))
})

/*
 * 편집 상태. `editingId`가 'new'면 아직 저장되지 않은 새 메모다.
 * 새 메모도 카드 하나가 편집 상태로 열리는 것이라 같은 자리를 쓴다.
 */
const editingId = ref(null)
const draft = ref('')
const draftOrigin = ref('')
const editorRef = ref(null)

/*
 * 새 메모도 카드 하나가 편집 상태로 열리는 것이라, 목록 맨 앞에 임시 카드를 끼워
 * 같은 v-for가 처리하게 한다. 마크업을 두 벌 두면 한쪽만 고쳐진다.
 */
const noteCards = computed(() =>
  editingId.value === 'new'
    ? [{ id: 'new', date: today(), context: currentContext.value, body: '' }, ...visibleNotes.value]
    : visibleNotes.value,
)

/* 편집 카드는 v-for 안에 있어 ref가 배열로 들어온다 */
function focusEditor() {
  nextTick(() => {
    const el = editorRef.value
    ;(Array.isArray(el) ? el[0] : el)?.focus()
  })
}

const isDirty = computed(() => editingId.value !== null && draft.value !== draftOrigin.value)

/* 무엇이 사라지는지 경고 문구에 넣는다 */
const editingSubject = computed(() => {
  if (editingId.value === 'new') return '새 메모'
  const note = visibleNotes.value.find((n) => n.id === editingId.value)
  return note ? `${note.date} 메모` : '메모'
})

/*
 * 새 메모의 맥락 태그는 환자의 현재 단계를 따른다.
 * 메모를 쓴 시점이 프로세스의 어디였는지가 나중에 읽을 때의 단서이기 때문이다.
 */
const currentContext = computed(() => {
  const step = PROCESS_STEPS[currentStep.value]
  if (isRunning.value && step === '프로그램 수행') return `${step} · ${SESSION_CURRENT}회차`
  return patient.value?.status ?? step
})

const today = () => {
  const d = new Date()
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}.${pad(d.getMonth() + 1)}.${pad(d.getDate())}`
}

function startEdit(note) {
  editingId.value = note.id
  draft.value = note.body
  draftOrigin.value = note.body
  focusEditor()
}

function startNew() {
  editingId.value = 'new'
  draft.value = ''
  draftOrigin.value = ''
  focusEditor()
}

function saveEdit() {
  const body = draft.value.trim()
  /* 빈 메모는 남기지 않는다. 새 메모면 그대로 버리고, 기존 메모는 건드리지 않는다 */
  if (body) {
    if (editingId.value === 'new') {
      addNote({
        patientId: patient.value.id,
        date: today(),
        context: currentContext.value,
        body,
      })
    } else {
      updateNote(editingId.value, body)
    }
  }
  closeEdit()
}

function closeEdit() {
  editingId.value = null
  draft.value = ''
  draftOrigin.value = ''
}

/*
 * 미저장 경고. 편집 중에 다른 곳으로 가려는 조작은 전부 guard를 통과한다 —
 * 탭 전환 · 다른 메모 편집 · 새 메모 · 삭제 · 화면 이탈.
 * 경고를 한 자리에 모아두지 않으면 어느 한 경로만 빠져나간다.
 */
const pendingAction = ref(null)

function guard(action) {
  if (!isDirty.value) {
    if (editingId.value !== null) closeEdit()
    action()
    return
  }
  pendingAction.value = action
}

function runPending() {
  const action = pendingAction.value
  pendingAction.value = null
  closeEdit()
  action?.()
}

function discardAndRun() {
  runPending()
}

function saveAndRun() {
  const body = draft.value.trim()
  if (body) {
    if (editingId.value === 'new') {
      addNote({ patientId: patient.value.id, date: today(), context: currentContext.value, body })
    } else {
      updateNote(editingId.value, body)
    }
  }
  runPending()
}

/* 삭제 확인 */
const deleting = ref(null)

function confirmDelete() {
  removeNote(deleting.value.id)
  deleting.value = null
}

function selectTab(id) {
  guard(() => { tab.value = id })
}

function goBack() {
  guard(() => router.push({ path: '/patients/list' }))
}

/*
 * 라우터로 빠져나가는 경로도 막는다. 모달이 쿼리를 붙이며 일으키는 이동은
 * 같은 화면 안이라 통과시킨다 — 여기서 막으면 경고 모달 자신이 열리지 못한다.
 */
onBeforeRouteLeave((to, from) => {
  if (to.path === from.path) return true
  if (!isDirty.value) return true
  pendingAction.value = () => router.push(to.fullPath)
  return false
})
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
      <div class="flex items-center gap-2">
        <p class="flex min-w-0 flex-1 items-center gap-1 text-text-secondary">
          <span class="text-caption">프로세스:</span>
          <!-- 아직 붙은 프로세스가 없으면 이름을 지어내지 않는다 -->
          <span v-if="patient.process === '시작 전'" class="text-label font-medium text-text-disabled">
            미할당
          </span>
          <span v-else class="text-label font-medium">
            {{ patient.processName ?? processName(CURRENT_VERSION) }}
          </span>
        </p>

        <button
          v-if="processEntry"
          class="flex h-11 shrink-0 items-center"
          @click="router.push({ path: `/process/${patient.id}/${processEntry.step}` })"
        >
          <!-- 화면의 주 행동이라 채움 버튼이다. 라이트에서 검정, 다크에서 흰색으로 반전된다 -->
          <span class="flex h-9 items-center gap-1 whitespace-nowrap rounded-lg bg-surface-inverse px-3 text-label font-medium text-text-inverse active:bg-surface-inverse-pressed">
            {{ processEntry.label }}
            <ChevronRight :size="16" class="shrink-0" />
          </span>
        </button>
      </div>

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

            <!-- 노드 전체가 터치 대상이다. 원만 누르게 하면 라벨이 헛돈다 -->
            <button
              class="flex w-[91px] shrink-0 flex-col items-center gap-2 rounded-lg py-1 active:bg-surface-pressed"
              @click="openStep(i, $event)"
            >
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
            </button>
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
          @click="openStep(currentStep, $event)"
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
            : 'font-medium text-text-secondary active:text-text-primary'"
          @click="selectTab(item.id)"
        >
          {{ item.label }}
        </button>
      </div>

      <!-- 프로세스 히스토리 -->
      <div v-if="tab === 'history'" class="flex min-h-0 flex-1 flex-col gap-2.5 overflow-y-auto">
        <div v-for="entry in history" :key="entry.id" class="shrink-0">
          <!--
            펼쳐지면 머리와 본문이 **한 상자**가 된다.
            둘 다 온전한 라운드 상자로 두면 맞닿는 자리에 선이 겹치고 모서리가 네 개
            생겨, 정작 중요하지 않은 경계가 제일 눈에 띈다.
            머리는 아래 라운드와 아래 테두리를 걷고, 본문은 위쪽을 걷는다.
            둘 사이는 배경색 차이만으로 나뉜다.
          -->
          <button
            class="flex h-11 w-full items-center gap-2.5 border px-2"
            :class="openHistory === entry.id
              ? 'rounded-t-lg border-b-0 border-border-selected bg-selected-bg active:bg-selected-bg-pressed'
              : 'rounded-lg border-border-default bg-surface-field active:bg-surface-pressed'"
            @click="openHistory = openHistory === entry.id ? null : entry.id"
          >
            <component
              :is="openHistory === entry.id ? ChevronUp : ChevronDown"
              :size="16"
              class="shrink-0 text-text-primary"
            />
            <!-- 실제로 붙은 프로세스는 자기 이름을 갖는다. 목업 이력만 진단에서 짓는다 -->
            <span class="shrink-0 text-label font-medium text-text-primary">
              {{ entry.name ?? processName(entry.id) }}
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
            class="flex gap-2.5 rounded-b-lg border border-t-0 border-border-selected p-3"
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
              ? 'border-border-selected bg-selected-bg active:bg-selected-bg-pressed'
              : 'border-border-default active:bg-surface-pressed'"
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

      <!-- 개인 메모 (Figma 188:5004) -->
      <div v-else class="flex min-h-0 flex-1 flex-col gap-2.5 overflow-hidden">
        <!-- 새 메모 + 검색 -->
        <div class="flex shrink-0 items-center gap-2.5">
          <button
            class="flex h-11 shrink-0 items-center justify-center gap-1 rounded-lg border border-border-default p-2 text-body text-text-secondary active:bg-surface-pressed"
            @click="guard(startNew)"
          >
            <Plus :size="20" class="shrink-0" />
            <span>새 메모</span>
          </button>
          <label class="flex h-11 min-w-0 flex-1 items-center gap-4 rounded-lg border border-border-default bg-surface-field px-3">
            <Search :size="20" class="shrink-0 text-text-secondary" />
            <input
              v-model="noteQuery"
              type="text"
              placeholder="메모 내용 · 날짜로 검색"
              class="min-w-0 flex-1 bg-transparent text-body text-text-primary outline-none placeholder:text-text-disabled"
            />
          </label>
        </div>

        <!--
          카드 2열. 편집 중인 카드만 커지므로 items-start로 위를 맞춘다 —
          늘어나면 옆 카드까지 같이 커져 목록이 출렁인다
        -->
        <div v-if="noteCards.length" class="grid min-h-0 flex-1 grid-cols-2 items-start gap-2.5 overflow-y-auto">
          <template v-for="note in noteCards" :key="note.id">
            <!-- 편집 중: 카드가 커지고 테두리가 accent로 바뀐다 (새 메모도 같은 카드다) -->
            <div
              v-if="editingId === note.id"
              class="flex flex-col gap-2 rounded-lg border border-border-selected px-3 pb-2"
            >
              <div class="flex h-11 items-center gap-1">
                <span class="shrink-0 text-label font-medium text-text-secondary">{{ note.date }}</span>
                <span class="truncate text-caption text-text-secondary">{{ note.context }}</span>
                <span class="flex-1 shrink-0 text-right text-label font-medium text-text-secondary">편집 중</span>
              </div>
              <textarea
                ref="editorRef"
                v-model="draft"
                class="h-[53px] w-full resize-none rounded border border-border-default bg-transparent p-2 text-label text-text-primary outline-none"
              ></textarea>
              <div class="flex items-center justify-end gap-2.5">
                <button
                  class="flex h-9 items-center justify-center rounded-lg border border-border-default px-3 py-2 text-body text-text-primary active:bg-surface-pressed"
                  @click="guard(closeEdit)"
                >
                  취소
                </button>
                <button
                  class="flex h-9 items-center justify-center rounded-lg bg-surface-inverse px-3 py-2 text-body text-text-inverse active:bg-surface-inverse-pressed"
                  @click="saveEdit"
                >
                  저장
                </button>
              </div>
            </div>

            <!-- 평소 -->
            <!--
              좌우 패딩을 대칭으로 둔다. 아이콘 묶음만 음수 마진으로 오른쪽 끝까지
              밀어, 44 히트 영역은 그대로 두면서 아이콘의 시각 위치를 Figma에 맞춘다
            -->
            <div v-else class="flex flex-col gap-2.5 rounded-lg border border-border-default px-3 pb-2">
              <div class="flex h-11 items-center gap-1">
                <span class="flex min-w-0 flex-1 items-end gap-1">
                  <span class="shrink-0 text-label font-medium text-text-secondary">{{ note.date }}</span>
                  <span class="truncate text-caption text-text-secondary">{{ note.context }}</span>
                </span>
                <span class="-mr-2 flex shrink-0 items-center gap-1">
                  <button
                    class="flex size-11 items-center justify-center rounded-lg text-text-secondary active:bg-surface-pressed"
                    @click="guard(() => startEdit(note))"
                  >
                    <Pencil :size="16" />
                  </button>
                  <button
                    class="flex size-11 items-center justify-center rounded-lg text-text-secondary active:bg-surface-pressed"
                    @click="guard(() => { deleting = note })"
                  >
                    <Trash2 :size="16" />
                  </button>
                </span>
              </div>
              <!-- 두 줄까지 보여준다. 한 줄이면 뒷부분을 편집으로 들어가야만 읽을 수 있다 -->
              <p class="line-clamp-2 text-label text-text-primary">{{ note.body }}</p>
            </div>
          </template>
        </div>

        <div v-else class="flex min-h-0 flex-1 items-center justify-center">
          <p class="text-body text-text-disabled">
            {{ noteQuery.trim() ? '검색 결과가 없습니다' : '작성된 메모가 없습니다' }}
          </p>
        </div>
      </div>
    </section>

    <!-- 아직 도달하지 않은 단계를 눌렀을 때. 비활성은 이유와 함께 와야 한다 -->
    <Teleport to="body">
      <div v-if="stepBlocked" class="fixed inset-0 z-50" @click="stepBlocked = null">
        <div class="absolute max-w-[280px]" :style="stepBlockedStyle">
          <InlineCallout :title="stepBlocked.title" :detail="stepBlocked.detail" />
        </div>
      </div>
    </Teleport>

    <!-- 삭제는 되돌릴 수 없다. 반드시 확인을 거친다 -->
    <DeleteConfirmModal
      v-if="deleting"
      heading="메모를 삭제하시겠습니까?"
      :detail="`${deleting.date} · ${deleting.context} 메모가 삭제됩니다.`"
      warning="삭제한 메모는 복구할 수 없습니다."
      @confirm="confirmDelete"
      @close="deleting = null"
    />

    <!-- 편집 중 이탈 경고. 탭 전환 · 다른 메모 · 화면 이탈이 모두 여기로 모인다 -->
    <UnsavedWarningModal
      v-if="pendingAction"
      :subject="editingSubject"
      @discard="discardAndRun"
      @save="saveAndRun"
      @close="pendingAction = null"
    />
  </div>

  <div v-else class="flex flex-1 items-center justify-center">
    <p class="text-body text-text-secondary">환자를 찾을 수 없습니다</p>
  </div>
</template>
