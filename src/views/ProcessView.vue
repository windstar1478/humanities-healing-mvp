<script setup>
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ChevronLeft, Check, Play, User } from 'lucide-vue-next'
import { patients } from '../mocks/patients.js'
import { stepsOf, stepIndexOf, stepStateOf, completeProcess } from '../mocks/process.js'
import InlineCallout from '../components/InlineCallout.vue'
import { josa } from '../text.js'
import ProcessStartStep from '../components/ProcessStartStep.vue'
import EmotionReviewStep from '../components/EmotionReviewStep.vue'
import ProgramPrescribeStep from '../components/ProgramPrescribeStep.vue'
import ProgramExecuteStep from '../components/ProgramExecuteStep.vue'
import ProcessCompleteStep from '../components/ProcessCompleteStep.vue'

/*
 * 코어 프로세스의 공통 셸 (Figma 148:7242 · 148:7729 · 173:5511 ·
 * 172:4483 · 173:5793).
 *
 * 모든 단계가 같은 머리를 쓴다 — 환자 정보 + **컴팩트 스테퍼** + '환자 상세'로
 * 돌아가는 버튼. 스테퍼가 곧 단계 이동 장치라서, 환자 상세의 큰 스테퍼와
 * 같은 규칙(완료·진행 중은 갈 수 있고 대기는 못 간다)을 그대로 쓴다.
 * 머리를 화면마다 다시 그리면 여섯 곳의 규칙이 갈라진다.
 *
 * 프로세스를 다루는 화면이므로 우측 환자 패널이 없다.
 * 단계 본문은 아래 slot 자리에 단계별로 붙는다.
 */
const route = useRoute()
const router = useRouter()

const patient = computed(() => patients.find((p) => p.id === route.params.id) ?? null)
const step = computed(() => Number(route.params.step))

const currentStep = computed(() => (patient.value ? stepIndexOf(patient.value) : 0))

/*
 * **단계는 프로세스 정의가 정한다**(4.8.6절). 개수도 순서도 정의마다 다르므로
 * 화면이 상수 목록을 들지 않는다 — 시작과 종료만 고정된 양끝이다.
 */
const steps = computed(() => stepsOf(patient.value))
const node = computed(() => steps.value[step.value] ?? null)

/* 판정은 mocks/process.js 한 곳에 있다. 환자 상세의 큰 스테퍼와 같은 규칙이다 */
function stepState(index) {
  return stepStateOf(patient.value, index)
}

/*
 * 단계를 마치고 다음으로 넘어간다. 환자의 현재 단계·다음 단계가 함께 바뀐다 —
 * 스테퍼도 우측 패널도 같은 레코드를 보므로 여기 한 번만 고치면 된다.
 * 번호만 옮긴다 — 단계 이름은 `statusOf`가 정의에서 읽어 만든다.
 */
function advance() {
  const next = step.value + 1
  patient.value.stepIndex = next
  router.push({ path: `/process/${patient.value.id}/${next}` })
}

/*
 * 종결. 사후 감정평가의 '종료 확정'만 여기로 온다.
 * 프로세스를 '완료'로 바꾸고 종료 시각을 남기는 일은 `completeProcess` 한 곳이다 —
 * 화면이 환자 레코드를 직접 고치면 이력을 닫는 일이 빠진다.
 */
function complete() {
  /* 이미 끝난 프로세스를 다시 종결하지 않는다. 종료 시각이 오늘로 덮인다 */
  if (patient.value.process !== '완료') completeProcess(patient.value)
  router.push({ path: `/process/${patient.value.id}/${steps.value.length - 1}` })
}

/* 처방은 프로그램을 환자에게 붙이는 일이다. 그 뒤 단계 이동은 advance와 같다 */
function prescribe(program) {
  patient.value.programId = program.id
  patient.value.programName = program.name
  advance()
}

const blocked = ref(null)

function goStep(i, event) {
  if (stepState(i) === 'waiting') {
    const r = event.currentTarget.getBoundingClientRect()
    blocked.value = {
      title: '아직 진행할 수 없는 단계입니다',
      detail: `${josa(steps.value[currentStep.value]?.label ?? '', '을', '를')} 마치면 열립니다`,
      x: r.left + r.width / 2,
      y: r.bottom,
    }
    return
  }
  if (i !== step.value) router.push({ path: `/process/${patient.value.id}/${i}` })
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
</script>

<template>
  <!--
    min-w-0이 없으면 머리의 스테퍼 최소 폭이 본문 폭을 밀어내
    중앙 패널(929)을 넘긴다. 연결선이 대신 줄어들어야 한다
  -->
  <div v-if="patient" class="flex min-w-0 flex-1 flex-col gap-2 py-3">
    <!-- 공통 머리: 환자 정보 + 컴팩트 스테퍼 + 환자 상세로 돌아가기 -->
    <section class="flex h-[72px] shrink-0 items-center gap-2 rounded-lg border border-border-default bg-surface-card px-3">
      <span class="flex size-10 shrink-0 items-center justify-center rounded-full bg-surface-container text-text-secondary">
        <User :size="24" />
      </span>
      <span class="flex w-[74px] shrink-0 flex-col">
        <span class="truncate text-title-sm font-semibold">{{ patient.name }}</span>
        <span class="truncate text-label font-medium text-text-secondary">
          {{ patient.condition }}
          <span class="text-caption font-normal">&nbsp;{{ patient.age }}·{{ patient.sex }}</span>
        </span>
      </span>

      <!--
        컴팩트 스테퍼. 환자 상세의 것과 상태 규칙은 같고 크기만 줄었다 —
        완료는 체크, 진행 중은 accent fill, 대기는 빈 점선 원. 순서 숫자는 없다.
      -->
      <div class="flex min-w-0 flex-1 items-start justify-center">
        <template v-for="(item, i) in steps" :key="i">
          <span
            v-if="i > 0"
            class="mt-3.5 min-w-3 flex-1"
            :class="stepState(i) === 'waiting'
              ? 'border-t border-dashed border-text-disabled'
              : 'h-px bg-border-default'"
          ></span>
          <button
            class="flex w-[76px] shrink-0 flex-col items-center gap-1 rounded-lg py-1 active:bg-surface-pressed"
            @click="goStep(i, $event)"
          >
            <span
              class="flex size-7 items-center justify-center rounded-full"
              :class="{
                'bg-surface-canvas text-text-primary': stepState(i) === 'done',
                'bg-interactive-default text-text-on-accent': stepState(i) === 'current',
                'border-2 border-dashed border-border-default': stepState(i) === 'waiting',
              }"
            >
              <Check v-if="stepState(i) === 'done'" :size="16" />
              <Play v-else-if="stepState(i) === 'current'" :size="12" fill="currentColor" />
            </span>
            <!-- 지금 보고 있는 단계는 선택 상태다. accent 용법 '현재 위치 마커' -->
            <span
              class="whitespace-nowrap text-count"
              :class="i === step
                ? 'font-medium text-interactive-default'
                : stepState(i) === 'waiting' ? 'text-text-disabled' : 'text-text-secondary'"
            >
              {{ item.label }}
            </span>
          </button>
        </template>
      </div>

      <button
        class="flex h-11 w-[138px] shrink-0 items-center justify-center gap-1 rounded-lg text-label font-medium text-text-secondary active:bg-surface-pressed"
        @click="router.push({ path: `/patients/detail/${patient.id}` })"
      >
        <ChevronLeft :size="12" class="shrink-0" />
        <span>환자 상세</span>
      </button>
    </section>

    <!-- 단계 본문 -->
    <section class="flex min-h-0 flex-1 flex-col rounded-lg border border-border-default bg-surface-card px-6 py-2">
      <!--
        할당이 끝나면 프로세스 시작이 완료된 단계가 된다. 그대로 두면 방금 끝낸
        단계에 머물러 무엇을 더 해야 하는지 알 수 없으므로 다음 단계로 넘긴다
      -->
      <ProcessStartStep
        v-if="node?.type === '시작'"
        :patient="patient"
        @assign="router.push({ path: `/process/${patient.id}/1` })"
      />
      <!-- 사전과 사후는 같은 화면이다. 시점은 정의의 노드가 들고 있다 -->
      <EmotionReviewStep
        v-else-if="node?.type === '감정평가'"
        :patient="patient"
        :step="step"
        :phase="node.phase"
        @advance="node.phase === '사후' ? complete() : advance()"
      />
      <!-- 고른 프로그램은 환자 레코드에 남는다 -->
      <ProgramPrescribeStep
        v-else-if="node?.type === '프로그램 처방'"
        :patient="patient"
        @advance="prescribe"
      />
      <!-- 마지막 회차를 마치면 다음 노드로 넘어간다 -->
      <ProgramExecuteStep
        v-else-if="node?.type === '프로그램 수행'"
        :patient="patient"
        @advance="advance"
      />
      <!-- 결정하는 화면이 아니라 결과를 보여주는 화면이다 -->
      <ProcessCompleteStep v-else-if="node?.type === '종료'" :patient="patient" />
      <div v-else class="flex min-h-0 flex-1 items-center justify-center">
        <p class="text-body text-text-disabled">
          {{ node?.label ?? '' }} 단계는 준비 중입니다
        </p>
      </div>
    </section>

    <Teleport to="body">
      <div v-if="blocked" class="fixed inset-0 z-50" @click="blocked = null">
        <div class="absolute max-w-[280px]" :style="blockedStyle">
          <InlineCallout :title="blocked.title" :detail="blocked.detail" />
        </div>
      </div>
    </Teleport>
  </div>
</template>
