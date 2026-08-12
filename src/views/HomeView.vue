<script setup>
import { reactive, watch, onMounted, onUnmounted } from 'vue'
import { ChevronLeft, ChevronRight, Plus } from 'lucide-vue-next'
import {
  quickAuthoringItems,
  unassignedTasks,
  scheduleDate,
  scheduleRows,
} from '../mocks/home.js'
import { dragState } from '../dragState.js'

/* 배치로 일정이 늘어나므로 목업을 복사해 화면 상태로 들고 있는다 */
const rows = reactive(scheduleRows.map((row) => ({ ...row })))

/* 지난 일정만 명도를 낮춘다. 진행 중은 accent 배지로 구분한다 */
const isPast = (row) => row.state === 'past'

/*
 * 환자를 집어 든 동안에만 드롭 상태를 계산한다.
 * 일정이 이미 있거나 지난 시간이면 놓을 수 없다.
 */
function dropState(row) {
  if (!dragState.patient) return null
  return row.event || isPast(row) ? 'blocked' : 'active'
}

function hourClass(row) {
  if (dropState(row) === 'active') return 'text-text-primary'
  return isPast(row) ? 'text-text-disabled' : 'text-text-secondary'
}

/* ── 배치 확인 ──────────────────────────────────────────────────
 * 오토세이브 없음 규칙에 따라 놓는 즉시 확정하지 않고 확인을 받는다.
 * 이 모달은 Figma에 화면이 없어 초안이다.
 */
let modalEntryPushed = false

/* PWA standalone에는 뒤로가기가 없으므로 제스처 뒤로가기로 닫히도록 등록한다 */
watch(
  () => dragState.pending,
  (pending) => {
    if (!pending || modalEntryPushed) return
    history.pushState({ modal: 'drop-confirm' }, '')
    modalEntryPushed = true
  },
)

function onPopState() {
  modalEntryPushed = false
  dragState.pending = null
}

function dismiss() {
  dragState.pending = null
  if (modalEntryPushed) {
    modalEntryPushed = false
    history.back()
  }
}

function confirmDrop() {
  const { patient, hour } = dragState.pending
  const row = rows.find((r) => r.hour === hour)
  if (row) {
    row.event = {
      id: `ev-${patient.id}-${hour}`,
      title: patient.name,
      meta: `${patient.condition} · ${patient.status}`,
      bar: true,
      badge: null,
    }
  }
  dismiss()
}

onMounted(() => window.addEventListener('popstate', onPopState))
onUnmounted(() => window.removeEventListener('popstate', onPopState))
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

          <!-- 빈 행은 배치 모드에서만 드롭 타깃으로 그려진다 -->
          <div
            v-else-if="dropState(row)"
            :data-drop-hour="dropState(row) === 'active' ? row.hour : null"
            class="flex min-h-11 flex-1 items-center overflow-hidden rounded-lg border"
            :class="dropState(row) === 'active'
              ? 'border-dashed border-border-selected bg-selected-bg'
              : 'border-text-disabled bg-danger-bg'"
          >
            <span
              class="w-2 shrink-0 self-stretch"
              :class="dropState(row) === 'active' ? 'bg-border-selected' : 'invisible'"
            ></span>
          </div>
        </div>
      </div>
    </section>

    <!-- 배치 확인. Figma 화면이 없는 초안이다 -->
    <Teleport to="body">
      <div
        v-if="dragState.pending"
        class="fixed inset-0 z-50 flex items-center justify-center p-6"
        :style="{ backgroundColor: 'var(--scrim)' }"
        @click.self="dismiss"
      >
        <div class="w-[360px] rounded-2xl border border-border-default bg-surface-card px-6 py-5">
          <h2 class="text-title-sm font-semibold">이 시간에 배치할까요?</h2>
          <p class="mt-2 text-body text-text-secondary">
            {{ dragState.pending.hour }} · {{ dragState.pending.patient.name }}
            ({{ dragState.pending.patient.condition }})
          </p>
          <div class="mt-5 flex justify-end gap-2">
            <button class="flex h-11 items-center" @click="dismiss">
              <span class="flex h-9 items-center rounded-lg border border-border-default px-3 text-body">
                취소
              </span>
            </button>
            <button class="flex h-11 items-center" @click="confirmDrop">
              <span class="flex h-9 items-center rounded-lg bg-interactive-primary-fill px-3 text-body text-text-on-dark-fill">
                배치
              </span>
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>
