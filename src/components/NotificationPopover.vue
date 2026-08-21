<script setup>
import { computed } from 'vue'
import { viewW, viewH } from '../uiScale.js'
import { CalendarDays, ClipboardList, FileText, Workflow, BellOff } from 'lucide-vue-next'
import { notifications, markRead, markAllRead, unreadCount } from '../mocks/notifications.js'

/*
 * 알림 목록. **Figma 디자인이 없어 임의로 만든 것이다.**
 *
 * 모달이 아니라 **팝오버**다 — 읽고 지나가는 가벼운 콘텐츠라 history 엔트리를
 * 만들지 않고 외부 탭으로 닫는다(3.5절). 폭 280 · 최대 높이 364는 캘린더
 * 날짜 팝오버와 같은 값이다. 같은 문법의 자리를 두 크기로 두지 않는다.
 *
 * **읽지 않음에 accent를 쓰지 않는다.** accent 용법은 선택 상태 · 현재 위치 ·
 * 드롭 대상 셋으로 동결돼 있다(3.1절). 표면과 굵기로 가른다.
 */
const emit = defineEmits(['close', 'go'])

const props = defineProps({
  /* 좌측 네비 버튼의 위치. 팝오버를 그 오른쪽에 붙인다 */
  anchor: { type: Object, required: true },
})

const ICONS = {
  schedule: CalendarDays,
  task: ClipboardList,
  survey: FileText,
  process: Workflow,
}

const unread = computed(() => unreadCount())

const style = computed(() => {
  const WIDTH = 280
  const HEIGHT = 364
  const MARGIN = 24
  const { right, top, height } = props.anchor
  return {
    left: `${right + 8}px`,
    /* 세로는 버튼 중앙에 맞추되 화면 밖으로 나가지 않게 가둔다 */
    top: `${Math.min(Math.max(MARGIN, top + height / 2 - HEIGHT / 2), viewH() - HEIGHT - MARGIN)}px`,
  }
})

/* 탭하면 읽음으로 바꾸고 관련 화면으로 간다. 팝오버는 먼저 닫는다 */
function open(item) {
  markRead(item.id)
  emit('go', item.to)
}
</script>

<template>
  <Teleport to="body">
    <div class="fixed inset-0 z-50" @click="emit('close')">
      <div
        class="absolute flex max-h-[364px] w-[280px] flex-col overflow-hidden rounded-2xl border border-border-default bg-surface-card"
        :style="style"
        @click.stop
      >
        <div class="flex h-12 shrink-0 items-center gap-2 border-b border-border-subtle px-3">
          <span class="text-label font-medium">알림</span>
          <span
            v-if="unread"
            class="flex h-4 min-w-4 items-center justify-center rounded-full bg-surface-inverse px-1 text-count text-text-inverse"
          >
            {{ unread }}
          </span>
          <span class="flex-1"></span>
          <button
            v-if="unread"
            class="flex h-11 items-center text-count text-text-secondary active:text-text-primary"
            @click="markAllRead"
          >
            모두 읽음
          </button>
        </div>

        <div v-if="notifications.length" class="min-h-0 flex-1 overflow-y-auto">
          <button
            v-for="item in notifications"
            :key="item.id"
            class="flex w-full items-start gap-2 border-b border-border-subtle px-3 py-2 text-left last:border-b-0"
            :class="item.read ? 'active:bg-surface-pressed' : 'bg-surface-field active:bg-surface-pressed'"
            @click="open(item)"
          >
            <component
              :is="ICONS[item.kind] ?? CalendarDays"
              :size="16"
              class="mt-0.5 shrink-0"
              :class="item.warning ? 'text-indicator-warning' : 'text-text-secondary'"
            />
            <span class="flex min-w-0 flex-1 flex-col gap-0.5">
              <span
                class="text-label"
                :class="[item.read ? 'font-normal' : 'font-medium', item.warning ? 'text-indicator-warning' : '']"
              >
                {{ item.title }}
              </span>
              <span class="truncate text-count text-text-secondary">{{ item.detail }}</span>
              <span class="text-count text-text-secondary">{{ item.when }}</span>
            </span>
          </button>
        </div>

        <!-- 빈 상태. 아무것도 없는 상자만 남으면 고장으로 읽힌다 -->
        <div v-else class="flex min-h-0 flex-1 flex-col items-center justify-center gap-2 py-8">
          <BellOff :size="24" class="text-text-disabled" />
          <p class="text-label text-text-secondary">새 알림이 없습니다</p>
        </div>
      </div>
    </div>
  </Teleport>
</template>
