<script setup>
import { ref, computed } from 'vue'
import { useRoute, useRouter, onBeforeRouteLeave } from 'vue-router'
import { ChevronLeft, ChevronUp, ChevronDown, Plus, Trash2, Check } from 'lucide-vue-next'
import {
  activities, findActivity, saveActivity, nextActivityId,
  ACTIVITY_KINDS, allKinds, PHASE_TYPES, DIFFICULTIES, BLOCK_KINDS, blockFilled,
} from '../mocks/activities.js'
import { books, findBook, sentencesOf } from '../mocks/books.js'
import { dimensions } from '../mocks/analysis.js'
import { josa } from '../text.js'
import InlineCallout from '../components/InlineCallout.vue'
import DeleteConfirmModal from '../components/DeleteConfirmModal.vue'
import UnsavedWarningModal from '../components/UnsavedWarningModal.vue'

/*
 * 세션 활동 저작 — 저작도구 '세션 활동'의 편집 화면 (축소 버전). 편집 화면 6호.
 *
 * 구버전 웹의 두 판(좌 메타데이터 / 우 블록 구성)을 그대로 가져왔다. **좌우로
 * 나눈 것은 웹의 사정이 아니라 이 일의 사정이다** — 블록 문구를 쓰는 동안
 * 대상과 소요시간이 화면에서 사라지면 안 된다(프로그램 처방의 탭 결정과 같다).
 *
 * **축소 기준은 앞의 다섯 화면과 같다 — 앱이 실제로 읽는 필드만 받는다.**
 * 웹이 받는 것 중 다음은 뺐다.
 *   · 인문 활동 종류 — **블록마다 이미 고른다.** 위에서 또 고르면 두 곳이 갈라지고,
 *     블록이 여럿인 활동에서는 위의 값이 어느 블록을 가리키는지도 알 수 없다
 *   · 치유 구성요소 · 주제어 · 증상의 강도 · 치유대상 연령대 — 읽는 화면이 없다.
 *     받아도 입력한 사람이 반영됐는지 확인할 방법이 없다(4.8.4절의 축소 기준)
 * 치유대상 감정만 남긴 것은 **세션 상세가 그 값을 보여주기 때문이다**(4.6.3절).
 *
 * **인문 문장 블록은 적는 자리가 아니라 고르는 자리다.** 인용하는 원문의 원본은
 * 도서 콘텐츠이고(4.8.10절) 블록은 도서와 문장 번호로 가리키기만 한다 —
 * 데이터 명세가 필드를 만들지 않고 고르는 것과 같다(4.8.7절).
 *
 * 머리의 `초기화` · `미리보기`도 두지 않았다. 초기화는 미저장 되돌리기인데 이
 * 앱은 그것을 이탈 경고로 처리하고(3.6절), 미리보기는 아직 볼 화면이 없다.
 *
 * ⚠️ Figma 디자인이 없다. 구버전 웹 화면의 구성만 옮긴 초안이다.
 */
const route = useRoute()
const router = useRouter()

const isNew = computed(() => route.params.id === 'new')
const original = computed(() => (isNew.value ? null : findActivity(route.params.id)))

const CONDITIONS = dimensions.find((d) => d.id === 'condition').keys

function draftFrom(activity) {
  return {
    id: activity?.id ?? nextActivityId(),
    name: activity?.name ?? '',
    summary: activity?.summary ?? '',
    condition: activity?.condition ?? CONDITIONS[0],
    emotions: activity?.emotions ?? '',
    minutes: activity?.minutes ?? 60,
    difficulty: activity?.difficulty ?? DIFFICULTIES[0],
    recommended: activity?.recommended ?? 1,
    capacity: activity?.capacity ?? 1,
    supplies: (activity?.supplies ?? []).join(', '),
    goal: activity?.goal ?? '',
    note: activity?.note ?? '',
    done: activity?.done ?? false,
    phases: (activity?.phases ?? []).map((phase) => ({
      type: phase.type,
      title: phase.title,
      blocks: phase.blocks.map((block) => ({ ...block })),
    })),
  }
}

const draft = ref(draftFrom(original.value))
const snapshot = ref(JSON.stringify(draft.value))
const isDirty = computed(() => JSON.stringify(draft.value) !== snapshot.value)

const blockCount = computed(() =>
  draft.value.phases.reduce((n, phase) => n + phase.blocks.length, 0),
)

/* 새 블록은 첫 종류로 시작한다. 고르지 않은 채로 두면 무엇을 하는 자리인지 비어 있다 */
const newBlock = () => ({
  kind: BLOCK_KINDS[0],
  activity: allKinds()[0],
  text: '',
  bookId: null,
  sentence: null,
})

/* 가리킬 수 있는 문장. 고른 도서의 문단을 끊어 낸 것이고 원본은 도서 콘텐츠다 */
const sentencesFor = (bookId) => sentencesOf(findBook(bookId))

/* 도서를 바꾸면 문장 번호는 다른 문단의 것이다. 남겨두면 엉뚱한 문장을 가리킨다 */
function pickBook(block, id) {
  block.bookId = id || null
  block.sentence = null
}

function addPhase() {
  draft.value.phases.push({ type: PHASE_TYPES[0], title: '', blocks: [newBlock()] })
}

const addBlock = (phase) => phase.blocks.push(newBlock())

function movePhase(i, step) {
  const to = i + step
  if (to < 0 || to >= draft.value.phases.length) return
  const [phase] = draft.value.phases.splice(i, 1)
  draft.value.phases.splice(to, 0, phase)
}

/*
 * **삭제는 확인을 거친다**(3.6절). 내용이 없는 블록·단계는 잃을 것이 없으므로
 * 바로 지운다 — 빈 줄만 확인 없이 지우는 것이 앱 전체의 규칙이다.
 */
const deleting = ref(null)

function askRemoveBlock(pi, bi) {
  const block = draft.value.phases[pi].blocks[bi]
  if (!blockFilled(block)) {
    draft.value.phases[pi].blocks.splice(bi, 1)
    return
  }
  deleting.value = {
    what: '블록',
    label: `${bi + 1} 블록 · ${block.activity}`,
    warning: '치유사가 읽을 문구가 하나 사라지고, 저장하면 되돌릴 수 없습니다.',
    run: () => draft.value.phases[pi].blocks.splice(bi, 1),
  }
}

function askRemovePhase(pi) {
  const phase = draft.value.phases[pi]
  if (!phase.blocks.some(blockFilled)) {
    draft.value.phases.splice(pi, 1)
    return
  }
  deleting.value = {
    what: '치유단계',
    label: `${phase.title || phase.type} · 블록 ${phase.blocks.length}`,
    warning: '이 단계의 블록이 모두 함께 사라지고, 저장하면 되돌릴 수 없습니다.',
    run: () => draft.value.phases.splice(pi, 1),
  }
}

function confirmRemove() {
  deleting.value.run()
  deleting.value = null
}

/* 저장할 수 없는 이유. 비활성 버튼은 왜 못 누르는지 말해야 한다(3.8절) */
const blocked = computed(() => {
  const d = draft.value
  if (!d.name.trim()) return '세션 활동 이름을 입력해 주세요'
  if (isNew.value && activities.some((a) => a.name === d.name.trim())) {
    return '이미 있는 세션 활동 이름입니다'
  }
  if (!d.summary.trim()) return '설명을 입력해 주세요'
  if (!Number(d.minutes)) return '소요시간을 입력해 주세요'
  if (!d.phases.length) return '치유단계를 하나 이상 만들어 주세요'
  if (!d.phases.some((phase) => phase.blocks.some(blockFilled))) {
    return '블록의 본문을 채우거나 인용할 문장을 골라 주세요'
  }
  return null
})

const calloutOpen = ref(false)

const goList = () => router.push({ path: '/authoring/activity' })

function commit() {
  saveActivity(draft.value)
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
        {{ isNew ? '새 세션 활동' : draft.name || original?.name }}
      </h1>
      <p class="min-w-0 flex-1 truncate text-label text-text-secondary">
        {{ draft.phases.length }}단계 · {{ blockCount }}블록 · {{ draft.minutes || 0 }}분
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
      <!-- 좌: 활동 자체 -->
      <section class="flex w-[300px] shrink-0 flex-col gap-2 overflow-y-auto rounded-lg border border-border-default bg-surface-card px-3 py-2">
        <p class="shrink-0 text-label font-medium">세션 활동</p>

        <label class="flex shrink-0 flex-col gap-1">
          <span class="text-count text-text-secondary">이름</span>
          <input
            v-model="draft.name"
            class="h-11 w-full rounded-lg border border-border-default bg-surface-field px-3 text-label text-text-primary"
            placeholder="예: 내 머릿속 기억의 구조"
          />
        </label>

        <label class="flex shrink-0 flex-col gap-1">
          <span class="text-count text-text-secondary">설명</span>
          <textarea
            v-model="draft.summary"
            rows="2"
            class="w-full rounded-lg border border-border-default bg-surface-field px-3 py-2 text-label text-text-primary"
            placeholder="예: 기억을 도식화"
          />
        </label>

        <div class="flex shrink-0 flex-col gap-1">
          <span class="text-count text-text-secondary">증상군</span>
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

        <label class="flex shrink-0 flex-col gap-1">
          <span class="text-count text-text-secondary">치유대상 감정 (쉼표로 구분)</span>
          <input
            v-model="draft.emotions"
            class="h-11 w-full rounded-lg border border-border-default bg-surface-field px-3 text-label text-text-primary"
            placeholder="예: 불안, 혼란"
          />
        </label>

        <div class="flex shrink-0 gap-2">
          <label class="flex min-w-0 flex-1 flex-col gap-1">
            <span class="text-count text-text-secondary">소요시간(분)</span>
            <input
              v-model="draft.minutes"
              type="number"
              inputmode="numeric"
              class="h-11 w-full rounded-lg border border-border-default bg-surface-field px-3 text-label text-text-primary"
            />
          </label>
          <label class="flex min-w-0 flex-1 flex-col gap-1">
            <span class="text-count text-text-secondary">난이도</span>
            <select
              v-model="draft.difficulty"
              class="h-11 w-full rounded-lg border border-border-default bg-surface-field px-3 text-label text-text-primary"
            >
              <option v-for="level in DIFFICULTIES" :key="level" :value="level">{{ level }}</option>
            </select>
          </label>
        </div>

        <div class="flex shrink-0 gap-2">
          <label class="flex min-w-0 flex-1 flex-col gap-1">
            <span class="text-count text-text-secondary">권장 인원</span>
            <input
              v-model="draft.recommended"
              type="number"
              inputmode="numeric"
              class="h-11 w-full rounded-lg border border-border-default bg-surface-field px-3 text-label text-text-primary"
            />
          </label>
          <label class="flex min-w-0 flex-1 flex-col gap-1">
            <span class="text-count text-text-secondary">최대 인원</span>
            <input
              v-model="draft.capacity"
              type="number"
              inputmode="numeric"
              class="h-11 w-full rounded-lg border border-border-default bg-surface-field px-3 text-label text-text-primary"
            />
          </label>
        </div>

        <!-- 프로그램의 준비물과 같은 자를 쓴다. 붙이면 세션 상세에 그대로 오른다 -->
        <label class="flex shrink-0 flex-col gap-1">
          <span class="text-count text-text-secondary">필요 도구 (쉼표로 구분)</span>
          <input
            v-model="draft.supplies"
            class="h-11 w-full rounded-lg border border-border-default bg-surface-field px-3 text-label text-text-primary"
            placeholder="예: 연필, 도화지, 포스트잇"
          />
        </label>

        <label class="flex shrink-0 flex-col gap-1">
          <span class="text-count text-text-secondary">활동 목표</span>
          <textarea
            v-model="draft.goal"
            rows="2"
            class="w-full rounded-lg border border-border-default bg-surface-field px-3 py-2 text-label text-text-primary"
          />
        </label>

        <label class="flex shrink-0 flex-col gap-1">
          <span class="text-count text-text-secondary">메모</span>
          <textarea
            v-model="draft.note"
            rows="2"
            class="w-full rounded-lg border border-border-default bg-surface-field px-3 py-2 text-label text-text-primary"
            placeholder="치유사 참고 메모 (선택)"
          />
        </label>

        <!-- 배치할 수 있는 상태인가. 앱이 읽을 값이라 남겼다 -->
        <button
          class="flex h-11 shrink-0 items-center justify-between rounded-lg border px-3 text-label font-medium"
          :class="draft.done
            ? 'border-border-selected bg-selected-bg text-text-primary active:bg-selected-bg-pressed'
            : 'border-border-default text-text-secondary active:bg-surface-pressed'"
          @click="draft.done = !draft.done"
        >
          <span>작성 완료 · 세션에 배치 가능</span>
          <Check v-if="draft.done" :size="16" />
        </button>
      </section>

      <!-- 우: 블록 구성 -->
      <section class="flex min-w-0 flex-1 flex-col rounded-lg border border-border-default bg-surface-card px-3 py-2">
        <div class="flex shrink-0 items-center gap-2">
          <p class="text-label font-medium">
            블록 구성 <span class="text-text-secondary">· {{ draft.phases.length }}단계</span>
          </p>
          <span class="flex-1"></span>
          <span class="text-count text-text-secondary">위에서 아래 순서로 진행된다</span>
        </div>

        <div class="mt-2 flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto">
          <!-- 치유단계 하나 -->
          <div
            v-for="(phase, pi) in draft.phases"
            :key="pi"
            class="flex shrink-0 flex-col gap-2 rounded-lg border border-border-default bg-surface-recessed px-3 py-2"
          >
            <div class="flex items-center gap-2">
              <select
                v-model="phase.type"
                class="h-11 w-24 shrink-0 rounded-lg border border-border-default bg-surface-field px-2 text-label text-text-primary"
              >
                <option v-for="type in PHASE_TYPES" :key="type" :value="type">{{ type }}</option>
              </select>
              <input
                v-model="phase.title"
                class="h-11 min-w-0 flex-1 rounded-lg border border-border-default bg-surface-field px-3 text-label text-text-primary"
                :placeholder="phase.type"
              />
              <button
                v-for="move in [-1, 1]"
                :key="move"
                class="flex size-11 shrink-0 items-center justify-center rounded-lg"
                :class="(move < 0 ? pi > 0 : pi < draft.phases.length - 1)
                  ? 'text-text-secondary active:bg-surface-pressed'
                  : 'text-text-disabled'"
                @click="movePhase(pi, move)"
              >
                <component :is="move < 0 ? ChevronUp : ChevronDown" :size="16" />
              </button>
              <!-- 파괴적 조작이라 경고색이다 -->
              <button
                class="flex size-11 shrink-0 items-center justify-center rounded-lg text-danger-fg active:bg-danger-bg"
                @click="askRemovePhase(pi)"
              >
                <Trash2 :size="16" />
              </button>
            </div>

            <!-- 블록 하나 -->
            <div
              v-for="(block, bi) in phase.blocks"
              :key="bi"
              class="flex flex-col gap-2 rounded-lg border border-border-default bg-surface-card px-3 py-2"
            >
              <div class="flex items-center gap-2">
                <span class="text-label font-medium">{{ bi + 1 }} 블록</span>
                <span class="flex-1"></span>
                <!-- 안내문인가 인용 원문인가. 세그먼트 토글과 같은 문법 -->
                <div class="flex h-11 items-center gap-1 rounded-lg bg-surface-field p-1">
                  <button
                    v-for="kind in BLOCK_KINDS"
                    :key="kind"
                    class="flex h-9 items-center rounded px-2 text-label font-medium"
                    :class="block.kind === kind
                      ? 'bg-surface-card text-text-primary'
                      : 'text-text-secondary active:bg-surface-pressed'"
                    @click="block.kind = kind"
                  >
                    {{ kind }}
                  </button>
                </div>
                <button
                  class="flex size-11 shrink-0 items-center justify-center rounded-lg text-danger-fg active:bg-danger-bg"
                  @click="askRemoveBlock(pi, bi)"
                >
                  <Trash2 :size="16" />
                </button>
              </div>

              <!-- 활동 종류. 블록마다 하나다 -->
              <div class="flex flex-col gap-1 rounded-lg border border-border-default bg-surface-recessed px-3 py-2">
                <div v-for="group in ACTIVITY_KINDS" :key="group.group" class="flex flex-col gap-1">
                  <span class="text-count text-text-secondary">{{ group.group }}</span>
                  <div class="flex flex-wrap gap-1">
                    <button
                      v-for="value in group.values"
                      :key="value"
                      class="flex h-11 items-center rounded-lg border px-3 text-label"
                      :class="block.activity === value
                        ? 'border-border-selected bg-selected-bg text-text-primary active:bg-selected-bg-pressed'
                        : 'border-border-default text-text-secondary active:bg-surface-pressed'"
                      @click="block.activity = value"
                    >
                      {{ value }}
                    </button>
                  </div>
                </div>
              </div>

              <!-- 안내문은 적는다 -->
              <label v-if="block.kind !== '인문 문장'" class="flex flex-col gap-1">
                <span class="text-count text-text-secondary">안내문 본문</span>
                <textarea
                  v-model="block.text"
                  rows="2"
                  class="w-full rounded-lg border border-border-default bg-surface-field px-3 py-2 text-label text-text-primary"
                  placeholder="안내문을 입력하세요"
                />
              </label>

              <!-- 인문 문장은 도서 콘텐츠에서 고른다. 여기서 적지 않는다 -->
              <div v-else class="flex flex-col gap-1">
                <span class="text-count text-text-secondary">인용할 문장</span>
                <select
                  :value="block.bookId"
                  class="h-11 w-full rounded-lg border border-border-default bg-surface-field px-3 text-label"
                  :class="block.bookId ? 'text-text-primary' : 'text-text-secondary'"
                  @change="pickBook(block, $event.target.value)"
                >
                  <option value="">도서를 고르세요</option>
                  <option v-for="item in books" :key="item.id" :value="item.id">
                    {{ item.title }} · {{ item.author }} · {{ item.pages }}쪽
                  </option>
                </select>

                <div
                  v-if="block.bookId"
                  class="flex max-h-40 flex-col overflow-y-auto rounded-lg border border-border-default"
                >
                  <button
                    v-for="(line, si) in sentencesFor(block.bookId)"
                    :key="si"
                    class="flex items-center gap-2 px-3 py-2 text-left"
                    :class="[
                      si > 0 && 'border-t border-border-subtle',
                      block.sentence === si
                        ? 'bg-selected-bg active:bg-selected-bg-pressed'
                        : 'active:bg-surface-pressed',
                    ]"
                    @click="block.sentence = si"
                  >
                    <Check
                      :size="12"
                      class="shrink-0"
                      :class="block.sentence === si ? 'text-text-primary' : 'text-transparent'"
                    />
                    <span class="min-w-0 flex-1 text-label">{{ line }}</span>
                  </button>
                </div>

                <!-- 고르지 않았으면 무엇이 비었는지 말한다. 조용히 비워 두지 않는다 -->
                <span v-if="!block.bookId || block.sentence === null" class="text-count text-text-secondary">
                  {{ block.bookId ? '문장을 고르면 이 블록이 채워집니다' : '도서 콘텐츠에 등록된 문단에서 고릅니다' }}
                </span>
              </div>
            </div>

            <button
              class="flex h-11 shrink-0 items-center justify-center gap-1 rounded-lg border border-dashed border-border-default text-label text-text-secondary active:bg-surface-pressed"
              @click="addBlock(phase)"
            >
              <Plus :size="16" />
              이 단계에 블록 추가
            </button>
          </div>

          <button
            class="flex h-11 shrink-0 items-center justify-center gap-1 rounded-lg border border-dashed border-border-default text-label text-text-secondary active:bg-surface-pressed"
            @click="addPhase"
          >
            <Plus :size="16" />
            치유단계 추가
          </button>
        </div>
      </section>
    </div>

    <DeleteConfirmModal
      v-if="deleting"
      :heading="`${josa(deleting.what, '을', '를')} 삭제할까요?`"
      :detail="deleting.label"
      :warning="deleting.warning"
      @confirm="confirmRemove"
      @close="deleting = null"
    />

    <UnsavedWarningModal
      v-if="pendingAction"
      subject="세션 활동"
      @discard="discardAndRun"
      @save="saveAndRun"
      @close="pendingAction = null"
    />
  </div>
</template>
