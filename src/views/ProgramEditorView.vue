<script setup>
import { ref, computed, nextTick } from 'vue'
import { useRoute, useRouter, onBeforeRouteLeave } from 'vue-router'
import { ChevronLeft, ChevronUp, ChevronDown, Plus, Trash2 } from 'lucide-vue-next'
import {
  programs, findProgram, saveProgram, nextProgramId, PROGRAM_FORMS,
} from '../mocks/programs.js'
import { dimensions } from '../mocks/analysis.js'
import InlineCallout from '../components/InlineCallout.vue'
import DeleteConfirmModal from '../components/DeleteConfirmModal.vue'
import UnsavedWarningModal from '../components/UnsavedWarningModal.vue'

/*
 * 프로그램 저작 — 저작도구 '프로그램'의 편집 화면 (축소 버전). 편집 화면 5호.
 *
 * **회차의 이름과 순서까지가 이 화면의 몫이다.** 회차 안의 PHASE와 활동은
 * 세션 활동 저작이 만들 자리다(4.8절) — 두 화면이 같은 것을 만들면 어느 쪽이
 * 원본인지 알 수 없다. 그래서 여기서 회차는 **이름을 가진 자리**까지만이고,
 * 처방 화면의 세션 상세는 지금처럼 `phasesOf`가 골격으로 채운다.
 *
 * **효과성(rating)은 받지 않는다.** 수행 기록에서 나오는 값이지 만드는 사람이
 * 적는 값이 아니다. 축소 기준은 척도 저작과 같다 — **앱이 실제로 읽는 필드**만
 * 받되, 그중에서도 저작이 정하는 것이 아닌 값은 뺀다.
 *
 * **회기 수·분량을 설명에 적게 하지 않는다.** 회차 목록이 이미 개수를 정하고
 * 분량은 자기 칸이 있다 — 설명에 다시 적으면 회차를 늘렸을 때 설명만 낡는다.
 *
 * ⚠️ Figma 디자인이 없다. 구버전 웹의 프로그램 저작 구성만 참고한 초안이다.
 */
const route = useRoute()
const router = useRouter()

const isNew = computed(() => route.params.id === 'new')
const original = computed(() => (isNew.value ? null : findProgram(route.params.id)))

const CONDITIONS = dimensions.find((d) => d.id === 'condition').keys

/* 쉼표로 나눈 목록은 입력에서 한 줄로 다룬다. 데이터 필드의 선택지와 같은 문법 */
const line = (list) => (list ?? []).join(', ')

function draftFrom(program) {
  return {
    id: program?.id ?? nextProgramId(),
    name: program?.name ?? '',
    condition: program?.condition ?? CONDITIONS[0],
    field: program?.field ?? '',
    form: program?.form ?? PROGRAM_FORMS[0],
    org: program?.org ?? '',
    place: program?.place ?? '',
    minutes: program?.minutes ?? 60,
    emotions: line(program?.emotions),
    topics: line(program?.topics),
    supplies: line(program?.supplies),
    summary: program?.summary ?? '',
    sessions: [...(program?.sessions ?? [])],
  }
}

const draft = ref(draftFrom(original.value))
const snapshot = ref(JSON.stringify(draft.value))
const isDirty = computed(() => JSON.stringify(draft.value) !== snapshot.value)

/* 새 회차는 추가하자마자 이름을 받는다 — 빈 줄을 남기지 않으려는 것이다 */
const rows = ref([])

async function addSession() {
  draft.value.sessions.push('')
  await nextTick()
  rows.value[draft.value.sessions.length - 1]?.focus()
}

function moveSession(i, step) {
  const to = i + step
  if (to < 0 || to >= draft.value.sessions.length) return
  const [name] = draft.value.sessions.splice(i, 1)
  draft.value.sessions.splice(to, 0, name)
}

/*
 * **삭제는 확인을 거친다.** 회차 하나가 환자가 실제로 만나는 자리 하나다.
 * 아직 이름이 없는 줄은 잃을 것이 없으므로 바로 지운다(3.6절).
 */
const deleting = ref(null)

function askRemoveSession(i) {
  if (!draft.value.sessions[i].trim()) {
    draft.value.sessions.splice(i, 1)
    return
  }
  deleting.value = { index: i, label: `${i + 1}회차 · ${draft.value.sessions[i]}` }
}

function confirmRemoveSession() {
  draft.value.sessions.splice(deleting.value.index, 1)
  deleting.value = null
}

/* 저장할 수 없는 이유. 비활성 버튼은 왜 못 누르는지 말해야 한다(3.8절) */
const blocked = computed(() => {
  const d = draft.value
  if (!d.name.trim()) return '프로그램 이름을 입력해 주세요'
  if (isNew.value && programs.some((p) => p.name === d.name.trim())) {
    return '이미 있는 프로그램 이름입니다'
  }
  if (!d.field.trim()) return '분야를 입력해 주세요'
  if (!d.org.trim()) return '기관을 입력해 주세요'
  if (!Number(d.minutes)) return '회차 분량을 입력해 주세요'
  if (!d.sessions.some((name) => name.trim())) return '회차를 하나 이상 만들어 주세요'
  return null
})

const calloutOpen = ref(false)

const goList = () => router.push({ path: '/authoring/program' })

function commit() {
  saveProgram(draft.value)
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

/* '나가기(저장 안 함)'은 초안을 되돌린 뒤 나간다 — 되돌리지 않으면 가드가 다시 막는다 */
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
        {{ isNew ? '새 프로그램' : draft.name || original?.name }}
      </h1>
      <p class="min-w-0 flex-1 truncate text-label text-text-secondary">
        {{ draft.sessions.length }}회차 · 회차당 {{ draft.minutes || 0 }}분
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
        <!-- 왜 못 누르는지 말한다. 무반응은 고장으로 읽힌다 -->
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
      <!-- 프로그램 자체 -->
      <section class="flex w-[320px] shrink-0 flex-col gap-2 overflow-y-auto rounded-lg border border-border-default bg-surface-card px-3 py-2">
        <p class="shrink-0 text-label font-medium">프로그램</p>

        <label class="flex shrink-0 flex-col gap-1">
          <span class="text-count text-text-secondary">이름</span>
          <input
            v-model="draft.name"
            class="h-11 w-full rounded-lg border border-border-default bg-surface-field px-3 text-label text-text-primary"
            placeholder="예: 마음챙김 호흡 이완 훈련"
          />
        </label>

        <div class="flex shrink-0 flex-col gap-1">
          <span class="text-count text-text-secondary">증상</span>
          <div class="flex h-11 items-center gap-1 rounded-lg bg-surface-field p-1">
            <button
              v-for="condition in CONDITIONS"
              :key="condition"
              class="flex h-9 min-w-0 flex-1 items-center justify-center truncate rounded px-2 text-label font-medium"
              :class="draft.condition === condition
                ? 'bg-surface-card text-text-primary'
                : 'text-text-secondary active:bg-surface-pressed'"
              @click="draft.condition = condition"
            >
              {{ condition }}
            </button>
          </div>
        </div>

        <div class="flex shrink-0 flex-col gap-1">
          <span class="text-count text-text-secondary">운영형태</span>
          <div class="flex h-11 items-center gap-1 rounded-lg bg-surface-field p-1">
            <button
              v-for="form in PROGRAM_FORMS"
              :key="form"
              class="flex h-9 min-w-0 flex-1 items-center justify-center rounded px-2 text-label font-medium"
              :class="draft.form === form
                ? 'bg-surface-card text-text-primary'
                : 'text-text-secondary active:bg-surface-pressed'"
              @click="draft.form = form"
            >
              {{ form }}
            </button>
          </div>
        </div>

        <div class="flex shrink-0 gap-2">
          <label class="flex min-w-0 flex-1 flex-col gap-1">
            <span class="text-count text-text-secondary">분야</span>
            <input
              v-model="draft.field"
              class="h-11 w-full rounded-lg border border-border-default bg-surface-field px-3 text-label text-text-primary"
              placeholder="예: 문학치료"
            />
          </label>
          <label class="flex w-24 shrink-0 flex-col gap-1">
            <span class="text-count text-text-secondary">회차 분량(분)</span>
            <input
              v-model="draft.minutes"
              type="number"
              inputmode="numeric"
              class="h-11 w-full rounded-lg border border-border-default bg-surface-field px-3 text-label text-text-primary"
            />
          </label>
        </div>

        <div class="flex shrink-0 gap-2">
          <label class="flex min-w-0 flex-1 flex-col gap-1">
            <span class="text-count text-text-secondary">기관</span>
            <input
              v-model="draft.org"
              class="h-11 w-full rounded-lg border border-border-default bg-surface-field px-3 text-label text-text-primary"
              placeholder="예: 중앙대학교병원"
            />
          </label>
          <label class="flex w-24 shrink-0 flex-col gap-1">
            <span class="text-count text-text-secondary">지역</span>
            <input
              v-model="draft.place"
              class="h-11 w-full rounded-lg border border-border-default bg-surface-field px-3 text-label text-text-primary"
              placeholder="예: 서울"
            />
          </label>
        </div>

        <!-- 쉼표로 나눈 목록 셋. 처방 화면의 필터 축이 이 값들을 센다 -->
        <label class="flex shrink-0 flex-col gap-1">
          <span class="text-count text-text-secondary">치유대상감정 (쉼표로 구분)</span>
          <input
            v-model="draft.emotions"
            class="h-11 w-full rounded-lg border border-border-default bg-surface-field px-3 text-label text-text-primary"
            placeholder="예: 불안, 분노, 무력감"
          />
        </label>

        <label class="flex shrink-0 flex-col gap-1">
          <span class="text-count text-text-secondary">주제어 (쉼표로 구분)</span>
          <input
            v-model="draft.topics"
            class="h-11 w-full rounded-lg border border-border-default bg-surface-field px-3 text-label text-text-primary"
            placeholder="예: 서사, 외상"
          />
        </label>

        <label class="flex shrink-0 flex-col gap-1">
          <span class="text-count text-text-secondary">준비물 (쉼표로 구분)</span>
          <input
            v-model="draft.supplies"
            class="h-11 w-full rounded-lg border border-border-default bg-surface-field px-3 text-label text-text-primary"
            placeholder="예: 감정 기록지, 필기구"
          />
        </label>

        <label class="flex shrink-0 flex-col gap-1">
          <span class="text-count text-text-secondary">설명</span>
          <textarea
            v-model="draft.summary"
            rows="3"
            class="w-full rounded-lg border border-border-default bg-surface-field px-3 py-2 text-label text-text-primary"
          />
        </label>
      </section>

      <!-- 회차. 개수도 순서도 여기서 정해진다 -->
      <section class="flex min-w-0 flex-1 flex-col rounded-lg border border-border-default bg-surface-card px-3 py-2">
        <div class="flex shrink-0 items-center gap-2">
          <p class="text-label font-medium">
            회차 <span class="text-text-secondary">· {{ draft.sessions.length }}</span>
          </p>
          <span class="flex-1"></span>
          <button
            class="-mr-2 flex h-11 items-center gap-1 rounded-lg px-2 text-label text-text-secondary active:bg-surface-pressed"
            @click="addSession"
          >
            <Plus :size="16" />
            회차 추가
          </button>
        </div>

        <p class="shrink-0 text-count text-text-secondary">
          회차 안의 활동은 세션 활동에서 만든다. 여기서는 이름과 순서를 정한다
        </p>

        <div class="mt-2 flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto">
          <div
            v-for="(name, i) in draft.sessions"
            :key="i"
            class="flex min-h-11 shrink-0 items-center gap-2 rounded-lg border border-border-default px-3 py-1"
          >
            <span class="w-12 shrink-0 text-count text-text-secondary">{{ i + 1 }}회차</span>
            <input
              :ref="(el) => (rows[i] = el)"
              v-model="draft.sessions[i]"
              class="h-9 min-w-0 flex-1 rounded bg-transparent text-label text-text-primary"
              placeholder="회차 이름"
            />
            <button
              v-for="move in [-1, 1]"
              :key="move"
              class="flex size-11 shrink-0 items-center justify-center rounded-lg"
              :class="(move < 0 ? i > 0 : i < draft.sessions.length - 1)
                ? 'text-text-secondary active:bg-surface-pressed'
                : 'text-text-disabled'"
              @click="moveSession(i, move)"
            >
              <component :is="move < 0 ? ChevronUp : ChevronDown" :size="16" />
            </button>
            <!-- 파괴적 조작이라 경고색이다 -->
            <button
              class="flex size-11 shrink-0 items-center justify-center rounded-lg text-danger-fg active:bg-danger-bg"
              @click="askRemoveSession(i)"
            >
              <Trash2 :size="16" />
            </button>
          </div>

          <p v-if="!draft.sessions.length" class="text-label text-text-secondary">
            아직 회차가 없습니다. '회차 추가'로 만듭니다
          </p>
        </div>
      </section>
    </div>

    <DeleteConfirmModal
      v-if="deleting"
      heading="회차를 삭제할까요?"
      :detail="deleting.label"
      warning="환자가 만나는 회차가 하나 줄고, 저장하면 되돌릴 수 없습니다."
      @confirm="confirmRemoveSession"
      @close="deleting = null"
    />

    <UnsavedWarningModal
      v-if="pendingAction"
      subject="프로그램"
      @discard="discardAndRun"
      @save="saveAndRun"
      @close="pendingAction = null"
    />
  </div>
</template>
