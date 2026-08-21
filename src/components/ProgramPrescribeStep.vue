<script setup>
import { ref, reactive, computed } from 'vue'
import { rectOf, viewW, viewH } from '../uiScale.js'
import { Search, ArrowUpDown, ChevronDown, ChevronRight, Check, ArrowRight, SearchX } from 'lucide-vue-next'
import { processFor } from '../mocks/processLibrary.js'
import { surveys, responseOf, gradeOf } from '../mocks/surveys.js'
import {
  programs, emotionAxes, programMeta, findProgram,
  PROGRAM_FILTERS, PROGRAM_SORTS, matchesFilter,
} from '../mocks/programs.js'
import InlineCallout from './InlineCallout.vue'
import ProgramDetailModal from './ProgramDetailModal.vue'

/*
 * 코어 프로세스 2단계 '프로그램 처방' (Figma 148:8145 · 178:3788 · 179:4283 · 180:4914).
 *
 * 한 화면이 탭 둘로 갈린다 — **감정평가 정보**(무엇을 보고 고르는가)와
 * **프로그램 선택**(무엇을 고르는가). 화면을 둘로 나누면 고르는 도중 근거를
 * 다시 보려고 화면을 나가야 한다. 탭은 탐색이라 상태를 바꾸지 않는다(3.5절).
 */
const props = defineProps({
  patient: { type: Object, required: true },
})

const emit = defineEmits(['advance'])

const TABS = [
  { key: 'review', label: '감정평가 정보' },
  { key: 'pick', label: '프로그램 선택' },
]
const tab = ref('review')

const process = computed(() => processFor(props.patient))

/*
 * 사전 감정평가 결과. 여기서 다시 계산하지 않고 1단계가 남긴 응답을 읽는다 —
 * 두 화면이 같은 점수를 보여야 한다.
 */
const results = computed(() => {
  const steps = process.value?.steps ?? []
  const source = steps.find((s) => s.name.includes('사전'))
  return (source?.items ?? []).map((item) => {
    const survey = surveys[item.code]
    const response = responseOf(props.patient.id, 'pre', item.code)
    const score = response?.done ? response.score : null
    return { survey, score, grade: gradeOf(survey, score) }
  })
})

/* ── 프로그램 선택 ────────────────────────────────────── */
const query = ref('')
const sortKey = ref('recommend')
const openPanel = ref(null)
const filters = reactive(Object.fromEntries(PROGRAM_FILTERS.map((f) => [f.id, null])))
/* 이미 처방된 환자는 그 프로그램이 골라진 채로 열린다 — 무엇을 붙였는지 되비쳐야 한다 */
const picked = ref(props.patient.programId ?? null)
const detail = ref(null)

const sortLabel = computed(() => PROGRAM_SORTS.find((s) => s.key === sortKey.value).label)

/* 이 환자의 진단에 맞는 것만 후보다. 다른 진단의 프로그램은 목록에 오르지 않는다 */
const candidates = computed(() => programs.filter((p) => p.condition === props.patient.condition))

const rows = computed(() => {
  const text = query.value.trim()
  const sort = PROGRAM_SORTS.find((s) => s.key === sortKey.value)
  return candidates.value
    .filter((p) => PROGRAM_FILTERS.every((f) => !filters[f.id] || matchesFilter(p, f.id, filters[f.id])))
    .filter((p) => !text || p.name.includes(text) || p.org.includes(text))
    .slice()
    .sort(sort.compare)
})

const pickedProgram = computed(() => (picked.value ? findProgram(picked.value) : null))

const blocked = ref(null)

function say(event, title, detail) {
  const r = rectOf(event.currentTarget)
  blocked.value = { title, detail, x: r.left + r.width / 2, y: r.bottom }
}

function advance(event) {
  if (!pickedProgram.value) {
    say(event, '아직 프로그램을 고르지 않았습니다', '목록에서 하나를 고르면 열립니다')
    return
  }
  emit('advance', pickedProgram.value)
}

const blockedStyle = computed(() => {
  if (!blocked.value) return {}
  const WIDTH = 280
  const MARGIN = 24
  const { x, y } = blocked.value
  return {
    left: `${Math.min(Math.max(MARGIN, x - WIDTH / 2), viewW() - WIDTH - MARGIN)}px`,
    top: `${y + 8}px`,
  }
})

/* 등급 배지의 세기. 고위험만 경고색이다 — 악화 표현 전용 규칙(3.1절) */
const gradeClass = (grade) => ({
  고위험: 'border-indicator-warning text-indicator-warning',
  중증도: 'border-text-secondary text-text-secondary',
  정상: 'border-border-default text-border-default',
  미작성: 'border-border-default text-text-disabled',
}[grade])

const percent = (value, max) => `${Math.min(100, Math.max(0, (value / max) * 100))}%`
</script>

<template>
  <div class="relative flex min-h-0 flex-1 flex-col gap-2">
    <div class="flex min-h-0 flex-1 flex-col gap-2">
      <!-- 머리: 제목 + 프로세스명, 그 아래 탭과 (선택 탭일 때) 검색·정렬 -->
      <div class="flex shrink-0 flex-col border-b border-border-strong pb-1.5">
        <div class="flex items-center gap-2.5 py-2.5">
          <h2 class="whitespace-nowrap text-title-sm font-semibold">프로그램 처방</h2>
          <p class="min-w-0 flex-1 truncate text-right text-label font-medium text-text-secondary">
            {{ process?.name ?? '프로세스 미할당' }}
          </p>
        </div>

        <div class="flex items-center gap-3">
          <!-- 세그먼트 토글. 좌측 하단 테마 토글과 같은 문법이다 -->
          <div class="flex h-12 w-[206px] shrink-0 items-center justify-center gap-1 rounded-lg border border-border-default bg-surface-container p-1">
            <button
              v-for="item in TABS"
              :key="item.key"
              class="flex h-9 w-[95px] items-center justify-center rounded-lg text-label font-medium"
              :class="tab === item.key
                ? 'border border-border-selected bg-surface-card text-interactive-default active:bg-selected-bg-pressed'
                : 'text-text-disabled active:bg-surface-pressed'"
              @click="tab = item.key"
            >
              {{ item.label }}
            </button>
          </div>

          <div v-if="tab === 'pick'" class="flex min-w-0 flex-1 items-center justify-end gap-3">
            <label class="flex h-11 w-[231px] shrink-0 items-center gap-4 rounded-lg border border-border-default bg-surface-field px-3">
              <Search :size="20" class="shrink-0 text-text-disabled" />
              <input
                v-model="query"
                type="text"
                placeholder="프로그램명 · 기관명으로 검색"
                class="min-w-0 flex-1 bg-transparent text-body text-text-primary placeholder:text-text-disabled"
              />
            </label>

            <button
              class="flex h-11 w-[157px] shrink-0 items-center gap-3 rounded-lg border border-border-default px-2 active:bg-surface-pressed"
              @click="openPanel = openPanel === 'sort' ? null : 'sort'"
            >
              <span class="flex shrink-0 items-center gap-1.5 whitespace-nowrap text-text-secondary">
                <ArrowUpDown :size="16" class="shrink-0" />
                <span class="text-caption">정렬</span>
              </span>
              <span class="shrink-0 whitespace-nowrap text-body">{{ sortLabel }}</span>
              <ChevronDown :size="16" class="ml-auto shrink-0 text-text-secondary" />
            </button>
          </div>
        </div>

        <!-- 필터 넷. 걸린 것만 accent다 — '선택 상태' 용법 -->
        <div v-if="tab === 'pick'" class="mt-3 flex items-center gap-2">
          <button
            v-for="filter in PROGRAM_FILTERS"
            :key="filter.id"
            class="flex h-9 min-w-0 flex-1 items-center gap-2 rounded-lg border px-2 active:bg-surface-pressed"
            :class="filters[filter.id]
              ? 'border-border-selected text-interactive-default'
              : 'border-border-default text-text-primary'"
            @click="openPanel = openPanel === filter.id ? null : filter.id"
          >
            <span class="min-w-0 flex-1 truncate text-left text-body">
              {{ filters[filter.id] ?? filter.label }}
            </span>
            <ChevronDown :size="16" class="shrink-0 text-text-secondary" />
          </button>
        </div>
      </div>

      <!-- 탭 1: 감정평가 정보 -->
      <div v-if="tab === 'review'" class="flex min-h-0 flex-1 gap-3">
        <div class="flex w-[387px] shrink-0 flex-col gap-3 overflow-y-auto">
          <div
            v-for="row in results"
            :key="row.survey.code"
            class="flex shrink-0 flex-col gap-2 rounded-lg border border-border-default p-2"
          >
            <div class="flex items-start gap-2">
              <p class="shrink-0 text-body">{{ row.survey.name }}</p>
              <span
                class="flex h-4 shrink-0 items-center justify-center rounded px-1 text-label font-medium"
                :class="row.survey.role === '핵심'
                  ? 'bg-interactive-primary-fill text-text-on-dark-fill'
                  : 'bg-surface-field text-text-secondary'"
              >
                {{ row.survey.role }}
              </span>
              <p class="min-w-0 flex-1 truncate text-caption text-text-secondary">{{ row.survey.code }}</p>
              <!-- 등급. 고위험만 경고색이다 -->
              <span
                class="flex h-4 shrink-0 items-center justify-center rounded border px-1 text-label font-medium"
                :class="gradeClass(row.grade)"
              >
                {{ row.grade }}
              </span>
            </div>

            <div class="flex items-center gap-1">
              <p class="w-7 shrink-0 text-center text-body font-bold">{{ row.score ?? '-' }}</p>
              <span class="w-[18px] shrink-0 text-count text-text-secondary">0</span>
              <div class="h-1 min-w-0 flex-1 rounded bg-chart-bar-default">
                <div
                  v-if="row.score !== null"
                  class="h-1 rounded bg-chart-axis-label"
                  :style="{ width: percent(row.score, row.survey.max) }"
                ></div>
              </div>
              <span class="w-[18px] shrink-0 text-count text-text-secondary">{{ row.survey.max }}</span>
            </div>
          </div>
        </div>

        <div class="w-px shrink-0 bg-border-default"></div>

        <!-- 감정 지표. 다섯 축을 0–100으로 정규화한 세로 막대다 -->
        <div class="flex min-w-0 flex-1 flex-col gap-3">
          <div class="flex shrink-0 items-center gap-3">
            <p class="shrink-0 text-body">감정 지표</p>
            <p class="shrink-0 text-count">0–100 정규화</p>
            <p class="min-w-0 flex-1 text-right text-count text-text-secondary">높을수록 양호</p>
          </div>
          <div class="flex min-h-0 flex-1 items-end justify-between py-1">
            <div
              v-for="axis in emotionAxes"
              :key="axis.id"
              class="flex h-full w-11 shrink-0 flex-col items-center justify-end gap-1 p-1"
            >
              <p class="shrink-0 text-label font-medium text-text-secondary">{{ axis.value }}</p>
              <!-- 막대 높이는 값/100이다. 남은 세로 공간을 그대로 눈금으로 쓴다 -->
              <div
                class="w-4 shrink-0 rounded bg-chart-bar-default"
                :style="{ height: `calc((100% - 40px) * ${axis.value / 100})` }"
              ></div>
              <p class="shrink-0 whitespace-nowrap text-count text-text-secondary">{{ axis.label }}</p>
            </div>
          </div>
        </div>
      </div>

      <!-- 탭 2: 프로그램 선택 -->
      <div v-else class="flex min-h-0 flex-1 flex-col overflow-y-auto">
        <button
          v-for="row in rows"
          :key="row.id"
          class="flex h-13 w-full shrink-0 items-center gap-1 px-2 py-1 text-left"
          :class="picked === row.id
            ? 'rounded-lg border border-border-selected bg-selected-bg active:bg-selected-bg-pressed'
            : 'border-b border-border-default active:bg-surface-pressed'"
          @click="detail = row"
        >
          <span class="flex min-w-0 flex-1 flex-col justify-center gap-1">
            <span class="flex items-start gap-1">
              <!-- 고른 것에 체크가 붙는다. 배경만으로는 선택이 잘 안 보인다 -->
              <Check v-if="picked === row.id" :size="16" class="mt-0.5 shrink-0" />
              <span class="truncate text-body">{{ row.name }}</span>
              <span class="flex h-4 shrink-0 items-center justify-center rounded border border-border-default bg-surface-field px-1 text-label font-medium text-text-secondary">
                {{ row.condition }}
              </span>
            </span>
            <span class="truncate text-caption" :class="picked === row.id ? '' : 'text-text-secondary'">
              {{ programMeta(row) }}
            </span>
          </span>
          <ChevronRight :size="24" class="shrink-0 text-text-secondary" />
        </button>

        <div v-if="!rows.length" class="flex flex-col items-center gap-2 py-12">
          <SearchX :size="24" class="shrink-0 text-text-secondary" />
          <p class="text-body text-text-secondary">조건에 맞는 프로그램이 없습니다</p>
        </div>
      </div>
    </div>

    <!-- 하단: 무엇을 골랐는지 + 다음 단계 -->
    <div class="flex h-13 shrink-0 items-center gap-3 border-t border-border-strong">
      <p class="min-w-0 flex-1 truncate text-label" :class="pickedProgram ? '' : 'text-text-secondary'">
        <template v-if="pickedProgram">
          선택됨: {{ pickedProgram.name }} ({{ pickedProgram.sessions.length }}세션)
        </template>
        <template v-else>선택된 프로그램이 없습니다</template>
      </p>

      <button class="flex h-11 shrink-0 items-center" @click="advance">
        <span
          class="flex h-9 min-w-[178px] items-center justify-center gap-1 whitespace-nowrap rounded-lg border px-3 text-body"
          :class="pickedProgram
            ? 'border-border-default bg-surface-inverse text-text-inverse active:bg-surface-inverse-pressed'
            : 'border-border-default bg-surface-field text-text-disabled'"
        >
          프로그램 수행으로 이동
          <ArrowRight :size="16" class="shrink-0" />
        </span>
      </button>
    </div>

    <!-- 정렬·필터 팝오버. 가벼운 콘텐츠라 외부 탭으로 닫는다 -->
    <div v-if="openPanel" class="fixed inset-0 z-40" @click="openPanel = null"></div>
    <div
      v-if="openPanel === 'sort'"
      class="absolute right-0 top-[92px] z-40 w-[157px] overflow-hidden rounded-lg border border-border-default bg-surface-card"
    >
      <button
        v-for="(option, i) in PROGRAM_SORTS"
        :key="option.key"
        class="flex h-11 w-full items-center justify-between gap-2 px-3 text-left text-label"
        :class="[
          i > 0 ? 'border-t border-border-subtle' : '',
          sortKey === option.key ? 'bg-selected-bg active:bg-selected-bg-pressed' : 'active:bg-surface-pressed',
        ]"
        @click="sortKey = option.key; openPanel = null"
      >
        <span>{{ option.label }}</span>
        <Check v-if="sortKey === option.key" :size="16" class="shrink-0 text-text-secondary" />
      </button>
    </div>

    <div
      v-for="(filter, i) in PROGRAM_FILTERS"
      v-show="openPanel === filter.id"
      :key="filter.id"
      class="absolute top-[148px] z-40 w-[202px] overflow-hidden rounded-lg border border-border-default bg-surface-card"
      :style="{ left: `${i * 210}px` }"
    >
      <!-- 첫 줄은 언제나 '전체'다. 걸린 필터를 푸는 길이 없으면 막다른 길이 된다 -->
      <button
        class="flex h-11 w-full items-center justify-between gap-2 px-3 text-left text-label"
        :class="filters[filter.id] ? 'active:bg-surface-pressed' : 'bg-selected-bg active:bg-selected-bg-pressed'"
        @click="filters[filter.id] = null; openPanel = null"
      >
        <span>전체</span>
        <Check v-if="!filters[filter.id]" :size="16" class="shrink-0 text-text-secondary" />
      </button>
      <button
        v-for="value in filter.values(candidates)"
        :key="value"
        class="flex h-11 w-full items-center justify-between gap-2 border-t border-border-subtle px-3 text-left text-label"
        :class="filters[filter.id] === value ? 'bg-selected-bg active:bg-selected-bg-pressed' : 'active:bg-surface-pressed'"
        @click="filters[filter.id] = value; openPanel = null"
      >
        <span class="min-w-0 truncate">{{ value }}</span>
        <Check v-if="filters[filter.id] === value" :size="16" class="shrink-0 text-text-secondary" />
      </button>
    </div>

    <ProgramDetailModal
      v-if="detail"
      :program="detail"
      @close="(chosen) => { if (chosen) picked = chosen.id; detail = null }"
    />

    <Teleport to="body">
      <div v-if="blocked" class="fixed inset-0 z-50" @click="blocked = null">
        <div class="absolute max-w-[280px]" :style="blockedStyle">
          <InlineCallout :title="blocked.title" :detail="blocked.detail" />
        </div>
      </div>
    </Teleport>
  </div>
</template>
