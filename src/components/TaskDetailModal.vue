<script setup>
import { computed, useTemplateRef } from 'vue'
import { Check } from 'lucide-vue-next'
import { taskWhen, setTaskDone } from '../scheduleState.js'
import ModalShell from './ModalShell.vue'

/*
 * 작업 상세. 무슨 작업인지 짧게 보여주고 완료 여부를 여기서 바꾼다.
 * 완료는 명시적 조작이고, 되돌리기도 같은 자리에서 한다 — 스낵바 실행취소가 아니다.
 * Figma 화면이 없는 초안이다.
 */
const props = defineProps({
  task: { type: Object, required: true },
})

const emit = defineEmits(['close'])

const shell = useTemplateRef('shell')
const when = computed(() => taskWhen(props.task))

function toggleDone() {
  setTaskDone(props.task.id, !props.task.done)
  shell.value?.dismiss()
}
</script>

<template>
  <ModalShell ref="shell" name="task" @close="emit('close')">
    <div class="flex items-start gap-2">
      <h2 class="min-w-0 flex-1 text-title-sm font-semibold">{{ task.title }}</h2>
      <!-- 완료는 개선 표현이므로 경고색을 쓰지 않는다 -->
      <span v-if="task.done" class="flex shrink-0 items-center gap-1 text-caption text-text-secondary">
        <Check :size="16" />완료
      </span>
    </div>

    <p class="mt-2 text-body" :class="task.note ? 'text-text-secondary' : 'text-text-disabled'">
      {{ task.note ?? '설명이 없습니다' }}
    </p>

    <!-- 라운드 8짜리 컨테이너 하나로 묶고 행은 구분선으로만 나눈다 -->
    <div class="mt-4 rounded-lg border border-border-default">
      <div class="flex min-h-11 items-center gap-3 px-3 py-2">
        <span class="w-12 shrink-0 text-label text-text-secondary">분류</span>
        <span class="min-w-0 flex-1 truncate text-body" :class="task.category ? '' : 'text-text-disabled'">
          {{ task.category ?? '없음' }}
        </span>
      </div>
      <div class="flex min-h-11 items-center gap-3 border-t border-border-subtle px-3 py-2">
        <span class="w-12 shrink-0 text-label text-text-secondary">시점</span>
        <span
          class="min-w-0 flex-1 truncate text-body"
          :class="when ? (when.overdue ? 'text-indicator-warning' : '') : 'text-text-disabled'"
        >
          {{ when ? when.text : '미정' }}
        </span>
      </div>
      <div v-if="task.date && !task.hour" class="flex min-h-11 items-center gap-3 border-t border-border-subtle px-3 py-2">
        <span class="w-12 shrink-0 text-label text-text-secondary">배치</span>
        <span class="min-w-0 flex-1 truncate text-body text-text-disabled">시간 미정</span>
      </div>
    </div>

    <p v-if="!task.date" class="mt-3 text-label text-text-secondary">
      꾹 눌러 일정에 배치할 수 있습니다
    </p>

    <template #actions="{ dismiss }">
      <button class="flex h-11 items-center" @click="dismiss">
        <span class="flex h-9 items-center rounded-lg border border-border-default px-3 text-body">
          닫기
        </span>
      </button>
      <button class="flex h-11 items-center" @click="toggleDone">
        <span
          class="flex h-9 items-center rounded-lg px-3 text-body"
          :class="task.done
            ? 'border border-border-default text-text-primary'
            : 'bg-surface-inverse text-text-inverse'"
        >
          {{ task.done ? '완료 취소' : '완료' }}
        </span>
      </button>
    </template>
  </ModalShell>
</template>
