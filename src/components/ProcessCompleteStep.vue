<script setup>
import { computed, ref } from 'vue'
import { Printer } from 'lucide-vue-next'
import { processFor } from '../mocks/processLibrary.js'
import { surveys, responseOf } from '../mocks/surveys.js'
import { findProgram } from '../mocks/programs.js'
import { progressOf } from '../mocks/sessions.js'
import { completionOf, runningEntry } from '../mocks/process.js'
import InlineCallout from './InlineCallout.vue'

/*
 * 코어 프로세스 5단계 '프로세스 종료' (Figma 148:8564 · 본문 148:8601).
 *
 * 마지막 단계는 **결과를 보여주는 화면**이다. 여기서 무엇을 결정하지 않는다 —
 * 종결 조작은 앞 단계(감정평가 사후)의 '종료 확정'이 이미 했다.
 * 그래서 하단에 다음 단계 CTA가 없고 종료 시각과 출력만 있다.
 *
 * 값은 전부 원본에서 읽는다. 사전·사후 점수는 1·4단계가 남긴 응답이고
 * (다시 계산하면 두 화면이 다른 점수를 보인다), 회차는 수행 기록에서 온다.
 */
const props = defineProps({
  patient: { type: Object, required: true },
})

const process = computed(() => processFor(props.patient))
const completion = computed(() => completionOf(props.patient))

/* 프로그램 완료 회차. 처방된 프로그램이 회차 수를 정한다 */
const program = computed(() => findProgram(props.patient.programId))
const run = computed(() => (program.value ? progressOf(props.patient, program.value) : null))

/* 이력의 기간 문자열(`2026.06.12 ~`)에서 시작일을 꺼낸다 */
const dash = (dot) => (dot ? dot.replaceAll('.', '-') : null)

const period = computed(() => {
  const entry = runningEntry(props.patient)
  const start = dash(entry?.period.split('~')[0].trim())
  const end = dash(completion.value?.date)
  if (!start || !end) return { text: '-', days: null }
  const days = Math.round((new Date(end) - new Date(start)) / 86400000) + 1
  return { text: `${start} ~ ${end}`, days }
})

/* 감정평가를 언제 했는지는 이력이 들고 있다. 없으면 적지 않는다 */
const reviewDates = computed(() => {
  const entries = runningEntry(props.patient)?.entries ?? []
  const at = (keyword) => dash(entries.find((e) => e.label?.includes(keyword))?.date)
  return { pre: at('사전'), post: at('사후') ?? dash(completion.value?.date) }
})

/*
 * 비교 대상은 **프로세스가 정한 설문 구성**이다. 화면이 목록을 따로 들지 않는다.
 * 사전과 사후가 같은 구성이므로 사전 단계의 목록을 그대로 쓴다.
 */
const rows = computed(() => {
  const source = (process.value?.steps ?? []).find((s) => s.name.includes('사전'))
  return (source?.items ?? []).map((item) => {
    const survey = surveys[item.code]
    const pre = responseOf(props.patient.id, 'pre', item.code)?.score ?? null
    const post = responseOf(props.patient.id, 'post', item.code)?.score ?? null
    /*
     * **낮을수록 양호**로 읽는다. Figma 종료 화면은 '높을수록 양호'라고 적었지만,
     * 같은 파일의 프로그램 처방 화면은 컷오프를 넘긴 점수를 고위험으로 판정한다
     * (`gradeOf`). 둘은 함께 성립할 수 없어 앱 안에서 이미 쓰고 있는 쪽을 따랐다.
     * ⚠️ 실제 방향은 척도마다 다르다. 확정되면 설문 정의가 방향을 들고 오게 한다.
     */
    const delta = pre === null || post === null ? null : pre - post
    return { survey, pre, post, delta }
  })
})

/* 개선은 중립색, 악화만 경고색이다 — 경고색은 악화 표현 전용이다 */
function changeOf(delta) {
  if (delta === null) return { label: '비교할 수 없음', detail: '· 한쪽 시점의 응답이 없습니다', warning: false }
  if (delta === 0) return { label: '변화 없음', detail: '· 점수 동일', warning: false }
  if (delta > 0) return { label: '개선', detail: `· ${delta}점 감소`, warning: false }
  return { label: '악화', detail: `· ${-delta}점 증가`, warning: true }
}

const percent = (value, max) =>
  value === null ? '0%' : `${Math.min(100, Math.max(0, (value / max) * 100))}%`

/* 출력은 아직 열지 않는다. 무반응은 고장으로 읽히므로 사유를 말한다 */
const blocked = ref(null)
function say(event, title, detail) {
  const r = event.currentTarget.getBoundingClientRect()
  blocked.value = { title, detail, x: r.left + r.width / 2, y: r.bottom }
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
  <div class="flex min-h-0 flex-1 flex-col">
    <!-- 요약 네 칸. 세로 구분선으로만 나눈다 -->
    <div class="flex shrink-0 items-center justify-between border-b border-border-strong pb-3 pt-2">
      <div class="flex min-w-0 flex-col">
        <span class="text-caption text-text-secondary">프로세스</span>
        <span class="truncate text-title-sm font-semibold">{{ process?.name ?? '-' }}</span>
      </div>
      <span class="h-[26px] w-px shrink-0 bg-border-default"></span>
      <div class="flex min-w-0 flex-col">
        <span class="text-caption text-text-secondary">기간</span>
        <span class="truncate text-title-sm font-semibold">
          {{ period.text }}
          <span v-if="period.days" class="text-body font-normal text-text-secondary">
            · 총 {{ period.days }}일
          </span>
        </span>
      </div>
      <span class="h-[26px] w-px shrink-0 bg-border-default"></span>
      <div class="flex min-w-0 flex-col">
        <span class="text-caption text-text-secondary">처방자</span>
        <span class="truncate text-title-sm font-semibold">
          {{ (process?.author ?? '-').split('·')[0].trim() }}
          <span class="text-body font-normal text-text-secondary">
            · {{ (process?.author ?? '').split('·')[1]?.trim() ?? '-' }}
          </span>
        </span>
      </div>
      <span class="h-[26px] w-px shrink-0 bg-border-default"></span>
      <div class="flex w-[149px] shrink-0 flex-col">
        <span class="text-caption text-text-secondary">프로그램 완료 회차</span>
        <span class="truncate text-title-sm font-semibold">
          <template v-if="run">
            {{ program.sessions.length }}회차 중 {{ run.entries.filter((e) => e.done).length }}회 완료
          </template>
          <template v-else>-</template>
        </span>
      </div>
    </div>

    <div class="flex shrink-0 items-center gap-2.5 py-2.5">
      <h2 class="whitespace-nowrap text-title-sm font-semibold">감정평가 사전 · 사후 비교</h2>
      <p class="truncate text-label font-medium text-text-secondary">
        사전 {{ reviewDates.pre ?? '-' }} · 사후 {{ reviewDates.post ?? '-' }}
      </p>
    </div>

    <!-- 척도 카드. 사전은 흐린 막대, 사후는 진한 막대로 같은 트랙 위에서 읽는다 -->
    <div class="grid min-h-0 flex-1 grid-cols-2 content-start gap-3 overflow-y-auto">
      <div
        v-for="row in rows"
        :key="row.survey.code"
        class="flex flex-col gap-3 rounded-lg border border-border-default p-2"
      >
        <div class="flex flex-col gap-3 border-b border-border-default pb-8">
          <div class="flex items-center gap-1">
            <p class="shrink-0 text-body">{{ row.survey.code }}</p>
            <!-- 핵심은 판정 근거라 채운 배지, 보조는 참고라 표면 배지다 -->
            <span
              class="flex h-4 shrink-0 items-center justify-center rounded px-1 text-label font-medium"
              :class="row.survey.role === '핵심'
                ? 'bg-interactive-primary-fill text-text-on-dark-fill'
                : 'bg-surface-field text-text-secondary'"
            >
              {{ row.survey.role }}
            </span>
            <!-- 방향을 적지 않으면 긴 막대가 좋은 것인지 알 수 없다 -->
            <p class="shrink-0 text-count text-text-secondary">낮을수록 양호</p>
            <p class="min-w-0 flex-1 text-right text-count text-text-secondary">0–{{ row.survey.max }}</p>
          </div>

          <div class="flex flex-col gap-2">
            <div
              v-for="bar in [
                { key: 'pre', label: '사전', value: row.pre, tone: 'bg-chart-bar-default' },
                { key: 'post', label: '사후', value: row.post, tone: 'bg-chart-axis-label' },
              ]"
              :key="bar.key"
              class="flex items-center gap-2.5"
            >
              <span class="w-6 shrink-0 text-caption text-text-secondary">{{ bar.label }}</span>
              <span class="h-4 min-w-0 flex-1 overflow-hidden rounded bg-chart-bar-track">
                <!-- 값이 없으면 막대를 그리지 않는다. 없는 것을 0처럼 보이게 하지 않는다 -->
                <span
                  v-if="bar.value !== null"
                  class="block h-full rounded"
                  :class="bar.tone"
                  :style="{ width: percent(bar.value, row.survey.max) }"
                ></span>
              </span>
              <span class="w-6 shrink-0 text-right text-caption text-text-secondary">
                {{ bar.value ?? '-' }}
              </span>
            </div>
          </div>
        </div>

        <p class="text-label font-medium" :class="changeOf(row.delta).warning ? 'text-indicator-warning' : ''">
          {{ changeOf(row.delta).label }}
          <span class="text-count font-normal">{{ changeOf(row.delta).detail }}</span>
        </p>
      </div>
    </div>

    <!-- 종료 시각은 끝내는 순간에 정해진 사실이다. 화면이 지금 시각을 찍지 않는다 -->
    <div class="flex h-13 shrink-0 items-center gap-8 border-t border-border-strong">
      <p class="min-w-0 flex-1 truncate text-label font-medium">
        <template v-if="completion">{{ completion.at }} 종료됨</template>
        <template v-else>아직 종료되지 않았습니다</template>
      </p>
      <button
        class="flex h-11 shrink-0 items-center"
        @click="say($event, '출력은 아직 준비 중입니다', '문서 양식이 확정되면 열립니다')"
      >
        <span class="flex items-center gap-1 rounded-lg border border-border-default px-3 py-2 text-body text-text-secondary active:bg-surface-pressed">
          <Printer :size="20" class="shrink-0" />출력
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
