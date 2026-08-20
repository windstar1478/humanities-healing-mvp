<script setup>
import { ref, computed } from 'vue'
import { useRoute, useRouter, onBeforeRouteLeave } from 'vue-router'
import { ChevronLeft, Check } from 'lucide-vue-next'
import {
  dataSpecs, findSpec, saveSpec, nextSpecId, categoryOf, SPEC_ORGS,
} from '../mocks/dataSpecs.js'
import { fieldGroups, findGroup, codeOf } from '../mocks/dataFields.js'
import { dimensions } from '../mocks/analysis.js'
import InlineCallout from '../components/InlineCallout.vue'
import UnsavedWarningModal from '../components/UnsavedWarningModal.vue'

/*
 * 데이터 명세 저작 — 저작도구 '데이터 명세'의 편집 화면 (축소 버전).
 *
 * **명세는 필드를 만드는 자리가 아니라 고르는 자리다.** 필드는 데이터 필드
 * (4.8.5절)가 만들고, 여기서는 그중 무엇을 수집할지 고른다. 그래서 이 화면에
 * 필드명·유형을 고치는 입력이 없다 — 두 곳에서 고칠 수 있으면 어느 쪽이 원본인지
 * 알 수 없다. 고칠 것이 있으면 필드 저작으로 간다.
 *
 * **명세는 그룹 하나에 붙는다.** 코드명이 그룹 접두 + 순번이라 여러 그룹을
 * 한 명세에 섞으면 같은 순번이 두 번 나온다. 여러 그룹이 필요하면 명세를 나눈다.
 *
 * **분류(기본정보 · 감정평가 · 생체신호)는 그룹이 정한다.** 명세가 따로 들면
 * 그룹과 어긋난 조합이 만들어진다 — 생체신호 그룹을 담은 '기본정보 명세' 같은 것.
 *
 * ⚠️ Figma 디자인이 없다. 구버전 웹의 카드 요약만 참고한 초안이다.
 */
const route = useRoute()
const router = useRouter()

const isNew = computed(() => route.params.id === 'new')
const original = computed(() => (isNew.value ? null : findSpec(route.params.id)))

const CONDITIONS = dimensions.find((d) => d.id === 'condition').keys
const today = () => new Date().toISOString().slice(0, 10)

function draftFrom(spec) {
  return {
    id: spec?.id ?? nextSpecId(),
    name: spec?.name ?? '',
    groupId: spec?.groupId ?? fieldGroups[0]?.id ?? '',
    condition: spec?.condition ?? CONDITIONS[0],
    org: spec?.org ?? SPEC_ORGS[0],
    date: spec?.date ?? today(),
    codes: [...(spec?.codes ?? [])],
  }
}

const draft = ref(draftFrom(original.value))
const snapshot = ref(JSON.stringify(draft.value))
const isDirty = computed(() => JSON.stringify(draft.value) !== snapshot.value)

/* 고를 수 있는 필드는 고른 그룹의 것이다. 원본은 그룹이 들고 있다 */
const group = computed(() => findGroup(draft.value.groupId))
const fieldChoices = computed(() =>
  (group.value?.fields ?? []).map((field, i) => ({ ...field, code: codeOf(group.value, i) })),
)

function toggleField(code) {
  const at = draft.value.codes.indexOf(code)
  if (at >= 0) draft.value.codes.splice(at, 1)
  else draft.value.codes.push(code)
}

/* 그룹을 바꾸면 고른 필드는 다른 그룹의 코드다. 남겨두면 없는 필드를 가리킨다 */
function pickGroup(id) {
  draft.value.groupId = id
  draft.value.codes = []
}

const allPicked = computed(() =>
  fieldChoices.value.length > 0 && fieldChoices.value.every((f) => draft.value.codes.includes(f.code)),
)

function toggleAll() {
  draft.value.codes = allPicked.value ? [] : fieldChoices.value.map((f) => f.code)
}

/* 저장할 수 없는 이유. 비활성 버튼은 왜 못 누르는지 말해야 한다(3.8절) */
const blocked = computed(() => {
  const d = draft.value
  if (!d.name.trim()) return '명세 이름을 입력해 주세요'
  if (!d.groupId) return '데이터 그룹을 골라 주세요'
  if (!d.codes.length) return '필드를 하나 이상 골라 주세요'
  return null
})

const calloutOpen = ref(false)

const goList = () => router.push({ path: '/authoring/spec' })

function commit() {
  saveSpec({ ...draft.value, name: draft.value.name.trim() })
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

const specCategory = computed(() => categoryOf(draft.value))
const existingNames = computed(() => dataSpecs.filter((s) => s.id !== draft.value.id).map((s) => s.name))
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
        {{ isNew ? '새 명세' : draft.name || original?.name }}
      </h1>
      <p class="min-w-0 flex-1 truncate text-label text-text-secondary">
        {{ specCategory }} · 필드 {{ draft.codes.length }}
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
      <!-- 명세 자체 -->
      <section class="flex w-[280px] shrink-0 flex-col gap-2 overflow-y-auto rounded-lg border border-border-default bg-surface-card px-3 py-2">
        <p class="text-label font-medium">명세</p>

        <label class="flex flex-col gap-1">
          <span class="text-count text-text-secondary">명세 이름</span>
          <input
            v-model="draft.name"
            class="h-11 w-full rounded-lg border border-border-default bg-surface-field px-3 text-label text-text-primary"
            placeholder="예: 기본명세"
          />
          <!-- 같은 이름이 여럿인 것은 웹에서도 그렇다(기관마다 하나씩). 막지 않고 알린다 -->
          <span v-if="draft.name.trim() && existingNames.includes(draft.name.trim())" class="text-count text-text-secondary">
            같은 이름의 명세가 이미 있습니다 — 기관으로 구분됩니다
          </span>
        </label>

        <div class="flex flex-col gap-1">
          <span class="text-count text-text-secondary">증상</span>
          <div class="flex h-11 items-center gap-1 rounded-lg bg-surface-field p-1">
            <button
              v-for="condition in CONDITIONS"
              :key="condition"
              class="flex h-9 min-w-0 flex-1 items-center justify-center truncate rounded px-2 text-label font-medium"
              :class="draft.condition === condition
                ? 'bg-surface-card text-text-primary'
                : 'text-text-secondary active:bg-surface-pressed'"
              @click="draft.condition = condition"
            >
              {{ condition }}
            </button>
          </div>
        </div>

        <label class="flex flex-col gap-1">
          <span class="text-count text-text-secondary">기관</span>
          <select
            v-model="draft.org"
            class="h-11 w-full rounded-lg border border-border-default bg-surface-field px-3 text-label text-text-primary"
          >
            <option v-for="org in SPEC_ORGS" :key="org" :value="org">{{ org }}</option>
          </select>
        </label>

        <div class="flex flex-col gap-1">
          <span class="text-count text-text-secondary">데이터 그룹</span>
          <!-- 분류는 그룹이 정한다. 명세가 따로 들면 어긋난 조합이 생긴다 -->
          <button
            v-for="item in fieldGroups"
            :key="item.id"
            class="flex h-11 items-center gap-2 rounded-lg border px-3 text-label font-medium"
            :class="draft.groupId === item.id
              ? 'border-border-selected bg-selected-bg text-text-primary active:bg-selected-bg-pressed'
              : 'border-border-default text-text-secondary active:bg-surface-pressed'"
            @click="pickGroup(item.id)"
          >
            <span class="min-w-0 flex-1 truncate text-left">{{ item.name }}({{ item.id }})</span>
            <span class="shrink-0 text-count">{{ item.category }}</span>
          </button>
        </div>
      </section>

      <!-- 담을 필드. 원본은 필드 저작이 들고 있고 여기서는 고르기만 한다 -->
      <section class="flex min-w-0 flex-1 flex-col rounded-lg border border-border-default bg-surface-card px-3 py-2">
        <div class="flex shrink-0 items-center gap-2">
          <p class="text-label font-medium">
            담을 필드 <span class="text-text-secondary">· {{ draft.codes.length }}/{{ fieldChoices.length }}</span>
          </p>
          <span class="flex-1"></span>
          <button
            class="flex h-11 items-center rounded-lg px-2 text-label text-text-secondary active:bg-surface-pressed"
            @click="toggleAll"
          >
            {{ allPicked ? '전체 해제' : '전체 선택' }}
          </button>
        </div>

        <p class="shrink-0 text-count text-text-secondary">
          필드의 이름 · 유형은 데이터 필드에서 고친다. 여기서는 무엇을 수집할지만 고른다
        </p>

        <div class="mt-2 flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto">
          <button
            v-for="field in fieldChoices"
            :key="field.code"
            class="flex min-h-11 shrink-0 items-center gap-2 rounded-lg border px-3 text-left"
            :class="draft.codes.includes(field.code)
              ? 'border-border-selected bg-selected-bg active:bg-selected-bg-pressed'
              : 'border-border-default active:bg-surface-pressed'"
            @click="toggleField(field.code)"
          >
            <Check
              :size="16"
              class="shrink-0"
              :class="draft.codes.includes(field.code) ? 'text-text-primary' : 'text-transparent'"
            />
            <span class="w-16 shrink-0 text-count text-text-secondary">{{ field.code }}</span>
            <span class="min-w-0 flex-1 truncate text-label">{{ field.name }}</span>
            <span class="shrink-0 text-count text-text-secondary">
              {{ field.unit || field.type }}
            </span>
          </button>

          <p v-if="!fieldChoices.length" class="text-label text-text-secondary">
            이 그룹에 필드가 없습니다
          </p>
        </div>
      </section>
    </div>

    <UnsavedWarningModal
      v-if="pendingAction"
      subject="데이터 명세"
      @discard="discardAndRun"
      @save="saveAndRun"
      @close="pendingAction = null"
    />
  </div>
</template>
