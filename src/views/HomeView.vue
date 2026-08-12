<script setup>
import { ref, computed, reactive, watch, onMounted, onUnmounted } from 'vue'
import { ChevronLeft, ChevronRight, Plus } from 'lucide-vue-next'
import {
  quickAuthoringItems,
  unassignedTasks,
  scheduleDays,
  GENERAL,
  PROCESS,
} from '../mocks/home.js'
import { dragState, startPress, trackPress, cancelDrag } from '../dragState.js'

/* 배치·추가로 목록이 늘어나므로 목업을 복사해 화면 상태로 들고 있는다 */
const days = reactive(
  scheduleDays.map((day) => ({ ...day, rows: day.rows.map((row) => ({ ...row })) })),
)
const tasks = reactive(unassignedTasks.map((task) => ({ ...task })))

const dayIndex = ref(Math.max(0, days.findIndex((d) => d.isToday)))
const day = computed(() => days[dayIndex.value])
const rows = computed(() => day.value.rows)

function goDay(step) {
  const next = dayIndex.value + step
  if (next >= 0 && next < days.length) dayIndex.value = next
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
 * 배치 확인 · 일정 추가 · 할 일 추가가 같은 셸을 쓴다.
 * 오토세이브 없음 규칙에 따라 어느 쪽도 즉시 확정하지 않는다.
 * Figma에 화면이 없는 초안이다.
 */
let modalEntryPushed = false

/* 'drop' | 'add-event' | 'add-task' */
const modal = ref(null)
const form = reactive({ title: '', category: '', hour: null })

/* 중복 배치 경고. 확인하고 나면 그대로 진행한다 */
const duplicate = ref(null)

/* 일반 상담인지 치유 프로세스인지. 단계 자체는 고르지 않는다 */
const visitType = ref(PROCESS)

/* 비어 있고 지나지 않은 시간만 고를 수 있다 — 드롭 규칙과 동일 */
const openHours = computed(() =>
  rows.value.filter((r) => !r.event && !isPast(r)).map((r) => r.hour),
)

const nextStep = computed(() => dragState.pending?.item?.nextStep ?? null)

const canConfirm = computed(() => {
  if (modal.value === 'add-task') return form.title.trim().length > 0
  if (modal.value === 'add-event') return form.title.trim().length > 0 && Boolean(form.hour)
  if (dragState.pending?.itemKind !== 'patient') return true
  return visitType.value === GENERAL || Boolean(nextStep.value)
})

/* PWA standalone에는 뒤로가기가 없으므로 제스처 뒤로가기로 닫히도록 등록한다 */
function pushEntry() {
  if (modalEntryPushed) return
  history.pushState({ modal: modal.value }, '')
  modalEntryPushed = true
}

function openAdd(kind) {
  modal.value = kind
  duplicate.value = null
  form.title = ''
  form.category = ''
  form.hour = openHours.value[0] ?? null
  pushEntry()
}

watch(
  () => dragState.pending,
  (pending) => {
    if (!pending) return
    modal.value = 'drop'
    duplicate.value = null
    visitType.value = pending.item?.nextStep ? PROCESS : GENERAL
    pushEntry()
  },
)

function closeModal() {
  modal.value = null
  duplicate.value = null
  dragState.pending = null
}

function onPopState() {
  modalEntryPushed = false
  closeModal()
}

function dismiss() {
  closeModal()
  if (modalEntryPushed) {
    modalEntryPushed = false
    history.back()
  }
}

/* 같은 날 같은 대상이 이미 배치되어 있는지 */
function findDuplicate(name) {
  return rows.value.find((r) => r.event?.title === name) ?? null
}

function place(hour, event) {
  const row = rows.value.find((r) => r.hour === hour)
  if (row) row.event = event
  dismiss()
}

/*
 * 일정은 환자의 현재 상태를 참조하지 않고 그때 무엇을 했는지를 자기 데이터로 갖는다.
 * 그래서 같은 환자라도 날짜마다 다른 단계를 가질 수 있다.
 */
function confirmDrop() {
  const { item, itemKind, hour } = dragState.pending
  const name = itemKind === 'patient' ? item.name : item.title
  if (!duplicate.value) {
    const found = findDuplicate(name)
    if (found) {
      duplicate.value = found
      return
    }
  }
  place(hour, {
    id: `ev-${item.id}-${day.value.label}-${hour}`,
    title: name,
    meta: itemKind === 'patient'
      ? `${item.condition} · ${visitType.value === PROCESS ? nextStep.value : GENERAL}`
      : item.category,
    bar: itemKind === 'patient',
    badge: null,
  })
}

function confirmAddEvent() {
  const name = form.title.trim()
  if (!duplicate.value) {
    const found = findDuplicate(name)
    if (found) {
      duplicate.value = found
      return
    }
  }
  place(form.hour, {
    id: `ev-new-${day.value.label}-${form.hour}`,
    title: name,
    meta: form.category.trim() || null,
    bar: false,
    badge: null,
  })
}

function confirmAddTask() {
  tasks.push({
    id: `task-${Date.now()}`,
    title: form.title.trim(),
    category: form.category.trim() || null,
    due: null,
    overdue: false,
  })
  dismiss()
}

function confirm() {
  if (modal.value === 'add-task') return confirmAddTask()
  if (modal.value === 'add-event') return confirmAddEvent()
  return confirmDrop()
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
          :class="dayIndex === days.length - 1 ? 'text-text-disabled' : 'text-text-secondary'"
          :disabled="dayIndex === days.length - 1"
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

    <!--
      배치 확인 · 일정 추가 · 할 일 추가가 같은 셸을 쓴다.
      Figma 화면이 없는 초안이다.
    -->
    <Teleport to="body">
      <div
        v-if="modal"
        class="fixed inset-0 z-50 flex items-center justify-center p-6"
        :style="{ backgroundColor: 'var(--scrim)' }"
        @click.self="dismiss"
      >
        <div class="w-[360px] rounded-2xl border border-border-default bg-surface-card px-6 py-5">
          <!-- 중복 경고. 확인을 거치면 원래 흐름으로 돌아간다 -->
          <template v-if="duplicate">
            <h2 class="text-title-sm font-semibold">이미 배치된 대상입니다</h2>
            <p class="mt-2 text-body text-text-secondary">
              {{ day.label }} {{ duplicate.hour }}에 <span class="text-text-primary">{{ duplicate.event.title }}</span> 일정이
              이미 있습니다. 그래도 배치할까요?
            </p>
          </template>

          <template v-else>
            <h2 class="text-title-sm font-semibold">
              {{ modal === 'add-task' ? '할 일 추가' : modal === 'add-event' ? '일정 추가' : '이 시간에 배치할까요?' }}
            </h2>

            <!-- 배치 확인 -->
            <template v-if="modal === 'drop'">
              <p class="mt-2 text-body text-text-secondary">
                {{ day.label }} {{ dragState.pending.hour }} ·
                <template v-if="dragState.pending.itemKind === 'patient'">
                  {{ dragState.pending.item.name }} ({{ dragState.pending.item.condition }})
                </template>
                <template v-else>{{ dragState.pending.item.title }}</template>
              </p>

              <!-- 환자만 유형을 고른다. 할 일은 그대로 배치된다 -->
              <template v-if="dragState.pending.itemKind === 'patient'">
                <p class="mt-4 text-label font-medium text-text-secondary">유형</p>
                <div class="mt-2 flex flex-wrap gap-2">
                  <button
                    v-for="type in [PROCESS, GENERAL]"
                    :key="type"
                    class="flex h-11 items-center"
                    @click="visitType = type"
                  >
                    <span
                      class="flex h-9 items-center rounded-lg border px-3 text-label"
                      :class="visitType === type
                        ? 'border-border-selected bg-selected-bg text-text-primary'
                        : 'border-border-default text-text-secondary'"
                    >
                      {{ type }}
                    </span>
                  </button>
                </div>

                <!--
                  단계는 고르는 게 아니라 환자 데이터가 정한다.
                  아직 도달하지 않은 단계에 접근하지 못하게 하기 위함이다.
                -->
                <p v-if="visitType === PROCESS" class="mt-3 text-label text-text-secondary">
                  <template v-if="nextStep">다음 단계 · <span class="font-medium text-text-primary">{{ nextStep }}</span></template>
                  <template v-else>남은 프로세스 단계가 없습니다</template>
                </p>
              </template>
            </template>

            <!-- 일정 추가 / 할 일 추가 -->
            <template v-else>
              <p class="mt-4 text-label font-medium text-text-secondary">제목</p>
              <input
                v-model="form.title"
                type="text"
                :placeholder="modal === 'add-task' ? '할 일 이름' : '일정 이름'"
                class="mt-2 h-11 w-full rounded-lg border border-border-default bg-surface-field px-3 text-body text-text-primary placeholder:text-text-disabled"
              />

              <p class="mt-4 text-label font-medium text-text-secondary">
                {{ modal === 'add-task' ? '분류' : '분류 (선택)' }}
              </p>
              <input
                v-model="form.category"
                type="text"
                placeholder="협업 · 보고 · 저작도구 등"
                class="mt-2 h-11 w-full rounded-lg border border-border-default bg-surface-field px-3 text-body text-text-primary placeholder:text-text-disabled"
              />

              <!-- 미배정 할 일은 시간을 갖지 않으므로 일정 추가에만 시간 선택이 있다 -->
              <template v-if="modal === 'add-event'">
                <p class="mt-4 text-label font-medium text-text-secondary">시간</p>
                <div v-if="openHours.length" class="mt-2 flex flex-wrap gap-2">
                  <button
                    v-for="hour in openHours"
                    :key="hour"
                    class="flex h-11 items-center"
                    @click="form.hour = hour"
                  >
                    <span
                      class="flex h-9 items-center rounded-lg border px-3 text-label"
                      :class="form.hour === hour
                        ? 'border-border-selected bg-selected-bg text-text-primary'
                        : 'border-border-default text-text-secondary'"
                    >
                      {{ hour }}
                    </span>
                  </button>
                </div>
                <p v-else class="mt-2 text-label text-text-secondary">비어 있는 시간이 없습니다</p>
              </template>
            </template>
          </template>

          <div class="mt-5 flex justify-end gap-2">
            <button class="flex h-11 items-center" @click="dismiss">
              <span class="flex h-9 items-center rounded-lg border border-border-default px-3 text-body">
                취소
              </span>
            </button>
            <button class="flex h-11 items-center" :disabled="!canConfirm" @click="confirm">
              <span
                class="flex h-9 items-center rounded-lg px-3 text-body"
                :class="canConfirm
                  ? 'bg-surface-inverse text-text-inverse'
                  : 'bg-surface-field text-text-disabled'"
              >
                {{ duplicate ? '그래도 배치' : modal === 'add-task' ? '추가' : '배치' }}
              </span>
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>
