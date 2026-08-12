<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import {
  ClipboardList, CalendarDays, Users, TrendingUp, PenTool,
  Bell, Settings, Sun, Moon,
  Search, User, ChevronRight, ArrowUpDown,
} from 'lucide-vue-next'
import { recentPatients, allPatients } from './mocks/patients.js'
import { dragState, LONG_PRESS_MS, PRESS_MOVE_TOLERANCE } from './dragState.js'

const navGroups = [
  [
    { label: '업무',       to: '/',              icon: ClipboardList },
    { label: '일정',       to: '/schedule',      icon: CalendarDays },
    { label: '환자 분석',   to: '/patients',      icon: Users },
  ],
  [
    { label: '효과성 분석', to: '/effectiveness', icon: TrendingUp },
    { label: '저작도구',    to: '/authoring',     icon: PenTool },
  ],
]

const isDark = ref(false)
function setTheme(dark) {
  isDark.value = dark
  document.documentElement.classList.toggle('dark', dark)
}

/* ── 환자 꾹 누르기 → 일정 배치 모드 ────────────────────────────── */
let pressTimer = null
let pressOrigin = null

function startPress(event, patient) {
  pressOrigin = { x: event.clientX, y: event.clientY }
  pressTimer = setTimeout(() => {
    dragState.patient = patient
    pressTimer = null
  }, LONG_PRESS_MS)
}

/* 임계 시간 전에 손가락이 움직이면 스크롤 의도이므로 넘겨준다 */
function trackPress(event) {
  if (!pressTimer || !pressOrigin) return
  const dx = event.clientX - pressOrigin.x
  const dy = event.clientY - pressOrigin.y
  if (Math.hypot(dx, dy) > PRESS_MOVE_TOLERANCE) cancelPress()
}

function cancelPress() {
  if (pressTimer) clearTimeout(pressTimer)
  pressTimer = null
  pressOrigin = null
}

function endPress() {
  cancelPress()
  dragState.patient = null
}

/* 행 밖에서 손을 떼도 배치 모드가 풀려야 한다 */
onMounted(() => window.addEventListener('pointerup', endPress))
onUnmounted(() => {
  window.removeEventListener('pointerup', endPress)
  cancelPress()
})
</script>

<template>
  <div class="flex h-dvh gap-6 overflow-hidden bg-surface-canvas p-6 text-text-primary">
    <!-- 좌: 네비게이션 -->
<nav class="flex w-[137px] shrink-0 flex-col overflow-y-auto pt-3">
  <!-- 상단 메뉴 -->
  <div class="flex flex-col gap-4">
    <template v-for="(group, gi) in navGroups" :key="gi">
      <hr v-if="gi > 0" class="border-border-default" />
      <div class="flex flex-col gap-2">
        <RouterLink
          v-for="item in group"
          :key="item.to"
          :to="item.to"
          class="flex h-12 items-center gap-2 whitespace-nowrap rounded-lg px-2.5 text-label font-medium"
          :class="$route.path === item.to
            ? 'bg-surface-inverse text-text-inverse'
            : 'text-text-secondary'"
        >
          <component :is="item.icon" :size="24" class="shrink-0" />
          <span>{{ item.label }}</span>
        </RouterLink>
      </div>
    </template>
  </div>

  <div class="flex-1"></div>

  <!-- 하단 유틸리티 -->
  <div class="flex flex-col items-start gap-1 px-1">
    <!-- 프로필 -->
    <div class="flex h-[52px] items-center gap-1.5 whitespace-nowrap">
      <div class="size-9 shrink-0 rounded-full bg-surface-field"></div>
      <div class="leading-tight">
        <div class="text-label font-medium">강치유</div>
        <div class="text-count font-normal text-text-secondary">중앙대학교 병원</div>
      </div>
    </div>

    <!-- 알림 / 설정 -->
    <button class="flex h-11 items-center gap-3 whitespace-nowrap rounded-lg px-1 text-text-secondary">
      <Bell :size="16" class="shrink-0" />
      <span>알림</span>
    </button>
    <button class="flex h-11 items-center gap-3 whitespace-nowrap rounded-lg px-1 text-text-secondary">
      <Settings :size="16" class="shrink-0" />
      <span>설정</span>
    </button>

    <!-- 테마 토글 -->
    <div class="flex h-11 w-[117px] gap-1 rounded-lg bg-surface-field p-1">
      <button
        class="flex h-9 flex-1 items-center justify-center rounded"
        :class="!isDark ? 'bg-surface-card text-text-primary' : 'text-text-secondary'"
        @click="setTheme(false)"
      >
        <Sun :size="16" />
      </button>
      <button
        class="flex h-9 flex-1 items-center justify-center rounded"
        :class="isDark ? 'bg-surface-card text-text-primary' : 'text-text-secondary'"
        @click="setTheme(true)"
      >
        <Moon :size="16" />
      </button>
    </div>
  </div>
</nav>

    <!-- 중앙 -->
    <main class="flex flex-1 gap-2 overflow-y-auto rounded-2xl bg-surface-container px-9">
      <RouterView />
    </main>

    <!-- 우: 환자 패널 -->
    <aside class="flex w-[274px] shrink-0 flex-col gap-1 overflow-y-auto rounded-2xl bg-surface-container px-6 py-4">
      <!-- 검색 -->
      <button class="mx-3 flex h-11 shrink-0 items-center gap-4 rounded-lg border border-border-default bg-surface-field px-3 text-text-disabled active:bg-surface-pressed">
        <Search :size="20" class="shrink-0" />
        <span class="text-body">환자 검색</span>
      </button>

      <!-- 최근 환자 -->
      <section class="flex shrink-0 flex-col gap-2 pl-3 pt-1 pb-3">
        <h2 class="flex h-11 items-center pl-1 text-label font-medium text-text-secondary">최근 환자</h2>
        <button
          v-for="p in recentPatients"
          :key="p.id"
          class="flex touch-manipulation select-none items-center gap-2 rounded-lg py-2 pl-1 text-left transition-colors duration-100 ease-standard active:bg-surface-pressed"
          :class="dragState.patient?.id === p.id ? 'bg-surface-pressed' : ''"
          @pointerdown="startPress($event, p)"
          @pointermove="trackPress"
          @pointercancel="endPress"
          @contextmenu.prevent
        >
          <span class="flex size-10 shrink-0 items-center justify-center rounded-full bg-surface-canvas text-text-secondary">
            <User :size="24" />
          </span>
          <span class="flex min-w-0 flex-1 flex-col gap-1">
            <span class="truncate text-title-sm font-semibold"
              >{{ p.name }}<span class="text-caption font-normal text-text-secondary">&nbsp;{{ p.age }}·{{ p.sex }}</span></span>
            <span class="truncate text-label font-medium"
              >{{ p.condition }}<span class="text-caption font-normal text-text-secondary">&nbsp;&nbsp;{{ p.status }}</span></span>
          </span>
        </button>
      </section>

      <div class="h-px shrink-0 bg-border-default"></div>

      <!-- 전체 환자 -->
      <section class="flex shrink-0 flex-col gap-2 pl-3 pt-2 pb-3">
        <!-- 행 텍스트는 우측 여백까지 쓰지만, 헤더의 정렬 버튼은 안쪽에 둔다 -->
        <div class="flex h-11 items-center gap-2 pl-1 pr-3">
          <h2 class="text-label font-medium text-text-secondary">전체 환자</h2>
          <ChevronRight :size="16" class="shrink-0 text-text-secondary" />
          <div class="flex-1"></div>
          <button class="flex size-11 shrink-0 items-center justify-center rounded-lg text-text-secondary active:bg-surface-pressed">
            <ArrowUpDown :size="16" />
          </button>
        </div>
        <button
          v-for="p in allPatients"
          :key="p.id"
          class="flex touch-manipulation select-none items-center gap-2 rounded-lg py-2 pl-1 text-left transition-colors duration-100 ease-standard active:bg-surface-pressed"
          :class="dragState.patient?.id === p.id ? 'bg-surface-pressed' : ''"
          @pointerdown="startPress($event, p)"
          @pointermove="trackPress"
          @pointercancel="endPress"
          @contextmenu.prevent
        >
          <span class="flex size-10 shrink-0 items-center justify-center rounded-full bg-surface-canvas text-text-secondary">
            <User :size="24" />
          </span>
          <span class="flex min-w-0 flex-1 flex-col gap-1">
            <span class="truncate text-title-sm font-semibold"
              >{{ p.name }}<span class="text-caption font-normal text-text-secondary">&nbsp;{{ p.age }}·{{ p.sex }}</span></span>
            <span class="truncate text-label font-medium"
              >{{ p.condition }}<span class="text-caption font-normal text-text-secondary">&nbsp;&nbsp;{{ p.status }}</span></span>
          </span>
        </button>
      </section>
    </aside>
  </div>
</template>