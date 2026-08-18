<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  ClipboardList, CalendarDays, Users, TrendingUp, PenTool,
  Bell, Settings, Sun, Moon,
  Search, User, ChevronRight, ArrowUpDown, Check, X,
} from 'lucide-vue-next'
import { recentPatients, allPatients } from './mocks/patients.js'
import { dimensions } from './mocks/analysis.js'
import { visitsOf } from './scheduleState.js'
import {
  dragState, startPress, trackPress, trackDrag, endPress, cancelDrag, clearRejected,
  swallowDragClick, beginGesture,
} from './dragState.js'
import InlineCallout from './components/InlineCallout.vue'

/*
 * 좌측 하단 프로필 사진.
 *
 * 파일이 있으면 쓰고 없으면 이름 첫 글자로 대체한다. import.meta.glob으로 찾는 것은
 * 정적 import와 달리 파일이 없어도 빌드가 깨지지 않기 때문이다 — 목업 자산이라
 * 저장소에 항상 들어 있다고 보장할 수 없다.
 * `src/assets/profile.*`에 넣으면 그대로 붙는다(png · jpg · svg · webp).
 */
const profilePhoto = Object.values(
  import.meta.glob('./assets/profile.*', { eager: true, query: '?url', import: 'default' }),
)[0] ?? null

const COUNSELOR = { name: '강치유', hospital: '중앙대학교 병원' }

/*
 * 거부 콜아웃은 손을 뗀 자리 옆에 뜬다. 그 자리가 방금 조작한 곳이라
 * 시선이 이미 거기에 있다. 화면 밖으로는 나가지 않게 가둔다.
 */
const rejectedStyle = computed(() => {
  if (!dragState.rejected) return {}
  const WIDTH = 280
  const HEIGHT = 56
  const GAP = 12
  const MARGIN = 24
  const { x, y } = dragState.rejected
  const left = Math.min(x + GAP, window.innerWidth - WIDTH - MARGIN)
  const top = Math.min(Math.max(MARGIN, y - HEIGHT / 2), window.innerHeight - HEIGHT - MARGIN)
  return { left: `${Math.max(MARGIN, left)}px`, top: `${top}px` }
})

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

/*
 * 하위 경로(전체 환자 리스트)에서도 상위 메뉴가 켜져 있어야 한다.
 * 홈만 완전 일치로 본다 — startsWith로 보면 모든 경로가 걸린다.
 */
const route = useRoute()
function isCurrent(to) {
  return to === '/' ? route.path === '/' : route.path.startsWith(to)
}

/*
 * 패널의 환자도 탭과 꾹 누르기를 모두 받는다.
 * 탭 = 환자 상세, 꾹 누르기 = 배치. 배치로 끝난 제스처의 click은
 * swallowDragClick이 삼키므로 여기서는 신경 쓰지 않는다.
 */
const router = useRouter()
function openPatient(patient) {
  router.push({ path: `/patients/detail/${patient.id}` })
}

/*
 * 패널의 '전체 환자' 정렬.
 *
 * 기준은 **전체 환자 리스트 화면과 같은 둘**이다. 같은 명단을 두 자리에서 보는데
 * 정렬 기준이 다르면 같은 '전체 환자'가 두 순서를 갖는다. 기본값도 가나다순으로
 * 맞췄다 — 목업 배열 순서는 아무 뜻이 없어 읽는 사람이 기준을 짐작할 수 없다.
 *
 * **명단 자체를 정렬하지 않는다.** allPatients는 명단 원본을 그대로 참조하므로
 * 여기서 sort()를 걸면 '최근 환자'(앞 3명)까지 같이 바뀐다.
 */
const PATIENT_SORTS = [
  { key: 'name', label: '가나다순' },
  { key: 'recent', label: '최근 진료순' },
  { key: 'condition', label: '진단순' },
  { key: 'stage', label: '단계순' },
]
const patientSort = ref('name')

/*
 * 진단의 나열 순서는 분석 화면의 진단 축과 같은 배열에서 온다.
 * 여기에 순서를 다시 적으면 차트의 막대 순서와 패널의 정렬이 갈라진다.
 */
const CONDITION_ORDER = dimensions.find((d) => d.id === 'condition').keys

/*
 * 단계 순서도 같은 곳에서 온다. 프로세스의 진행 순서 그대로라
 * 위에서 아래로 읽으면 명단이 프로세스를 따라 늘어선다.
 */
const STAGE_ORDER = dimensions.find((d) => d.id === 'stage').keys
const sortOpen = ref(false)
/* 팝오버는 패널 밖으로 나가야 한다 — aside가 overflow-y-auto라 안에 두면 잘린다 */
const sortAnchor = ref(null)

const byName = (a, b) => a.name.localeCompare(b.name, 'ko')

const sortedPatients = computed(() => {
  const list = [...allPatients]
  if (patientSort.value === 'name') return list.sort(byName)
  /* 같은 진단 안에서는 가나다순이다. 기준이 없으면 순서가 매번 달라 보인다 */
  if (patientSort.value === 'condition') {
    return list.sort((a, b) =>
      CONDITION_ORDER.indexOf(a.condition) - CONDITION_ORDER.indexOf(b.condition) || byName(a, b))
  }
  if (patientSort.value === 'stage') {
    return list.sort((a, b) =>
      STAGE_ORDER.indexOf(a.status) - STAGE_ORDER.indexOf(b.status) || byName(a, b))
  }
  /* 진료가 없는 사람은 뒤로 보낸다 — 최근이라 할 것이 없다. 리스트 화면과 같은 규칙 */
  return list
    .map((patient) => ({ patient, last: visitsOf(patient.name).last }))
    .sort((a, b) => {
      if (a.last === b.last) return 0
      if (!a.last) return 1
      if (!b.last) return -1
      return a.last < b.last ? 1 : -1
    })
    .map((row) => row.patient)
})

/*
 * 패널의 환자 검색.
 *
 * **패널 안에서 거른다.** 리스트 화면으로 보내면 검색 결과를 꾹 눌러 일정에
 * 배치하는 길이 끊긴다 — 패널의 존재 이유가 어느 화면에서든 환자를 집어 오는 것이다.
 * 검색 중에는 두 구간을 합쳐 `검색 결과` 하나로 보여준다. 배치 모달의 환자
 * 리스트와 같은 문법이다(그쪽이 패널 구조를 그대로 옮겨 온 것이다).
 */
const patientQuery = ref('')
const searching = computed(() => patientQuery.value.trim().length > 0)

/*
 * 검색은 이름·진단에 더해 **현재 단계**도 본다. '감정평가'를 치면 그 단계에
 * 있는 사람만 남는다 — 패널에는 필터를 둘 자리가 없어(폭 274) 검색이 그 일을 겸한다.
 * 전체 환자 리스트에는 같은 축이 필터로 올라가 있다(mocks/analysis.js의 stage).
 */
const searchResults = computed(() => {
  const q = patientQuery.value.trim()
  return sortedPatients.value.filter(
    (p) => p.name.includes(q) || p.condition.includes(q) || p.status.includes(q),
  )
})

/* 한 벌의 행 마크업이 세 구간을 다 그린다. 구간마다 복제하면 한쪽만 고쳐진다 */
const panelSections = computed(() => {
  if (searching.value) {
    return [{ key: 'result', label: '검색 결과', items: searchResults.value }]
  }
  return [
    { key: 'recent', label: '최근 환자', items: recentPatients },
    { key: 'all', label: '전체 환자', items: sortedPatients.value },
  ]
})

function toggleSort(event) {
  if (sortOpen.value) {
    sortOpen.value = false
    return
  }
  const r = event.currentTarget.getBoundingClientRect()
  const WIDTH = 157
  sortAnchor.value = {
    left: `${Math.max(24, r.right - WIDTH)}px`,
    top: `${r.bottom + 4}px`,
  }
  sortOpen.value = true
}

const isDark = ref(false)
function setTheme(dark) {
  isDark.value = dark
  document.documentElement.classList.toggle('dark', dark)
}

/* 꾹 누르기 로직은 dragState에 있다. 셸에서 window 리스너만 한 번 건다 */
onMounted(() => {
  window.addEventListener('pointerdown', beginGesture, true)
  window.addEventListener('pointerup', endPress)
  window.addEventListener('pointercancel', cancelDrag)
  window.addEventListener('pointermove', trackDrag)
  /* 배치로 끝난 제스처의 click을 삼킨다. 캡처 단계라야 행에 닿기 전에 잡는다 */
  window.addEventListener('click', swallowDragClick, true)
})
onUnmounted(() => {
  window.removeEventListener('pointerdown', beginGesture, true)
  window.removeEventListener('pointerup', endPress)
  window.removeEventListener('pointercancel', cancelDrag)
  window.removeEventListener('pointermove', trackDrag)
  window.removeEventListener('click', swallowDragClick, true)
  cancelDrag()
})
</script>

<template>
  <!--
    설문 수행 화면은 셸 전체를 걷는다. 조작자가 환자라서 우측 패널에 다른 환자가
    보여서도 안 되고 좌측 내비로 아무 화면에나 들어갈 수 있어서도 안 된다.
    우측만 감추면 이탈 경로가 남아 응답이 소실된다.
  -->
  <RouterView v-if="$route.meta.bare" />

  <div v-else class="flex h-dvh gap-6 overflow-hidden bg-surface-canvas p-6 text-text-primary">
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
          :class="isCurrent(item.to)
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
      <!--
        표면 분리는 border로 한다(그림자 금지). 사진이 흰 배경이면 원의 경계가
        사라지므로 테두리를 항상 둔다. overflow-hidden으로 사진을 원에 가둔다
      -->
      <div class="flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border-default bg-surface-field">
        <img
          v-if="profilePhoto"
          :src="profilePhoto"
          alt=""
          class="size-full object-contain"
        />
        <span v-else class="text-label font-medium text-text-secondary">
          {{ COUNSELOR.name.slice(0, 1) }}
        </span>
      </div>
      <div class="leading-tight">
        <div class="text-label font-medium">{{ COUNSELOR.name }}</div>
        <div class="text-count font-normal text-text-secondary">{{ COUNSELOR.hospital }}</div>
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
    <!-- 좌우 패딩은 화면마다 다르다. 분석은 36, 전체 리스트는 24 -->
    <main
      class="flex flex-1 gap-2 overflow-y-auto rounded-2xl bg-surface-container"
      :class="$route.meta.noPatientPanel ? 'px-6' : 'px-9'"
    >
      <RouterView />
    </main>

    <!-- 우: 환자 패널. 전체 환자 리스트 화면은 이 패널을 쓰지 않는다 -->
    <aside
      v-if="!$route.meta.noPatientPanel"
      class="flex w-[274px] shrink-0 flex-col gap-1 overflow-y-auto rounded-2xl bg-surface-container px-6 py-4"
    >
      <!-- 검색. 패널 안에서 거르므로 결과도 그대로 꾹 눌러 배치할 수 있다 -->
      <label class="mx-3 flex h-11 shrink-0 items-center gap-4 rounded-lg border border-border-default bg-surface-field px-3">
        <Search :size="20" class="shrink-0 text-text-disabled" />
        <input
          v-model="patientQuery"
          type="text"
          placeholder="환자 검색"
          class="min-w-0 flex-1 bg-transparent text-body text-text-primary placeholder:text-text-disabled"
        />
        <button
          v-if="searching"
          class="-mr-1 flex size-8 shrink-0 items-center justify-center rounded-lg text-text-secondary active:bg-surface-pressed"
          @click="patientQuery = ''"
        >
          <X :size="16" />
        </button>
      </label>

      <!--
        구간은 검색 여부로 갈린다 — 평소엔 최근 환자 + 전체 환자, 검색 중에는
        둘을 합친 검색 결과 하나다. 행 마크업은 한 벌이라 구간마다 갈라지지 않는다.
      -->
      <template v-for="(group, i) in panelSections" :key="group.key">
        <div v-if="i > 0" class="h-px shrink-0 bg-border-default"></div>

        <section class="flex shrink-0 flex-col gap-2 pl-3 pb-3" :class="i > 0 ? 'pt-2' : 'pt-1'">
          <!-- 전체 환자 머리만 진입점과 정렬을 갖는다 -->
          <div v-if="group.key === 'all'" class="flex h-11 items-center gap-2 pl-1 pr-3">
            <!--
              머리를 누르면 전체 환자 리스트로 간다. chevron이 이미 '더 있다'고
              말하고 있어서 눌리지 않으면 고장으로 읽힌다. 탭 = 탐색이라 버튼이 아니라
              행 전체가 대상이고, 정렬 버튼만 따로 떼어 둔다
            -->
            <button
              class="-ml-1 flex h-11 items-center gap-2 rounded-lg px-1 active:bg-surface-pressed"
              @click="router.push({ path: '/patients/list' })"
            >
              <h2 class="text-label font-medium text-text-secondary">{{ group.label }}</h2>
              <ChevronRight :size="16" class="shrink-0 text-text-secondary" />
            </button>
            <div class="flex-1"></div>
            <button
              class="flex size-11 shrink-0 items-center justify-center rounded-lg active:bg-surface-pressed"
              :class="sortOpen ? 'text-interactive-default' : 'text-text-secondary'"
              @click="toggleSort"
            >
              <ArrowUpDown :size="16" />
            </button>
          </div>
          <h2 v-else class="flex h-11 items-center gap-1 pl-1 text-label font-medium text-text-secondary">
            {{ group.label }}
            <span v-if="group.key === 'result'" class="text-count">{{ group.items.length }}</span>
          </h2>

          <button
            v-for="p in group.items"
            :key="p.id"
            class="flex touch-manipulation select-none items-center gap-2 rounded-lg py-2 pl-1 text-left transition-colors duration-100 ease-standard active:bg-surface-pressed"
            :class="dragState.item?.id === p.id ? 'bg-surface-pressed' : ''"
            @pointerdown="startPress($event, p, 'patient')"
            @pointermove="trackPress"
            @pointercancel="cancelDrag"
            @contextmenu.prevent
            @click="openPatient(p)"
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

          <p v-if="!group.items.length" class="py-2 pl-1 text-label text-text-secondary">
            찾는 환자가 없습니다
          </p>
        </section>
      </template>
    </aside>

    <!--
      정렬 팝오버. 가벼운 콘텐츠라 외부 탭으로 닫고 history entry를 만들지 않는다.
      패널이 스크롤 상자라 안에 두면 잘려서 body로 내보낸다.
      Figma에 열린 상태가 없어 초안이다 — 전체 환자 리스트의 것과 같은 모양이다.
    -->
    <Teleport to="body">
      <div v-if="sortOpen" class="fixed inset-0 z-40" @click="sortOpen = false"></div>
      <div
        v-if="sortOpen"
        class="fixed z-40 w-[157px] overflow-hidden rounded-lg border border-border-default bg-surface-card"
        :style="sortAnchor"
      >
        <button
          v-for="(option, i) in PATIENT_SORTS"
          :key="option.key"
          class="flex h-11 w-full items-center justify-between gap-2 px-3 text-left text-label"
          :class="[
            i > 0 ? 'border-t border-border-subtle' : '',
            patientSort === option.key
              ? 'bg-selected-bg active:bg-selected-bg-pressed'
              : 'active:bg-surface-pressed',
          ]"
          @click="patientSort = option.key; sortOpen = false"
        >
          <span>{{ option.label }}</span>
          <Check v-if="patientSort === option.key" :size="16" class="shrink-0 text-text-secondary" />
        </button>
      </div>
    </Teleport>

    <!-- 집어 든 대상이 손가락을 따라온다. 초안 — Figma 정의 없음 -->
    <Teleport to="body">
      <div
        v-if="dragState.item"
        class="pointer-events-none fixed z-50 w-[195px] -translate-y-1/2 opacity-50"
        :style="{ left: `${dragState.x + 12}px`, top: `${dragState.y}px` }"
      >
        <div class="flex items-center gap-2 rounded-lg border border-border-default bg-surface-card py-2 pl-1">
          <template v-if="dragState.itemKind === 'patient'">
            <span class="flex size-10 shrink-0 items-center justify-center rounded-full bg-surface-canvas text-text-secondary">
              <User :size="24" />
            </span>
            <span class="flex min-w-0 flex-1 flex-col gap-1">
              <span class="truncate text-title-sm font-semibold"
                >{{ dragState.item.name }}<span class="text-caption font-normal text-text-secondary">&nbsp;{{ dragState.item.age }}·{{ dragState.item.sex }}</span></span>
              <span class="truncate text-label font-medium"
                >{{ dragState.item.condition }}<span class="text-caption font-normal text-text-secondary">&nbsp;&nbsp;{{ dragState.item.status }}</span></span>
            </span>
          </template>
          <span v-else class="flex min-w-0 flex-1 flex-col gap-0.5 px-2">
            <span class="truncate text-body">{{ dragState.item.title }}</span>
            <span v-if="dragState.item.category" class="truncate text-caption text-text-secondary">
              {{ dragState.item.category }}
            </span>
          </span>
        </div>
      </div>
    </Teleport>

    <!--
      놓을 수 없는 자리에 놓았을 때. 드래그 중에는 blocked 표현이 보이지만
      손을 떼는 순간 그것이 통째로 사라져, 아무 일도 일어나지 않은 것처럼 보인다.
      비활성 자리를 눌렀을 때와 같은 콜아웃으로 이유를 남긴다.

      드래그는 셸이 관리하므로 여기 한 곳에만 둔다 — 아젠다와 캘린더가
      각자 띄우면 두 화면의 문법이 갈라진다.
    -->
    <Teleport to="body">
      <div v-if="dragState.rejected" class="fixed inset-0 z-50" @click="clearRejected">
        <div class="absolute max-w-[280px]" :style="rejectedStyle">
          <InlineCallout
            :title="dragState.rejected.title"
            :detail="dragState.rejected.detail"
          />
        </div>
      </div>
    </Teleport>
  </div>
</template>