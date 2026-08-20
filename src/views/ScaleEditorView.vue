<script setup>
import { ref, computed } from 'vue'
import { useRoute, useRouter, onBeforeRouteLeave } from 'vue-router'
import { ChevronLeft, Plus, Trash2 } from 'lucide-vue-next'
import { surveys, surveyOf, saveSurvey, SURVEY_KINDS } from '../mocks/surveys.js'
import { dimensions } from '../mocks/analysis.js'
import InlineCallout from '../components/InlineCallout.vue'
import UnsavedWarningModal from '../components/UnsavedWarningModal.vue'

/*
 * 척도 저작 — 저작도구 '척도'의 편집 화면 (축소 버전).
 *
 * **축소의 기준은 '앱이 실제로 쓰는 필드'다.** 구버전 웹의 저작 화면은
 * 버전 · 스키마 버전 · 영문명 · 작성기관 · 문항수 · 역채점 · 서술형 · 중증도
 * 구간까지 받지만, 이 앱의 어느 화면도 그 값을 읽지 않는다. 읽는 곳이 없는
 * 값을 받으면 **입력한 사람이 반영됐는지 확인할 방법이 없다.**
 * 읽는 곳이 생기면 그때 이 폼에 한 줄씩 는다.
 *
 * 뺀 것 중 둘은 이유가 따로 있다.
 *  - **문항수**: 문항 목록이 이미 정한다. 두 곳에서 받으면 갈라진다
 *  - **중증도 구간**: 이 앱의 등급 판정은 컷오프 하나와 핵심/보조로 갈린다
 *    (`gradeOf`). 구간을 여러 개 받아도 판정이 그것을 보지 않는다
 *
 * **설문 코드는 새로 만들 때만 정한다.** 코드가 응답의 키라(`환자:시점:코드`)
 * 나중에 바꾸면 이미 받아둔 응답이 끊긴다.
 *
 * ⚠️ Figma 디자인이 없다. 구버전 웹의 저작 화면 구성만 참고한 초안이다.
 */
const route = useRoute()
const router = useRouter()

const isNew = computed(() => route.params.code === 'new')
const original = computed(() => (isNew.value ? null : surveyOf(route.params.code)))

/* 진단 축은 분석 화면과 같은 곳에서 온다 — 여기 다시 적으면 두 화면이 갈라진다 */
const SCOPES = ['공통', ...dimensions.find((d) => d.id === 'condition').keys]
const ROLES = ['핵심', '보조']

function draftFrom(survey) {
  return {
    code: survey?.code ?? '',
    name: survey?.name ?? '',
    role: survey?.role ?? '보조',
    scope: survey?.scope ?? '공통',
    kind: survey?.kind ?? '임상',
    cutoff: survey?.cutoff ?? '',
    summary: survey?.summary ?? '',
    guide: survey?.guide ?? '',
    scale: (survey?.scale ?? [{ label: '', score: 0 }]).map((o) => ({ ...o })),
    questions: [...(survey?.questions ?? [''])],
  }
}

const draft = ref(draftFrom(original.value))
const snapshot = ref(JSON.stringify(draft.value))
const isDirty = computed(() => JSON.stringify(draft.value) !== snapshot.value)

/* 보기 최고점. 총점 미리보기와 저장이 같은 식을 쓴다 */
const topScore = computed(() => Math.max(...draft.value.scale.map((o) => Number(o.score) || 0), 0))
const filledQuestions = computed(() => draft.value.questions.filter((q) => q.trim()).length)

/* 저장할 수 없는 이유. 비활성 버튼은 왜 못 누르는지 말해야 한다(3.8절) */
const blocked = computed(() => {
  const d = draft.value
  if (!d.code.trim()) return '설문 코드를 입력해 주세요'
  if (isNew.value && surveys[d.code.trim()]) return '이미 있는 설문 코드입니다'
  if (!d.name.trim()) return '척도 이름을 입력해 주세요'
  if (!d.scale.some((o) => o.label.trim())) return '응답 보기를 하나 이상 만들어 주세요'
  if (!filledQuestions.value) return '문항을 하나 이상 적어 주세요'
  return null
})

const calloutOpen = ref(false)

const goList = () => router.push({ path: '/authoring/scale' })

function commit() {
  saveSurvey({ ...draft.value, code: draft.value.code.trim() })
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

/*
 * 미저장 경고는 한 자리로 모은다 — 머리의 뒤로가기와 라우터 이탈 둘 다
 * 여기를 거친다. 흩어놓으면 한 경로만 빠져나간다.
 */
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
  /* 저장할 수 없는 상태면 저장하지 않고 나간다 — 반쪽짜리 정의를 남기지 않는다 */
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

const addOption = () => draft.value.scale.push({ label: '', score: draft.value.scale.length })
const removeOption = (i) => draft.value.scale.splice(i, 1)
const addQuestion = () => draft.value.questions.push('')
const removeQuestion = (i) => draft.value.questions.splice(i, 1)
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
        {{ isNew ? '새 척도' : draft.name || original?.name }}
      </h1>
      <p class="min-w-0 flex-1 truncate text-label text-text-secondary">
        감정평가에서 쓰는 설문 척도
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

    <div class="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto">
      <div class="flex shrink-0 gap-2">
        <!-- 기본 정보 -->
        <section class="flex min-w-0 flex-1 flex-col gap-2 rounded-lg border border-border-default bg-surface-card px-3 py-2">
          <p class="text-label font-medium">기본 정보</p>

          <label class="flex flex-col gap-1">
            <span class="text-count text-text-secondary">설문 코드</span>
            <!-- 응답의 키라 만들 때만 정한다 -->
            <input
              v-if="isNew"
              v-model="draft.code"
              class="h-11 w-full rounded-lg border border-border-default bg-surface-field px-3 text-label text-text-primary"
              placeholder="예: PCL-5"
            />
            <span v-else class="flex h-11 items-center rounded-lg bg-surface-recessed px-3 text-label text-text-secondary">
              {{ draft.code }}
            </span>
          </label>

          <label class="flex flex-col gap-1">
            <span class="text-count text-text-secondary">척도 이름</span>
            <input
              v-model="draft.name"
              class="h-11 w-full rounded-lg border border-border-default bg-surface-field px-3 text-label text-text-primary"
              placeholder="예: PTSD 증상 체크리스트"
            />
          </label>

          <!-- 대상은 진단 축을 다 펼쳐야 해서 한 줄을 통째로 쓴다 -->
          <div class="flex flex-col gap-1">
            <span class="text-count text-text-secondary">대상</span>
              <div class="flex h-11 items-center gap-1 rounded-lg bg-surface-field p-1">
                <button
                  v-for="scope in SCOPES"
                  :key="scope"
                  class="flex h-9 min-w-0 flex-1 items-center justify-center truncate rounded px-2 text-label font-medium"
                  :class="draft.scope === scope
                    ? 'bg-surface-card text-text-primary'
                    : 'text-text-secondary active:bg-surface-pressed'"
                  @click="draft.scope = scope"
                >
                  {{ scope }}
                </button>
              </div>
          </div>

          <div class="flex gap-2">
            <!-- 종류. 인문 척도는 임상 원본의 코드에 H-를 붙인 것이다(4.7절) -->
            <div class="flex min-w-0 flex-1 flex-col gap-1">
              <span class="text-count text-text-secondary">종류</span>
              <div class="flex h-11 items-center gap-1 rounded-lg bg-surface-field p-1">
                <button
                  v-for="kind in SURVEY_KINDS"
                  :key="kind"
                  class="flex h-9 flex-1 items-center justify-center rounded px-2 text-label font-medium"
                  :class="draft.kind === kind
                    ? 'bg-surface-card text-text-primary'
                    : 'text-text-secondary active:bg-surface-pressed'"
                  @click="draft.kind = kind"
                >
                  {{ kind }}
                </button>
              </div>
            </div>

            <div class="flex min-w-0 flex-1 flex-col gap-1">
              <span class="text-count text-text-secondary">역할</span>
              <div class="flex h-11 items-center gap-1 rounded-lg bg-surface-field p-1">
                <button
                  v-for="role in ROLES"
                  :key="role"
                  class="flex h-9 flex-1 items-center justify-center rounded px-2 text-label font-medium"
                  :class="draft.role === role
                    ? 'bg-surface-card text-text-primary'
                    : 'text-text-secondary active:bg-surface-pressed'"
                  @click="draft.role = role"
                >
                  {{ role }}
                </button>
              </div>
            </div>

            <label class="flex w-[100px] shrink-0 flex-col gap-1">
              <span class="text-count text-text-secondary">컷오프</span>
              <input
                v-model="draft.cutoff"
                class="h-11 w-full rounded-lg border border-border-default bg-surface-field px-3 text-label text-text-primary"
                inputmode="numeric"
                placeholder="없음"
              />
            </label>
          </div>

          <label class="flex flex-col gap-1">
            <span class="text-count text-text-secondary">설명</span>
            <textarea
              v-model="draft.summary"
              rows="2"
              class="w-full rounded-lg border border-border-default bg-surface-field px-3 py-2 text-label text-text-primary"
            />
          </label>

          <label class="flex flex-col gap-1">
            <span class="text-count text-text-secondary">지시문</span>
            <textarea
              v-model="draft.guide"
              rows="2"
              class="w-full rounded-lg border border-border-default bg-surface-field px-3 py-2 text-label text-text-primary"
            />
          </label>
        </section>

        <!-- 응답 보기. 한 척도에 한 벌이다 -->
        <section class="flex w-[360px] shrink-0 flex-col gap-2 rounded-lg border border-border-default bg-surface-card px-3 py-2">
          <div class="flex items-center gap-2">
            <p class="text-label font-medium">응답 보기</p>
            <span class="flex-1"></span>
            <span class="text-count text-text-secondary">최고점 {{ topScore }}</span>
          </div>

          <div class="flex flex-col gap-1">
            <div v-for="(option, i) in draft.scale" :key="i" class="flex items-center gap-1">
              <input
                v-model="option.label"
                class="h-11 min-w-0 flex-1 rounded-lg border border-border-default bg-surface-field px-3 text-label text-text-primary"
                placeholder="보기 문구"
              />
              <input
                v-model="option.score"
                class="h-11 w-14 shrink-0 rounded-lg border border-border-default bg-surface-field px-2 text-center text-label text-text-primary"
                inputmode="numeric"
              />
              <button
                class="flex size-11 shrink-0 items-center justify-center rounded-lg text-text-secondary active:bg-surface-pressed"
                @click="removeOption(i)"
              >
                <Trash2 :size="16" />
              </button>
            </div>
          </div>

          <button
            class="flex h-11 items-center justify-center gap-1 rounded-lg border border-border-default text-label text-text-secondary active:bg-surface-pressed"
            @click="addOption"
          >
            <Plus :size="16" />
            보기 추가
          </button>
        </section>
      </div>

      <!-- 문항 -->
      <section class="flex shrink-0 flex-col gap-2 rounded-lg border border-border-default bg-surface-card px-3 py-2">
        <div class="flex items-center gap-2">
          <p class="text-label font-medium">
            문항 <span class="text-text-secondary">· {{ draft.questions.length }}</span>
          </p>
          <span class="flex-1"></span>
          <!-- 총점은 저장할 때 세는 식과 같다 -->
          <span class="text-count text-text-secondary">총점 {{ filledQuestions * topScore }}</span>
        </div>

        <div class="flex flex-col gap-1">
          <div v-for="(question, i) in draft.questions" :key="i" class="flex items-center gap-2">
            <span class="w-6 shrink-0 text-center text-count text-text-secondary">{{ i + 1 }}</span>
            <input
              v-model="draft.questions[i]"
              class="h-11 min-w-0 flex-1 rounded-lg border border-border-default bg-surface-field px-3 text-label text-text-primary"
              placeholder="문항 내용"
            />
            <button
              class="flex size-11 shrink-0 items-center justify-center rounded-lg text-text-secondary active:bg-surface-pressed"
              @click="removeQuestion(i)"
            >
              <Trash2 :size="16" />
            </button>
          </div>
        </div>

        <button
          class="flex h-11 items-center justify-center gap-1 rounded-lg border border-border-default text-label text-text-secondary active:bg-surface-pressed"
          @click="addQuestion"
        >
          <Plus :size="16" />
          문항 추가
        </button>
      </section>
    </div>

    <UnsavedWarningModal
      v-if="pendingAction"
      subject="척도 정의"
      @discard="runPending"
      @save="saveAndRun"
      @close="pendingAction = null"
    />
  </div>
</template>
