<script setup>
import { computed } from 'vue'
import { ChevronLeft, ChevronRight, Plus } from 'lucide-vue-next'
import { calendarMonth, monthEvents, nextMonthEvents } from '../mocks/calendar.js'

const WEEKDAYS = ['월', '화', '수', '목', '금', '토', '일']

/*
 * 6주 × 7일 = 42칸을 채운다. 앞뒤로 걸친 달의 날짜는 흐리게 표시한다.
 * emphasis: 'normal' | 'dimmed'
 */
const cells = computed(() => {
  const { firstWeekday, daysInMonth, prevMonthDays, today } = calendarMonth
  const out = []

  for (let i = firstWeekday - 1; i > 0; i -= 1) {
    out.push({ date: prevMonthDays - i + 1, dimmed: true, isToday: false, entry: null })
  }
  for (let d = 1; d <= daysInMonth; d += 1) {
    out.push({ date: d, dimmed: false, isToday: d === today, entry: monthEvents[d] ?? null })
  }
  for (let d = 1; out.length < 42; d += 1) {
    out.push({ date: d, dimmed: true, isToday: false, entry: nextMonthEvents[d] ?? null })
  }
  return out
})

/* 셀에는 두 건까지만 보이고 나머지는 접힌다 */
const visibleEvents = (entry) => (entry ? entry.events.slice(0, 2) : [])
const overflowCount = (entry) =>
  entry ? Math.max(0, entry.events.length - 2) + (entry.more ?? 0) : 0
</script>

<template>
  <div class="flex flex-1 flex-col py-3">
    <section class="flex min-h-0 flex-1 flex-col rounded-lg border border-border-default bg-surface-card px-3 py-2">
      <!-- 월 네비게이션 -->
      <div class="flex h-12 shrink-0 items-center justify-center gap-2">
        <button class="flex size-11 items-center justify-center rounded-lg text-text-secondary active:bg-surface-pressed">
          <ChevronLeft :size="24" />
        </button>
        <span class="text-title-sm font-semibold">{{ calendarMonth.label }}</span>
        <button class="flex size-11 items-center justify-center rounded-lg text-text-secondary active:bg-surface-pressed">
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
      <div class="grid shrink-0 grid-cols-7 gap-px">
        <div v-for="day in WEEKDAYS" :key="day" class="h-4 text-center text-count text-text-secondary">
          {{ day }}
        </div>
      </div>

      <!-- 날짜 격자. 셀 사이 1px 간격으로 카드 배경이 비쳐 격자선이 된다 -->
      <div class="mt-px grid min-h-0 flex-1 grid-cols-7 grid-rows-6 gap-px overflow-hidden">
        <div
          v-for="(cell, i) in cells"
          :key="i"
          class="flex flex-col gap-0.5 overflow-hidden rounded-lg bg-surface-container p-1.5"
        >
          <!-- 날짜 · 오늘 · 접힌 건수 -->
          <div class="flex shrink-0 items-end gap-1">
            <span
              class="text-label font-medium"
              :class="[cell.dimmed ? 'text-text-disabled' : 'text-text-primary',
                       cell.isToday ? 'text-interactive-default' : '']"
            >
              {{ cell.date }}
            </span>
            <span v-if="cell.isToday" class="flex-1 text-count text-interactive-default">오늘</span>
            <span v-else class="flex-1"></span>
            <span v-if="overflowCount(cell.entry)" class="shrink-0 text-count text-text-secondary">
              +{{ overflowCount(cell.entry) }}
            </span>
          </div>

          <!-- 일정 -->
          <div v-if="cell.entry" class="flex min-h-0 flex-col gap-0.5 overflow-hidden">
            <div
              v-for="(event, j) in visibleEvents(cell.entry)"
              :key="j"
              class="flex shrink-0 items-center gap-1.5 rounded-sm"
            >
              <!-- 바는 항상 자리를 차지한다. 아젠다와 같은 규칙 -->
              <span
                class="w-[3px] shrink-0 self-stretch rounded-xs"
                :class="event.bar ? 'bg-border-strong' : 'invisible'"
              ></span>
              <span
                class="truncate text-count"
                :class="cell.dimmed ? 'text-text-disabled' : 'text-text-primary'"
              >
                {{ event.title }}
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>
