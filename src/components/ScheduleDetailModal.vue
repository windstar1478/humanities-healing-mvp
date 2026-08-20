<script setup>
import { computed, useTemplateRef } from 'vue'
import { ChevronRight, Pencil, Trash2 } from 'lucide-vue-next'
import { dayLabel } from '../mocks/schedule.js'
import ModalShell from './ModalShell.vue'

/*
 * 환자 일정 상세. 작업 블록이 작업 상세로 열리는 것과 같은 자리다 —
 * 타임라인 위의 두 블록이 같은 문법을 갖게 하려고 이렇게 뒀다.
 *
 * 원래 확정 규칙은 '환자 블록 탭 → 환자 화면'이었다. 그러면 탭도 꾹 누르기도
 * 차 있어 배치를 되돌릴 자리가 남지 않는다. 환자 상세로 가는 길은 이 모달의
 * 첫 행으로 남기고(캘린더 팝오버·리스트·우측 패널에도 그대로 있다),
 * 이 자리에서 편집·삭제를 한다.
 *
 * Figma 화면이 없는 초안이다.
 */
const props = defineProps({
  dateKey: { type: String, required: true },
  event: { type: Object, required: true },
  /* 이름으로 찾은 환자. 없으면 상세로 가는 행을 내리지 않는다 */
  patient: { type: Object, default: null },
})

const emit = defineEmits(['close', 'open-patient', 'edit', 'delete'])

const shell = useTemplateRef('shell')

const when = computed(() => `${dayLabel(props.dateKey)} ${props.event.hour}`)

/*
 * 다음 자리(환자 상세 · 편집 모달 · 삭제 확인)로는 **이 모달이 완전히 닫힌 뒤에**
 * 넘긴다. 엔트리를 쥔 채로 다음 모달을 열면 history가 두 겹이 되어
 * 뒤로가기를 두 번 눌러야 화면으로 돌아온다.
 * 선택만 기억해 두고 쿼리가 사라진 뒤에 올린다 — 경고 모달들과 같은 방식이다.
 */
let choice = 'close'

function hand(kind) {
  choice = kind
  shell.value?.dismiss()
}

function settle() {
  const kind = choice
  choice = 'close'
  emit(kind)
  if (kind !== 'close') emit('close')
}
</script>

<template>
  <ModalShell ref="shell" name="event" @close="settle">
    <h2 class="text-title-sm font-semibold">{{ event.title }}</h2>
    <p class="mt-2 text-body text-text-secondary">{{ when }}</p>

    <!-- 라운드 8짜리 컨테이너 하나로 묶고 행은 구분선으로만 나눈다 -->
    <div class="mt-4 rounded-lg border border-border-default">
      <div class="flex min-h-11 items-center gap-3 px-3 py-2">
        <span class="w-12 shrink-0 text-label text-text-secondary">유형</span>
        <span class="min-w-0 flex-1 truncate text-body" :class="event.meta ? '' : 'text-text-disabled'">
          {{ event.meta ?? '없음' }}
        </span>
      </div>
      <!-- 탭은 탐색이다. 상태를 바꾸지 않으므로 행으로 두고 chevron을 붙인다 -->
      <button
        v-if="patient"
        class="flex min-h-11 w-full items-center gap-3 border-t border-border-subtle px-3 py-2 text-left active:bg-surface-pressed"
        @click="hand('open-patient')"
      >
        <span class="w-12 shrink-0 text-label text-text-secondary">환자</span>
        <span class="min-w-0 flex-1 truncate text-body">{{ patient.name }} 상세 보기</span>
        <ChevronRight :size="16" class="shrink-0 text-text-secondary" />
      </button>
    </div>

    <template #actions="{ dismiss }">
      <!--
        삭제는 되돌릴 수 없어 확인을 한 번 더 거친다. 여기서는 채우지 않고
        테두리만 둔 버튼으로 둔다 — 자리는 낮추되 **색은 경고색**이다(3.1절)
      -->
      <button class="mr-auto flex h-11 items-center" @click="hand('delete')">
        <span class="flex h-9 items-center gap-1 rounded-lg border border-danger-fg px-3 text-body text-danger-fg active:bg-danger-bg">
          <Trash2 :size="16" />삭제
        </span>
      </button>
      <button class="flex h-11 items-center" @click="dismiss">
        <span class="flex h-9 items-center rounded-lg border border-border-default px-3 text-body active:bg-surface-pressed">
          닫기
        </span>
      </button>
      <button class="flex h-11 items-center" @click="hand('edit')">
        <span class="flex h-9 items-center gap-1 rounded-lg bg-surface-inverse px-3 text-body text-text-inverse active:bg-surface-inverse-pressed">
          <Pencil :size="16" />편집
        </span>
      </button>
    </template>
  </ModalShell>
</template>
