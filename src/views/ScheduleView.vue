<script setup>
import { computed } from 'vue'
import { ChevronLeft, ChevronRight, Plus } from 'lucide-vue-next'
import { calendarMonth, buildMonthCells } from '../mocks/calendar.js'

const WEEKDAYS = ['월', '화', '수', '목', '금', '토', '일']

const cells = computed(() => buildMonthCells(calendarMonth))

/* 셀에는 두 건까지만 보이고 나머지는 접힌다 */
const visibleEvents = (events) => events.slice(0, 2)
const overflowCount = (events) => Math.max(0, events.length - 2)
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
      <div class="grid min-h-0 flex-1 grid-cols-7 grid-rows-6 overflow-hidden rounded-lg bg-surface-container">
        <div
          v-for="(cell, i) in cells"
          :key="cell.key"
          class="flex min-h-0 flex-col gap-1 overflow-hidden p-2"
          :class="[
            i % 7 !== 6 ? 'border-r border-border-subtle' : '',
            i < 35 ? 'border-b border-border-subtle' : '',
          ]"
        >
          <!-- 날짜 · 오늘 · 접힌 건수 -->
          <div class="flex shrink-0 items-baseline gap-1">
            <span
              class="text-label font-medium"
              :class="cell.isToday
                ? 'text-interactive-default'
                : cell.dimmed ? 'text-text-disabled' : 'text-text-primary'"
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
