<script setup>
import { ref, computed, useTemplateRef } from 'vue'
import { X, ChevronDown, ChevronUp, TriangleAlert } from 'lucide-vue-next'
import ModalShell from './ModalShell.vue'

/*
 * 치유 프로세스 상세 (Figma 148:7729 · 173:5511 · 172:4483 · 173:5793).
 *
 * 프로세스 시작 단계에서 목록의 행을 누르면 열린다. 무거운 콘텐츠(단계 아코디언)라
 * 팝오버가 아니라 대형 모달이고, 뒤로가기로 닫힌다 — ModalShell의 'large'다.
 *
 * 한 모달이 네 가지 상태를 다 갖는다. 갈리는 축은 둘뿐이다:
 *   - 훑어보는 중 / 할당을 확인하는 중  (버튼 행이 바뀐다)
 *   - 환자 진단과 같은 프로세스 / 다른 프로세스  (경고가 붙는다)
 * 화면을 넷으로 나누면 같은 규칙이 네 곳에 복제된다.
 *
 * **확인을 거치지 않고 할당하지 않는다.** 오토세이브 없음 규칙의 연장이고,
 * 할당은 되돌리려면 프로세스를 재시작해야 하는 조작이라 더 그렇다.
 */
const props = defineProps({
  process: { type: Object, required: true },
  patient: { type: Object, required: true },
})

const emit = defineEmits(['close'])

const shell = useTemplateRef('shell')

/* 펼친 단계. 처음에는 모두 접혀 있다 */
const openStep = ref(null)

/* 훑어보는 중 → 확인하는 중. 되돌아올 수 있어야 하므로 모달을 닫지 않는다 */
const confirming = ref(false)

/*
 * 진단이 다른 프로세스도 고를 수 있다 — 동반이환이나 시연처럼 필요한 경우가 있다.
 * 다만 실수로 고른 것과 구분되지 않으므로 경고를 붙이고 확정 문구도 달라진다.
 */
const mismatch = computed(() => props.process.condition !== props.patient.condition)

/* 선택은 기억해 뒀다가 @close에서 올린다. 부모가 v-if로 걷으면 history가 어긋난다 */
const assigned = ref(false)

function confirmAssign() {
  assigned.value = true
  shell.value?.dismiss()
}

function settle() {
  emit('close', assigned.value ? props.process : null)
}
</script>

<template>
  <ModalShell ref="shell" name="process" variant="large" @close="settle">
    <!-- 머리: 프로세스명 · 진단 · 작성자 · 작성일 -->
    <div class="flex items-center justify-between pb-2">
      <div class="flex min-w-0 flex-col gap-0.5">
        <h2 class="truncate text-title-sm font-semibold">{{ process.name }}</h2>
        <div class="flex items-center gap-1">
          <!-- 진단이 다르면 칩부터 경고색이다. 목록에서 고른 뒤 처음 마주치는 자리다 -->
          <span
            class="flex h-4 shrink-0 items-center justify-center gap-0.5 rounded border px-1 text-label font-medium"
            :class="mismatch
              ? 'border-indicator-warning text-indicator-warning'
              : 'border-border-default bg-surface-field text-text-secondary'"
          >
            <TriangleAlert v-if="mismatch" :size="12" class="shrink-0" />
            {{ process.condition }}
          </span>
          <span class="truncate text-count text-text-secondary">{{ process.author }}</span>
          <span class="h-[13px] w-px shrink-0 bg-border-default"></span>
          <span class="shrink-0 text-count text-text-secondary">{{ process.date }}</span>
        </div>
      </div>

      <button
        class="flex size-11 shrink-0 items-center justify-center rounded-lg text-text-secondary active:bg-surface-pressed"
        @click="shell?.dismiss()"
      >
        <X :size="24" />
      </button>
    </div>

    <p class="border-b border-border-strong pb-1 text-label font-medium text-text-secondary">
      {{ process.summary }}
    </p>

    <!-- 구성 머리. 진단이 다르면 여기서 한 번 더 말한다 -->
    <div class="flex items-center gap-2.5 border-b border-border-default bg-surface-field px-3 py-1">
      <span class="flex-1 text-label font-medium">프로세스 구성</span>
      <span v-if="mismatch" class="flex shrink-0 items-center gap-2.5 text-indicator-warning">
        <TriangleAlert :size="12" class="shrink-0" />
        <span class="text-label font-medium">환자 진단({{ patient.condition }})과 다른 프로세스입니다</span>
      </span>
    </div>

    <!--
      단계 아코디언. 펼친 머리와 본문은 한 상자가 된다 —
      머리는 rounded-t·border-b-0, 본문은 rounded-b·border-t-0으로 걷고
      둘 사이는 배경색 차이만으로 나눈다. 테두리 색도 하나(accent)로 통일한다.
    -->
    <div v-for="(step, i) in process.steps" :key="i">
      <button
        class="flex h-13 w-full items-center gap-2.5 p-1 text-left"
        :class="openStep === i
          ? 'rounded-t-lg border border-b-0 border-border-selected bg-selected-bg active:bg-selected-bg-pressed'
          : 'border-b border-border-default active:bg-surface-pressed'"
        @click="openStep = openStep === i ? null : i"
      >
        <span class="w-4 shrink-0 text-center text-caption text-text-secondary">{{ i + 1 }}</span>
        <span class="min-w-0 flex-1 truncate text-body">{{ step.name }}</span>
        <span class="shrink-0 text-caption text-text-secondary">{{ step.meta }}</span>
        <span class="flex size-11 shrink-0 items-center justify-center text-text-secondary">
          <component :is="openStep === i ? ChevronUp : ChevronDown" :size="16" />
        </span>
      </button>

      <div
        v-if="openStep === i"
        class="flex flex-col gap-2 rounded-b-lg border border-t-0 border-border-selected px-3 py-2"
      >
        <div
          v-for="item in step.items"
          :key="item.code"
          class="flex h-8 items-center gap-4 rounded-lg border border-border-default px-2"
        >
          <span class="w-[58px] shrink-0 text-count">{{ item.code }}</span>
          <span class="min-w-0 flex-1 truncate text-label font-medium">{{ item.label }}</span>
        </div>
        <!--
          처방·수행 단계는 정의가 내용을 들지 않는다. 처방할 프로그램은 그 자리에서
          상담사가 고르고(4.6.3절), 회차는 처방된 프로그램과 일정이 정한다(4.6.4절).
          '등록된 항목이 없습니다'로 두면 빠뜨린 것처럼 읽힌다
        -->
        <p v-if="!step.items.length" class="text-label text-text-secondary">
          {{ step.name === '프로그램 처방'
            ? '처방할 프로그램은 이 단계에서 환자를 보고 고른다'
            : '회차는 처방된 프로그램과 잡힌 일정이 정한다' }}
        </p>
      </div>
    </div>

    <template #actions>
      <!--
        확인 중에는 무엇이 확정되는지 한 줄로 말한다. 되돌릴 수 없는 조작이라
        '취소'는 모달을 닫지 않고 훑어보던 자리로 돌아간다
      -->
      <p v-if="confirming" class="min-w-0 flex-1 px-1 text-caption">
        <span class="font-bold">{{ patient.name }}</span> 환자에게
        <template v-if="mismatch">
          <span class="font-bold text-indicator-warning">{{ process.condition }}</span>
        </template>
        프로세스를 할당합니다. 할당 후 변경하려면 프로세스를 재시작해야 합니다.
      </p>

      <button class="flex h-11 items-center" @click="confirming ? (confirming = false) : shell?.dismiss()">
        <span class="flex h-9 items-center justify-center rounded-lg border border-border-default px-3 text-body active:bg-surface-pressed">
          {{ confirming ? '취소' : '닫기' }}
        </span>
      </button>

      <button class="flex h-11 shrink-0 items-center" @click="confirming ? confirmAssign() : (confirming = true)">
        <span class="flex h-9 items-center justify-center whitespace-nowrap rounded-lg bg-surface-inverse px-3 text-body text-text-inverse active:bg-surface-inverse-pressed">
          {{ confirming ? (mismatch ? '그래도 할당' : '할당 확정') : '할당하기' }}
        </span>
      </button>
    </template>
  </ModalShell>
</template>
