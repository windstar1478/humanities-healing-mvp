<script setup>
import { ref, computed } from 'vue'
import { useRoute, useRouter, onBeforeRouteLeave } from 'vue-router'
import {
  ChevronLeft, ChevronUp, ChevronDown, Check, Plus, Trash2,
  ClipboardList, Pill, Play,
} from 'lucide-vue-next'
import {
  processLibrary, findProcess, saveProcess, nextProcessId,
} from '../mocks/processLibrary.js'
import { surveys } from '../mocks/surveys.js'
import { programs } from '../mocks/programs.js'
import { dimensions } from '../mocks/analysis.js'
import InlineCallout from '../components/InlineCallout.vue'
import UnsavedWarningModal from '../components/UnsavedWarningModal.vue'
import DeleteConfirmModal from '../components/DeleteConfirmModal.vue'

/*
 * 프로세스 저작 — 저작도구 '프로세스'의 편집 화면 (MVP).
 *
 * **단계 수는 고정이 아니다.** 감정평가 · 프로그램 처방 · 프로그램 수행 노드를
 * 몇 개든, 어떤 순서로든 이을 수 있다 — 구버전 웹이 노드 편집기로 설계된 이유가
 * 그것이다. 표준형(사전 평가 → 처방 → 수행 → 사후 평가)은 흔한 한 가지일 뿐이고,
 * 처방과 수행을 번갈아 두 번 도는 프로세스도 성립한다.
 *
 * MVP에서 웹과 다르게 둔 것은 **연결 방식**이다. 자유 캔버스에서 선을 잇는 대신
 * **세로 시퀀스**로 둔다. 태블릿 터치로 선을 끌어 잇는 조작 자체가 무겁고,
 * 지금 필요한 것은 '어떤 노드가 어떤 순서로 오는가'까지다. 분기(조건에 따라
 * 갈라지는 흐름)가 필요해지면 그때 캔버스를 연다.
 *
 * **회차는 정의가 적지 않는다.** 회차의 이름·개수는 처방된 프로그램이 정하고
 * 날짜·간격은 일정이 정한다(4.6.4절). `주 1회 · 5주` 같은 값을 정의가 약속하면
 * 실제 일정과 어긋나는 순간 어느 쪽이 맞는지 알 수 없다.
 *
 * **생체신호는 토글 하나다.** 웹은 HRV · fNIRS를 따로 켜지만 앱이 읽는 값은
 * `bio` 하나뿐이라(측정 모달이 두 종류를 모두 연다) 나눠 받아도 반영될 자리가 없다.
 *
 * ⚠️ Figma 디자인이 없다. 구버전 웹 화면의 구성만 참고한 MVP다.
 * ⚠️ **코어 프로세스 화면은 아직 표준형 네 노드를 전제로 그린다.** 노드 수가
 *    다른 정의를 환자에게 붙이면 스테퍼가 그대로 따라가지 못한다(6.2절 38번).
 * ⚠️ **정의가 프로그램 id를 들고 있지 않다.** 목업의 처방 항목은 임의 문구라
 *    이름으로 대조하고 있어, 기존 정의를 열면 후보가 비어 보인다.
 */
const route = useRoute()
const router = useRouter()

const isNew = computed(() => route.params.id === 'new')
const original = computed(() => (isNew.value ? null : findProcess(route.params.id)))

const CONDITIONS = dimensions.find((d) => d.id === 'condition').keys

/* 노드 종류 셋. 웹의 '노드 컴포넌트' 목록과 같다 */
const NODE_TYPES = [
  { type: '감정평가', icon: ClipboardList, detail: '척도로 지금 상태를 잰다' },
  { type: '프로그램 처방', icon: Pill, detail: '수행할 프로그램을 고른다' },
  { type: '프로그램 수행', icon: Play, detail: '회차를 진행하고 기록한다' },
]
/* 감정평가 노드의 시점. 아직 정하지 않았으면 '미연결'이다 */
const PHASES = ['사전', '사후']

const today = () => new Date().toISOString().slice(0, 10)

/* 저장된 정의를 노드 목록으로 되읽는다 */
function nodesFrom(process) {
  return (process?.steps ?? []).map((step) => {
    if (step.name.startsWith('감정평가')) {
      return {
        type: '감정평가',
        phase: PHASES.find((p) => step.name.includes(p)) ?? null,
        surveyCodes: (step.items ?? []).map((item) => item.code),
        programIds: [],
      }
    }
    if (step.name === '프로그램 처방') {
      return {
        type: '프로그램 처방',
        phase: null,
        surveyCodes: [],
        /* 정의가 프로그램 id를 들고 있지 않아 이름으로 맞춘다 */
        programIds: programs
          .filter((p) => (step.items ?? []).some((item) => item.label === p.name))
          .map((p) => p.id),
      }
    }
    return { type: '프로그램 수행', phase: null, surveyCodes: [], programIds: [] }
  })
}

function draftFrom(process) {
  return {
    id: process?.id ?? nextProcessId(),
    name: process?.name ?? '',
    condition: process?.condition ?? CONDITIONS[0],
    author: process?.author ?? '',
    summary: process?.summary ?? '',
    date: process?.date ?? today(),
    bio: process?.bio ?? true,
    nodes: nodesFrom(process),
  }
}

const draft = ref(draftFrom(original.value))
const snapshot = ref(JSON.stringify(draft.value))
const isDirty = computed(() => JSON.stringify(draft.value) !== snapshot.value)

/* 고를 수 있는 설문은 그 증상의 것과 공통 척도다 */
const surveyChoices = computed(() =>
  Object.values(surveys).filter((s) => s.scope === '공통' || s.scope === draft.value.condition),
)
const programChoices = computed(() => programs.filter((p) => p.condition === draft.value.condition))

function toggle(list, value) {
  const at = list.indexOf(value)
  if (at >= 0) list.splice(at, 1)
  else list.push(value)
}

/* 증상을 바꾸면 그 증상에서 고를 수 없는 것은 선택에서 빠진다 */
function pickCondition(condition) {
  draft.value.condition = condition
  for (const node of draft.value.nodes) {
    node.surveyCodes = node.surveyCodes.filter((code) =>
      surveyChoices.value.some((s) => s.code === code),
    )
    node.programIds = node.programIds.filter((id) =>
      programChoices.value.some((p) => p.id === id),
    )
  }
}

const addNode = (type) =>
  draft.value.nodes.push({ type, phase: null, surveyCodes: [], programIds: [] })
/*
 * **삭제는 확인을 거친다.** 노드 하나가 곧 환자가 지나는 단계 하나라
 * 잘못 지우면 흐름이 통째로 바뀐다(3.6절). 아무것도 고르지 않은 빈 노드는
 * 잃을 것이 없으므로 바로 지운다.
 */
const deleting = ref(null)

function askRemoveNode(i) {
  const node = draft.value.nodes[i]
  if (!node.surveyCodes.length && !node.programIds.length) {
    draft.value.nodes.splice(i, 1)
    return
  }
  deleting.value = {
    index: i,
    label: node.phase ? `${node.type} (${node.phase})` : node.type,
  }
}

function confirmRemoveNode() {
  draft.value.nodes.splice(deleting.value.index, 1)
  deleting.value = null
}

function moveNode(i, step) {
  const to = i + step
  if (to < 0 || to >= draft.value.nodes.length) return
  const [node] = draft.value.nodes.splice(i, 1)
  draft.value.nodes.splice(to, 0, node)
}

/* 시점은 다시 누르면 풀린다 — 미연결로 두는 길이 있어야 한다 */
function pickPhase(node, phase) {
  node.phase = node.phase === phase ? null : phase
}

const iconOf = (type) => NODE_TYPES.find((t) => t.type === type).icon

/* 저장할 수 없는 이유. 비활성 버튼은 왜 못 누르는지 말해야 한다(3.8절) */
const blocked = computed(() => {
  const d = draft.value
  if (!d.name.trim()) return '프로세스 이름을 입력해 주세요'
  if (isNew.value && processLibrary.some((p) => p.name === d.name.trim())) {
    return '같은 이름의 프로세스가 있습니다'
  }
  if (!d.author.trim()) return '작성자를 입력해 주세요'
  if (!d.nodes.length) return '노드를 하나 이상 이어 주세요'
  if (d.nodes.some((n) => n.type === '감정평가' && !n.surveyCodes.length)) {
    return '감정평가 노드에 설문을 골라 주세요'
  }
  /* 같은 시점이 둘이면 사전·사후를 읽는 화면이 어느 쪽을 봐야 할지 모른다 */
  for (const phase of PHASES) {
    if (d.nodes.filter((n) => n.phase === phase).length > 1) return `${phase} 노드가 둘입니다`
  }
  return null
})

const calloutOpen = ref(false)

const goList = () => router.push({ path: '/authoring/process' })

function commit() {
  saveProcess({
    ...draft.value,
    name: draft.value.name.trim(),
    nodes: draft.value.nodes.map((node) => ({
      ...node,
      programs: programs.filter((p) => node.programIds.includes(p.id)),
    })),
  })
  snapshot.value = JSON.stringify(draft.value)
}

function save() {
  if (blocked.value) {
    calloutOpen.value = true
    return
  }
  commit()
  goList()
}

/* 미저장 경고는 한 자리로 모은다 — 머리의 뒤로가기와 라우터 이탈 둘 다 여기를 거친다 */
const pendingAction = ref(null)

function guard(action) {
  if (!isDirty.value) {
    action()
    return
  }
  pendingAction.value = action
}

function runPending() {
  const action = pendingAction.value
  pendingAction.value = null
  action?.()
}

/*
 * **'나가기(저장 안 함)'는 편집을 되돌리고 나간다.** 되돌리지 않으면
 * `isDirty`가 그대로라 라우터 가드가 다시 막고, 경고만 다시 뜬다 —
 * 버튼이 아무 일도 하지 않는 것처럼 보인다.
 */
function discardAndRun() {
  draft.value = JSON.parse(snapshot.value)
  runPending()
}

function saveAndRun() {
  if (!blocked.value) commit()
  else snapshot.value = JSON.stringify(draft.value)
  runPending()
}

onBeforeRouteLeave((to, from) => {
  if (to.path === from.path) return true
  if (!isDirty.value) return true
  pendingAction.value = () => router.push(to.fullPath)
  return false
})
</script>

<template>
  <div class="flex min-w-0 flex-1 flex-col gap-2 py-3">
    <!-- 머리: 어디에 있는가 + 나가는 길 + 주 행동 -->
    <section class="flex h-14 shrink-0 items-center gap-2 rounded-lg border border-border-default bg-surface-card px-3">
      <button
        class="-ml-2 flex size-11 shrink-0 items-center justify-center rounded-lg text-text-secondary active:bg-surface-pressed"
        @click="guard(goList)"
      >
        <ChevronLeft :size="16" />
      </button>
      <h1 class="whitespace-nowrap text-title-sm font-semibold">
        {{ isNew ? '새 프로세스' : draft.name || original?.name }}
      </h1>
      <p class="min-w-0 flex-1 truncate text-label text-text-secondary">
        노드를 이어 흐름을 만든다 · {{ draft.nodes.length }}노드
      </p>
      <div class="relative shrink-0">
        <button
          class="flex h-11 items-center rounded-lg px-3 text-label font-medium"
          :class="blocked
            ? 'bg-surface-field text-text-disabled'
            : 'bg-surface-inverse text-text-inverse active:bg-surface-inverse-pressed'"
          @click="save"
        >
          저장
        </button>
        <InlineCallout
          v-if="calloutOpen && blocked"
          class="absolute right-0 top-12 z-10 w-[280px]"
          :title="blocked"
          detail="채우고 나면 저장할 수 있습니다"
          @click="calloutOpen = false"
        />
      </div>
    </section>

    <div class="flex min-h-0 flex-1 gap-2">
      <!-- 기본 정보 -->
      <section class="flex w-[280px] shrink-0 flex-col gap-2 overflow-y-auto rounded-lg border border-border-default bg-surface-card px-3 py-2">
        <p class="text-label font-medium">기본 정보</p>

        <label class="flex flex-col gap-1">
          <span class="text-count text-text-secondary">프로세스 이름</span>
          <input
            v-model="draft.name"
            class="h-11 w-full rounded-lg border border-border-default bg-surface-field px-3 text-label text-text-primary"
            placeholder="예: PTSD 표준 프로세스_v2.1"
          />
        </label>

        <div class="flex flex-col gap-1">
          <span class="text-count text-text-secondary">증상</span>
          <div class="flex h-11 items-center gap-1 rounded-lg bg-surface-field p-1">
            <button
              v-for="condition in CONDITIONS"
              :key="condition"
              class="flex h-9 min-w-0 flex-1 items-center justify-center truncate rounded px-2 text-label font-medium"
              :class="draft.condition === condition
                ? 'bg-surface-card text-text-primary'
                : 'text-text-secondary active:bg-surface-pressed'"
              @click="pickCondition(condition)"
            >
              {{ condition }}
            </button>
          </div>
        </div>

        <label class="flex flex-col gap-1">
          <span class="text-count text-text-secondary">작성자</span>
          <input
            v-model="draft.author"
            class="h-11 w-full rounded-lg border border-border-default bg-surface-field px-3 text-label text-text-primary"
            placeholder="예: 강치유 · 중앙대학교산학협력단"
          />
        </label>

        <label class="flex flex-col gap-1">
          <span class="text-count text-text-secondary">설명</span>
          <textarea
            v-model="draft.summary"
            rows="3"
            class="w-full rounded-lg border border-border-default bg-surface-field px-3 py-2 text-label text-text-primary"
          />
        </label>

        <!-- 앱이 읽는 값이 하나뿐이라 토글도 하나다 -->
        <button
          class="flex h-11 items-center justify-between rounded-lg border px-3 text-label font-medium"
          :class="draft.bio
            ? 'border-border-selected bg-selected-bg text-text-primary active:bg-selected-bg-pressed'
            : 'border-border-default text-text-secondary active:bg-surface-pressed'"
          @click="draft.bio = !draft.bio"
        >
          <span>생체신호 측정</span>
          <Check v-if="draft.bio" :size="16" />
        </button>
      </section>

      <!-- 노드 시퀀스. 개수도 순서도 정해져 있지 않다 -->
      <section class="flex min-w-0 flex-1 flex-col rounded-lg border border-border-default bg-surface-card px-3 py-2">
        <div class="flex shrink-0 items-center gap-2">
          <p class="text-label font-medium">흐름</p>
          <span class="flex-1"></span>
          <span class="text-count text-text-secondary">위에서 아래 순서로 진행된다</span>
        </div>

        <div class="mt-2 flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto">
          <div
            v-for="(node, i) in draft.nodes"
            :key="i"
            class="flex shrink-0 flex-col gap-1 rounded-lg border border-border-default px-3 py-2"
          >
            <div class="flex items-center gap-2">
              <component :is="iconOf(node.type)" :size="16" class="shrink-0 text-text-secondary" />
              <span class="text-label font-medium">{{ node.type }}</span>

              <!-- 감정평가만 시점을 갖는다. 고르지 않으면 미연결이다 -->
              <template v-if="node.type === '감정평가'">
                <button
                  v-for="phase in PHASES"
                  :key="phase"
                  class="flex h-11 items-center gap-1 rounded-lg border px-2 text-count"
                  :class="node.phase === phase
                    ? 'border-border-selected bg-selected-bg text-text-primary active:bg-selected-bg-pressed'
                    : 'border-border-default text-text-secondary active:bg-surface-pressed'"
                  @click="pickPhase(node, phase)"
                >
                  <Check v-if="node.phase === phase" :size="12" class="shrink-0" />
                  {{ phase }}
                </button>
                <span v-if="!node.phase" class="text-count text-text-secondary">미연결</span>
              </template>

              <span class="flex-1"></span>

              <button
                v-for="move in [-1, 1]"
                :key="move"
                class="flex size-11 shrink-0 items-center justify-center rounded-lg"
                :class="(move < 0 ? i > 0 : i < draft.nodes.length - 1)
                  ? 'text-text-secondary active:bg-surface-pressed'
                  : 'text-text-disabled'"
                @click="moveNode(i, move)"
              >
                <component :is="move < 0 ? ChevronUp : ChevronDown" :size="16" />
              </button>
              <!-- 파괴적 조작이라 경고색이다 -->
              <button
                class="flex size-11 shrink-0 items-center justify-center rounded-lg text-danger-fg active:bg-danger-bg"
                @click="askRemoveNode(i)"
              >
                <Trash2 :size="16" />
              </button>
            </div>

            <!-- 감정평가: 설문 구성 -->
            <div v-if="node.type === '감정평가'" class="flex flex-wrap gap-1">
              <button
                v-for="survey in surveyChoices"
                :key="survey.code"
                class="flex h-11 items-center gap-1 rounded-lg border px-3 text-label"
                :class="node.surveyCodes.includes(survey.code)
                  ? 'border-border-selected bg-selected-bg text-text-primary active:bg-selected-bg-pressed'
                  : 'border-border-default text-text-secondary active:bg-surface-pressed'"
                @click="toggle(node.surveyCodes, survey.code)"
              >
                <Check v-if="node.surveyCodes.includes(survey.code)" :size="12" class="shrink-0" />
                {{ survey.name }}
                <span class="text-count text-text-secondary">{{ survey.code }}</span>
              </button>
            </div>

            <!-- 프로그램 처방: 후보 프로그램 -->
            <div v-else-if="node.type === '프로그램 처방'" class="flex flex-wrap gap-1">
              <button
                v-for="program in programChoices"
                :key="program.id"
                class="flex h-11 items-center gap-1 rounded-lg border px-3 text-label"
                :class="node.programIds.includes(program.id)
                  ? 'border-border-selected bg-selected-bg text-text-primary active:bg-selected-bg-pressed'
                  : 'border-border-default text-text-secondary active:bg-surface-pressed'"
                @click="toggle(node.programIds, program.id)"
              >
                <Check v-if="node.programIds.includes(program.id)" :size="12" class="shrink-0" />
                {{ program.name }}
              </button>
              <p v-if="!programChoices.length" class="text-count text-text-secondary">
                이 증상의 프로그램이 아직 없습니다
              </p>
            </div>

            <!-- 프로그램 수행: 회차는 정의가 적지 않는다 -->
            <p v-else class="text-count text-text-secondary">
              회차의 이름 · 개수는 처방된 프로그램이, 날짜와 간격은 일정이 정한다
            </p>
          </div>

          <p v-if="!draft.nodes.length" class="text-label text-text-secondary">
            아래에서 노드를 골라 흐름을 만든다
          </p>
        </div>

        <!-- 노드 추가. 개수 제한이 없다 -->
        <div class="mt-1 flex shrink-0 gap-1">
          <button
            v-for="item in NODE_TYPES"
            :key="item.type"
            class="flex h-11 min-w-0 flex-1 items-center justify-center gap-1 rounded-lg border border-border-default text-label text-text-secondary active:bg-surface-pressed"
            @click="addNode(item.type)"
          >
            <Plus :size="16" class="shrink-0" />
            <span class="truncate">{{ item.type }}</span>
          </button>
        </div>
      </section>
    </div>

    <DeleteConfirmModal
      v-if="deleting"
      heading="노드를 삭제할까요?"
      :detail="deleting.label"
      warning="환자가 지나는 단계가 하나 줄고, 저장하면 되돌릴 수 없습니다."
      @confirm="confirmRemoveNode"
      @close="deleting = null"
    />

    <UnsavedWarningModal
      v-if="pendingAction"
      subject="프로세스 정의"
      @discard="discardAndRun"
      @save="saveAndRun"
      @close="pendingAction = null"
    />
  </div>
</template>
