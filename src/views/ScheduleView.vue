<script setup>
import { ref, computed } from 'vue'
import { ChevronLeft, ChevronRight, ChevronRight as Caret, Plus } from 'lucide-vue-next'
import { calendarMonth, buildMonthCells } from '../mocks/calendar.js'
import { dayLabel, TODAY_KEY, NOW_HOUR } from '../mocks/schedule.js'

const WEEKDAYS = ['월', '화', '수', '목', '금', '토', '일']

const cells = computed(() => buildMonthCells(calendarMonth))

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
        <button class="flex h-11 items-center gap-1 pl-2 text-label font-medium text-text-secondary active:text-text-primary">
          <Plus :size="16" class="shrink-0" />
          <span>일정 추가</span>
        </button>
      </div>

      <!-- 요일 머리 -->
      <div class="grid shrink-0 grid-cols-7 pb-2">
        <div v-for="d in WEEKDAYS" :key="d" class="text-center text-count text-text-secondary">
          {{ d }}
        </div>
      </div>

      <!--
        Figma는 셀을 따로 그리지 않는다. 배경을 한 장 깔고 구분선으로만 나눈다.
        그래서 셀에는 라운드도 개별 배경도 없다.
      -->
      <!--
        격자 전체를 subtle로 채우고 셀을 container로 덮는다. 1px 간격에서
        subtle이 비쳐 구분선이 되는 구조라 셀에 border를 그리지 않는다.
      -->
      <div class="grid min-h-0 flex-1 grid-cols-7 grid-rows-6 gap-px overflow-hidden rounded-lg bg-border-subtle">
        <button
          v-for="cell in cells"
          :key="cell.key"
          class="flex min-h-0 flex-col gap-1 overflow-hidden p-2 text-left"
          :class="[
            cell.dimmed ? 'opacity-40' : '',
            popover?.cell.key === cell.key
              ? 'border-2 border-border-selected bg-selected-bg'
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
            <button class="flex h-11 items-center gap-1 text-label font-medium text-text-secondary active:text-text-primary">
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
  </div>
</template>
