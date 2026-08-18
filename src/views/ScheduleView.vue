<script setup>
import { ref, computed } from 'vue'
import {
  ChevronLeft, ChevronRight, ChevronRight as Caret, Plus, Check,
} from 'lucide-vue-next'
import { useRouter } from 'vue-router'
import { calendarMonth } from '../mocks/calendar.js'
import { findPatientByName } from '../mocks/patients.js'
import { dayLabel, TODAY_KEY, NOW_HOUR } from '../mocks/schedule.js'
import { monthCells, canDropOn, findTask, removeEvent } from '../scheduleState.js'
import { dragState } from '../dragState.js'
import ScheduleEntryModal from '../components/ScheduleEntryModal.vue'
import TaskDetailModal from '../components/TaskDetailModal.vue'
import ScheduleDetailModal from '../components/ScheduleDetailModal.vue'
import InlineCallout from '../components/InlineCallout.vue'
import DeleteConfirmModal from '../components/DeleteConfirmModal.vue'

const router = useRouter()

const WEEKDAYS = ['월', '화', '수', '목', '금', '토', '일']

const cells = computed(() => monthCells(calendarMonth))

/*
 * '일정 추가'가 여는 모달.
 * 팝오버에서 열면 날짜가 정해져 있고, 상단 버튼에서 열면 모달에서 고른다.
 */
const addOpen = ref(false)
const addOnKey = ref(null)

/* 배치할 수 있는 날짜만 고를 수 있게 한다 — 드롭 규칙과 동일 */
const openDates = computed(() => cells.value.filter((c) => canDropOn(c.key)).map((c) => c.key))

/*
 * 캘린더는 날짜 칸이 드롭 단위다. 빈 시간이 하나도 없거나 지난 날이면 놓을 수 없다.
 * 시간은 확인 모달에서 고른다 — 아젠다와 같은 문법이되 단위만 날짜다.
 *
 * 셀의 opacity-40(앞뒤 달)은 dropState가 있을 때 걷어낸다.
 * 드롭 배경까지 40%로 씻겨 어느 칸이 대상인지 보이지 않기 때문이다.
 */
function dropState(cell) {
  if (!dragState.item) return null
  /* 작업은 다른 작업 위에 겹칠 수 있어 놓을 수 있는 날이 더 많다 */
  return canDropOn(cell.key, dragState.itemKind) ? 'active' : 'blocked'
}

function isFaded(cell) {
  return dropState(cell) === 'active' && dragState.hoverDate && dragState.hoverDate !== cell.key
}

/*
 * 놓을 수 없는 날에 놓았을 때 뜰 사유. 캘린더는 단위가 날짜라
 * 막히는 이유가 둘이다 — 지난 날이거나, 그 날에 빈 시간이 하나도 없거나.
 */
function blockedReason(cell) {
  if (dropState(cell) !== 'blocked') return null
  if (cell.key < TODAY_KEY) {
    return {
      title: '지난 날짜에는 배치할 수 없습니다',
      detail: '오늘부터의 날짜에만 놓을 수 있습니다',
    }
  }
  return {
    title: '빈 시간이 없는 날입니다',
    detail: '다른 날짜를 고르거나 기존 일정을 먼저 옮겨야 합니다',
  }
}

/* 셀에는 두 건까지만 보이고 나머지는 접힌다 */
const visibleEvents = (events) => events.slice(0, 2)
const overflowCount = (events) => Math.max(0, events.length - 2)

/*
 * 날짜 팝오버. 가벼운 콘텐츠이므로 모달이 아니라 팝오버 + 외부 탭 dismiss다.
 * Figma 일정 화면(188:6603)의 calendar modal을 옮긴 초안이다.
 */
const popover = ref(null)

function openDay(cell, event) {
  const r = event.currentTarget.getBoundingClientRect()
  const anchor = { right: r.right, top: r.top, height: r.height }
  /*
   * 빈 칸은 열 팝오버가 없다. 대신 그 날짜로 일정 추가를 연다.
   * 놓을 수 없는 날이면 왜 안 되는지 말해준다 —
   * 아무 반응이 없으면 고장으로 읽힌다.
   */
  if (!cell.events.length) {
    if (!canDropOn(cell.key)) {
      /* 무엇이 안 되는지 + 언제 되는지. 둘째 줄이 없으면 뚫을 방법을 모른다 */
      popover.value = {
        cell,
        anchor,
        warning: {
          title: '지난 날짜에는 일정을 추가할 수 없습니다',
          detail: '오늘부터의 날짜에만 추가할 수 있습니다',
        },
      }
      return
    }
    addOnKey.value = cell.key
    addOpen.value = true
    return
  }
  popover.value = { cell, anchor }
}

/* 칸 오른쪽에 붙이고 세로는 칸 중앙에 맞춘다. 화면 밖으로는 나가지 않는다 */
const popoverStyle = computed(() => {
  if (!popover.value) return {}
  const WIDTH = 280
  const HEIGHT = popover.value.warning ? 56 : 364
  const GAP = 8
  const MARGIN = 24
  const { right, top, height } = popover.value.anchor
  const left = Math.min(right + GAP, window.innerWidth - WIDTH - MARGIN)
  const wanted = top + height / 2 - HEIGHT / 2
  const maxTop = window.innerHeight - HEIGHT - MARGIN
  return {
    left: `${Math.max(MARGIN, left)}px`,
    top: `${Math.min(Math.max(MARGIN, wanted), maxTop)}px`,
    /* 콜아웃은 문구 길이에 맞춰 줄어든다. 목록 팝오버만 고정 폭이다 */
    ...(popover.value.warning ? { maxWidth: `${WIDTH}px` } : { width: `${WIDTH}px` }),
  }
})

/*
 * 팝오버의 업무 행도 작업 상세로 들어간다 — 아젠다 행과 같은 문법이다.
 * 팝오버는 먼저 닫는다. 모달만 history 엔트리를 갖게 하기 위함이다.
 */
const detailTask = ref(null)

function openEvent(event) {
  /* 팝오버를 비우기 전에 어느 날의 일정인지 챙긴다 */
  const key = popover.value?.cell.key ?? null
  popover.value = null
  if (event.taskId) {
    detailTask.value = findTask(event.taskId)
    return
  }
  /*
   * 환자 일정은 일정 상세로 연다 — 아젠다와 같은 문법이다.
   * 환자 상세로 가는 길은 그 모달 안에 남는다.
   */
  detailEvent.value = { dateKey: key, event }
}

/* 환자 일정의 되돌리기 경로. 상세에서 편집·삭제로 갈라진다 */
const detailEvent = ref(null)
const editingEvent = ref(null)
const deletingEvent = ref(null)

function confirmDeleteEvent() {
  removeEvent(deletingEvent.value.dateKey, deletingEvent.value.event.id)
  deletingEvent.value = null
}

/* 지난 일정은 명도를 낮춘다 — 아젠다와 같은 규칙 */
function isPastEvent(key, hour) {
  if (key < TODAY_KEY) return true
  if (key > TODAY_KEY) return false
  return hour < NOW_HOUR
}
</script>

<template>
  <div class="flex flex-1 flex-col py-3">
    <section class="flex min-h-0 flex-1 flex-col rounded-lg border border-border-default bg-surface-card px-4 py-3">
      <!-- 월 네비게이션. 7월 목업만 있어 양쪽 모두 비활성 -->
      <div class="flex h-12 shrink-0 items-center justify-center gap-2">
        <button class="flex size-11 items-center justify-center rounded-lg text-text-disabled" disabled>
          <ChevronLeft :size="24" />
        </button>
        <span class="text-title-sm font-semibold">{{ calendarMonth.label }}</span>
        <button class="flex size-11 items-center justify-center rounded-lg text-text-disabled" disabled>
          <ChevronRight :size="24" />
        </button>
      </div>

      <!-- 이번 달 / 일정 추가 -->
      <div class="flex h-11 shrink-0 items-center justify-between">
        <span class="text-label font-medium text-text-secondary">이번 달</span>
        <button
          class="flex h-11 items-center gap-1 pl-2 text-label font-medium text-text-secondary active:text-text-primary"
          @click="addOnKey = null; addOpen = true"
        >
          <Plus :size="16" class="shrink-0" />
          <span>일정 추가</span>
        </button>
      </div>

      <!--
        요일 머리부터 격자까지 한 판을 subtle로 채우고 날짜 칸만 container로 덮는다.
        그래서 요일 머리 행과 1px 간격에서는 subtle이 그대로 보인다.
      -->
      <div class="flex min-h-0 flex-1 flex-col gap-px bg-border-subtle">
        <div class="grid shrink-0 grid-cols-7 gap-px py-1">
          <div
            v-for="d in WEEKDAYS"
            :key="d"
            class="text-center text-count text-text-secondary"
          >
            {{ d }}
          </div>
        </div>

        <div class="grid min-h-0 flex-1 grid-cols-7 grid-rows-6 gap-px overflow-hidden">
        <button
          v-for="cell in cells"
          :key="cell.key"
          :data-drop-date="dropState(cell) === 'active' ? cell.key : null"
          :data-blocked-title="blockedReason(cell)?.title"
          :data-blocked-detail="blockedReason(cell)?.detail"
          class="flex min-h-0 flex-col gap-1 overflow-hidden p-2 text-left transition duration-150 ease-standard"
          :class="[
            /*
             * 앞뒤 달 칸은 평소 opacity-40이다. 누르는 동안에는 걷어낸다 —
             * 그러지 않으면 눌린 색까지 40%로 씻겨 반응이 거의 보이지 않는다.
             * 드래그 중에 걷어내는 것(!dropState)과 같은 이유다
             */
            cell.dimmed && !dropState(cell) ? 'opacity-40 active:opacity-100' : '',
            isFaded(cell) ? 'opacity-40' : '',
            dropState(cell) === 'active'
              ? 'bg-selected-bg ring-2 ring-inset ring-border-selected'
              : dropState(cell) === 'blocked'
                ? 'bg-danger-bg opacity-60 ring-1 ring-inset ring-text-disabled'
                : popover?.cell.key === cell.key && !popover.warning
                  ? 'bg-selected-bg ring-2 ring-inset ring-border-selected'
                  : 'bg-surface-container',
            /*
             * 누르는 동안의 피드백. 드래그 중에는 넣지 않는다 —
             * 드롭 상태 표현과 겹친다
             */
            dragState.item
              ? ''
              : popover?.cell.key === cell.key && !popover.warning
                ? 'active:bg-selected-bg-pressed'
                : 'active:bg-surface-pressed',
          ]"
          @click="openDay(cell, $event)"
        >
          <!-- 날짜 · 오늘 · 접힌 건수 -->
          <div class="flex shrink-0 items-baseline gap-1">
            <span
              class="text-label font-medium"
              :class="cell.isToday
                ? 'text-interactive-default'
                : cell.dimmed ? 'text-text-secondary' : 'text-text-primary'"
            >
              {{ cell.date }}
            </span>
            <span v-if="cell.isToday" class="flex-1 text-count text-interactive-default">오늘</span>
            <span v-else class="flex-1"></span>
            <span v-if="overflowCount(cell.events)" class="shrink-0 text-count text-text-secondary">
              +{{ overflowCount(cell.events) }}
            </span>
          </div>

          <!-- 일정 -->
          <div v-if="cell.events.length" class="flex min-h-0 flex-col gap-1 overflow-hidden">
            <div
              v-for="(event, j) in visibleEvents(cell.events)"
              :key="j"
              class="flex shrink-0 items-center gap-1.5"
            >
              <!-- 바는 항상 자리를 차지한다. 아젠다와 같은 규칙 -->
              <span
                class="w-[3px] shrink-0 self-stretch rounded-xs"
                :class="event.bar ? 'bg-border-strong' : 'invisible'"
              ></span>
              <span
                class="truncate text-count"
                :class="cell.dimmed ? 'text-text-secondary' : 'text-text-primary'"
              >
                {{ event.title }}
              </span>
            </div>
          </div>
        </button>
        </div>
      </div>
    </section>

    <!--
      날짜 팝오버. 가벼운 콘텐츠라 외부 탭으로 닫는다(모달 아님).
      Figma calendar modal(188:6603)을 옮긴 초안이다.
    -->
    <Teleport to="body">
      <div v-if="popover" class="fixed inset-0 z-50" @click="popover = null">
        <!-- 비활성 사유 콜아웃 (Figma 176:5336). 아젠다와 같은 컴포넌트다 -->
        <div v-if="popover.warning" class="absolute" :style="popoverStyle" @click.stop>
          <InlineCallout :title="popover.warning.title" :detail="popover.warning.detail" />
        </div>

        <div
          v-else
          class="absolute flex max-h-[364px] flex-col overflow-hidden rounded-2xl border border-border-default bg-surface-card"
          :style="popoverStyle"
          @click.stop
        >
          <div class="shrink-0 px-3 pt-3">
            <div class="flex h-11 items-center gap-2">
              <span class="text-title-sm font-semibold">{{ dayLabel(popover.cell.key) }}</span>
              <span v-if="popover.cell.isToday" class="text-count text-interactive-default">오늘</span>
              <span class="flex-1"></span>
              <span class="shrink-0 text-count text-text-secondary">{{ popover.cell.events.length }}건</span>
            </div>
            <button
              class="flex h-11 items-center gap-1 text-label font-medium text-text-secondary active:text-text-primary"
              @click="addOnKey = popover.cell.key; addOpen = true; popover = null"
            >
              <Plus :size="16" class="shrink-0" />
              <span>일정 추가</span>
            </button>
          </div>

          <div class="min-h-0 flex-1 overflow-y-auto px-3 pb-3">
            <button
              v-for="(event, i) in popover.cell.events"
              :key="i"
              class="flex min-h-11 w-full items-center gap-2 py-1 text-left active:bg-surface-pressed"
              :class="i > 0 ? 'border-t border-border-subtle' : ''"
              @click="openEvent(event)"
            >
              <span
                class="w-10 shrink-0 text-caption"
                :class="isPastEvent(popover.cell.key, event.hour) ? 'text-text-disabled' : 'text-text-secondary'"
              >
                {{ event.hour }}
              </span>
              <!-- 바는 항상 자리를 차지한다 -->
              <span
                class="w-[3px] shrink-0 self-stretch rounded-xs"
                :class="event.bar ? 'bg-border-strong' : 'invisible'"
              ></span>
              <span class="flex min-w-0 flex-1 flex-col gap-0.5">
                <span
                  class="flex items-center gap-1 truncate text-body font-medium"
                  :class="isPastEvent(popover.cell.key, event.hour) || event.done
                    ? 'text-text-secondary'
                    : 'text-text-primary'"
                >
                  <Check v-if="event.done" :size="16" class="shrink-0" />
                  <span class="truncate">{{ event.title }}</span>
                </span>
                <span v-if="event.meta" class="truncate text-caption text-text-secondary">
                  {{ event.meta }}
                </span>
              </span>
              <!-- 환자는 환자 상세로, 업무는 작업 상세로 들어간다 -->
              <Caret :size="16" class="shrink-0 text-text-secondary" />
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <ScheduleEntryModal
      v-if="addOpen"
      mode="add-event"
      :date-key="addOnKey"
      :date-options="openDates"
      @close="addOpen = false; addOnKey = null"
    />

    <!-- 날짜 칸에 놓았을 때. 시간은 모달에서 고른다 -->
    <ScheduleEntryModal
      v-if="dragState.pending?.dateKey"
      mode="drop"
      :date-key="dragState.pending.dateKey"
      :drop="dragState.pending"
      @close="dragState.pending = null"
    />

    <TaskDetailModal
      v-if="detailTask"
      :task="detailTask"
      @close="detailTask = null"
    />

    <!-- 환자 일정: 상세 → 편집 · 삭제. 아젠다와 같은 문법이다 -->
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
      :date-options="openDates"
      @close="editingEvent = null"
    />

    <DeleteConfirmModal
      v-if="deletingEvent"
      heading="일정을 삭제하시겠습니까?"
      :detail="`${dayLabel(deletingEvent.dateKey)} ${deletingEvent.event.hour} ${deletingEvent.event.title} 일정이 삭제됩니다.`"
      warning="삭제한 일정은 복구할 수 없습니다."
      @confirm="confirmDeleteEvent"
      @close="deletingEvent = null"
    />
  </div>
</template>
