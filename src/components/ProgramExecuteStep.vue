<script setup>
import { ref, computed, watch } from 'vue'
import { Check, ArrowRight } from 'lucide-vue-next'
import { findProgram, phasesOf } from '../mocks/programs.js'
import { progressOf, sessionWhen, completeSession, saveSessionNote, NOTE_LIMIT } from '../mocks/sessions.js'
import InlineCallout from './InlineCallout.vue'

/*
 * 코어 프로세스 3단계 '프로그램 수행' (Figma 148:8311).
 *
 * 좌: 처방된 프로그램의 회차 목록과 진행률. 우: 고른 회차의 내용과 수행 내역.
 * 두 칸을 한 화면에 두는 이유는 프로그램 처방(4.6.3절)과 같다 — 기록하는 도중
 * 어느 회차인지, 무엇을 하기로 한 회차인지 다시 보려고 화면을 나가면 안 된다.
 */
const props = defineProps({
  patient: { type: Object, required: true },
})

const emit = defineEmits(['advance'])

const program = computed(() => findProgram(props.patient.programId))
const progress = computed(() => (program.value ? progressOf(props.patient, program.value) : null))

const total = computed(() => program.value?.sessions.length ?? 0)
const doneCount = computed(() => progress.value?.entries.filter((e) => e.done).length ?? 0)

/* 처음 열면 진행 중인 회차를 본다. 그 뒤로는 고른 회차를 따라간다 */
const selected = ref(0)
watch(progress, (value) => {
  if (value) selected.value = Math.min(value.current, total.value - 1)
}, { immediate: true })

const entry = computed(() => progress.value?.entries[selected.value] ?? null)

/* 회차의 내용은 프로그램 정의에서 온다 — 세션 상세 모달이 보여주는 것과 같은 값이다 */
const detail = computed(() => {
  if (!program.value) return null
  const phases = phasesOf(program.value, selected.value)
  return phases[0] ?? null
})

const stateOf = (index) => {
  if (progress.value.entries[index].done) return 'done'
  return index === progress.value.current ? 'current' : 'waiting'
}

/*
 * 수행 내역은 오토세이브하지 않는다(3.6절). 화면을 떠나기 전에 저장을 눌러야 하고,
 * 저장하면 저장한 시각이 남는다 — 저장됐다는 사실이 보여야 한다.
 */
const draft = ref('')
watch(entry, (value) => { draft.value = value?.note ?? '' }, { immediate: true })

const dirty = computed(() => entry.value && draft.value !== entry.value.note)

/* 아직 오지 않은 회차는 기록할 것이 없다 */
const editable = computed(() => entry.value && stateOf(selected.value) !== 'waiting')

const blocked = ref(null)

function say(event, title, detail) {
  const r = event.currentTarget.getBoundingClientRect()
  blocked.value = { title, detail, x: r.left + r.width / 2, y: r.bottom }
}

function save() {
  saveSessionNote(props.patient, program.value, selected.value, draft.value)
}

/*
 * '저장 후 다음 회차로'가 이 화면의 주 행동이다. 저장과 완료를 한 번에 하는 이유는
 * 회차를 마쳤다는 사실과 그때의 기록이 같은 조작에서 나와야 하기 때문이다.
 * 마지막 회차에서는 갈 회차가 없으므로 다음 단계(감정평가)로 넘긴다.
 */
const isLast = computed(() => selected.value >= total.value - 1)

function saveAndNext(event) {
  if (!editable.value) {
    say(event, '아직 진행하지 않은 회차입니다', `${progress.value.current + 1}회차를 마치면 열립니다`)
    return
  }
  save()
  completeSession(props.patient, program.value, selected.value)
  if (isLast.value) {
    emit('advance')
    return
  }
  selected.value += 1
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
  <div v-if="program && progress" class="flex min-h-0 flex-1 flex-col">
    <div class="flex min-h-0 flex-1 items-start gap-4">
      <!-- 좌: 회차 목록 -->
      <div class="flex h-full w-[303px] shrink-0 flex-col border-r border-border-default pr-4">
        <div class="flex shrink-0 flex-col">
          <div class="flex items-center gap-2.5 py-2.5">
            <h2 class="whitespace-nowrap text-title-sm font-semibold">
              {{ total }}회차 중 {{ Math.min(progress.current + 1, total) }}회차
            </h2>
            <p class="text-label font-medium text-text-secondary">
              {{ doneCount === total ? '완료' : '진행 중' }}
            </p>
          </div>

          <div class="flex flex-col gap-1 pb-3">
            <div class="h-2 w-full rounded bg-chart-bar-default">
              <div
                class="h-2 rounded bg-chart-axis-label"
                :style="{ width: `${(doneCount / total) * 100}%` }"
              ></div>
            </div>
            <p class="text-count text-text-secondary">
              완료 {{ doneCount }}회 · 남은 회차 {{ total - doneCount }}회
            </p>
          </div>
        </div>

        <div class="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto">
          <!--
            고른 회차가 accent로 선다. 대개 진행 중인 회차와 같지만, 지난 회차의
            기록을 다시 볼 때는 갈린다 — 무엇을 보고 있는지는 선택이 말하고,
            어디까지 왔는지는 오른쪽 상태 배지가 말한다
          -->
          <button
            v-for="(item, i) in progress.entries"
            :key="i"
            class="flex w-full shrink-0 items-center gap-1 rounded-lg border px-2 py-2.5 text-left"
            :class="selected === i
              ? 'border-border-selected bg-selected-bg active:bg-selected-bg-pressed'
              : stateOf(i) === 'waiting'
                ? 'border-border-default bg-surface-field active:bg-surface-pressed'
                : 'border-border-default active:bg-surface-pressed'"
            @click="selected = i"
          >
            <span class="flex min-w-0 flex-1 flex-col gap-1" :class="stateOf(i) === 'waiting' ? 'opacity-50' : ''">
              <span class="flex items-end gap-1">
                <span class="shrink-0 text-count text-text-secondary">{{ i + 1 }}</span>
                <span class="truncate text-label font-medium">{{ item.name }}</span>
              </span>
              <span class="truncate text-count text-text-secondary">{{ sessionWhen(item) }}</span>
            </span>

            <span
              class="flex h-7 w-16 shrink-0 items-center justify-center gap-1 rounded-lg border text-label font-medium"
              :class="{
                'border-border-strong bg-border-default': stateOf(i) === 'done',
                'border-border-default bg-interactive-default text-text-inverse': stateOf(i) === 'current',
                'border-border-default bg-surface-field text-text-disabled opacity-80': stateOf(i) === 'waiting',
              }"
            >
              <Check v-if="stateOf(i) === 'done'" :size="16" class="shrink-0" />
              {{ stateOf(i) === 'done' ? '완료' : stateOf(i) === 'current' ? '진행 중' : '대기' }}
            </span>
          </button>
        </div>
      </div>

      <!-- 우: 고른 회차 -->
      <div class="flex h-full min-w-0 flex-1 flex-col gap-2">
        <div class="flex shrink-0 items-end gap-1 border-b border-border-strong py-2.5">
          <p class="shrink-0 text-count text-text-secondary">처방 프로그램</p>
          <p class="min-w-0 truncate text-label font-medium">{{ program.name }}</p>
        </div>

        <div class="flex shrink-0 flex-col gap-1.5 pb-1.5">
          <div class="flex items-center gap-1">
            <p class="shrink-0 text-label font-medium">{{ selected + 1 }}회차</p>
            <h3 class="min-w-0 truncate text-title-sm font-semibold">{{ entry.name }}</h3>
          </div>
          <p class="text-caption text-text-secondary">
            {{ detail?.activities[0]?.steps[1] ?? '' }}
          </p>
        </div>

        <div class="flex shrink-0 items-start gap-2 border-b border-border-default p-4">
          <div class="flex shrink-0 flex-col gap-2 border-r border-border-default pr-4">
            <p class="w-[174px] text-caption">준비물</p>
            <div class="flex flex-wrap gap-2">
              <span
                v-for="item in detail?.supplies ?? []"
                :key="item"
                class="flex h-4 items-center justify-center rounded border border-border-default px-1 text-label font-medium text-text-secondary"
              >
                {{ item }}
              </span>
            </div>
          </div>
          <div class="flex flex-col gap-2 px-2">
            <p class="w-[174px] text-caption">주의사항</p>
            <p class="w-[174px] text-count text-text-secondary">{{ detail?.caution ?? '없음' }}</p>
          </div>
        </div>

        <!-- 수행 내역. 상담사가 그 회차에 무엇이 있었는지 남기는 자리다 -->
        <div class="flex min-h-0 flex-1 flex-col gap-1">
          <p class="shrink-0 px-2 text-body">수행 내역</p>
          <div class="flex min-h-0 flex-1 flex-col rounded-lg border border-border-default px-3 py-2.5">
            <textarea
              v-model="draft"
              :maxlength="NOTE_LIMIT"
              :disabled="!editable"
              :placeholder="editable ? '이 회차에서 관찰한 것을 남겨 주세요' : '아직 진행하지 않은 회차입니다'"
              class="min-h-0 flex-1 resize-none bg-transparent text-caption text-text-secondary placeholder:text-text-disabled"
            ></textarea>
            <p class="shrink-0 text-right text-count text-text-disabled">
              {{ draft.length }} / {{ NOTE_LIMIT }}자
            </p>
          </div>
        </div>
      </div>
    </div>

    <!-- 하단: 저장 상태와 두 버튼. 오른쪽 칸에 맞춰 오른쪽으로 몬다 -->
    <div class="flex h-13 shrink-0 items-center gap-3">
      <p class="min-w-0 flex-1 text-count text-text-secondary">
        <template v-if="dirty">저장하지 않은 기록이 있습니다</template>
        <template v-else-if="entry?.savedAt">저장됨 · {{ entry.savedAt }}</template>
      </p>

      <button class="flex h-11 shrink-0 items-center" :disabled="!editable" @click="save">
        <span
          class="flex h-9 items-center justify-center rounded-lg border border-border-default px-3 text-body"
          :class="editable ? 'active:bg-surface-pressed' : 'bg-surface-field text-text-disabled'"
        >
          저장
        </span>
      </button>

      <button class="flex h-11 shrink-0 items-center" @click="saveAndNext">
        <span
          class="flex h-9 items-center justify-center gap-1 whitespace-nowrap rounded-lg border px-3 text-body"
          :class="editable
            ? 'border-border-default bg-surface-inverse text-text-inverse active:bg-surface-inverse-pressed'
            : 'border-border-default bg-surface-field text-text-disabled'"
        >
          {{ isLast ? '저장 후 감정평가로' : `저장 후 ${selected + 2}회차로` }}
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

  <!-- 처방이 없으면 수행할 것도 없다. 무엇을 해야 열리는지 말한다 -->
  <div v-else class="flex min-h-0 flex-1 items-center justify-center">
    <p class="text-body text-text-disabled">프로그램 처방 단계에서 프로그램을 먼저 고르세요</p>
  </div>
</template>
