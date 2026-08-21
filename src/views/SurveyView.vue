<script setup>
import { ref, computed } from 'vue'
import { useRoute, useRouter, onBeforeRouteLeave } from 'vue-router'
import { session } from '../authState.js'
import { Check, CircleCheckBig } from 'lucide-vue-next'
import { patients } from '../mocks/patients.js'
import { surveyOf, draftOf, answeredCount, submitSurvey, saveSurveyDraft } from '../mocks/surveys.js'

/*
 * 설문 수행 (Figma 없음 — 임의 제작).
 *
 * **이 화면은 셸 전체를 걷는다.** 상담사가 태블릿을 환자에게 건네는 유일한
 * 지점이라(4.0.1절), 우측 패널에 다른 환자가 보여서도 안 되고 좌측 내비로
 * 환자가 아무 화면에나 들어갈 수 있어서도 안 된다. 우측만 감추면 이탈 경로가
 * 남아 응답이 소실된다. 라우트 `meta.bare`가 셸을 통째로 걷는다.
 *
 * **환자가 끝내는 유일한 경로는 제출 버튼**이고, 제출하면 완료 알림 화면으로
 * 넘어간다. 그 화면도 셸을 걷은 채다 — 태블릿이 아직 환자 손에 있다.
 * 상담사용으로 돌아가는 것은 그 화면의 명시적 조작으로만 한다.
 *
 * 이탈 차단은 **UI 경로 제거까지**다. 기기 화면 고정은 전제하지 않는다 —
 * 앱이 제어할 수 없는 시스템 설정에 안전성을 걸 수 없다. 다만 제스처 뒤로가기는
 * 살아 있으므로 뒤로가기가 오면 경고 모달을 띄운다. 무반응은 고장으로 읽힌다.
 */
const route = useRoute()
const router = useRouter()

const patient = computed(() => patients.find((p) => p.id === route.params.patientId) ?? null)
const survey = computed(() => surveyOf(route.params.code))
const phase = computed(() => (route.params.phase === 'post' ? 'post' : 'pre'))

const draft = computed(() => draftOf(route.params.patientId, phase.value, route.params.code))

/* 이미 제출된 설문을 다시 열면 응답이 그대로 보인다 — 고치러 들어오는 자리다 */
const submitted = ref(false)

const answered = computed(() => answeredCount(survey.value, draft.value.answers))
const total = computed(() => survey.value.questions.length)
const percent = computed(() => Math.round((answered.value / total.value) * 100))
const complete = computed(() => answered.value === total.value)

function pick(index, score) {
  draft.value.answers[index] = score
}

/*
 * 제출 뒤가 세션에 따라 갈린다.
 *
 * **상담사가 건네준 경우에만 완료 알림 화면을 거친다.** 그 화면의 목적은
 * 태블릿이 아직 환자 손에 있을 때 상담사용으로 곧장 돌아가지 않게 막는 것이다.
 * 환자가 자기 화면에서 열었다면 돌아갈 곳이 자기 화면이라 막을 것이 없고,
 * '태블릿을 전달해 주세요'도 맞지 않는 말이 된다 — 바로 되돌린다.
 */
function submit() {
  if (!complete.value) return
  submitSurvey(route.params.patientId, phase.value, route.params.code)
  submitted.value = true
  if (patientSession()) backToCounselor()
}

/*
 * 임시 저장. 응답은 이미 반응형 상태에 남아 있고, 이 버튼은 **저장했다는 사실을
 * 남기는** 명시적 조작이다. 그 사실이 남아야 감정평가 목록이 '작성 중'을 알아보고,
 * 나가기 경고도 무엇이 사라지는지를 다르게 말할 수 있다.
 */
const savedAt = computed(() => draft.value.savedAt ?? null)

function saveDraft() {
  saveSurveyDraft(route.params.patientId, phase.value, route.params.code)
}

/*
 * 뒤로가기 경고. 환자가 실수로 뒤로 스와이프하면 응답이 소실된다.
 *
 * `history.pushState`로 직접 엔트리를 만들지 않는다 — 라우터가 모르는 엔트리가
 * 끼면 모달의 `router.back()`이 낸 popstate까지 이 화면이 삼켜 경고가 닫히지
 * 않는다(실제로 그렇게 만들었다가 고쳤다). 개인 메모의 미저장 경고와 같은
 * `onBeforeRouteLeave` 한 자리로 모은다.
 */
const warning = ref(false)

/* 경고에서 '나가기'를 고른 뒤에는 가드가 붙잡지 않는다 */
const leaving = ref(false)

onBeforeRouteLeave((to, from) => {
  /* 제출을 마쳤거나 나가기를 명시적으로 골랐으면 붙잡을 것이 없다 */
  if (submitted.value || leaving.value) return true
  /* 모달이 쿼리를 붙이며 일으키는 이동까지 막으면 경고 자신이 열리지 못한다 */
  if (to.path === from.path) return true
  warning.value = true
  return false
})

/*
 * **나가는 길은 여기 하나뿐이다.** 화면에 상시 나가기 버튼을 두면 환자가
 * 무심코 누른다. 뒤로가기 제스처를 받아 3버튼 경고로 갈라 놓으면, 나가려면
 * 두 번의 명시적 조작을 거쳐야 한다 — 개인 메모의 미저장 이탈 경고와 같은 문법이다.
 *
 * 다 채우지 않으면 제출할 수 없으므로, 저장하고 나가는 길이 없으면 중간에
 * 멈춘 설문은 아무 데도 갈 수 없다.
 */
function leave(save) {
  if (save) saveDraft()
  leaving.value = true
  warning.value = false
  backToCounselor()
}

/*
 * 돌아갈 곳은 **누가 들고 있느냐**가 정한다.
 * 상담사가 건네준 경우(상담사 세션)는 감정평가 단계로 돌아가고,
 * 환자가 자기 화면에서 연 경우는 자기 화면으로 돌아간다 —
 * 환자 세션으로 상담사 화면에 보내면 가드가 되돌려 화면이 한 번 튄다.
 */
const patientSession = () => session.role === 'patient'

function backToCounselor() {
  if (patientSession()) {
    router.replace({ path: '/patient' })
    return
  }
  router.replace({ path: `/process/${route.params.patientId}/${phase.value === 'post' ? 4 : 1}` })
}
</script>

<template>
  <div v-if="patient && survey" class="flex h-app flex-col overflow-hidden bg-surface-canvas text-text-primary">
    <!-- 제출 완료 알림. 셸을 걷은 채다 — 태블릿이 아직 환자 손에 있다 -->
    <div v-if="submitted" class="flex flex-1 flex-col items-center justify-center gap-6 px-6">
      <CircleCheckBig :size="48" class="shrink-0 text-interactive-default" />
      <div class="flex flex-col items-center gap-2">
        <h1 class="text-title-lg font-semibold">응답이 제출되었습니다</h1>
        <p class="text-body text-text-secondary">참여해 주셔서 감사합니다. 태블릿을 상담사에게 전달해 주세요.</p>
      </div>
      <!-- 환자가 무심코 누를 자리는 피한다. 화면 아래에 따로 떨어뜨렸다 -->
      <button class="mt-12 flex h-11 items-center" @click="backToCounselor">
        <span class="flex h-9 items-center rounded-lg border border-border-default bg-surface-card px-3 text-label font-medium text-text-secondary active:bg-surface-pressed">
          {{ session.role === 'patient' ? '내 화면으로 돌아가기' : '상담사 화면으로 돌아가기' }}
        </span>
      </button>
    </div>

    <template v-else>
      <!-- 머리: 무엇을 왜 묻는지. 환자가 읽는 화면이라 설명이 앞에 온다 -->
      <header class="shrink-0 border-b border-border-default bg-surface-card px-8 pb-4 pt-6">
        <div class="flex items-center gap-2">
          <span class="flex h-5 items-center rounded border border-border-selected px-1.5 text-caption font-medium text-interactive-default">
            {{ survey.scope }}
          </span>
          <span class="flex h-5 items-center rounded bg-surface-field px-1.5 text-caption font-medium text-text-secondary">
            {{ survey.role }} 설문
          </span>
        </div>

        <div class="mt-2 flex items-baseline gap-2">
          <h1 class="text-title-lg font-semibold">{{ survey.name }}</h1>
          <span class="text-label text-text-secondary">{{ survey.code }}</span>
        </div>

        <div class="mt-3 flex flex-col gap-1.5 text-label text-text-secondary">
          <p>{{ survey.summary }}</p>
          <p>{{ survey.guide }}</p>
          <p v-if="survey.note">{{ survey.note }}</p>
        </div>
      </header>

      <!-- 문항 표. 머리 행은 붙어 있어야 아래로 내려가도 보기가 무엇인지 안다 -->
      <main class="min-h-0 flex-1 overflow-y-auto px-8 py-4">
        <p class="pb-2 text-body font-medium">{{ survey.lead }}</p>

        <div class="overflow-hidden rounded-lg border border-border-default bg-surface-card">
          <div class="sticky top-0 z-10 flex items-center gap-3 border-b border-border-default bg-surface-field px-3 py-2">
            <span class="w-10 shrink-0 text-center text-label font-medium text-text-secondary">No</span>
            <span class="min-w-0 flex-1 text-label font-medium text-text-secondary">질문 내용</span>
            <span
              v-for="option in survey.scale"
              :key="option.score"
              class="flex w-[84px] shrink-0 flex-col items-center gap-0.5"
            >
              <span class="whitespace-nowrap text-caption text-text-secondary">{{ option.label }}</span>
              <span class="text-count text-text-secondary">{{ option.score }}</span>
            </span>
          </div>

          <div
            v-for="(question, index) in survey.questions"
            :key="index"
            class="flex items-center gap-3 border-b border-border-subtle px-3 py-2 last:border-b-0"
          >
            <span class="w-10 shrink-0 text-center text-body font-medium">{{ index + 1 }}</span>
            <p class="min-w-0 flex-1 text-body">{{ question }}</p>

            <!--
              보기 하나가 통째로 터치 대상이다. 원만 누르게 하면 44 하한에 못 미치고
              환자가 좁은 점을 겨냥해야 한다
            -->
            <button
              v-for="option in survey.scale"
              :key="option.score"
              class="flex h-11 w-[84px] shrink-0 items-center justify-center rounded-lg active:bg-surface-pressed"
              @click="pick(index, option.score)"
            >
              <span
                class="flex size-6 items-center justify-center rounded-full border-2"
                :class="draft.answers[index] === option.score
                  ? 'border-border-selected bg-interactive-default text-text-on-accent'
                  : 'border-border-default'"
              >
                <Check v-if="draft.answers[index] === option.score" :size="14" />
              </span>
            </button>
          </div>
        </div>
      </main>

      <!-- 진행률과 조작. 남은 문항 수가 제출 가능 여부와 같은 값을 본다 -->
      <footer class="flex shrink-0 items-center gap-4 border-t border-border-default bg-surface-card px-8 py-3">
        <div class="flex min-w-0 flex-1 items-center gap-3">
          <span class="w-10 shrink-0 text-label font-medium text-interactive-default">{{ percent }}%</span>
          <div class="h-1 min-w-0 max-w-[320px] flex-1 rounded bg-chart-bar-default">
            <div class="h-1 rounded bg-interactive-default" :style="{ width: `${percent}%` }"></div>
          </div>
          <span class="shrink-0 text-label text-text-secondary">{{ answered }} / {{ total }} 문항</span>
          <span v-if="savedAt" class="shrink-0 text-caption text-text-secondary">{{ savedAt }} 임시 저장됨</span>
        </div>

        <button class="flex h-11 shrink-0 items-center" @click="saveDraft">
          <span class="flex h-9 items-center rounded-lg border border-border-default px-3 text-body active:bg-surface-pressed">
            임시 저장
          </span>
        </button>

        <!-- 다 채우기 전에는 제출할 수 없다. 누르면 왜 안 되는지 말한다 -->
        <button class="flex h-11 shrink-0 items-center" @click="complete ? submit() : (warning = 'incomplete')">
          <span
            class="flex h-9 items-center rounded-lg border px-3 text-body"
            :class="complete
              ? 'border-border-default bg-surface-inverse text-text-inverse active:bg-surface-inverse-pressed'
              : 'border-border-default bg-surface-field text-text-disabled'"
          >
            제출하기
          </span>
        </button>
      </footer>
    </template>

    <!--
      뒤로가기 경고. 짧은 확인이라 alert의 상자를 그대로 쓰되 **history 엔트리를
      갖지 않는다.** 이 경고 자체가 뒤로가기에 대한 응답이라, 엔트리를 만들면
      경고를 닫는 back과 화면을 나가려는 back이 같은 제스처를 두고 다툰다
      (ModalShell을 썼다가 경고가 닫히지 않아 걷어냈다).
      되돌릴 수 없는 갈림길이므로 스크림 탭으로도 닫지 않는다.
    -->
    <Teleport to="body">
      <div
        v-if="warning"
        class="fixed inset-0 z-50 flex items-center justify-center p-6"
        :style="{ backgroundColor: 'var(--scrim)' }"
      >
        <div class="flex w-[402px] flex-col gap-4 rounded-lg border border-border-default bg-surface-card px-3 py-2">
          <div class="flex flex-col gap-2 p-1">
            <p class="text-title-sm font-semibold">
              {{ warning === 'incomplete' ? '아직 응답하지 않은 문항이 있습니다' : '설문을 중단하시겠습니까?' }}
            </p>
            <p class="text-caption text-text-secondary">
              <template v-if="warning === 'incomplete'">
                {{ total - answered }}문항이 남았습니다. 모든 문항에 응답해야 제출할 수 있습니다.
              </template>
              <template v-else-if="savedAt">
                {{ savedAt }}까지 저장되어 있습니다. 그 뒤에 답한 내용은 저장하지 않으면 사라집니다.
              </template>
              <template v-else>
                지금까지 응답한 내용은 저장하지 않으면 사라집니다.
              </template>
            </p>
          </div>

          <!-- 미완 제출 안내는 갈림길이 아니라 알림이라 버튼 하나다 -->
          <div v-if="warning === 'incomplete'" class="flex items-center justify-end">
            <button
              class="flex h-9 items-center justify-center rounded-lg bg-surface-inverse px-3 py-2 text-body text-text-inverse active:bg-surface-inverse-pressed"
              @click="warning = false"
            >
              계속 응답
            </button>
          </div>

          <!--
            나가는 갈림길은 셋이다. 파괴적인 쪽(저장하지 않고 나가기)을 왼쪽에
            텍스트만으로 떨어뜨리고, 기본 자리(오른쪽 끝)는 '계속 응답'이 갖는다 —
            실수로 나가는 것을 막는 것이 이 경고의 목적이다.
            개인 메모의 미저장 이탈 경고와 같은 배치다(4.0.4절).
          -->
          <div v-else class="flex items-center justify-between px-1">
            <button
              class="flex h-11 items-center justify-center text-label font-medium text-text-secondary active:text-text-primary"
              @click="leave(false)"
            >
              저장하지 않고 나가기
            </button>
            <div class="flex items-center gap-2.5">
              <button
                class="flex h-9 items-center justify-center rounded-lg border border-border-default px-3 py-2 text-body opacity-80 active:bg-surface-pressed"
                @click="leave(true)"
              >
                임시 저장하고 나가기
              </button>
              <button
                class="flex h-9 items-center justify-center rounded-lg bg-surface-inverse px-3 py-2 text-body text-text-inverse active:bg-surface-inverse-pressed"
                @click="warning = false"
              >
                계속 응답
              </button>
            </div>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>
