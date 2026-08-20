<script setup>
import { ref, computed, useTemplateRef } from 'vue'
import { X, ChevronLeft, ChevronRight, ArrowRight } from 'lucide-vue-next'
import { phasesOf } from '../mocks/programs.js'
import ModalShell from './ModalShell.vue'

/*
 * 프로그램 상세 · 세션 상세 (Figma 179:4283 · 180:4914).
 *
 * **두 화면이 한 모달이다.** 세션 행을 누르면 같은 상자 안에서 내용이 바뀌고,
 * 머리의 닫기 버튼이 뒤로가기(chevron-left)로 바뀐다 — Figma가 그렇게 그렸고,
 * 모달을 겹쳐 띄우면 history가 두 겹이 되어 뒤로가기를 두 번 눌러야 목록으로
 * 돌아온다(일정 상세에서 겪은 것과 같은 문제다).
 *
 * 세션 안에서는 PHASE를 차례로 넘긴다. PHASE가 한 세션의 흐름이라 목록으로 두지
 * 않고 페이지로 넘긴다 — 지금 어디인지가 `1/5`로 남는다. **개수는 붙은 활동이
 * 정한다**(4.8.9절).
 *
 * **활동이 붙지 않은 회차는 비어 있다.** 예전에는 생성기가 그럴듯한 문구로 채웠는데,
 * 그것이 지어낸 값임을 화면에서 알 수 없었다 — 지금은 무엇이 없는지 말한다.
 */
const props = defineProps({
  program: { type: Object, required: true },
})

const emit = defineEmits(['close'])

const shell = useTemplateRef('shell')

/* null이면 프로그램 상세, 숫자면 그 세션의 상세다 */
const session = ref(null)
const phaseIndex = ref(0)

const phases = computed(() => (session.value === null ? [] : phasesOf(props.program, session.value)))
const phase = computed(() => phases.value[phaseIndex.value] ?? null)

function openSession(index) {
  session.value = index
  phaseIndex.value = 0
}

const chosen = ref(false)

function choose() {
  chosen.value = true
  shell.value?.dismiss()
}

function settle() {
  emit('close', chosen.value ? props.program : null)
}
</script>

<template>
  <ModalShell ref="shell" name="program" variant="large" @close="settle">
    <!-- 머리. 세션을 보고 있으면 닫기가 뒤로가기로 바뀐다 -->
    <div class="flex items-center justify-between pb-2">
      <div class="flex min-w-0 items-baseline gap-2">
        <template v-if="session === null">
          <h2 class="truncate text-title-sm font-semibold">{{ program.name }}</h2>
          <span class="flex h-4 shrink-0 items-center justify-center rounded border border-border-default bg-surface-field px-1 text-label font-medium text-text-secondary">
            {{ program.condition }}
          </span>
        </template>
        <template v-else>
          <h2 class="shrink-0 text-title-sm font-semibold">{{ session + 1 }}. {{ program.sessions[session].name }}</h2>
          <span class="truncate text-caption text-text-secondary">{{ program.name }}</span>
        </template>
      </div>

      <button
        class="flex size-11 shrink-0 items-center justify-center rounded-lg text-text-secondary active:bg-surface-pressed"
        @click="session === null ? shell?.dismiss() : (session = null)"
      >
        <component :is="session === null ? X : ChevronLeft" :size="24" />
      </button>
    </div>

    <!-- 프로그램 상세: 좌 요약 / 우 세션 구성 -->
    <div v-if="session === null" class="flex items-start border-t border-border-default">
      <div class="flex w-[253px] shrink-0 flex-col">
        <div class="flex items-center justify-center gap-4 border-b border-border-default p-4 text-center">
          <div class="flex flex-col items-center gap-0.5">
            <p class="text-label font-medium text-text-secondary">효과성</p>
            <p class="text-title-lg font-semibold">{{ program.rating ?? '-' }}</p>
          </div>
          <div class="flex flex-col items-center gap-0.5">
            <p class="text-label font-medium text-text-secondary">세션</p>
            <p class="text-title-lg font-semibold">{{ program.sessions.length }}</p>
          </div>
          <div class="flex flex-col items-center gap-0.5">
            <p class="text-label font-medium text-text-secondary">참여형태</p>
            <p class="text-title-lg font-semibold">{{ program.form }}</p>
          </div>
        </div>

        <div class="flex flex-col gap-1 py-1">
          <div class="flex flex-col gap-0.5 px-3 py-1">
            <p class="text-label font-medium">운영 기관</p>
            <p class="text-caption text-text-secondary">{{ program.org }} · {{ program.place }}</p>
          </div>
          <div class="flex flex-col gap-1 px-3 py-1">
            <p class="text-label font-medium">준비물</p>
            <div class="flex flex-wrap gap-1">
              <span
                v-for="item in program.supplies"
                :key="item"
                class="flex h-4 items-center justify-center rounded border border-border-default px-1 text-label font-medium text-text-secondary"
              >
                {{ item }}
              </span>
            </div>
          </div>
          <div class="flex flex-col gap-0.5 px-3 py-1">
            <p class="text-label font-medium">프로그램 개요</p>
            <p class="text-caption text-text-secondary">{{ program.summary }}</p>
          </div>
        </div>
      </div>

      <div class="flex min-w-0 flex-1 flex-col gap-3 border-l border-border-default p-4">
        <div class="flex items-center gap-2">
          <h3 class="shrink-0 text-title-sm font-semibold">세션 구성</h3>
          <p class="shrink-0 text-label font-medium text-text-secondary">
            {{ program.sessions.length }}회 · 주 1회 {{ program.minutes }}분
          </p>
        </div>

        <div class="flex flex-col">
          <button
            v-for="(item, i) in program.sessions"
            :key="i"
            class="flex h-13 w-full items-center gap-2.5 border-b border-border-default p-1 text-left active:bg-surface-pressed"
            @click="openSession(i)"
          >
            <span class="w-4 shrink-0 text-center text-caption text-text-secondary">{{ i + 1 }}</span>
            <span class="min-w-0 flex-1 truncate text-body">{{ item.name }}</span>
            <span class="flex size-11 shrink-0 items-center justify-center text-text-secondary">
              <ChevronRight :size="16" />
            </span>
          </button>
        </div>
      </div>
    </div>

    <!-- 아직 활동이 붙지 않은 회차. 지어낸 내용으로 채우지 않는다 -->
    <div v-else-if="!phase" class="flex flex-1 flex-col items-center justify-center gap-1 border-t border-border-default p-4 text-center">
      <p class="text-body font-medium">이 회차에 붙은 세션 활동이 없습니다</p>
      <p class="text-label text-text-secondary">
        저작도구 · 프로그램에서 회차에 활동을 붙이면 여기에 내용이 나옵니다
      </p>
    </div>

    <!-- 세션 상세: 좌 PHASE 내용 / 우 준비물·주의사항·담당 -->
    <div v-else class="flex items-stretch border-t border-border-default">
      <div class="flex min-w-0 flex-1 flex-col border-r border-border-default">
        <div class="flex items-center gap-3 border-b border-border-default p-4">
          <p class="shrink-0 text-label font-medium text-text-secondary">PHASE {{ phaseIndex + 1 }}</p>
          <h3 class="min-w-0 truncate text-title-sm font-semibold">{{ phase.name }}</h3>
        </div>

        <div class="flex items-center gap-7 p-4 text-center">
          <div class="flex flex-col items-center gap-0.5">
            <p class="text-label font-medium text-text-secondary">장소</p>
            <p class="text-title-sm font-semibold">{{ phase.place }}</p>
          </div>
          <div class="flex flex-col items-center gap-0.5">
            <p class="text-label font-medium text-text-secondary">인원</p>
            <p class="text-title-sm font-semibold">{{ phase.people }}</p>
          </div>
          <div class="flex min-w-0 flex-col items-center gap-0.5">
            <p class="text-label font-medium text-text-secondary">대상감정</p>
            <p class="truncate text-title-sm font-semibold">{{ phase.emotions }}</p>
          </div>
        </div>

        <!-- 활동은 두 겹이다. 큰 항목이 번호, 그 안의 절차가 a·b·c다 -->
        <div class="flex flex-col gap-1 px-3">
          <p class="text-body">수행 활동</p>
          <ol class="flex list-decimal flex-col gap-2 pl-5 text-label font-medium text-text-secondary">
            <li v-for="(activity, i) in phase.activities" :key="i">
              {{ activity.title }}
              <div class="mt-2 flex flex-col gap-2 px-4 text-caption font-normal">
                <p v-for="(step, s) in activity.steps" :key="s">
                  {{ String.fromCharCode(97 + s) }}. {{ step }}
                </p>
              </div>
            </li>
          </ol>
        </div>
      </div>

      <div class="flex w-[206px] shrink-0 flex-col">
        <div class="flex flex-col gap-2 border-b border-border-default p-4">
          <p class="text-caption text-text-primary">준비물</p>
          <div class="flex flex-wrap gap-1">
            <span
              v-for="item in phase.supplies"
              :key="item"
              class="flex h-4 items-center justify-center rounded border border-border-default px-1 text-label font-medium text-text-secondary"
            >
              {{ item }}
            </span>
          </div>
        </div>
        <div class="flex flex-col gap-2 border-b border-border-default p-4">
          <p class="text-caption text-text-primary">주의사항</p>
          <p class="text-count text-text-secondary">{{ phase.caution }}</p>
        </div>
        <div class="flex flex-col gap-2 p-4">
          <p class="text-caption text-text-primary">담당</p>
          <p class="text-count text-text-secondary">{{ phase.staff }}</p>
        </div>
      </div>
    </div>

    <template #actions>
      <!-- 세션을 보고 있으면 PHASE를 넘기는 자리가 되고, 아니면 선택하는 자리다 -->
      <template v-if="session === null">
        <button class="flex h-11 items-center" @click="shell?.dismiss()">
          <span class="flex h-9 items-center justify-center rounded-lg border border-border-default px-3 text-body active:bg-surface-pressed">
            닫기
          </span>
        </button>
        <button class="flex h-11 shrink-0 items-center" @click="choose">
          <span class="flex h-9 items-center justify-center whitespace-nowrap rounded-lg bg-surface-inverse px-3 text-body text-text-inverse active:bg-surface-inverse-pressed">
            이 프로그램 선택
          </span>
        </button>
      </template>

      <template v-else>
        <p class="min-w-0 flex-1 px-1 text-label text-text-secondary">
          {{ phases.length ? `${phaseIndex + 1}/${phases.length}` : '' }}
        </p>
        <button
          v-if="phaseIndex > 0"
          class="flex h-11 shrink-0 items-center"
          @click="phaseIndex -= 1"
        >
          <span class="flex h-9 items-center gap-1 whitespace-nowrap rounded-lg border border-border-default px-3 text-body active:bg-surface-pressed">
            <ChevronLeft :size="16" class="shrink-0" />이전 PHASE
          </span>
        </button>
        <button
          class="flex h-11 shrink-0 items-center"
          @click="phaseIndex < phases.length - 1 ? (phaseIndex += 1) : (session = null)"
        >
          <span class="flex h-9 items-center gap-1 whitespace-nowrap rounded-lg border border-border-default px-3 text-body active:bg-surface-pressed">
            {{ phaseIndex < phases.length - 1 ? '다음 PHASE' : '세션 목록' }}
            <ArrowRight :size="16" class="shrink-0" />
          </span>
        </button>
      </template>
    </template>
  </ModalShell>
</template>
