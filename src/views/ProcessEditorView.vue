<script setup>
import { ref, computed } from 'vue'
import { useRoute, useRouter, onBeforeRouteLeave } from 'vue-router'
import { ChevronLeft, Check, Minus, Plus } from 'lucide-vue-next'
import {
  processLibrary, findProcess, saveProcess, nextProcessId,
} from '../mocks/processLibrary.js'
import { surveys } from '../mocks/surveys.js'
import { programs } from '../mocks/programs.js'
import { dimensions } from '../mocks/analysis.js'
import InlineCallout from '../components/InlineCallout.vue'
import UnsavedWarningModal from '../components/UnsavedWarningModal.vue'

/*
 * 프로세스 저작 — 저작도구 '프로세스'의 편집 화면 (MVP).
 *
 * **단계 골격은 편집하지 않는다.** 구버전 웹은 노드를 끌어다 자유롭게 이어
 * 임의의 흐름을 만들 수 있지만, 이 앱의 코어 프로세스는 네 단계로 고정돼 있고
 * (감정평가 사전 → 프로그램 처방 → 프로그램 수행 → 감정평가 사후) 스테퍼 ·
 * 단계 화면 · `stepStateOf`가 전부 그 순서를 전제한다. 자유 그래프를 받으면
 * **앱이 그릴 수 없는 정의**가 만들어진다 — 만드는 쪽은 되는데 쓰는 쪽이 안 되는
 * 상태가 제일 나쁘다.
 *
 * 그래서 저작이 정하는 것은 골격 안의 **내용물 셋**이다.
 *   감정평가 → 어떤 설문을 쓰는가 (사전·사후 같은 구성이다. 앱이 그렇게 읽는다)
 *   프로그램 처방 → 어떤 프로그램을 후보로 두는가
 *   프로그램 수행 → 몇 회기인가
 *
 * 골격 자체를 바꿔야 할 때가 오면 코어 프로세스 화면과 함께 열어야 한다.
 *
 * **생체신호는 하나의 토글이다.** 웹은 HRV·fNIRS를 따로 켜지만 앱이 읽는 값은
 * `bio` 하나뿐이라(측정 화면이 두 종류를 모두 연다) 나눠 받아도 반영될 자리가 없다.
 *
 * ⚠️ Figma 디자인이 없다. 구버전 웹 화면의 구성만 참고한 MVP다.
 * ⚠️ **정의가 프로그램 id를 들고 있지 않다.** 목업의 처방 항목은 임의 문구라
 *    (`이야기 다시 쓰기`) `programs.js`의 이름과 맞지 않고, 기존 정의를 열면
 *    후보가 비어 보인다. 정의가 id를 들고 오면 이름 대조를 걷어낸다.
 */
const route = useRoute()
const router = useRouter()

const isNew = computed(() => route.params.id === 'new')
const original = computed(() => (isNew.value ? null : findProcess(route.params.id)))

const CONDITIONS = dimensions.find((d) => d.id === 'condition').keys

const today = () => new Date().toISOString().slice(0, 10)

/* 회기 수는 '프로그램 수행' 단계의 항목 수가 곧 값이다 */
function draftFrom(process) {
  const performing = process?.steps?.find((s) => s.name === '프로그램 수행')
  const evaluation = process?.steps?.find((s) => s.name.startsWith('감정평가'))
  const prescribing = process?.steps?.find((s) => s.name === '프로그램 처방')
  return {
    id: process?.id ?? nextProcessId(),
    name: process?.name ?? '',
    condition: process?.condition ?? CONDITIONS[0],
    author: process?.author ?? '',
    summary: process?.summary ?? '',
    date: process?.date ?? today(),
    bio: process?.bio ?? true,
    surveyCodes: (evaluation?.items ?? []).map((item) => item.code),
    /* 처방 후보는 이름으로 맞춘다 — 정의가 프로그램 id를 들고 있지 않다 */
    programIds: programs
      .filter((p) => (prescribing?.items ?? []).some((item) => item.label === p.name))
      .map((p) => p.id),
    sessionCount: performing?.items?.length ?? 6,
  }
}

const draft = ref(draftFrom(original.value))
const snapshot = ref(JSON.stringify(draft.value))
const isDirty = computed(() => JSON.stringify(draft.value) !== snapshot.value)

/* 고를 수 있는 설문은 그 진단의 것과 공통 척도다 */
const surveyChoices = computed(() =>
  Object.values(surveys).filter((s) => s.scope === '공통' || s.scope === draft.value.condition),
)
const programChoices = computed(() => programs.filter((p) => p.condition === draft.value.condition))

function toggle(list, value) {
  const at = list.indexOf(value)
  if (at >= 0) list.splice(at, 1)
  else list.push(value)
}

/* 진단을 바꾸면 고를 목록이 바뀐다. 남겨두면 그 진단에 없는 구성이 저장된다 */
function pickCondition(condition) {
  draft.value.condition = condition
  draft.value.surveyCodes = draft.value.surveyCodes.filter((code) =>
    surveyChoices.value.some((s) => s.code === code),
  )
  draft.value.programIds = draft.value.programIds.filter((id) =>
    programChoices.value.some((p) => p.id === id),
  )
}

const bump = (step) => {
  draft.value.sessionCount = Math.min(20, Math.max(1, draft.value.sessionCount + step))
}

/* 저장할 수 없는 이유. 비활성 버튼은 왜 못 누르는지 말해야 한다(3.8절) */
const blocked = computed(() => {
  const d = draft.value
  if (!d.name.trim()) return '프로세스 이름을 입력해 주세요'
  if (isNew.value && processLibrary.some((p) => p.name === d.name.trim())) {
    return '같은 이름의 프로세스가 있습니다'
  }
  if (!d.author.trim()) return '작성자를 입력해 주세요'
  if (!d.surveyCodes.length) return '감정평가 설문을 하나 이상 골라 주세요'
  return null
})

const calloutOpen = ref(false)

const goList = () => router.push({ path: '/authoring/process' })

function commit() {
  saveProcess({
    ...draft.value,
    name: draft.value.name.trim(),
    programs: programs.filter((p) => draft.value.programIds.includes(p.id)),
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
        네 단계 골격은 고정이고 그 안의 구성을 정한다
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
      <section class="flex w-[300px] shrink-0 flex-col gap-2 overflow-y-auto rounded-lg border border-border-default bg-surface-card px-3 py-2">
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

      <!-- 단계 구성. 골격은 고정이고 내용물만 고른다 -->
      <section class="flex min-w-0 flex-1 flex-col gap-2 overflow-y-auto rounded-lg border border-border-default bg-surface-card px-3 py-2">
        <div class="flex items-center gap-2">
          <p class="text-label font-medium">단계 구성</p>
          <span class="flex-1"></span>
          <span class="text-count text-text-secondary">
            감정평가(사전) · 프로그램 처방 · 프로그램 수행 · 감정평가(사후)
          </span>
        </div>

        <!-- 감정평가. 사전과 사후는 같은 구성이다 -->
        <div class="flex flex-col gap-1 rounded-lg border border-border-default px-3 py-2">
          <div class="flex items-center gap-2">
            <p class="text-label font-medium">감정평가 설문</p>
            <span class="flex-1"></span>
            <span class="text-count text-text-secondary">
              사전 · 사후 같은 구성 · {{ draft.surveyCodes.length }}종
            </span>
          </div>
          <div class="flex flex-wrap gap-1">
            <button
              v-for="survey in surveyChoices"
              :key="survey.code"
              class="flex h-11 items-center gap-1 rounded-lg border px-3 text-label"
              :class="draft.surveyCodes.includes(survey.code)
                ? 'border-border-selected bg-selected-bg text-text-primary active:bg-selected-bg-pressed'
                : 'border-border-default text-text-secondary active:bg-surface-pressed'"
              @click="toggle(draft.surveyCodes, survey.code)"
            >
              <Check v-if="draft.surveyCodes.includes(survey.code)" :size="12" class="shrink-0" />
              {{ survey.name }}
              <span class="text-count text-text-secondary">{{ survey.code }}</span>
            </button>
          </div>
        </div>

        <!-- 프로그램 처방 후보 -->
        <div class="flex flex-col gap-1 rounded-lg border border-border-default px-3 py-2">
          <div class="flex items-center gap-2">
            <p class="text-label font-medium">처방 후보 프로그램</p>
            <span class="flex-1"></span>
            <span class="text-count text-text-secondary">{{ draft.programIds.length }}개</span>
          </div>
          <div class="flex flex-wrap gap-1">
            <button
              v-for="program in programChoices"
              :key="program.id"
              class="flex h-11 items-center gap-1 rounded-lg border px-3 text-label"
              :class="draft.programIds.includes(program.id)
                ? 'border-border-selected bg-selected-bg text-text-primary active:bg-selected-bg-pressed'
                : 'border-border-default text-text-secondary active:bg-surface-pressed'"
              @click="toggle(draft.programIds, program.id)"
            >
              <Check v-if="draft.programIds.includes(program.id)" :size="12" class="shrink-0" />
              {{ program.name }}
            </button>
          </div>
          <p v-if="!programChoices.length" class="text-count text-text-secondary">
            이 증상의 프로그램이 아직 없습니다
          </p>
        </div>

        <!-- 프로그램 수행 회기 수 -->
        <div class="flex items-center gap-2 rounded-lg border border-border-default px-3 py-2">
          <p class="text-label font-medium">수행 회기</p>
          <span class="flex-1"></span>
          <span class="text-count text-text-secondary">
            총 {{ draft.sessionCount }}회기 · {{ draft.sessionCount }}주 · 주 1회
          </span>
          <div class="flex items-center gap-1">
            <button
              class="flex size-11 items-center justify-center rounded-lg border border-border-default text-text-secondary active:bg-surface-pressed"
              @click="bump(-1)"
            >
              <Minus :size="16" />
            </button>
            <span class="w-8 text-center text-label font-medium">{{ draft.sessionCount }}</span>
            <button
              class="flex size-11 items-center justify-center rounded-lg border border-border-default text-text-secondary active:bg-surface-pressed"
              @click="bump(1)"
            >
              <Plus :size="16" />
            </button>
          </div>
        </div>
      </section>
    </div>

    <UnsavedWarningModal
      v-if="pendingAction"
      subject="프로세스 정의"
      @discard="runPending"
      @save="saveAndRun"
      @close="pendingAction = null"
    />
  </div>
</template>
