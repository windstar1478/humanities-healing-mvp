<script setup>
import { TriangleAlert } from 'lucide-vue-next'

/*
 * 비활성 사유 콜아웃 (Figma 176:5336 · 176:5225).
 *
 * 누를 수 없는 자리를 눌렀을 때 왜 안 되는지 말해준다.
 * 아무 반응이 없으면 고장으로 읽히기 때문이다.
 *
 * 두 줄인 것이 핵심이다 — 첫 줄이 **무엇이 안 되는지**, 둘째 줄이
 * **언제 되는지**를 말한다. 한 줄만 두면 막힌 이유는 알아도 뚫을 방법을 모른다.
 * 첫 줄만 경고색이고 둘째 줄은 중립색이다. 둘 다 경고색이면 덩어리 전체가
 * 경고로 읽혀 정작 해법인 둘째 줄이 묻힌다.
 *
 * 색은 `indicator-warning`이다. `warning-fg`(amber)가 아니다 —
 * Figma가 orange 계열을 쓰고, 기한 지난 작업의 경고색과도 같은 값이어야 한다.
 */
defineProps({
  /* 무엇이 안 되는지 */
  title: { type: String, required: true },
  /* 언제 되는지 */
  detail: { type: String, default: null },
})
</script>

<template>
  <div class="flex flex-col justify-center gap-1 rounded-lg border border-indicator-warning bg-surface-card px-3 py-2">
    <div class="flex items-center gap-1">
      <TriangleAlert :size="12" class="shrink-0 text-indicator-warning" />
      <p class="text-label font-medium text-indicator-warning">{{ title }}</p>
    </div>
    <p v-if="detail" class="text-count text-text-secondary">{{ detail }}</p>
  </div>
</template>
