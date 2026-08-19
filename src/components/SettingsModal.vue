<script setup>
import { ref, reactive, useTemplateRef } from 'vue'
import { useRouter } from 'vue-router'
import { LogOut } from 'lucide-vue-next'
import { settings, SETTING_ITEMS, APP_VERSION, applySettings } from '../mocks/settings.js'
import { session, signOut } from '../authState.js'
import ModalShell from './ModalShell.vue'

/*
 * 설정. **Figma 디자인이 없어 임의로 만든 것이다.**
 *
 * 팝오버가 아니라 **모달**이다 — 값을 바꾸고 저장하는 자리라 조작이 끝날 때까지
 * 열려 있어야 하고, 뒤로가기로 닫히는 편이 맞다(3.5절).
 *
 * **사본을 고친다.** 스위치를 누를 때마다 반영하면 '취소'가 되돌릴 것이 없다 —
 * 오토세이브 없음 규칙(3.6절)이 여기에도 걸린다.
 *
 * 테마 토글은 두지 않는다. 좌측 하단에 이미 있고, 같은 조작이 두 자리에 있으면
 * 어느 쪽이 지금 값인지 알 수 없다.
 */
const emit = defineEmits(['close'])

const router = useRouter()

const draft = reactive({ ...settings })

const shell = useTemplateRef('shell')

let saving = false
function save() {
  saving = true
  shell.value?.dismiss()
}

/*
 * 로그아웃은 확인을 거친다. 되돌릴 수 없고, 고르던 설정도 함께 버려진다.
 * 중복 경고와 같은 문법이다 — 모달을 닫지 않고 **버튼 행만** 확인 상태로 바뀐다.
 */
const leaving = ref(false)
let signingOut = false

function confirmLeave() {
  signingOut = true
  shell.value?.dismiss()
}

/* 저장·이동은 셸이 닫힌 뒤에 한다. 어느 버튼이든 셸의 dismiss를 거쳐 닫는다 */
function settle() {
  if (saving) applySettings(draft)
  emit('close')
  if (signingOut) {
    signOut()
    router.replace('/login')
  }
}
</script>

<template>
  <ModalShell ref="shell" name="settings" @close="settle">
    <h2 class="text-title-sm font-semibold">설정</h2>

    <!-- 지금 누구로 들어와 있는지. 로그아웃 옆에 두어야 무엇이 끊기는지 보인다 -->
    <p class="mt-1 text-label text-text-secondary">
      {{ session.role === 'counselor' ? '치유사' : '환자' }}로 로그인되어 있습니다
    </p>

    <div class="mt-4 flex flex-col gap-1 rounded-lg border border-border-default">
      <button
        v-for="(item, i) in SETTING_ITEMS"
        :key="item.key"
        class="flex items-center gap-3 px-3 py-2 text-left active:bg-surface-pressed"
        :class="i ? 'border-t border-border-subtle' : ''"
        @click="draft[item.key] = !draft[item.key]"
      >
        <span class="flex min-w-0 flex-1 flex-col">
          <span class="text-label font-medium">{{ item.label }}</span>
          <span class="text-count text-text-secondary">{{ item.detail }}</span>
        </span>
        <!--
          켠 자리는 채운 표면이다. accent는 선택 상태·현재 위치·드롭 대상
          셋으로 동결돼 있어(3.1절) 스위치에 쓰지 않는다
        -->
        <span
          class="relative h-6 w-10 shrink-0 rounded-full border transition-colors duration-150 ease-standard"
          :class="draft[item.key]
            ? 'border-border-strong bg-surface-inverse'
            : 'border-border-default bg-surface-field'"
        >
          <span
            class="absolute top-0.5 size-4.5 rounded-full border border-border-default bg-surface-card transition-[left] duration-150 ease-standard"
            :class="draft[item.key] ? 'left-[18px]' : 'left-0.5'"
          ></span>
        </span>
      </button>
    </div>

    <!-- 로그아웃은 설정을 바꾸는 일이 아니다. 항목 상자 밖에 떨어뜨린다 -->
    <button
      class="mt-4 flex h-11 w-full items-center gap-1 rounded-lg border border-border-default px-3 text-body text-text-secondary active:bg-surface-pressed"
      @click="leaving = true"
    >
      <LogOut :size="16" class="shrink-0" />로그아웃
    </button>

    <p class="mt-4 text-count text-text-secondary">앱 버전 {{ APP_VERSION }}</p>

    <template #actions>
      <!-- 확인 중에는 버튼 행만 바뀐다. '돌아가기'는 모달을 닫지 않는다 -->
      <p v-if="leaving" class="min-w-0 flex-1 self-center text-count text-text-secondary">
        로그아웃하면 고르던 설정은 저장되지 않습니다.
      </p>
      <button class="flex h-11 items-center" @click="leaving ? (leaving = false) : shell?.dismiss()">
        <span class="flex h-9 items-center rounded-lg border border-border-default px-3 text-body active:bg-surface-pressed">
          {{ leaving ? '돌아가기' : '취소' }}
        </span>
      </button>
      <button class="flex h-11 items-center" @click="leaving ? confirmLeave() : save()">
        <span class="flex h-9 items-center rounded-lg bg-surface-inverse px-3 text-body text-text-inverse active:bg-surface-inverse-pressed">
          {{ leaving ? '로그아웃' : '저장' }}
        </span>
      </button>
    </template>
  </ModalShell>
</template>
