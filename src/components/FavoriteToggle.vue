<script setup>
/*
 * 저작도구의 즐겨찾기 별. 도구 화면(`AuthoringToolView`) 머리 우측에 붙는다.
 *
 * **단위는 도구다.** 별을 켜면 그 도구가 홈의 '빠른 저작'에 오른다.
 *
 * **accent를 쓰지 않는다.** accent 용법은 셋(선택 상태 · 현재 위치 마커 ·
 * 드롭 대상)으로 동결돼 있고, 켜진 별은 채움과 글자색 한 단계만으로 충분히 갈린다.
 *
 * **자리가 없으면 사유를 말한다.** 넷이 차 있을 때 다섯 번째를 누르면 아무 일도
 * 일어나지 않는데, 무반응은 고장으로 읽힌다(3.8절). 콜아웃 둘째 줄이 **어떻게
 * 뚫는지**를 말한다 — 다른 도구의 별을 먼저 뺀다.
 */
import { ref, computed } from 'vue'
import { Star } from 'lucide-vue-next'
import { isFavorite, isFull, toggleFavorite, FAVORITE_MAX } from '../mocks/favorites.js'
import InlineCallout from './InlineCallout.vue'

const props = defineProps({
  tool: { type: String, required: true },
})

const on = computed(() => isFavorite(props.tool))
const calloutOpen = ref(false)

function toggle() {
  if (toggleFavorite(props.tool)) {
    calloutOpen.value = false
    return
  }
  calloutOpen.value = true
}
</script>

<template>
  <div class="relative shrink-0">
    <button
      class="flex size-11 items-center justify-center rounded-lg active:bg-surface-pressed"
      :class="on ? 'text-text-primary' : 'text-text-secondary'"
      :aria-label="on ? '빠른 저작에서 빼기' : '빠른 저작에 추가'"
      @click="toggle"
    >
      <Star :size="16" :class="on && 'fill-current'" />
    </button>
    <InlineCallout
      v-if="calloutOpen && !on && isFull()"
      class="absolute right-0 top-12 z-10 w-[280px]"
      :title="`빠른 저작에는 ${FAVORITE_MAX}개까지 담을 수 있습니다`"
      detail="다른 도구의 별을 먼저 빼면 자리가 생깁니다"
      @click="calloutOpen = false"
    />
  </div>
</template>
