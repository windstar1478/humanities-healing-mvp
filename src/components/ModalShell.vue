<script setup>
import { watch, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'

/*
 * 모달이 공유하는 셸. 라운드 16 / 폭 360 / border-default / 스크림은 --scrim.
 * 본문만 스크롤하고 버튼은 하단에 고정된다.
 *
 * history 처리도 여기 있다. PWA standalone에는 뒤로가기 버튼이 없지만
 * Android 제스처 뒤로가기는 살아 있어서, 모달이 history에 없으면 그 제스처가
 * 앱 이탈로 이어진다.
 *
 * 단, history.pushState로 직접 만들면 안 된다. vue-router는 자기 history 스택을
 * 따로 관리하는데, 라우터가 모르는 엔트리가 끼면 history.back()의 popstate를
 * 라우터가 'route 이동'으로 해석해 다른 화면으로 튕긴다.
 * 그래서 엔트리 생성·소멸을 전부 라우터에게 맡긴다.
 */
const props = defineProps({
  /* route.query.modal에 남길 이름 */
  name: { type: String, required: true },
})

const emit = defineEmits(['close'])

const route = useRoute()
const router = useRouter()

/* 쿼리가 사라지면(뒤로가기든 버튼이든) 닫힌다 */
watch(
  () => route.query.modal,
  (value) => { if (!value) emit('close') },
)

function dismiss() {
  router.back()
}

onMounted(() => {
  router.push({ query: { ...route.query, modal: props.name } })
})

defineExpose({ dismiss })
</script>

<template>
  <Teleport to="body">
    <div
      class="fixed inset-0 z-50 flex items-center justify-center p-6"
      :style="{ backgroundColor: 'var(--scrim)' }"
      @click.self="dismiss"
    >
      <!-- 내용이 길어져도 화면을 넘기지 않는다. 본문만 스크롤하고 버튼은 고정 -->
      <div class="flex max-h-full w-[360px] flex-col overflow-hidden rounded-2xl border border-border-default bg-surface-card">
        <div class="min-h-0 flex-1 overflow-y-auto px-6 py-5">
          <slot :dismiss="dismiss" />
        </div>
        <div class="flex shrink-0 justify-end gap-2 border-t border-border-subtle px-6 py-3">
          <slot name="actions" :dismiss="dismiss" />
        </div>
      </div>
    </div>
  </Teleport>
</template>
