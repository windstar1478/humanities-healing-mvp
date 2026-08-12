<script setup>
import { ref } from 'vue'
import {
  ClipboardList, CalendarDays, Users, TrendingUp, PenTool,
  Bell, Settings, Sun, Moon,
} from 'lucide-vue-next'

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
    <aside class="w-[274px] shrink-0 overflow-y-auto rounded-2xl bg-surface-container p-4">
      환자 패널
    </aside>
  </div>
</template>