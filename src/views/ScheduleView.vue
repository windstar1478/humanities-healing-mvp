<script setup>
import { ref, computed } from 'vue'
import { ChevronLeft, ChevronRight, ChevronRight as Caret, Plus } from 'lucide-vue-next'
import { calendarMonth } from '../mocks/calendar.js'
import { dayLabel, TODAY_KEY, NOW_HOUR } from '../mocks/schedule.js'
import { monthCells, canDropOn } from '../scheduleState.js'
import { dragState } from '../dragState.js'
import ScheduleEntryModal from '../components/ScheduleEntryModal.vue'

const WEEKDAYS = ['월', '화', '수', '목', '금', '토', '일']

const cells = computed(() => monthCells(calendarMonth))

/* 팝오버의 '일정 추가'가 여는 모달. 날짜만 넘기면 규칙은 모달이 갖는다 */
const addOnKey = ref(null)

/*
 * 캘린더는 날짜 칸이 드롭 단위다. 빈 시간이 하나도 없거나 지난 날이면 놓을 수 없다.
 * 시간은 확인 모달에서 고른다 — 아젠다와 같은 문법이되 단위만 날짜다.
 */
function dropState(cell) {
  if (!dragState.item) return null
  return canDropOn(cell.key) ? 'active' : 'blocked'
}

function isFaded(cell) {
  return dropState(cell) === 'active' && dragState.hoverDate && dragState.hoverDate !== cell.key
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
  if (!cell.events.length) return
  const r = event.currentTarget.getBoundingClientRect()
  popover.value = { cell, anchor: { right: r.right, top: r.top, height: r.height } }
}

/* 칸 오른쪽에 붙이고 세로는 칸 중앙에 맞춘다. 화면 밖으로는 나가지 않는다 */
const popoverStyle = computed(() => {
  if (!popover.value) return {}
  const WIDTH = 280
  const HEIGHT = 364
  const GAP = 8
  const MARGIN = 24
  const { right, top, height } = popover.value.anchor
  const left = Math.min(right + GAP, window.innerWidth - WIDTH - MARGIN)
  const wanted = top + height / 2 - HEIGHT / 2
  const maxTop = window.innerHeight - HEIGHT - MARGIN
  return {
    left: `${Math.max(MARGIN, left)}px`,
    top: `${Math.min(Math.max(MARGIN, wanted), maxTop)}px`,
    width: `${WIDTH}px`,
  }
})

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
          @click="addOnKey = TODAY_KEY"
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
            class="text-center text-count text-text-secondary opacity-40"
          >
            {{ d }}
          </div>
        </div>

        <div class="grid min-h-0 flex-1 grid-cols-7 grid-rows-6 gap-px overflow-hidden">
        <button
          v-for="cell in cells"
          :key="cell.key"
          :data-drop-date="dropState(cell) === 'active' ? cell.key : null"
          class="flex min-h-0 flex-col gap-1 overflow-hidden p-2 text-left transition duration-150 ease-standard"
          :class="[
            cell.dimmed ? 'opacity-40' : '',
            isFaded(cell) ? 'opacity-40' : '',
            dropState(cell) === 'active'
              ? 'bg-selected-bg ring-2 ring-inset ring-border-selected'
              : dropState(cell) === 'blocked'
                ? 'bg-danger-bg opacity-60 ring-1 ring-inset ring-text-disabled'
                : popover?.cell.key === cell.key
                  ? 'bg-selected-bg ring-2 ring-inset ring-border-selected'
                  : 'bg-surface-container',
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
        <div
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
              @click="addOnKey = popover.cell.key; popover = null"
            >
              <Plus :size="16" class="shrink-0" />
              <span>일정 추가</span>
            </button>
          </div>

          <div class="min-h-0 flex-1 overflow-y-auto px-3 pb-3">
            <div
              v-for="(event, i) in popover.cell.events"
              :key="i"
              class="flex min-h-11 items-center gap-2 py-1"
              :class="i > 0 ? 'border-t border-border-subtle' : ''"
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
                  class="truncate text-body font-medium"
                  :class="isPastEvent(popover.cell.key, event.hour) ? 'text-text-secondary' : 'text-text-primary'"
                >
                  {{ event.title }}
                </span>
                <span v-if="event.meta" class="truncate text-caption text-text-secondary">
                  {{ event.meta }}
                </span>
              </span>
              <!-- 환자 일정만 상세로 들어간다 -->
              <Caret v-if="event.bar" :size="16" class="shrink-0 text-text-secondary" />
            </div>
          </div>
        </div>
      </div>
    </Teleport>

    <ScheduleEntryModal
      v-if="addOnKey"
      mode="add-event"
      :date-key="addOnKey"
      @close="addOnKey = null"
    />

    <!-- 날짜 칸에 놓았을 때. 시간은 모달에서 고른다 -->
    <ScheduleEntryModal
      v-if="dragState.pending?.dateKey"
      mode="drop"
      :date-key="dragState.pending.dateKey"
      :drop="dragState.pending"
      @close="dragState.pending = null"
    />
  </div>
</template>
