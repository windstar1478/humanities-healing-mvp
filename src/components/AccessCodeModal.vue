<script setup>
import { ref, useTemplateRef } from 'vue'
import { RotateCcw } from 'lucide-vue-next'
import { issueCode, codeOf } from '../mocks/accessCodes.js'
import ModalShell from './ModalShell.vue'

/*
 * 환자 접속 코드 발급. **Figma 디자인이 없어 임의로 만든 것이다.**
 *
 * 환자는 계정을 만들지 않고 이 코드로만 자기 화면에 들어온다(4.0.7절).
 * 코드가 곧 열쇠라서 **발급은 명시적 조작**이고, 새로 내면 이전 코드는 무효가
 * 된다 — 회수하지 못한 종이 한 장이 계속 열쇠로 남으면 안 된다.
 *
 * 짧은 확인이라 alert 상자를 쓴다. 코드를 읽어 주는 자리라 스크롤도 구분선도 없다.
 */
const props = defineProps({
  patient: { type: Object, required: true },
})

const emit = defineEmits(['close'])

const shell = useTemplateRef('shell')

/* 이미 살아 있는 코드가 있으면 그것을 보여준다. 열 때마다 새로 내지 않는다 */
const code = ref(codeOf(props.patient))
const reissued = ref(false)

function issue() {
  code.value = issueCode(props.patient)
  reissued.value = true
}
</script>

<template>
  <ModalShell ref="shell" name="access-code" variant="alert" @close="emit('close')">
    <h2 class="text-title-sm font-semibold">{{ patient.name }} 환자 접속 코드</h2>

    <p class="mt-2 text-label text-text-secondary">
      환자가 자기 화면에 들어올 때 쓰는 코드입니다. 태블릿을 건네며 읽어 주세요.
    </p>

    <div class="mt-3 flex items-center gap-3 rounded-lg border border-border-default bg-surface-field px-3 py-2">
      <span class="min-w-0 flex-1 text-title-lg font-semibold tracking-[0.2em]">
        {{ code ?? '발급된 코드가 없습니다' }}
      </span>
      <button class="flex h-11 shrink-0 items-center" @click="issue">
        <span class="flex h-9 items-center gap-1 rounded-lg border border-border-default bg-surface-card px-3 text-label font-medium text-text-secondary active:bg-surface-pressed">
          <RotateCcw :size="16" class="shrink-0" />{{ code ? '새로 발급' : '발급' }}
        </span>
      </button>
    </div>

    <!-- 새로 냈다는 사실은 남겨야 한다. 앞서 알려준 코드가 방금 막혔기 때문이다 -->
    <p class="mt-2 text-count" :class="reissued ? 'text-indicator-warning' : 'text-text-secondary'">
      <template v-if="reissued">새로 발급했습니다. 앞서 알려준 코드는 더 이상 쓸 수 없습니다.</template>
      <template v-else>새로 발급하면 이전 코드는 쓸 수 없게 됩니다.</template>
    </p>

    <div class="mt-3 flex justify-end">
      <button class="flex h-11 items-center" @click="shell?.dismiss()">
        <span class="flex h-9 items-center rounded-lg bg-surface-inverse px-3 text-body text-text-inverse active:bg-surface-inverse-pressed">
          닫기
        </span>
      </button>
    </div>
  </ModalShell>
</template>
