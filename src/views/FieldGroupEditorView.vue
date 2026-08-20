<script setup>
import { ref, computed } from 'vue'
import { useRoute, useRouter, onBeforeRouteLeave } from 'vue-router'
import { ChevronLeft, Plus, Trash2 } from 'lucide-vue-next'
import {
  fieldGroups, findGroup, saveGroup, codeOf, FIELD_TYPES, FIELD_CATEGORIES,
} from '../mocks/dataFields.js'
import InlineCallout from '../components/InlineCallout.vue'
import UnsavedWarningModal from '../components/UnsavedWarningModal.vue'
import DeleteConfirmModal from '../components/DeleteConfirmModal.vue'

/*
 * 데이터 필드 저작 — 저작도구 '데이터 필드'의 편집 화면 (축소 버전).
 *
 * **편집 단위가 필드가 아니라 그룹이다.** 코드명이 그룹 접두 + 순번이라
 * (1.3절) 필드는 자기 그룹 안에서만 뜻이 있다. 구버전 웹은 좌측에서 필드를
 * 고르고 가운데서 한 개씩 고쳤지만, 그러면 **순번이 어디서 온 값인지 보이지
 * 않고** 한 개를 고치는 동안 그룹 전체의 모습이 사라진다.
 *
 * **코드명은 받지 않는다.** 그룹 접두와 자리 순서가 이미 그 값을 정한다 —
 * 손으로 적게 하면 순서를 바꾸는 순간 둘이 갈라진다. 화면은 만들어진 코드를
 * 보여주기만 한다.
 *
 * **구버전 우측의 JSON 패널은 두지 않았다.** 폼과 같은 내용을 두 번 그리는
 * 자리이고, 태블릿에서 JSON을 읽어 고칠 사람이 없다.
 *
 * 저장·경고·사유 콜아웃은 척도 저작과 같은 문법이다(4.8.4절).
 *
 * ⚠️ Figma 디자인이 없다. 구버전 웹의 저작 화면 구성만 참고한 초안이다.
 */
const route = useRoute()
const router = useRouter()

const isNew = computed(() => route.params.group === 'new')
const original = computed(() => (isNew.value ? null : findGroup(route.params.group)))

/* 선택 유형의 선택지는 쉼표로 받는다. 값 하나에 입력란 하나를 두면 표가 세로로 길어진다 */
function draftFrom(group) {
  return {
    id: group?.id ?? '',
    name: group?.name ?? '',
    category: group?.category ?? FIELD_CATEGORIES[0],
    fields: (group?.fields ?? [{ name: '', type: 'text', unit: '', values: [] }]).map((f) => ({
      name: f.name,
      type: f.type,
      unit: f.unit,
      valuesText: (f.values ?? []).join(', '),
    })),
  }
}

const draft = ref(draftFrom(original.value))
const snapshot = ref(JSON.stringify(draft.value))
const isDirty = computed(() => JSON.stringify(draft.value) !== snapshot.value)

/* 저장할 수 없는 이유. 비활성 버튼은 왜 못 누르는지 말해야 한다(3.8절) */
const blocked = computed(() => {
  const d = draft.value
  const id = d.id.trim().toUpperCase()
  if (!id) return '그룹 코드를 입력해 주세요'
  if (!/^[A-Z]{2,4}$/.test(id)) return '그룹 코드는 영문 대문자 2~4자입니다'
  if (isNew.value && fieldGroups.some((g) => g.id === id)) return '이미 있는 그룹 코드입니다'
  if (!d.name.trim()) return '그룹 이름을 입력해 주세요'
  if (!d.fields.some((f) => f.name.trim())) return '필드를 하나 이상 만들어 주세요'
  return null
})

const calloutOpen = ref(false)

const goList = () => router.push({ path: '/authoring/field' })

function commit() {
  saveGroup({
    ...draft.value,
    fields: draft.value.fields.map((f) => ({
      ...f,
      values: f.valuesText.split(',').map((v) => v.trim()),
    })),
  })
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

/*
 * **'나가기(저장 안 함)'는 편집을 되돌리고 나간다.** 되돌리지 않으면
 * `isDirty`가 그대로라 라우터 가드가 다시 막고, 경고만 다시 뜬다 —
 * 버튼이 아무 일도 하지 않는 것처럼 보인다.
 */
function discardAndRun() {
  draft.value = JSON.parse(snapshot.value)
  runPending()
}

function saveAndRun() {
  /* 저장할 수 없는 상태면 저장하지 않고 나간다 — 반쪽짜리 정의를 남기지 않는다 */
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

const addField = () => draft.value.fields.push({ name: '', type: 'text', unit: '', valuesText: '' })

/*
 * **삭제는 확인을 거친다.** 되돌릴 자리가 없는 조작이라 한 번 묻는다(3.6절).
 * 이름이 비어 있는 줄은 잃을 것이 없으므로 바로 지운다.
 * **필드를 지우면 뒤 필드의 코드명이 한 칸씩 당겨진다** — 확인 문구가 그것을 말한다.
 */
const deleting = ref(null)

function askRemove(i) {
  if (!draft.value.fields[i].name.trim()) {
    draft.value.fields.splice(i, 1)
    return
  }
  deleting.value = { index: i, label: `${previewCode(i)} · ${draft.value.fields[i].name}` }
}

function confirmRemove() {
  draft.value.fields.splice(deleting.value.index, 1)
  deleting.value = null
}

/*
 * 코드명 미리보기. 저장한 뒤 그리는 값과 같은 함수를 쓴다.
 * 그룹 코드를 아직 안 적었으면 **순번만** 보인다 — 자리를 물음표로 채우면
 * 값이 잘못된 것처럼 읽힌다.
 */
const previewCode = (i) => codeOf({ id: draft.value.id.trim().toUpperCase() }, i)
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
        {{ isNew ? '새 그룹' : draft.name || original?.name }}
      </h1>
      <p class="min-w-0 flex-1 truncate text-label text-text-secondary">
        그룹 안에서 필드의 자리가 코드명을 정한다
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
      <!-- 그룹. 코드는 만들 때만 정한다 — 이미 붙은 코드명이 전부 여기서 나온다 -->
      <section class="flex w-[260px] shrink-0 flex-col gap-2 rounded-lg border border-border-default bg-surface-card px-3 py-2">
        <p class="text-label font-medium">그룹</p>

        <label class="flex flex-col gap-1">
          <span class="text-count text-text-secondary">그룹 코드</span>
          <input
            v-if="isNew"
            v-model="draft.id"
            class="h-11 w-full rounded-lg border border-border-default bg-surface-field px-3 text-label text-text-primary uppercase"
            placeholder="예: DS"
          />
          <span v-else class="flex h-11 items-center rounded-lg bg-surface-recessed px-3 text-label text-text-secondary">
            {{ draft.id }}
          </span>
        </label>

        <label class="flex flex-col gap-1">
          <span class="text-count text-text-secondary">그룹 이름</span>
          <input
            v-model="draft.name"
            class="h-11 w-full rounded-lg border border-border-default bg-surface-field px-3 text-label text-text-primary"
            placeholder="예: 기본정보"
          />
        </label>

        <div class="flex flex-col gap-1">
          <span class="text-count text-text-secondary">분류</span>
          <!-- 데이터 명세가 이 셋으로 탭을 나눈다 -->
          <div class="flex flex-col gap-1">
            <button
              v-for="category in FIELD_CATEGORIES"
              :key="category"
              class="flex h-11 items-center rounded-lg border px-3 text-label font-medium"
              :class="draft.category === category
                ? 'border-border-selected bg-selected-bg text-text-primary active:bg-selected-bg-pressed'
                : 'border-border-default text-text-secondary active:bg-surface-pressed'"
              @click="draft.category = category"
            >
              {{ category }}
            </button>
          </div>
        </div>
      </section>

      <!-- 필드. 코드명은 자리에서 나오므로 읽기 전용이다 -->
      <section class="flex min-w-0 flex-1 flex-col rounded-lg border border-border-default bg-surface-card px-3 py-2">
        <div class="flex shrink-0 items-center gap-2">
          <p class="text-label font-medium">
            필드 <span class="text-text-secondary">· {{ draft.fields.length }}</span>
          </p>
          <span class="flex-1"></span>
          <span class="text-count text-text-secondary">코드명은 그룹 코드 + 순번</span>
        </div>

        <div class="mt-2 flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto">
          <div v-for="(field, i) in draft.fields" :key="i" class="flex flex-col gap-1">
            <div class="flex items-center gap-2">
              <span class="w-16 shrink-0 text-count text-text-secondary">{{ previewCode(i) }}</span>
              <input
                v-model="field.name"
                class="h-11 min-w-0 flex-1 rounded-lg border border-border-default bg-surface-field px-3 text-label text-text-primary"
                placeholder="필드명"
              />
              <select
                v-model="field.type"
                class="h-11 w-24 shrink-0 rounded-lg border border-border-default bg-surface-field px-2 text-label text-text-primary"
              >
                <option v-for="type in FIELD_TYPES" :key="type.value" :value="type.value">
                  {{ type.label }}
                </option>
              </select>
              <input
                v-model="field.unit"
                class="h-11 w-20 shrink-0 rounded-lg border border-border-default bg-surface-field px-2 text-center text-label text-text-primary"
                placeholder="단위"
              />
              <!-- 파괴적 조작이라 경고색이다 -->
              <button
                class="flex size-11 shrink-0 items-center justify-center rounded-lg text-danger-fg active:bg-danger-bg"
                @click="askRemove(i)"
              >
                <Trash2 :size="16" />
              </button>
            </div>

            <!-- 선택 유형일 때만. 고를 것이 없는 선택 필드는 빈 칸이 된다 -->
            <div v-if="field.type === 'select'" class="flex items-center gap-2 pl-[72px] pr-[52px]">
              <input
                v-model="field.valuesText"
                class="h-11 min-w-0 flex-1 rounded-lg border border-border-default bg-surface-field px-3 text-label text-text-primary"
                placeholder="선택지 (쉼표로 구분)"
              />
            </div>
          </div>
        </div>

        <button
          class="mt-1 flex h-11 shrink-0 items-center justify-center gap-1 rounded-lg border border-border-default text-label text-text-secondary active:bg-surface-pressed"
          @click="addField"
        >
          <Plus :size="16" />
          필드 추가
        </button>
      </section>
    </div>

    <DeleteConfirmModal
      v-if="deleting"
      heading="필드를 삭제할까요?"
      :detail="deleting.label"
      warning="뒤 필드의 코드명이 한 칸씩 당겨지고, 저장하면 되돌릴 수 없습니다."
      @confirm="confirmRemove"
      @close="deleting = null"
    />

    <UnsavedWarningModal
      v-if="pendingAction"
      subject="데이터 필드 정의"
      @discard="discardAndRun"
      @save="saveAndRun"
      @close="pendingAction = null"
    />
  </div>
</template>
