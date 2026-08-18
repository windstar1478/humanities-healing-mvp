<script setup>
import ModalShell from './ModalShell.vue'

/*
 * 메모 삭제 확인 (Figma 190:8960 / alert 190:9039).
 *
 * 삭제는 되돌릴 수 없으므로 반드시 여기를 거친다.
 * 어느 메모가 지워지는지를 문구가 특정하고(날짜 · 맥락), 복구 불가를 못박는다.
 * 스낵바 실행취소를 두지 않는 이유는 "저장은 명시적 조작으로만" 규칙과 같다.
 *
 * ⚠️ Figma의 확정 버튼 텍스트 레이어 이름이 `프로그램 처방으로 이동`으로 남아 있는데,
 *    다른 화면 인스턴스의 레이어명이 남은 것이고 실제 문자열은 `삭제`다.
 *    (같은 노드의 텍스트 폭 26 = 두 글자, 화살표 아이콘도 hidden 처리되어 있다)
 */
defineProps({
  note: { type: Object, required: true },
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
  <ModalShell v-slot="{ dismiss }" name="note-delete" variant="alert" @close="settle">
    <div class="flex flex-col gap-3">
      <div class="flex flex-col gap-2 p-1">
        <p class="text-title-sm font-semibold text-text-primary">메모를 삭제하시겠습니까?</p>
        <p class="text-caption text-text-secondary">
          {{ note.date }} · {{ note.context }} 메모가 삭제됩니다.
        </p>
        <!-- 복구 불가는 secondary로 낮추지 않는다. 이 문장이 이 모달의 이유다 -->
        <p class="text-caption text-text-primary">삭제한 메모는 복구할 수 없습니다.</p>
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
