<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { Printer, PencilLine, Check, ArrowRight } from 'lucide-vue-next'
import { processFor } from '../mocks/processLibrary.js'
import { PROCESS_STEPS } from '../mocks/process.js'
import { surveys, responseOf } from '../mocks/surveys.js'
import InlineCallout from './InlineCallout.vue'

/*
 * 코어 프로세스 1·4단계 '감정평가' (Figma 148:7935).
 *
 * 사전과 사후가 **같은 화면**이다. 보는 설문도 판정 규칙도 같고 시점만 다르다 —
 * 화면을 둘로 나누면 같은 규칙이 두 곳에 복제된다. 시점은 단계 번호가 정한다
 * (1단계 = 사전, 4단계 = 사후).
 *
 * 설문 자체는 **환자가 작성한다.** '작성하기'를 누르면 셸을 걷은 설문 수행
 * 화면으로 넘어간다 — 태블릿을 환자에게 건네는 유일한 지점이다(4.0.1절).
 */
const props = defineProps({
  patient: { type: Object, required: true },
  /* 이 화면이 붙은 단계. 1이면 사전, 4면 사후다 */
  step: { type: Number, required: true },
})

const emit = defineEmits(['advance'])

const router = useRouter()

const PHASES = [
  { key: 'pre', label: '사전', step: 1 },
  { key: 'post', label: '사후', step: 4 },
]

const phase = ref(props.step === 4 ? 'post' : 'pre')

/*
 * 아직 도달하지 않은 시점은 볼 수 없다 — 사전 단계에서 사후 설문을 열면
 * 순서가 뒤집힌다. 지나온 시점은 기록이므로 되돌아가 볼 수 있다.
 * 스테퍼 노드의 규칙과 같다(대기는 못 가고 완료는 간다).
 */
const reachable = (item) => item.step <= props.step

const process = computed(() => processFor(props.patient))

/* 프로세스가 정한 설문 구성을 그대로 쓴다. 화면이 목록을 따로 들지 않는다 */
const items = computed(() => {
  const steps = process.value?.steps ?? []
  const source = steps.find((s) => s.name.includes(phase.value === 'pre' ? '사전' : '사후'))
  return (source?.items ?? []).map((item) => {
    const survey = surveys[item.code]
    const response = responseOf(props.patient.id, phase.value, item.code)
    return { survey, done: !!response?.done, score: response?.score ?? null }
  })
})

/* 다음 단계로 넘어가려면 **모든 설문이 작성**되어야 한다. 빠진 채로 처방할 수 없다 */
const remaining = computed(() => items.value.filter((row) => !row.done).length)

const blocked = ref(null)

function say(event, title, detail) {
  const r = event.currentTarget.getBoundingClientRect()
  blocked.value = { title, detail, x: r.left + r.width / 2, y: r.bottom }
}

function pickPhase(item, event) {
  if (!reachable(item)) {
    say(event, '아직 볼 수 없는 시점입니다', '프로그램 수행을 마치면 열립니다')
    return
  }
  phase.value = item.key
}

function openSurvey(row) {
  router.push({ path: `/survey/${props.patient.id}/${phase.value}/${row.survey.code}` })
}

function advance(event) {
  if (remaining.value) {
    say(event, '아직 작성되지 않은 설문이 있습니다', `${remaining.value}종을 마치면 열립니다`)
    return
  }
  emit('advance')
}

const blockedStyle = computed(() => {
  if (!blocked.value) return {}
  const WIDTH = 280
  const MARGIN = 24
  const { x, y } = blocked.value
  return {
    left: `${Math.min(Math.max(MARGIN, x - WIDTH / 2), window.innerWidth - WIDTH - MARGIN)}px`,
    top: `${y + 8}px`,
  }
})

/*
 * 다음 단계의 이름을 그대로 버튼에 쓴다 — 사전이면 '프로그램 처방으로',
 * 사후면 '프로세스 종료로'다. 라벨을 고정하면 사후 단계에서 틀린 곳을 가리킨다.
 * 받침 유무로 조사가 갈린다(처방'으로' / 종료'로').
 */
const nextLabel = computed(() => {
  const name = PROCESS_STEPS[props.step + 1] ?? ''
  const last = name.charCodeAt(name.length - 1)
  const hasFinal = last >= 0xac00 && last <= 0xd7a3 && (last - 0xac00) % 28 !== 0
  return `${name}${hasFinal ? '으로' : '로'} 이동`
})

/* 막대는 점수/총점이고, 세로 마커는 컷오프 자리다 */
const percent = (value, max) => `${Math.min(100, Math.max(0, (value / max) * 100))}%`
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col gap-1">
    <div class="flex min-h-0 flex-1 flex-col gap-3">
      <div class="flex shrink-0 flex-col border-b border-border-strong">
        <div class="flex items-center gap-2.5 py-2.5">
          <h2 class="whitespace-nowrap text-title-sm font-semibold">감정평가 설문 리스트</h2>
          <p class="min-w-0 flex-1 truncate text-right text-label font-medium text-text-secondary">
            {{ process?.name ?? '프로세스 미할당' }}
          </p>
        </div>

        <div class="flex items-center gap-3">
          <div class="flex min-w-0 flex-1 items-center gap-3">
            <!--
              도달하지 않은 시점은 채운 회색으로 눌러도 넘어가지 않는다.
              무반응은 고장으로 읽히므로 누르면 사유를 말한다
            -->
            <button
              v-for="item in PHASES"
              :key="item.key"
              class="flex h-8 w-16 shrink-0 items-center justify-center rounded-full border text-label font-medium"
              :class="!reachable(item)
                ? 'border-border-default bg-text-disabled text-text-inverse'
                : phase === item.key
                  ? 'border-border-selected text-interactive-default active:bg-selected-bg-pressed'
                  : 'border-border-default text-text-secondary active:bg-surface-pressed'"
              @click="pickPhase(item, $event)"
            >
              {{ item.label }}
            </button>
          </div>

          <button
            class="flex h-11 shrink-0 items-center"
            @click="say($event, '출력은 아직 준비 중입니다', '문서 양식이 확정되면 열립니다')"
          >
            <span class="flex items-center gap-1 rounded-lg border border-border-default px-3 py-2 text-caption text-text-secondary active:bg-surface-pressed">
              <Printer :size="16" class="shrink-0" />출력
            </span>
          </button>
        </div>
      </div>

      <!-- 설문 카드 -->
      <div class="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto">
        <div
          v-for="row in items"
          :key="row.survey.code"
          class="flex shrink-0 items-start gap-1 rounded-lg border border-border-default p-2"
        >
          <!-- 작성 전에는 내용을 흐리게 내린다. 아직 값이 없다는 뜻이다 -->
          <div class="flex min-w-0 flex-1 flex-col gap-2" :class="row.done ? '' : 'opacity-50'">
            <div class="flex items-start gap-2">
              <p class="shrink-0 text-body">{{ row.survey.name }}</p>
              <span class="flex shrink-0 items-center gap-0.5">
                <!-- 핵심은 판정 근거라 채운 배지, 보조는 참고라 표면 배지다 -->
                <span
                  class="flex h-4 items-center justify-center rounded px-1 text-label font-medium"
                  :class="row.survey.role === '핵심'
                    ? 'bg-interactive-primary-fill text-text-on-dark-fill'
                    : 'bg-surface-field text-text-secondary'"
                >
                  {{ row.survey.role }}
                </span>
                <span class="flex h-4 items-center justify-center rounded border border-border-default bg-surface-field px-1 text-label font-medium text-text-secondary">
                  {{ row.survey.scope }}
                </span>
              </span>
              <p class="shrink-0 text-caption text-text-secondary">{{ row.survey.code }}</p>
            </div>

            <div class="flex items-center">
              <p class="w-7 shrink-0 text-center text-body font-bold">
                {{ row.done ? row.score : '-' }}
              </p>
              <div class="flex items-center gap-1">
                <span class="text-count text-text-secondary">0</span>
                <div class="relative h-1 w-[132px] shrink-0 rounded bg-chart-bar-default">
                  <div
                    v-if="row.done"
                    class="h-1 rounded bg-chart-axis-label"
                    :style="{ width: percent(row.score, row.survey.max) }"
                  ></div>
                  <!-- 컷오프. 점수 하나만으로는 높은지 낮은지 알 수 없다 -->
                  <span
                    v-if="row.survey.cutoff"
                    class="absolute top-[-3px] h-2.5 w-0.5 bg-text-primary"
                    :style="{ left: percent(row.survey.cutoff, row.survey.max) }"
                  ></span>
                </div>
                <span class="text-count text-text-secondary">{{ row.survey.max }}</span>
              </div>
            </div>
          </div>

          <!--
            작성완료도 누를 수 있다. 응답을 다시 보거나 고치는 자리라 —
            완료를 막으면 잘못 찍은 응답을 되돌릴 길이 없다
          -->
          <button class="flex h-11 shrink-0 items-center" @click="openSurvey(row)">
            <span
              class="flex h-9 items-center justify-center gap-2 rounded-lg border px-3 text-body"
              :class="row.done
                ? 'border-border-strong bg-border-default active:bg-surface-pressed-strong'
                : 'border-border-default active:bg-surface-pressed'"
            >
              <component :is="row.done ? Check : PencilLine" :size="16" class="shrink-0" />
              {{ row.done ? '작성완료' : '작성하기' }}
            </span>
          </button>
        </div>
      </div>
    </div>

    <!-- 다음 단계로. 전제조건(모든 설문 작성)을 채우지 못하면 비활성이다 -->
    <div class="flex h-13 shrink-0 items-center justify-end border-t border-border-strong">
      <button class="flex h-11 items-center" @click="advance">
        <span
          class="flex h-9 min-w-[176px] items-center justify-center gap-1 whitespace-nowrap rounded-lg border px-3 text-body"
          :class="remaining
            ? 'border-border-default bg-surface-field text-text-disabled'
            : 'border-border-default bg-surface-inverse text-text-inverse active:bg-surface-inverse-pressed'"
        >
          {{ nextLabel }}
          <ArrowRight :size="16" class="shrink-0" />
        </span>
      </button>
    </div>

    <Teleport to="body">
      <div v-if="blocked" class="fixed inset-0 z-50" @click="blocked = null">
        <div class="absolute max-w-[280px]" :style="blockedStyle">
          <InlineCallout :title="blocked.title" :detail="blocked.detail" />
        </div>
      </div>
    </Teleport>
  </div>
</template>
