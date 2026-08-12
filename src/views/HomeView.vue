<script setup>
import { ref } from 'vue'
import { ChevronLeft, ChevronRight, Plus } from 'lucide-vue-next'
import {
  quickAuthoringItems,
  unassignedTasks,
  scheduleDate,
  scheduleRows,
  selectedEventId,
} from '../mocks/home.js'

const selectedId = ref(selectedEventId)

const hourColor = {
  past: 'text-text-disabled',
  current: 'text-text-primary',
  upcoming: 'text-text-secondary',
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
          <h2 class="text-title-sm font-semibold">미배정 · {{ unassignedTasks.length }}</h2>
          <button class="flex h-11 items-center gap-1 pl-2 text-label font-medium text-text-secondary active:text-text-primary">
            <Plus :size="16" class="shrink-0" />
            <span>할 일 추가</span>
          </button>
        </div>

        <ul class="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto">
          <li
            v-for="task in unassignedTasks"
            :key="task.id"
            class="flex h-13 shrink-0 flex-col justify-center border-t border-border-default"
          >
            <button class="flex h-12 w-full flex-col justify-center gap-0.5 rounded-lg p-2 text-left active:bg-surface-card-pressed">
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
        <button class="flex size-11 items-center justify-center rounded-lg text-text-secondary active:bg-surface-pressed">
          <ChevronLeft :size="24" />
        </button>
        <span class="text-title-sm font-semibold">{{ scheduleDate }}</span>
        <button class="flex size-11 items-center justify-center rounded-lg text-text-secondary active:bg-surface-pressed">
          <ChevronRight :size="24" />
        </button>
      </div>

      <!-- 오늘 / 일정 추가 -->
      <div class="flex h-11 shrink-0 items-center justify-between">
        <span class="text-label font-medium text-text-secondary">오늘</span>
        <button class="flex h-11 items-center gap-1 pl-2 text-label font-medium text-text-secondary active:text-text-primary">
          <Plus :size="16" class="shrink-0" />
          <span>일정 추가</span>
        </button>
      </div>

      <!-- 타임라인 -->
      <div class="min-h-0 flex-1 overflow-y-auto">
        <div
          v-for="row in scheduleRows"
          :key="row.hour"
          class="flex h-13 items-start gap-2 border-t border-border-default py-1"
        >
          <span class="shrink-0 text-caption" :class="hourColor[row.state]">{{ row.hour }}</span>

          <button
            v-if="row.event"
            class="flex min-h-11 flex-1 items-center gap-3 overflow-hidden rounded-lg pr-3 text-left"
            :class="row.event.id === selectedId ? 'bg-selected-bg' : 'bg-surface-container'"
            @click="selectedId = row.event.id"
          >
            <!-- 바는 항상 자리를 차지한다. 미표시일 때만 투명 처리해 텍스트 정렬을 유지 -->
            <span
              class="w-2 shrink-0 self-stretch"
              :class="row.event.bar
                ? (row.event.id === selectedId ? 'bg-border-selected' : 'bg-border-default')
                : 'invisible'"
            ></span>

            <span class="flex min-w-0 flex-1 flex-col gap-1">
              <span
                class="truncate text-title-sm font-semibold"
                :class="row.state === 'past' ? 'text-text-secondary' : 'text-text-primary'"
              >
                {{ row.event.title }}
              </span>
              <span
                v-if="row.event.meta"
                class="truncate text-label font-medium"
                :class="row.state === 'past' ? 'text-text-disabled' : 'text-text-secondary'"
              >
                {{ row.event.meta }}
              </span>
            </span>

            <span v-if="row.event.badge" class="shrink-0 text-caption text-text-primary">
              {{ row.event.badge }}
            </span>
          </button>
        </div>
      </div>
    </section>
  </div>
</template>
