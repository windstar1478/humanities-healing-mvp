<script setup>
import { ref, reactive, computed, watch } from 'vue'
import { rectOf, viewW, viewH } from '../uiScale.js'
import {
  ChevronLeft, ChevronRight, ChevronDown, Plus, ArrowUpDown, Check, Star,
} from 'lucide-vue-next'
import { useRouter } from 'vue-router'
import { favoriteTools } from '../mocks/favorites.js'
import { findPatientByName } from '../mocks/patients.js'
import { shiftedKey } from '../mocks/schedule.js'
import {
  dayOn, canDropOn, isOpenHour, leadEvent, taskState, taskWhen, findTask, removeEvent, removeTask,
} from '../scheduleState.js'
import { dragState, startPress, trackPress, cancelDrag } from '../dragState.js'
import ScheduleEntryModal from '../components/ScheduleEntryModal.vue'
import TaskDetailModal from '../components/TaskDetailModal.vue'
import ScheduleDetailModal from '../components/ScheduleDetailModal.vue'
import DeleteConfirmModal from '../components/DeleteConfirmModal.vue'
import InlineCallout from '../components/InlineCallout.vue'

const router = useRouter()

/* 홈에 오르는 도구. 이름·아이콘은 저작도구 정의에서 읽는다 */
const favorites = computed(() => favoriteTools())

/* 아젠다가 보여주는 창: 오늘 기준 앞뒤 3일 */
const dayKeys = [-3, -2, -1, 0, 1, 2, 3].map((offset) => shiftedKey(offset))
/* 업무는 다른 날로 옮겨 잡을 수 있어야 하므로 배치 가능한 날을 모두 넘긴다 */
const openDates = computed(() => dayKeys.filter((key) => canDropOn(key, 'task')))
/* 환자 일정을 옮길 수 있는 날. 작업과 규칙이 달라 따로 센다 */
const openPatientDates = computed(() => dayKeys.filter((key) => canDropOn(key)))

const dayIndex = ref(3)
/* 일정은 공용 상태에서 온다. 화면이 사본을 들면 캘린더와 갈라진다 */
const day = computed(() => dayOn(dayKeys[dayIndex.value]))
const rows = computed(() => day.value.rows)

function goDay(step) {
  const next = dayIndex.value + step
  if (next >= 0 && next < dayKeys.length) dayIndex.value = next
}

/* ── 작업 목록 ────────────────────────────────────────────────────
 * 배치해도 목록에서 사라지지 않는다. 리마인더로 남고 완료로만 내려간다.
 * 그래서 배치 여부로 구간을 나눈다 — 미배정 / 배정됨 / 완료.
 */
const SORTS = [
  { key: 'time', label: '시간 빠른 순' },
  { key: 'added', label: '추가한 순' },
]
const sortKey = ref('time')
const sortOpen = ref(false)
/* 완료만 접어 둔다. 지난 일이라 평소에는 볼 일이 없다 */
const sectionOpen = reactive({ unassigned: true, assigned: true, done: false })

/*
 * 시간까지 넣어 비교한다. 같은 날 안에서는 이른 시간이 먼저다.
 * 날짜 미정은 맨 뒤로 보낸다 — 정할 것이 없어 급하지 않다.
 */
const sortStamp = (task) => `${task.date} ${task.hour ?? ''}`

function bySort(list) {
  if (sortKey.value === 'added') return list
  return [...list].sort((a, b) => {
    if (!a.date && !b.date) return 0
    if (!a.date) return 1
    if (!b.date) return -1
    const [x, y] = [sortStamp(a), sortStamp(b)]
    return x === y ? 0 : (x < y ? -1 : 1)
  })
}

/* 시간까지 정해져야 배정된 것이다. 날짜만 있으면 타임라인에 자리가 없다 */
const sections = computed(() => {
  const open = taskState.items.filter((t) => !t.done)
  return [
    { key: 'unassigned', label: '미배정', items: bySort(open.filter((t) => !t.hour)), draggable: true },
    { key: 'assigned', label: '배정됨', items: bySort(open.filter((t) => t.hour)), draggable: true },
    { key: 'done', label: '완료', items: bySort(taskState.items.filter((t) => t.done)), draggable: false },
  ]
})

const openCount = computed(() => taskState.items.filter((t) => !t.done).length)

/* ── 타임라인 ─────────────────────────────────────────────────────
 * 지난 행은 행 전체를 어둡게 깔아 지금 시각의 경계를 드러낸다.
 *
 * opacity가 아니라 배경 토큰을 쓴다. opacity는 글자까지 같이 씻어내서
 * 실측 대비가 제목 4.44 / 메타 2.99(AA 미달)까지 떨어졌다.
 * 배경만 바꾸면 글자는 온전한 토큰 대비를 유지한다.
 */
const isPast = (row) => row.state === 'past'

/* 대표 한 건과 접힌 수. 캘린더 셀과 같은 문법이다 */
const lead = (row) => leadEvent(row.events)
const overflow = (row) => Math.max(0, row.events.length - 1)

/*
 * 집어 든 동안에만 드롭 상태를 계산한다.
 * 작업은 다른 작업 위에 겹칠 수 있고, 환자 일정은 빈 행에만 놓을 수 있다.
 */
function dropState(row) {
  if (!dragState.item) return null
  return isOpenHour(row, dragState.itemKind) ? 'active' : 'blocked'
}

/*
 * 손가락이 특정 슬롯 위에 있으면 그 슬롯만 남기고 나머지 후보의 accent를 낮춘다.
 * 아직 아무 슬롯 위도 아니면 후보를 모두 같은 세기로 보여준다.
 */
function isFaded(row) {
  return dropState(row) === 'active' && dragState.hoverHour && dragState.hoverHour !== row.hour
}

function hourClass(row) {
  if (dropState(row) === 'active') {
    return isFaded(row) ? 'text-text-secondary' : 'text-text-primary'
  }
  return 'text-text-secondary'
}

/* 목록 팝오버가 열린 행은 선택 상태다 — 캘린더 선택 칸과 같은 문법 */
function isSelected(row) {
  const open = rowPopover.value
  return Boolean(open && !open.warning && open.row.hour === row.hour)
}

/*
 * 누르는 동안의 피드백.
 * 행 전체가 surface-pressed 한 색으로 눌린다 — 라이트에서는 어두워지고
 * 다크에서는 밝아지지만, 어느 쪽이든 평소 표면(카드·container·recessed·canvas)과
 * 확실히 다른 값이라 뭘 누르고 있는지 보인다.
 * 선택된 자리는 selected-bg-pressed로 눌러 accent를 잃지 않는다.
 * 드래그 중에는 넣지 않는다 — 드롭 상태 표현과 겹친다.
 *
 * 지난 행은 행과 블록이 함께 pressed-strong으로 내려간다.
 * 지난 행의 블록은 평소가 canvas라 pressed(#EEF0F3)와 값이 같아 눌러도 변화가 없다.
 * 그렇다고 블록만 strong으로 내리면 행(#EEF0F3)보다 블록(#E8EAEE)이 어두워
 * '박스가 눌린 것'으로 읽힌다 — 지나지 않은 행은 둘이 같은 색이라 행 전체가
 * 눌린 것으로 보이는데, 같은 제스처가 두 가지로 읽히면 안 된다.
 * 둘 다 strong으로 내려 한 색 띠를 만든다.
 */
function pressClass(row) {
  if (dragState.item) return ''
  if (isSelected(row)) return 'active:bg-selected-bg-pressed'
  return isPast(row) ? 'active:bg-surface-pressed-strong' : 'active:bg-surface-pressed'
}

/* 블록도 행과 같은 값으로 눌린다 (위 주석 참고) */
function blockPressClass(row) {
  return pressClass(row)
}

/*
 * 놓을 수 없는 자리에 놓았을 때 뜰 사유.
 * 지난 시간과 '이미 차 있음'은 막힌 이유가 달라 문구도 갈린다.
 * 작업은 다른 작업 위에 겹칠 수 있으므로 막히는 것은 환자 일정이 있는 행뿐이다.
 */
function blockedReason(row) {
  if (dropState(row) !== 'blocked') return null
  if (isPast(row)) {
    return {
      title: '지난 시간에는 배치할 수 없습니다',
      detail: '아직 지나지 않은 시간에만 놓을 수 있습니다',
    }
  }
  if (dragState.itemKind === 'task') {
    return {
      title: '환자 일정이 있는 시간입니다',
      detail: '작업은 비어 있거나 다른 작업만 있는 시간에 놓을 수 있습니다',
    }
  }
  return {
    title: '이미 일정이 있는 시간입니다',
    detail: '환자 일정은 비어 있는 시간에만 놓을 수 있습니다',
  }
}

/*
 * 일정 블록은 행 배경보다 한 단계 더 어둡다.
 * 지난 행은 행 자체가 recessed로 깔리므로 블록은 canvas로 내려간다.
 */
function blockClass(row) {
  if (dropState(row) === 'blocked') return 'border-text-disabled bg-danger-bg'
  if (dropState(row) === 'active') return 'border-dashed border-border-selected bg-selected-bg'
  if (isSelected(row)) return 'border-transparent bg-selected-bg ring-2 ring-inset ring-border-selected'
  return isPast(row) ? 'border-transparent bg-surface-canvas' : 'border-transparent bg-surface-container'
}

/* ── 모달 ────────────────────────────────────────────────────────
 * 배치 확인 · 일정 추가 · 작업 추가는 ScheduleEntryModal 하나가 담당한다.
 * 규칙(중복 경고 · nextStep 검증)이 화면마다 갈라지지 않게 하기 위함이다.
 */
const modal = ref(null)
/* 빈 행을 눌러 열면 그 시간이 기본값이 된다 */
const addHour = ref(null)
const detailTask = ref(null)

watch(
  () => dragState.pending,
  (pending) => { if (pending) modal.value = 'drop' },
)

function openAdd(kind, hour = null) {
  addHour.value = hour
  modal.value = kind
}

function closeModal() {
  modal.value = null
  addHour.value = null
  dragState.pending = null
}

/*
 * 행 탭과 꾹 누르기는 같은 요소가 받는다.
 * 배치로 끝난 제스처의 click은 dragState가 삼키므로 여기서는 신경 쓰지 않는다.
 */
function openTask(task) {
  rowPopover.value = null
  detailTask.value = task
}

/*
 * 환자 일정의 되돌리기 경로. 상세에서 편집·삭제로 갈라진다.
 * 팝오버는 먼저 닫는다 — 모달만 history 엔트리를 갖게 하기 위함이다.
 */
const detailEvent = ref(null)
const editingEvent = ref(null)
const deletingEvent = ref(null)

function openEventDetail(event) {
  rowPopover.value = null
  detailEvent.value = { dateKey: day.value.key, event }
}

function confirmDeleteEvent() {
  removeEvent(deletingEvent.value.dateKey, deletingEvent.value.event.id)
  deletingEvent.value = null
}

/* 작업 삭제. 배치돼 있으면 타임라인의 업무 블록도 파생이라 같이 사라진다 */
const deletingTask = ref(null)

function confirmDeleteTask() {
  removeTask(deletingTask.value.id)
  deletingTask.value = null
}

/*
 * 여러 건이 접힌 행은 목록부터 연다. 가벼운 콘텐츠라 모달이 아니라 팝오버다 —
 * 캘린더 날짜 팝오버와 같은 문법이고 history entry를 만들지 않는다.
 */
const rowPopover = ref(null)

function anchorOf(event) {
  const r = rectOf(event.currentTarget)
  return { left: r.left, top: r.top, height: r.height }
}

function openRow(row, event) {
  if (row.events.length > 1) {
    rowPopover.value = { row, anchor: anchorOf(event) }
    return
  }
  const only = row.events[0]
  if (only?.taskId) {
    /* 타임라인 블록은 작업에서 파생한 사본이다. 원본을 찾아 연다 */
    openTask(findTask(only.taskId))
    return
  }
  /*
   * 환자 일정은 일정 상세로 연다 — 작업 블록이 작업 상세로 열리는 것과 같은 문법이다.
   * 환자 상세로 가는 길은 그 모달 안에 남는다.
   */
  if (only) {
    openEventDetail(only)
    return
  }
  /*
   * 지난 시간은 왜 안 되는지 말해준다. 아무 반응이 없으면
   * 고장으로 읽힌다 — 비활성은 이유와 함께 와야 한다.
   */
  if (isPast(row)) {
    rowPopover.value = {
      row,
      anchor: anchorOf(event),
      /* 무엇이 안 되는지 + 언제 되는지. 둘째 줄이 없으면 뚫을 방법을 모른다 */
      warning: {
        title: '지난 시간에는 일정을 추가할 수 없습니다',
        detail: '아직 지나지 않은 시간에만 추가할 수 있습니다',
      },
    }
    return
  }
  openAdd('add-event', row.hour)
}

/* 행 왼쪽에 붙인다. 세로는 행 중앙에 맞추되 화면 밖으로 나가지 않게 가둔다 */
const rowPopoverStyle = computed(() => {
  if (!rowPopover.value) return {}
  const WIDTH = 280
  const HEIGHT = rowPopover.value.warning ? 56 : 300
  const GAP = 8
  const MARGIN = 24
  const { left, top, height } = rowPopover.value.anchor
  const wanted = top + height / 2 - HEIGHT / 2
  return {
    left: `${Math.max(MARGIN, left - WIDTH - GAP)}px`,
    top: `${Math.min(Math.max(MARGIN, wanted), viewH() - HEIGHT - MARGIN)}px`,
    /* 콜아웃은 문구 길이에 맞춰 줄어든다. 목록 팝오버만 고정 폭이다 */
    ...(rowPopover.value.warning ? { maxWidth: `${WIDTH}px` } : { width: `${WIDTH}px` }),
  }
})
</script>

<template>
  <div class="flex flex-1 gap-2 py-3">
    <!-- ─────────── 좌측 컬럼 ─────────── -->
    <div class="flex w-[247px] shrink-0 flex-col gap-2.5">
      <!--
        빠른 저작 — 저작도구에서 별표한 도구가 온다(mocks/favorites.js).
        머리 전체가 저작도구로 가는 길이다. chevron이 이미 '더 있다'고 말하고
        있어 눌리지 않으면 고장으로 읽힌다(우측 패널 '전체 환자'와 같은 문법).
      -->
      <section class="shrink-0 rounded-lg border border-border-default bg-surface-card px-3 py-2">
        <button
          class="-mx-1 flex h-11 w-full items-center gap-1 rounded-lg px-1 text-left active:bg-surface-pressed"
          @click="router.push({ path: '/authoring' })"
        >
          <h2 class="text-title-sm font-semibold">빠른 저작</h2>
          <ChevronRight :size="16" class="shrink-0 text-text-secondary" />
        </button>
        <div v-if="favorites.length" class="mt-1 grid grid-cols-2 gap-2.5">
          <button
            v-for="tool in favorites"
            :key="tool.key"
            class="flex h-15 flex-col items-center justify-center gap-1 rounded-lg border border-border-default p-2 text-label font-medium text-text-primary active:bg-surface-pressed"
            @click="router.push({ path: `/authoring/${tool.key}` })"
          >
            <component :is="tool.icon" :size="24" class="shrink-0" />
            <span class="truncate">{{ tool.name }}</span>
          </button>
        </div>
        <!-- 별표가 하나도 없을 때. 빈 칸을 남기지 않고 어디서 담는지 말한다 -->
        <p v-else class="flex items-center gap-1 py-2 text-caption text-text-secondary">
          <Star :size="12" class="shrink-0" />
          저작도구에서 별표한 도구가 여기 모입니다
        </p>
      </section>

      <!-- 작업 -->
      <section class="relative flex min-h-0 flex-1 flex-col rounded-lg border border-border-default bg-surface-card px-3 py-2">
        <div class="flex h-11 shrink-0 items-center">
          <h2 class="text-title-sm font-semibold">작업 · {{ openCount }}</h2>
          <div class="flex-1"></div>
          <button
            class="flex size-11 shrink-0 items-center justify-center rounded-lg text-text-secondary active:bg-surface-pressed"
            @click="sortOpen = !sortOpen"
          >
            <ArrowUpDown :size="16" />
          </button>
          <button
            class="flex h-11 shrink-0 items-center gap-1 pl-1 text-label font-medium text-text-secondary active:text-text-primary"
            @click="openAdd('add-task')"
          >
            <Plus :size="16" class="shrink-0" />
            <span>작업 추가</span>
          </button>
        </div>

        <!-- 정렬 기준. 가벼운 콘텐츠라 팝오버 + 외부 탭 dismiss다 -->
        <div v-if="sortOpen" class="fixed inset-0 z-40" @click="sortOpen = false"></div>
        <div
          v-if="sortOpen"
          class="absolute right-3 top-12 z-40 w-36 overflow-hidden rounded-lg border border-border-default bg-surface-card"
        >
          <button
            v-for="(opt, i) in SORTS"
            :key="opt.key"
            class="flex h-11 w-full items-center justify-between gap-2 px-3 text-left text-label"
            :class="[
              i > 0 ? 'border-t border-border-subtle' : '',
              sortKey === opt.key
                ? 'bg-selected-bg active:bg-selected-bg-pressed'
                : 'active:bg-surface-pressed',
            ]"
            @click="sortKey = opt.key; sortOpen = false"
          >
            <span>{{ opt.label }}</span>
            <Check v-if="sortKey === opt.key" :size="16" class="shrink-0 text-text-secondary" />
          </button>
        </div>

        <div class="flex min-h-0 flex-1 flex-col overflow-y-auto">
          <template v-for="section in sections" :key="section.key">
            <button
              class="flex h-11 shrink-0 items-center gap-1 border-t border-border-default pl-1 text-label font-medium text-text-secondary active:text-text-primary"
              @click="sectionOpen[section.key] = !sectionOpen[section.key]"
            >
              <component
                :is="sectionOpen[section.key] ? ChevronDown : ChevronRight"
                :size="16"
                class="shrink-0"
              />
              <span>{{ section.label }} · {{ section.items.length }}</span>
            </button>

            <ul v-if="sectionOpen[section.key]" class="flex shrink-0 flex-col gap-2 pb-2">
              <li
                v-for="task in section.items"
                :key="task.id"
                class="flex h-13 shrink-0 flex-col justify-center border-t border-border-subtle"
              >
                <!-- 완료된 작업은 배치 대상이 아니다. 탭으로 되돌리기만 한다 -->
                <button
                  class="flex h-12 w-full touch-manipulation select-none flex-col justify-center gap-0.5 rounded-lg p-2 text-left transition-colors duration-100 ease-standard active:bg-surface-pressed"
                  :class="dragState.item?.id === task.id ? 'bg-surface-pressed' : ''"
                  @pointerdown="section.draggable && startPress($event, task, 'task')"
                  @pointermove="trackPress"
                  @pointercancel="cancelDrag"
                  @contextmenu.prevent
                  @click="openTask(task)"
                >
                  <span class="flex items-center gap-1">
                    <Check v-if="task.done" :size="16" class="shrink-0 text-text-secondary" />
                    <span
                      class="truncate text-body"
                      :class="task.done ? 'text-text-secondary' : 'text-text-primary'"
                    >
                      {{ task.title }}
                    </span>
                  </span>
                  <span v-if="task.category || taskWhen(task)" class="truncate text-caption text-text-secondary">
                    <template v-if="task.category">{{ task.category }}</template>
                    <template v-if="task.category && taskWhen(task)"> · </template>
                    <span
                      v-if="taskWhen(task)"
                      :class="taskWhen(task).overdue ? 'text-indicator-warning' : ''"
                    >
                      {{ taskWhen(task).text }}
                    </span>
                  </span>
                </button>
              </li>
              <li v-if="!section.items.length" class="px-2 py-2 text-label text-text-disabled">
                없음
              </li>
            </ul>
          </template>
        </div>
      </section>
    </div>

    <!-- ─────────── 우측 컬럼: 일정 ─────────── -->
    <section class="flex min-h-0 flex-1 flex-col rounded-lg border border-border-default bg-surface-card px-3 py-2">
      <!-- 날짜 네비게이션 -->
      <div class="flex h-12 shrink-0 items-center justify-center gap-2">
        <button
          class="flex size-11 items-center justify-center rounded-lg active:bg-surface-pressed"
          :class="dayIndex === 0 ? 'text-text-disabled' : 'text-text-secondary'"
          :disabled="dayIndex === 0"
          @click="goDay(-1)"
        >
          <ChevronLeft :size="24" />
        </button>
        <span class="text-title-sm font-semibold">{{ day.label }}</span>
        <button
          class="flex size-11 items-center justify-center rounded-lg active:bg-surface-pressed"
          :class="dayIndex === dayKeys.length - 1 ? 'text-text-disabled' : 'text-text-secondary'"
          :disabled="dayIndex === dayKeys.length - 1"
          @click="goDay(1)"
        >
          <ChevronRight :size="24" />
        </button>
      </div>

      <!-- 오늘 / 일정 추가 -->
      <div class="flex h-11 shrink-0 items-center justify-between">
        <span v-if="day.isToday" class="text-label font-medium text-text-secondary">오늘</span>
        <span v-else></span>
        <button
          class="flex h-11 items-center gap-1 pl-2 text-label font-medium text-text-secondary active:text-text-primary"
          @click="openAdd('add-event')"
        >
          <Plus :size="16" class="shrink-0" />
          <span>일정 추가</span>
        </button>
      </div>

      <!-- 타임라인 -->
      <div class="min-h-0 flex-1 overflow-y-auto">
        <div
          v-for="row in rows"
          :key="row.hour"
          class="flex h-13 items-start gap-2 border-t border-border-default px-1 py-1 transition-colors duration-150 ease-standard"
          :class="[
            dropState(row) === 'blocked' ? 'opacity-60' : '',
            isPast(row) && !dropState(row) ? 'bg-surface-recessed' : '',
            pressClass(row),
          ]"
        >
          <span class="shrink-0 text-caption" :class="hourClass(row)">{{ row.hour }}</span>

          <button
            v-if="row.events.length"
            :data-drop-hour="dropState(row) === 'active' ? row.hour : null"
            :data-blocked-title="blockedReason(row)?.title"
            :data-blocked-detail="blockedReason(row)?.detail"
            class="flex min-h-11 flex-1 items-center gap-3 overflow-hidden rounded-lg border pr-3 text-left transition-colors duration-150 ease-standard"
            :class="[blockClass(row), blockPressClass(row), isFaded(row) ? 'opacity-40' : '']"
            @click="openRow(row, $event)"
          >
            <!-- 바는 항상 자리를 차지한다. 미표시일 때만 투명 처리해 텍스트 정렬을 유지 -->
            <span
              class="w-2 shrink-0 self-stretch transition-colors duration-150 ease-standard"
              :class="dropState(row) === 'active'
                ? 'bg-border-selected'
                : (!lead(row).bar
                  ? 'invisible'
                  : (dropState(row) === 'blocked' ? 'bg-border-default' : 'bg-border-strong'))"
            ></span>

            <span class="flex min-w-0 flex-1 flex-col gap-1">
              <span
                class="truncate text-title-sm font-semibold"
                :class="isPast(row) || lead(row).done || dropState(row) === 'blocked'
                  ? 'text-text-secondary'
                  : 'text-text-primary'"
              >
                {{ lead(row).title }}
              </span>
              <!-- 지난 일정 메타도 secondary. Figma는 disabled이지만 13px 본문 대비가 3.02로 낮아 격상 -->
              <span v-if="lead(row).meta" class="truncate text-label font-medium text-text-secondary">
                {{ lead(row).meta }}
              </span>
            </span>

            <!-- 접힌 건수. 캘린더 셀과 같은 문법이다 -->
            <span v-if="overflow(row)" class="shrink-0 text-count text-text-secondary">
              +{{ overflow(row) }}
            </span>
            <!-- 완료는 개선 표현이므로 중립색 체크로 둔다 -->
            <Check v-if="lead(row).done" :size="16" class="shrink-0 text-text-secondary" />
            <span
              v-else-if="lead(row).badge"
              class="shrink-0 text-caption font-bold text-interactive-default"
            >
              {{ lead(row).badge }}
            </span>
          </button>

          <!--
            빈 행의 블록은 항상 렌더한다. v-if로 새로 붙이면 전환 없이 즉시 나타나
            일정이 있는 행(색 전환 150ms)보다 빨라 보인다.
            지난 시간에는 넣을 것이 없으므로 누를 수 없다 — 드롭 규칙과 같다.
          -->
          <button
            v-else
            :data-drop-hour="dropState(row) === 'active' ? row.hour : null"
            :data-blocked-title="blockedReason(row)?.title"
            :data-blocked-detail="blockedReason(row)?.detail"
            class="flex min-h-11 flex-1 items-center overflow-hidden rounded-lg border transition duration-150 ease-standard"
            :class="[
              dropState(row) === 'active' ? 'border-dashed border-border-selected bg-selected-bg' : '',
              dropState(row) === 'blocked' ? 'border-text-disabled bg-danger-bg' : '',
              !dropState(row) ? 'border-transparent' : '',
              blockPressClass(row),
              isFaded(row) ? 'opacity-40' : '',
            ]"
            @click="openRow(row, $event)"
          >
            <span
              class="w-2 shrink-0 self-stretch transition duration-150 ease-standard"
              :class="dropState(row) === 'active' ? 'bg-border-selected' : 'bg-transparent'"
            ></span>
          </button>
        </div>
      </div>
    </section>

    <!-- 한 시간에 여러 건이 있을 때. 캘린더 날짜 팝오버와 같은 문법이다 -->
    <Teleport to="body">
      <div v-if="rowPopover" class="fixed inset-0 z-50" @click="rowPopover = null">
        <!-- 비활성 사유 콜아웃 (Figma 176:5336). 아무 반응이 없으면 고장으로 읽힌다 -->
        <div v-if="rowPopover.warning" class="absolute" :style="rowPopoverStyle" @click.stop>
          <InlineCallout
            :title="rowPopover.warning.title"
            :detail="rowPopover.warning.detail"
          />
        </div>

        <div
          v-else
          class="absolute flex max-h-[300px] flex-col overflow-hidden rounded-2xl border border-border-default bg-surface-card"
          :style="rowPopoverStyle"
          @click.stop
        >
          <div class="flex h-11 shrink-0 items-center gap-2 px-3 pt-3">
            <span class="text-title-sm font-semibold">{{ rowPopover.row.hour }}</span>
            <span class="flex-1"></span>
            <span class="shrink-0 text-count text-text-secondary">
              {{ rowPopover.row.events.length }}건
            </span>
          </div>
          <div class="min-h-0 flex-1 overflow-y-auto px-3 pb-3">
            <button
              v-for="(event, i) in rowPopover.row.events"
              :key="i"
              class="flex min-h-11 w-full items-center gap-2 py-1 text-left active:bg-surface-pressed"
              :class="i > 0 ? 'border-t border-border-subtle' : ''"
              @click="event.taskId ? openTask(findTask(event.taskId)) : openEventDetail(event)"
            >
              <Check
                v-if="event.done"
                :size="16"
                class="shrink-0 text-text-secondary"
              />
              <span class="flex min-w-0 flex-1 flex-col gap-0.5">
                <span
                  class="truncate text-body font-medium"
                  :class="event.done ? 'text-text-secondary' : 'text-text-primary'"
                >
                  {{ event.title }}
                </span>
                <span v-if="event.meta" class="truncate text-caption text-text-secondary">
                  {{ event.meta }}
                </span>
              </span>
              <ChevronRight :size="16" class="shrink-0 text-text-secondary" />
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <ScheduleEntryModal
      v-if="modal"
      :mode="modal"
      :date-key="day.key"
      :hour-key="addHour"
      :date-options="openDates"
      :drop="dragState.pending"
      @close="closeModal"
    />

    <TaskDetailModal
      v-if="detailTask"
      :task="detailTask"
      @delete="deletingTask = detailTask"
      @close="detailTask = null"
    />

    <DeleteConfirmModal
      v-if="deletingTask"
      heading="작업을 삭제하시겠습니까?"
      :detail="`${deletingTask.title} 작업이 삭제됩니다.`"
      warning="삭제한 작업은 복구할 수 없습니다."
      @confirm="confirmDeleteTask"
      @close="deletingTask = null"
    />

    <!-- 환자 일정: 상세 → 편집 · 삭제 -->
    <ScheduleDetailModal
      v-if="detailEvent"
      :date-key="detailEvent.dateKey"
      :event="detailEvent.event"
      :patient="findPatientByName(detailEvent.event.title)"
      @open-patient="router.push({ path: `/patients/detail/${findPatientByName(detailEvent.event.title).id}` })"
      @edit="editingEvent = detailEvent"
      @delete="deletingEvent = detailEvent"
      @close="detailEvent = null"
    />

    <ScheduleEntryModal
      v-if="editingEvent"
      mode="edit"
      :editing="editingEvent"
      :date-options="openPatientDates"
      @close="editingEvent = null"
    />

    <DeleteConfirmModal
      v-if="deletingEvent"
      heading="일정을 삭제하시겠습니까?"
      :detail="`${deletingEvent.event.hour} ${deletingEvent.event.title} 일정이 삭제됩니다.`"
      warning="삭제한 일정은 복구할 수 없습니다."
      @confirm="confirmDeleteEvent"
      @close="deletingEvent = null"
    />
  </div>
</template>
