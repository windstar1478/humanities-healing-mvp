<script setup>
import { ref, computed } from 'vue'
import { Search, ArrowUpDown, ChevronDown, ChevronRight, Check, SearchX } from 'lucide-vue-next'
import { processLibrary, PROCESS_SORTS } from '../mocks/processLibrary.js'
import { recordAssignment } from '../mocks/process.js'
import ProcessDetailModal from './ProcessDetailModal.vue'

/*
 * 코어 프로세스 0단계 '프로세스 시작' (Figma 148:7242).
 *
 * 치유 프로세스 라이브러리에서 하나를 골라 환자에게 할당한다.
 * 행을 누르면 상세 모달이 열리고, 할당은 그 안의 확인을 거쳐야 끝난다 —
 * 목록에서 바로 확정하는 길은 두지 않았다(오토세이브 없음의 연장).
 *
 * 진단 칩은 **환자의 진단**과 '전체' 둘뿐이다. 라이브러리 전체를 진단별로
 * 훑는 화면이 아니라 이 환자에게 붙일 것을 고르는 화면이라, 기본값이 환자 진단이다.
 * '전체'로 넓히면 다른 진단의 프로세스도 보이고, 그것을 고르면 경고가 붙는다.
 */
const props = defineProps({
  patient: { type: Object, required: true },
})

const emit = defineEmits(['assign'])

const query = ref('')
const condition = ref('mine')
const sortKey = ref('recent')
const sortOpen = ref(false)
const detail = ref(null)

const sortLabel = computed(() => PROCESS_SORTS.find((s) => s.key === sortKey.value).label)

const rows = computed(() => {
  const text = query.value.trim()
  const sort = PROCESS_SORTS.find((s) => s.key === sortKey.value)
  return processLibrary
    .filter((p) => condition.value === 'all' || p.condition === props.patient.condition)
    .filter((p) => !text || p.name.includes(text) || p.author.includes(text))
    .slice()
    .sort(sort.compare)
})

/*
 * 할당이 끝나면 프로세스 시작 단계가 완료된다 — 다음은 사전 감정평가다.
 * 환자 레코드를 직접 고치는 이유는 스테퍼·우측 패널·분석 화면이 모두
 * 같은 명단 하나를 보기 때문이다. 사본을 두면 화면마다 진행 상태가 갈린다.
 */
function onClose(process) {
  detail.value = null
  if (!process) return
  /* 이력을 먼저 남긴다 — 환자 레코드를 고친 뒤면 직전 상태(중단/진행 중)를 알 수 없다 */
  recordAssignment(props.patient, process)
  props.patient.processId = process.id
  props.patient.processName = process.name
  props.patient.process = '진행 중'
  props.patient.status = '감정평가 (사전)'
  props.patient.nextStep = '프로그램 처방'
  emit('assign', process)
}
</script>

<template>
  <div class="relative flex min-h-0 flex-1 flex-col">
    <div class="flex shrink-0 flex-col justify-center py-2.5">
      <h2 class="text-title-sm font-semibold">치유 프로세스 리스트</h2>
    </div>

    <!-- 진단 칩 · 검색 · 정렬 -->
    <div class="flex h-11 shrink-0 items-center gap-3">
      <button
        v-for="chip in [{ key: 'mine', label: patient.condition }, { key: 'all', label: '전체' }]"
        :key="chip.key"
        class="flex h-8 w-16 shrink-0 items-center justify-center rounded-full border text-label font-medium"
        :class="condition === chip.key
          ? 'border-border-selected text-interactive-default active:bg-selected-bg-pressed'
          : 'border-border-default text-text-secondary active:bg-surface-pressed'"
        @click="condition = chip.key"
      >
        {{ chip.label }}
      </button>

      <label class="flex h-11 min-w-0 flex-1 items-center gap-4 rounded-lg border border-border-default bg-surface-field px-3">
        <Search :size="20" class="shrink-0 text-text-disabled" />
        <input
          v-model="query"
          type="text"
          placeholder="프로세스명 · 작성자로 검색"
          class="min-w-0 flex-1 bg-transparent text-body text-text-primary placeholder:text-text-disabled"
        />
      </label>

      <button
        class="flex h-11 w-[157px] shrink-0 items-center gap-3 rounded-lg border border-border-default px-2 active:bg-surface-pressed"
        @click="sortOpen = !sortOpen"
      >
        <span class="flex shrink-0 items-center gap-1.5 whitespace-nowrap text-text-secondary">
          <ArrowUpDown :size="16" class="shrink-0" />
          <span class="text-caption">정렬</span>
        </span>
        <span class="shrink-0 whitespace-nowrap text-body">{{ sortLabel }}</span>
        <ChevronDown :size="16" class="ml-auto shrink-0 text-text-secondary" />
      </button>
    </div>

    <!-- 표. 헤더와 행이 같은 열 폭·간격을 쓴다 -->
    <div class="flex min-h-0 flex-1 flex-col py-4">
      <div class="flex shrink-0 items-center gap-1 border-b border-border-strong px-2 pb-1 text-body text-text-secondary">
        <span class="w-56 shrink-0">프로세스명</span>
        <span class="w-[153px] shrink-0">증상명</span>
        <span class="w-[181px] shrink-0">작성자</span>
        <span class="flex-1">작성일</span>
        <span class="w-6 shrink-0"></span>
      </div>

      <div class="min-h-0 flex-1 overflow-y-auto">
        <button
          v-for="row in rows"
          :key="row.id"
          class="flex h-13 w-full items-center gap-1 border-b border-border-default px-2 py-1 text-left"
          :class="[
            /* 구버전은 빼지 않고 흐리게 내린다. 누르는 동안에는 걷어낸다 */
            row.deprecated ? 'opacity-50 active:opacity-100' : '',
            patient.processId === row.id
              ? 'bg-selected-bg ring-2 ring-inset ring-border-selected active:bg-selected-bg-pressed'
              : 'active:bg-surface-pressed',
          ]"
          @click="detail = row"
        >
          <span class="flex w-56 shrink-0 items-start gap-1">
            <span class="min-w-0 truncate text-body">{{ row.name }}</span>
            <span
              v-if="row.deprecated"
              class="shrink-0 rounded border border-border-default p-0.5 text-count text-text-secondary"
            >
              구버전
            </span>
          </span>
          <span class="w-[153px] shrink-0 truncate text-label font-medium text-text-secondary">{{ row.condition }}</span>
          <span class="w-[181px] shrink-0 truncate text-label font-medium text-text-secondary">{{ row.author }}</span>
          <span class="min-w-0 flex-1 truncate pr-[7px] text-label font-medium text-text-secondary">{{ row.date }}</span>
          <ChevronRight :size="24" class="w-6 shrink-0 text-text-secondary" />
        </button>

        <div v-if="!rows.length" class="flex flex-col items-center gap-2 py-12">
          <SearchX :size="24" class="shrink-0 text-text-secondary" />
          <p class="text-body text-text-secondary">조건에 맞는 프로세스가 없습니다</p>
        </div>
      </div>
    </div>

    <!-- 정렬 팝오버. 가벼운 콘텐츠라 외부 탭으로 닫고 history entry를 만들지 않는다 -->
    <div v-if="sortOpen" class="fixed inset-0 z-40" @click="sortOpen = false"></div>
    <div
      v-if="sortOpen"
      class="absolute right-0 top-[92px] z-40 w-[157px] overflow-hidden rounded-lg border border-border-default bg-surface-card"
    >
      <button
        v-for="(option, i) in PROCESS_SORTS"
        :key="option.key"
        class="flex h-11 w-full items-center justify-between gap-2 px-3 text-left text-label"
        :class="[
          i > 0 ? 'border-t border-border-subtle' : '',
          sortKey === option.key
            ? 'bg-selected-bg active:bg-selected-bg-pressed'
            : 'active:bg-surface-pressed',
        ]"
        @click="sortKey = option.key; sortOpen = false"
      >
        <span>{{ option.label }}</span>
        <Check v-if="sortKey === option.key" :size="16" class="shrink-0 text-text-secondary" />
      </button>
    </div>

    <ProcessDetailModal
      v-if="detail"
      :process="detail"
      :patient="patient"
      @close="onClose"
    />
  </div>
</template>
