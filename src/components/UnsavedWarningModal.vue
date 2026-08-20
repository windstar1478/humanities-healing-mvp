<script setup>
import ModalShell from './ModalShell.vue'

/*
 * 미저장 이탈 경고 (Figma 186:6839).
 *
 * 오토세이브가 없으므로 편집 중 이탈은 전부 여기를 거친다.
 * 선택지는 셋이고 **비파괴적인 것이 시각적으로 강하다** —
 * '나가기 (저장 안 함)'만 텍스트로 두고 반대편 끝에 떼어놓았다.
 * 버튼 두 개를 나란히 놓으면 파괴적인 쪽을 잘못 누를 수 있다.
 *
 * 저작도구·프로그램 수행 등 다른 화면에서도 같은 문구 틀을 쓴다.
 * 무엇이 사라지는지(`subject`)만 갈아끼운다.
 */
defineProps({
  /* '5회차 수행 내역' 처럼, 무엇에 저장되지 않은 변경이 있는지 */
  subject: { type: String, required: true },
})

const emit = defineEmits(['discard', 'save', 'close'])

/*
 * 어느 버튼을 눌렀든 **셸의 dismiss(= router.back())를 거쳐서** 닫는다.
 * 부모가 v-if로 그냥 걷으면 셸이 올려둔 history 엔트리가 남아,
 * 다음 뒤로가기 제스처가 아무 일도 하지 않고 소리 없이 먹힌다.
 * 선택만 기억해 두고, 쿼리가 사라진 뒤(@close) 그 선택을 부모에게 올린다.
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
  <ModalShell v-slot="{ dismiss }" name="unsaved" variant="alert" @close="settle">
    <div class="flex flex-col gap-4">
      <div class="flex flex-col gap-2 p-1">
        <p class="text-title-sm font-semibold text-text-primary">저장하지 않은 내용이 있습니다</p>
        <p class="text-caption text-text-secondary">
          {{ subject }}에 저장되지 않은 변경사항이 있습니다.<br />
          지금 나가면 입력한 내용이 사라집니다.
        </p>
      </div>

      <div class="flex items-center justify-between px-1">
        <!--
          파괴적 선택지. 색도 경고색이다(3.1절) — 자리를 떼어놓는 것만으로는
          '무엇이 사라지는 쪽인가'가 보이지 않는다
        -->
        <button
          class="flex h-11 items-center justify-center rounded-lg px-2 text-label font-medium text-danger-fg active:bg-danger-bg"
          @click="pick('discard', dismiss)"
        >
          나가기 (저장 안 함)
        </button>

        <div class="flex items-center gap-2.5">
          <button
            class="flex h-9 items-center justify-center rounded-lg border border-border-default px-3 py-2 text-body text-text-primary opacity-80 active:bg-surface-pressed"
            @click="pick('close', dismiss)"
          >
            계속 작성
          </button>
          <button
            class="flex h-9 items-center justify-center rounded-lg bg-surface-inverse px-3 py-2 text-body text-text-inverse active:bg-surface-inverse-pressed"
            @click="pick('save', dismiss)"
          >
            저장하고 나가기
          </button>
        </div>
      </div>
    </div>
  </ModalShell>
</template>
