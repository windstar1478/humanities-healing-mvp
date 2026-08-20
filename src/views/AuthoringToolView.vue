<script setup>
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ChevronLeft, Plus } from 'lucide-vue-next'
import { findTool } from '../mocks/authoring.js'
import FavoriteToggle from '../components/FavoriteToggle.vue'

/*
 * 저작도구 하나의 화면.
 *
 * **일곱 도구가 화면 하나를 공유한다.** 지금 확정된 것은 이름과 무엇을 만드는
 * 화면인가까지고, 편집 화면의 구조는 도구마다 다를 것이 분명하다 — 그것이
 * 나오기 전에 일곱 벌을 따로 만들면 나중에 일곱 곳을 고쳐야 한다.
 *
 * 이 화면이 지금 하는 일은 둘이다.
 *  1. 어디에 들어왔는지 말한다 (이름 · 무엇을 만드는 화면인가)
 *  2. 지금 그 도구가 들고 있는 결과물을 **읽기 전용으로** 보여준다
 *
 * **구버전 웹에서 무엇이 바뀌었는지, 무엇이 아직 미완성인지는 적지 않는다.**
 * 둘 다 만드는 사람의 사정이지 쓰는 사람의 일이 아니다 —
 * 근거는 설계문서 4.8절에만 남긴다.
 *
 * **편집 화면은 도구마다 하나씩 연다**(`editPath`). 세션 활동 · 도서 콘텐츠는
 * 아직 열리지 않았고, 그런 도구는 만드는 조작을 비활성으로 둔다 — 있는 척하지 않는다.
 *
 * 머리 우측의 별표는 이 도구를 **홈의 '빠른 저작'**에 올린다(`mocks/favorites.js`).
 *
 * ⚠️ Figma 디자인이 미완성이라 이 화면 전체가 초안이다(4.8절).
 */
const route = useRoute()
const router = useRouter()

const tool = computed(() => findTool(route.params.tool))
const items = computed(() => tool.value?.items() ?? null)

/* 편집 화면이 열린 도구만 행과 '새로 만들기'가 눌린다 */
const open = (id) => router.push({ path: tool.value.editPath(id) })

/* 홈으로 돌아간다. 뒤로가기가 아니라 경로다 — 네비에서 바로 들어올 수도 있다 */
const back = () => router.push({ path: '/authoring' })
</script>

<template>
  <div v-if="tool" class="flex min-w-0 flex-1 flex-col gap-2 py-3">
    <!-- 머리: 어디에 들어왔는가 + 나가는 길 -->
    <section class="flex h-14 shrink-0 items-center gap-2 rounded-lg border border-border-default bg-surface-card px-3">
      <button
        class="-ml-2 flex size-11 shrink-0 items-center justify-center rounded-lg text-text-secondary active:bg-surface-pressed"
        @click="back"
      >
        <ChevronLeft :size="16" />
      </button>
      <h1 class="whitespace-nowrap text-title-sm font-semibold">{{ tool.name }}</h1>
      <p class="min-w-0 flex-1 truncate text-label text-text-secondary">{{ tool.summary }}</p>
      <!-- 켜면 홈의 '빠른 저작'에 오른다 -->
      <FavoriteToggle :tool="tool.key" class="-mr-2" />
    </section>

    <div class="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto">
      <!-- 지금 들고 있는 결과물. 읽기 전용이고, 없으면 카드 자체를 두지 않는다 -->
      <section v-if="items" class="flex min-h-0 flex-col rounded-lg border border-border-default bg-surface-card px-3 py-2">
        <div class="flex shrink-0 items-center gap-2">
          <span class="text-label font-medium">
            {{ tool.itemLabel }} <span class="text-text-secondary">· {{ items.length }}</span>
          </span>
          <span class="flex-1"></span>
          <button
            v-if="tool.editPath"
            class="-mr-2 flex h-11 items-center gap-1 rounded-lg px-2 text-label text-text-secondary active:bg-surface-pressed"
            @click="open(null)"
          >
            <Plus :size="16" />
            새로 만들기
          </button>
          <!-- 편집 화면이 아직 없는 도구. 눌러도 되는 것처럼 두지 않는다 -->
          <span v-else class="flex h-11 items-center gap-1 text-label text-text-disabled">
            <Plus :size="16" />
            새로 만들기
          </span>
        </div>

        <div class="mt-2 flex min-h-0 flex-col overflow-y-auto rounded-lg border border-border-default">
          <component
            :is="tool.editPath ? 'button' : 'div'"
            v-for="(item, i) in items"
            :key="item.id"
            class="flex min-h-11 shrink-0 items-center gap-2 px-3 py-2 text-left"
            :class="[i > 0 && 'border-t border-border-subtle', tool.editPath && 'active:bg-surface-pressed']"
            @click="tool.editPath && open(item.id)"
          >
            <span class="min-w-0 flex-1 truncate text-label">{{ item.title }}</span>
            <span v-if="item.badge" class="shrink-0 text-count text-text-secondary">{{ item.badge }}</span>
            <span class="shrink-0 truncate text-count text-text-secondary">{{ item.meta.join(' · ') }}</span>
          </component>
        </div>
      </section>
    </div>
  </div>
</template>
