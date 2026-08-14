<script setup>
import { ref, computed, watch } from 'vue'
import { ChevronLeft, ChevronRight, Plus } from 'lucide-vue-next'
import { quickAuthoringItems } from '../mocks/home.js'
import { shiftedKey } from '../mocks/schedule.js'
import { dayOn, canDropOn, taskState } from '../scheduleState.js'
import { dragState, startPress, trackPress, cancelDrag } from '../dragState.js'
import ScheduleEntryModal from '../components/ScheduleEntryModal.vue'

/* 아젠다가 보여주는 창: 오늘 기준 앞뒤 3일 */
const dayKeys = [-3, -2, -1, 0, 1, 2, 3].map((offset) => shiftedKey(offset))
/* 미배정 할 일도 공용 상태다. 캘린더에서 만든 미정 업무가 여기 들어온다 */
const tasks = computed(() => taskState.items)
/* 업무는 다른 날로 옮겨 잡을 수 있어야 하므로 배치 가능한 날을 모두 넘긴다 */
const openDates = computed(() => dayKeys.filter((key) => canDropOn(key)))

const dayIndex = ref(3)
/* 일정은 공용 상태에서 온다. 화면이 사본을 들면 캘린더와 갈라진다 */
const day = computed(() => dayOn(dayKeys[dayIndex.value]))
const rows = computed(() => day.value.rows)

function goDay(step) {
  const next = dayIndex.value + step
  if (next >= 0 && next < dayKeys.length) dayIndex.value = next
}

/* 지난 일정만 명도를 낮춘다. 진행 중은 accent 배지로 구분한다 */
const isPast = (row) => row.state === 'past'

/*
 * 환자를 집어 든 동안에만 드롭 상태를 계산한다.
 * 일정이 이미 있거나 지난 시간이면 놓을 수 없다.
 */
function dropState(row) {
  if (!dragState.item) return null
  return row.event || isPast(row) ? 'blocked' : 'active'
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
  return isPast(row) ? 'text-text-disabled' : 'text-text-secondary'
}


/* ── 모달 ────────────────────────────────────────────────────────
 * 배치 확인 · 일정 추가 · 할 일 추가는 ScheduleEntryModal 하나가 담당한다.
 * 규칙(중복 경고 · nextStep 검증)이 화면마다 갈라지지 않게 하기 위함이다.
 */
const modal = ref(null)

watch(
  () => dragState.pending,
  (pending) => { if (pending) modal.value = 'drop' },
)

function openAdd(kind) {
  modal.value = kind
}

function closeModal() {
  modal.value = null
  dragState.pending = null
}
</script>

<template>
  <div class="flex flex-1 gap-2 py-3">
    <!-- ─────────── 좌측 컬럼 ─────────── -->
    <div class="flex w-[247px] shrink-0 flex-col gap-2.5">
      <!-- 빠른 저작 -->
      <section class="shrink-0 rounded-lg border border-border-default bg-surface-card px-3 py-2">
        <h2 class="text-title-sm font-semibold">빠른 저작</h2>
        <div class="mt-2.5 grid grid-cols-2 gap-2.5">
          <button
            v-for="item in quickAuthoringItems"
            :key="item.id"
            class="flex h-15 flex-col items-center justify-center gap-1 rounded-lg border border-border-default p-2 text-label font-medium text-text-primary active:bg-surface-card-pressed"
          >
            <component :is="item.icon" :size="24" class="shrink-0" />
            <span>{{ item.label }}</span>
          </button>
        </div>
      </section>

      <!-- 미배정 -->
      <section class="flex min-h-0 flex-1 flex-col rounded-lg border border-border-default bg-surface-card px-3 py-2">
        <div class="flex h-11 shrink-0 items-center justify-between">
          <h2 class="text-title-sm font-semibold">미배정 · {{ tasks.length }}</h2>
          <button
            class="flex h-11 items-center gap-1 pl-2 text-label font-medium text-text-secondary active:text-text-primary"
            @click="openAdd('add-task')"
          >
            <Plus :size="16" class="shrink-0" />
            <span>할 일 추가</span>
          </button>
        </div>

        <ul class="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto">
          <li
            v-for="task in tasks"
            :key="task.id"
            class="flex h-13 shrink-0 flex-col justify-center border-t border-border-default"
          >
            <button
              class="flex h-12 w-full touch-manipulation select-none flex-col justify-center gap-0.5 rounded-lg p-2 text-left transition-colors duration-100 ease-standard active:bg-surface-card-pressed"
              :class="dragState.item?.id === task.id ? 'bg-surface-card-pressed' : ''"
              @pointerdown="startPress($event, task, 'task')"
              @pointermove="trackPress"
              @pointercancel="cancelDrag"
              @contextmenu.prevent
            >
              <span class="truncate text-body text-text-primary">{{ task.title }}</span>
              <span v-if="task.category || task.due" class="truncate text-caption text-text-secondary">
                <template v-if="task.category">{{ task.category }}</template>
                <template v-if="task.category && task.due"> · </template>
                <span v-if="task.due" :class="task.overdue ? 'text-indicator-warning' : ''">{{ task.due }}</span>
              </span>
            </button>
          </li>
        </ul>
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
          class="flex h-13 items-start gap-2 border-t border-border-default py-1 transition-opacity duration-150 ease-standard"
          :class="dropState(row) === 'blocked' ? 'opacity-60' : ''"
        >
          <span class="shrink-0 text-caption" :class="hourClass(row)">{{ row.hour }}</span>

          <button
            v-if="row.event"
            class="flex min-h-11 flex-1 items-center gap-3 overflow-hidden rounded-lg border pr-3 text-left transition-colors duration-150 ease-standard"
            :class="dropState(row) === 'blocked'
              ? 'border-text-disabled bg-danger-bg'
              : 'border-transparent bg-surface-container'"
          >
            <!-- 바는 항상 자리를 차지한다. 미표시일 때만 투명 처리해 텍스트 정렬을 유지 -->
            <span
              class="w-2 shrink-0 self-stretch"
              :class="!row.event.bar
                ? 'invisible'
                : (isPast(row) || dropState(row) === 'blocked'
                  ? 'bg-border-default'
                  : 'bg-border-strong')"
            ></span>

            <span class="flex min-w-0 flex-1 flex-col gap-1">
              <span
                class="truncate text-title-sm font-semibold"
                :class="isPast(row) || dropState(row) === 'blocked'
                  ? 'text-text-secondary'
                  : 'text-text-primary'"
              >
                {{ row.event.title }}
              </span>
              <!-- 지난 일정 메타도 secondary. Figma는 disabled이지만 13px 본문 대비가 3.02로 낮아 격상 -->
              <span v-if="row.event.meta" class="truncate text-label font-medium text-text-secondary">
                {{ row.event.meta }}
              </span>
            </span>

            <span v-if="row.event.badge" class="shrink-0 text-caption font-bold text-interactive-default">
              {{ row.event.badge }}
            </span>
          </button>

          <!--
            빈 행의 블록은 항상 렌더한다. v-if로 새로 붙이면 전환 없이 즉시 나타나
            일정이 있는 행(색 전환 150ms)보다 빨라 보인다
          -->
          <div
            v-else
            :data-drop-hour="dropState(row) === 'active' ? row.hour : null"
            class="flex min-h-11 flex-1 items-center overflow-hidden rounded-lg border transition duration-150 ease-standard"
            :class="[
              dropState(row) === 'active' ? 'border-dashed border-border-selected bg-selected-bg' : '',
              dropState(row) === 'blocked' ? 'border-text-disabled bg-danger-bg' : '',
              !dropState(row) ? 'border-transparent' : '',
              isFaded(row) ? 'opacity-40' : '',
            ]"
          >
            <span
              class="w-2 shrink-0 self-stretch transition duration-150 ease-standard"
              :class="dropState(row) === 'active' ? 'bg-border-selected' : 'bg-transparent'"
            ></span>
          </div>
        </div>
      </div>
    </section>

    <ScheduleEntryModal
      v-if="modal"
      :mode="modal"
      :date-key="day.key"
      :date-options="openDates"
      :drop="dragState.pending"
      @close="closeModal"
    />
  </div>
</template>
