<script setup>
import { useRouter } from 'vue-router'
import {
  ChevronRight, ClipboardCheck, Tags, Layers, Workflow, Package, Activity, BookOpen,
} from 'lucide-vue-next'
import { authoringGroups, toolsInGroup } from '../mocks/authoring.js'

/*
 * 저작도구 홈.
 *
 * **프로그램·프로세스를 다루는 화면이라 우측 환자 패널이 없다**(4.0.1절).
 *
 * 이 화면이 하는 일은 둘뿐이다.
 *  1. 일곱 저작도구가 **무엇을 만드는 화면인지** 말한다
 *  2. 그 중 하나로 **들어간다**
 *
 * 구버전 웹은 좌측 네비에 일곱 항목을 한꺼번에 펼쳐 두었지만, 이 앱의 좌측
 * 네비는 다섯 화면짜리 한 벌이라 여기에 일곱을 더 밀어 넣으면 네비가 화면의
 * 절반이 된다. **들어가는 자리를 홈 하나로 모으고 네비는 `저작도구` 한 줄로 뒀다.**
 *
 * **구버전 웹에서 무엇이 바뀌었는지는 화면에 적지 않는다.** 지금 쓰는 사람에게
 * 필요한 것은 이 도구가 무엇을 만드는가뿐이고, 옛 이름은 이미 지나간 사정이다.
 * 이름을 바꾼 근거는 설계문서 4.8.1절에만 남긴다.
 */
const ICONS = {
  scale: ClipboardCheck,
  field: Tags,
  spec: Layers,
  process: Workflow,
  program: Package,
  activity: Activity,
  book: BookOpen,
}

const router = useRouter()
const open = (tool) => router.push({ path: `/authoring/${tool.key}` })

/* 목업이 있는 도구만 개수를 적는다. 없는 것을 0으로 적으면 '비어 있다'로 읽힌다 */
function count(tool) {
  const items = tool.items()
  return items ? `${tool.itemLabel} ${items.length}` : null
}
</script>

<template>
  <div class="flex min-w-0 flex-1 flex-col gap-2 py-3">
    <!-- 머리: 무엇을 보고 있는지 + 이름을 다시 붙인 규칙 한 줄 -->
    <section class="flex h-14 shrink-0 items-center gap-2 rounded-lg border border-border-default bg-surface-card px-3">
      <h1 class="whitespace-nowrap text-title-sm font-semibold">저작도구</h1>
      <p class="min-w-0 flex-1 truncate text-label text-text-secondary">
        척도 · 프로세스 · 프로그램의 정의를 만든다
      </p>
    </section>

    <!-- 본문은 이 안에서만 스크롤한다 -->
    <div class="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto">
      <section v-for="group in authoringGroups" :key="group" class="flex shrink-0 flex-col gap-2">
        <p class="text-count text-text-secondary">{{ group }}</p>

        <div class="grid grid-cols-3 gap-2">
          <button
            v-for="tool in toolsInGroup(group)"
            :key="tool.key"
            class="flex flex-col gap-1 rounded-lg border border-border-default bg-surface-card px-3 py-2 text-left active:bg-surface-pressed"
            @click="open(tool)"
          >
            <span class="flex min-h-11 items-center gap-2">
              <component :is="ICONS[tool.key]" :size="16" class="shrink-0 text-text-secondary" />
              <span class="min-w-0 flex-1 truncate text-title-sm font-semibold">{{ tool.name }}</span>
              <ChevronRight :size="16" class="shrink-0 text-text-secondary" />
            </span>

            <span class="line-clamp-2 text-label text-text-secondary">{{ tool.summary }}</span>

            <!-- 목업이 있는 도구만 개수를 적는다. 0으로 적으면 '지웠다'로 읽힌다 -->
            <span v-if="count(tool)" class="text-count text-text-secondary">{{ count(tool) }}</span>
            <span v-else class="text-count text-transparent">·</span>
          </button>
        </div>
      </section>
    </div>
  </div>
</template>
