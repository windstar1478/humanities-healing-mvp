<script setup>
import { ref, computed } from 'vue'
import { useRoute, useRouter, onBeforeRouteLeave } from 'vue-router'
import { ChevronLeft, ChevronDown, ChevronUp, Check } from 'lucide-vue-next'
import {
  books, findBook, saveBook, nextBookId,
  BOOK_ATTRIBUTES, BOOK_TYPES, ATTRIBUTE_TOTAL, countInAxis,
} from '../mocks/books.js'
import InlineCallout from '../components/InlineCallout.vue'
import UnsavedWarningModal from '../components/UnsavedWarningModal.vue'

/*
 * 도서 콘텐츠 저작 — 저작도구 '도서 콘텐츠'의 편집 화면. 편집 화면 7호(마지막).
 *
 * 구버전 웹 '문장 명세'의 두 판을 그대로 가져왔다 — 좌 기본 정보, 우 속성값.
 * **한 건 = 한 도서에서 뽑은 문단 하나**이고, 그 문단에 45개 항목 중 해당하는
 * 것을 붙인다.
 *
 * **여기서는 필드를 줄이지 않았다.** 앞의 여섯 화면은 '앱이 읽는 필드만'으로
 * 좁혔지만, 이 화면의 왼쪽은 전부 작품을 특정하는 서지 정보라 하나만 빠져도
 * 어느 책의 몇 쪽인지 가리키지 못한다. 뺀 것은 머리의 `DCAT 데이터셋` 하나이고,
 * 그것은 입력이 아니라 표준 형식으로 내보내는 자리라 지금 붙일 곳이 없다.
 *
 * **속성 분류는 화면이 들지 않는다**(`BOOK_ATTRIBUTES`). 45개 항목의 구성은
 * 백엔드·연구 방향에 따라 가장 먼저 바뀔 값이라, 화면은 배열을 그리기만 한다.
 * 축이 늘거나 항목이 바뀌면 목업 한 곳에서 끝난다.
 *
 * ⚠️ Figma 디자인이 없다. 구버전 웹 화면의 구성만 옮긴 초안이다.
 */
const route = useRoute()
const router = useRouter()

const isNew = computed(() => route.params.id === 'new')
const original = computed(() => (isNew.value ? null : findBook(route.params.id)))

function draftFrom(book) {
  return {
    id: book?.id ?? nextBookId(),
    title: book?.title ?? '',
    type: book?.type ?? BOOK_TYPES[0],
    publisher: book?.publisher ?? '',
    published: book?.published ?? '',
    author: book?.author ?? '',
    born: book?.born ?? '',
    pages: book?.pages ?? '',
    passage: book?.passage ?? '',
    attributes: [...(book?.attributes ?? [])],
  }
}

const draft = ref(draftFrom(original.value))
const snapshot = ref(JSON.stringify(draft.value))
const isDirty = computed(() => JSON.stringify(draft.value) !== snapshot.value)

function toggleValue(value) {
  const at = draft.value.attributes.indexOf(value)
  if (at >= 0) draft.value.attributes.splice(at, 1)
  else draft.value.attributes.push(value)
}

/* 축은 접을 수 있다. 45개가 한 번에 펼쳐져 있으면 지금 보는 축을 잃는다 */
const collapsed = ref([])
const isOpen = (id) => !collapsed.value.includes(id)

function toggleAxis(id) {
  const at = collapsed.value.indexOf(id)
  if (at >= 0) collapsed.value.splice(at, 1)
  else collapsed.value.push(id)
}

/* 저장할 수 없는 이유. 비활성 버튼은 왜 못 누르는지 말해야 한다(3.8절) */
const blocked = computed(() => {
  const d = draft.value
  if (!d.title.trim()) return '작품명을 입력해 주세요'
  if (!d.author.trim()) return '저자를 입력해 주세요'
  if (!d.publisher.trim()) return '출판사명을 입력해 주세요'
  if (!Number(d.published)) return '출판연도를 입력해 주세요'
  if (!d.pages.trim()) return '추출 페이지를 입력해 주세요'
  if (!d.passage.trim()) return '추출 문단을 입력해 주세요'
  /* 속성값이 없으면 이 문단이 무엇에 쓰이는지 알 수 없다 */
  if (!d.attributes.length) return '속성값을 하나 이상 골라 주세요'
  return null
})

const calloutOpen = ref(false)

const goList = () => router.push({ path: '/authoring/book' })

function commit() {
  saveBook(draft.value)
  snapshot.value = JSON.stringify(draft.value)
}

function save() {
  if (blocked.value) {
    calloutOpen.value = true
    return
  }
  commit()
  goList()
}

/* 미저장 경고는 한 자리로 모은다 — 머리의 뒤로가기와 라우터 이탈 둘 다 여기를 거친다 */
const pendingAction = ref(null)

function guard(action) {
  if (!isDirty.value) {
    action()
    return
  }
  pendingAction.value = action
}

function runPending() {
  const action = pendingAction.value
  pendingAction.value = null
  action?.()
}

/* '나가기(저장 안 함)'은 초안을 되돌린 뒤 나간다 — 되돌리지 않으면 가드가 다시 막는다 */
function discardAndRun() {
  draft.value = JSON.parse(snapshot.value)
  runPending()
}

function saveAndRun() {
  if (!blocked.value) commit()
  else snapshot.value = JSON.stringify(draft.value)
  runPending()
}

onBeforeRouteLeave((to, from) => {
  if (to.path === from.path) return true
  if (!isDirty.value) return true
  pendingAction.value = () => router.push(to.fullPath)
  return false
})
</script>

<template>
  <div class="flex min-w-0 flex-1 flex-col gap-2 py-3">
    <!-- 머리: 어디에 있는가 + 나가는 길 + 주 행동 -->
    <section class="flex h-14 shrink-0 items-center gap-2 rounded-lg border border-border-default bg-surface-card px-3">
      <button
        class="-ml-2 flex size-11 shrink-0 items-center justify-center rounded-lg text-text-secondary active:bg-surface-pressed"
        @click="guard(goList)"
      >
        <ChevronLeft :size="16" />
      </button>
      <h1 class="whitespace-nowrap text-title-sm font-semibold">
        {{ isNew ? '새 도서 콘텐츠' : draft.title || original?.title }}
      </h1>
      <p class="min-w-0 flex-1 truncate text-label text-text-secondary">
        {{ ATTRIBUTE_TOTAL }}개 항목 중 {{ draft.attributes.length }}개 선택
      </p>
      <div class="relative shrink-0">
        <button
          class="flex h-11 items-center rounded-lg px-3 text-label font-medium"
          :class="blocked
            ? 'bg-surface-field text-text-disabled'
            : 'bg-surface-inverse text-text-inverse active:bg-surface-inverse-pressed'"
          @click="save"
        >
          저장
        </button>
        <!-- 왜 못 누르는지 말한다. 무반응은 고장으로 읽힌다 -->
        <InlineCallout
          v-if="calloutOpen && blocked"
          class="absolute right-0 top-12 z-10 w-[280px]"
          :title="blocked"
          detail="채우고 나면 저장할 수 있습니다"
          @click="calloutOpen = false"
        />
      </div>
    </section>

    <div class="flex min-h-0 flex-1 gap-2">
      <!-- 좌: 어느 책의 어느 문단인가 -->
      <section class="flex w-[320px] shrink-0 flex-col gap-2 overflow-y-auto rounded-lg border border-border-default bg-surface-card px-3 py-2">
        <p class="shrink-0 text-label font-medium">기본 정보</p>

        <label class="flex shrink-0 flex-col gap-1">
          <span class="text-count text-text-secondary">작품명</span>
          <input
            v-model="draft.title"
            class="h-11 w-full rounded-lg border border-border-default bg-surface-field px-3 text-label text-text-primary"
            placeholder="예: 태평천하"
          />
        </label>

        <div class="flex shrink-0 gap-2">
          <label class="flex min-w-0 flex-1 flex-col gap-1">
            <span class="text-count text-text-secondary">유형</span>
            <select
              v-model="draft.type"
              class="h-11 w-full rounded-lg border border-border-default bg-surface-field px-3 text-label text-text-primary"
            >
              <option v-for="type in BOOK_TYPES" :key="type" :value="type">{{ type }}</option>
            </select>
          </label>
          <label class="flex min-w-0 flex-1 flex-col gap-1">
            <span class="text-count text-text-secondary">출판사명</span>
            <input
              v-model="draft.publisher"
              class="h-11 w-full rounded-lg border border-border-default bg-surface-field px-3 text-label text-text-primary"
              placeholder="예: 문학동네"
            />
          </label>
        </div>

        <div class="flex shrink-0 gap-2">
          <label class="flex min-w-0 flex-1 flex-col gap-1">
            <span class="text-count text-text-secondary">출판연도</span>
            <input
              v-model="draft.published"
              type="number"
              inputmode="numeric"
              class="h-11 w-full rounded-lg border border-border-default bg-surface-field px-3 text-label text-text-primary"
            />
          </label>
          <label class="flex min-w-0 flex-1 flex-col gap-1">
            <span class="text-count text-text-secondary">저자</span>
            <input
              v-model="draft.author"
              class="h-11 w-full rounded-lg border border-border-default bg-surface-field px-3 text-label text-text-primary"
              placeholder="예: 채만식"
            />
          </label>
        </div>

        <div class="flex shrink-0 gap-2">
          <label class="flex min-w-0 flex-1 flex-col gap-1">
            <span class="text-count text-text-secondary">출생연도</span>
            <input
              v-model="draft.born"
              type="number"
              inputmode="numeric"
              class="h-11 w-full rounded-lg border border-border-default bg-surface-field px-3 text-label text-text-primary"
            />
          </label>
          <label class="flex min-w-0 flex-1 flex-col gap-1">
            <span class="text-count text-text-secondary">추출 페이지</span>
            <input
              v-model="draft.pages"
              class="h-11 w-full rounded-lg border border-border-default bg-surface-field px-3 text-label text-text-primary"
              placeholder="예: 45-78"
            />
          </label>
        </div>

        <label class="flex min-h-0 flex-1 flex-col gap-1">
          <span class="shrink-0 text-count text-text-secondary">추출 문단</span>
          <textarea
            v-model="draft.passage"
            class="min-h-40 w-full flex-1 rounded-lg border border-border-default bg-surface-field px-3 py-2 text-label text-text-primary"
            placeholder="이 문단에 속성값을 붙입니다"
          />
        </label>
      </section>

      <!-- 우: 추출 문장 속성값. 구성은 목업이 정한다 -->
      <section class="flex min-w-0 flex-1 flex-col rounded-lg border border-border-default bg-surface-card px-3 py-2">
        <div class="flex h-11 shrink-0 items-center gap-2">
          <p class="text-label font-medium">추출 문장 속성값</p>
          <span class="text-count text-text-secondary">
            {{ ATTRIBUTE_TOTAL }}개 항목 · {{ draft.attributes.length }}개 선택됨
          </span>
        </div>

        <div class="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto">
          <!--
            축 하나. 머리와 본문이 한 상자다(3.4절) — 둘 다 온전한 라운드 상자로
            두면 맞닿는 자리에 선이 두 줄 겹친다.
          -->
          <div v-for="axis in BOOK_ATTRIBUTES" :key="axis.id" class="shrink-0">
            <button
              class="flex h-11 w-full items-center gap-2 border border-border-default bg-surface-recessed px-3 text-left active:bg-surface-pressed"
              :class="isOpen(axis.id) ? 'rounded-t-lg border-b-0' : 'rounded-lg'"
              @click="toggleAxis(axis.id)"
            >
              <span class="min-w-0 flex-1 truncate text-label font-medium">{{ axis.name }}</span>
              <span class="shrink-0 text-count text-text-secondary">
                {{ countInAxis(axis, draft.attributes) }}개 선택
              </span>
              <component
                :is="isOpen(axis.id) ? ChevronUp : ChevronDown"
                :size="16"
                class="shrink-0 text-text-secondary"
              />
            </button>

            <div
              v-if="isOpen(axis.id)"
              class="flex flex-col gap-2 rounded-b-lg border border-t-0 border-border-default bg-surface-card px-3 py-2"
            >
              <div v-for="(group, gi) in axis.groups" :key="gi" class="flex flex-col gap-1">
                <!-- 소분류가 없는 축(관계 · 주제어)은 이름 줄을 두지 않는다 -->
                <span v-if="group.name" class="text-count text-text-secondary">{{ group.name }}</span>
                <div class="flex flex-wrap gap-1">
                  <button
                    v-for="value in group.values"
                    :key="value"
                    class="flex h-11 items-center gap-1 rounded-lg border px-3 text-label"
                    :class="draft.attributes.includes(value)
                      ? 'border-border-selected bg-selected-bg text-text-primary active:bg-selected-bg-pressed'
                      : 'border-border-default text-text-secondary active:bg-surface-pressed'"
                    @click="toggleValue(value)"
                  >
                    <Check
                      v-if="draft.attributes.includes(value)"
                      :size="12"
                      class="shrink-0"
                    />
                    {{ value }}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>

    <UnsavedWarningModal
      v-if="pendingAction"
      subject="도서 콘텐츠"
      @discard="discardAndRun"
      @save="saveAndRun"
      @close="pendingAction = null"
    />
  </div>
</template>
