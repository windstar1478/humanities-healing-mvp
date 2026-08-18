<script setup>
import ModalShell from './ModalShell.vue'

/*
 * 삭제 확인 (Figma 190:8960 / alert 190:9039).
 *
 * 삭제는 되돌릴 수 없으므로 반드시 여기를 거친다. 문구가 셋으로 나뉜다 —
 * 무엇을 지우는지 묻고(heading), 어느 것인지 특정하고(detail),
 * 복구 불가를 못박는다(warning). 마지막 줄이 이 모달의 존재 이유라
 * secondary로 낮추지 않는다.
 *
 * 메모와 일정이 같은 틀을 쓴다. 스낵바 실행취소를 두지 않는 이유는
 * "저장은 명시적 조작으로만" 규칙과 같다.
 *
 * ⚠️ Figma의 확정 버튼 텍스트 레이어 이름이 `프로그램 처방으로 이동`으로 남아 있는데,
 *    다른 화면 인스턴스의 레이어명이 남은 것이고 실제 문자열은 `삭제`다.
 */
defineProps({
  heading: { type: String, required: true },
  detail: { type: String, required: true },
  warning: { type: String, required: true },
})

const emit = defineEmits(['confirm', 'close'])

/*
 * 확정이든 취소든 셸의 dismiss(= router.back())를 거쳐 닫는다.
 * v-if로 걷으면 셸이 올려둔 history 엔트리가 남아 다음 뒤로가기를 먹는다.
 */
let choice = 'close'

function pick(kind, dismiss) {
  choice = kind
  dismiss()
}

function settle() {
  const kind = choice
  choice = 'close'
  emit(kind)
}
</script>

<template>
  <ModalShell v-slot="{ dismiss }" name="delete" variant="alert" @close="settle">
    <div class="flex flex-col gap-3">
      <div class="flex flex-col gap-2 p-1">
        <p class="text-title-sm font-semibold text-text-primary">{{ heading }}</p>
        <p class="text-caption text-text-secondary">{{ detail }}</p>
        <p class="text-caption text-text-primary">{{ warning }}</p>
      </div>

      <div class="flex items-center justify-end gap-2.5">
        <button
          class="flex h-9 items-center justify-center rounded-lg border border-border-default px-3 py-2 text-body text-text-primary opacity-80 active:bg-surface-pressed"
          @click="pick('close', dismiss)"
        >
          취소
        </button>
        <button
          class="flex h-9 items-center justify-center rounded-lg bg-surface-inverse px-3 py-2 text-body text-text-inverse active:bg-surface-inverse-pressed"
          @click="pick('confirm', dismiss)"
        >
          삭제
        </button>
      </div>
    </div>
  </ModalShell>
</template>
