<script setup>
import { ref, reactive, computed, watch, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Search } from 'lucide-vue-next'
import { GENERAL, PROCESS } from '../mocks/home.js'
import { recentPatients, allPatients } from '../mocks/patients.js'
import { dayLabel, shortDayLabel } from '../mocks/schedule.js'
import { openHoursOn, duplicateOn, addEvent } from '../scheduleState.js'

/*
 * 배치 확인 · 일정 추가 · 할 일 추가가 쓰는 공용 모달.
 * 대상 선택 · 환자 검색 · 중복 경고 · nextStep 검증까지 전부 여기 있다.
 * 화면마다 다시 구현하면 규칙이 한쪽에만 남아 우회 경로가 생긴다.
 * Figma 화면이 없는 초안이다.
 */
const props = defineProps({
  /* 'drop' | 'add-event' | 'add-task' */
  mode: { type: String, required: true },
  /* 날짜가 정해져 있으면 넘긴다. null이면 모달에서 고른다 */
  dateKey: { type: String, default: null },
  /* dateKey가 없을 때 고를 수 있는 날짜들 */
  dateOptions: { type: Array, default: () => [] },
  /* mode='drop'일 때 { item, itemKind, hour } */
  drop: { type: Object, default: null },
})

const emit = defineEmits(['close', 'placed', 'added-task'])

/* 신규 환자 등록은 이 모달의 일이 아니다. 기존 환자 중에서만 고른다 */
const patientOptions = [...recentPatients, ...allPatients].filter(
  (p, i, arr) => arr.findIndex((q) => q.name === p.name) === i,
)

const form = reactive({ subjectKind: 'patient', patient: null, query: '', title: '', category: '', date: null, hour: null })

/* 날짜가 넘어왔으면 그것을, 아니면 모달에서 고른 날짜를 쓴다 */
const activeDate = computed(() => props.dateKey ?? form.date)
const needsDate = computed(() => !props.dateKey && props.mode !== 'add-task')
const duplicate = ref(null)
const visitType = ref(PROCESS)

const openHours = computed(() => (activeDate.value ? openHoursOn(activeDate.value) : []))

/* 캘린더는 날짜 칸에 놓으므로 시간이 정해지지 않은 채로 온다 */
const needsHour = computed(() => props.mode === 'add-event' || (props.mode === 'drop' && !props.drop?.hour))

const patientResults = computed(() => {
  const q = form.query.trim()
  if (!q) return recentPatients
  return patientOptions.filter((p) => p.name.includes(q) || p.condition.includes(q))
})

/* 드롭이든 추가든 환자면 같은 규칙을 탄다 */
const activePatient = computed(() => {
  if (props.mode === 'drop') return props.drop?.itemKind === 'patient' ? props.drop.item : null
  if (props.mode === 'add-event') return form.subjectKind === 'patient' ? form.patient : null
  return null
})

const nextStep = computed(() => activePatient.value?.nextStep ?? null)
const patientRuleOk = computed(() => visitType.value === GENERAL || Boolean(nextStep.value))

const canConfirm = computed(() => {
  if (props.mode === 'add-task') return form.title.trim().length > 0
  if (needsDate.value && !form.date) return false
  if (needsHour.value && !form.hour) return false
  if (props.mode === 'add-event') {
    return form.subjectKind === 'patient'
      ? Boolean(form.patient) && patientRuleOk.value
      : form.title.trim().length > 0
  }
  return activePatient.value ? patientRuleOk.value : true
})

const title = computed(() =>
  props.mode === 'add-task' ? '할 일 추가' : props.mode === 'add-event' ? '일정 추가' : '이 시간에 배치할까요?',
)

function pickPatient(patient) {
  form.patient = patient
  visitType.value = patient.nextStep ? PROCESS : GENERAL
}

function subjectName() {
  if (props.mode === 'drop') {
    return props.drop.itemKind === 'patient' ? props.drop.item.name : props.drop.item.title
  }
  return activePatient.value ? activePatient.value.name : form.title.trim()
}

function buildEvent(hour) {
  const patient = activePatient.value
  if (props.mode === 'drop' && props.drop.itemKind === 'task') {
    const task = props.drop.item
    return { hour, title: task.title, meta: task.category, bar: false, badge: null }
  }
  if (patient) {
    return {
      hour,
      title: patient.name,
      meta: `${patient.condition} · ${visitType.value === PROCESS ? nextStep.value : GENERAL}`,
      bar: true,
      badge: null,
    }
  }
  return { hour, title: form.title.trim(), meta: form.category.trim() || null, bar: false, badge: null }
}

function confirm() {
  if (props.mode === 'add-task') {
    emit('added-task', {
      id: `task-${Date.now()}`,
      title: form.title.trim(),
      category: form.category.trim() || null,
      due: null,
      overdue: false,
    })
    dismiss()
    return
  }

  const hour = props.mode === 'drop' ? (props.drop.hour ?? form.hour) : form.hour
  if (!duplicate.value) {
    const found = duplicateOn(activeDate.value, subjectName())
    if (found) {
      duplicate.value = found
      return
    }
  }
  addEvent(activeDate.value, buildEvent(hour))
  emit('placed', { dateKey: activeDate.value, hour })
  dismiss()
}

/*
 * PWA standalone에는 뒤로가기 버튼이 없지만 Android 제스처 뒤로가기는 살아 있다.
 * 모달이 history에 없으면 그 제스처가 앱 이탈로 이어지므로 엔트리를 남긴다.
 *
 * 단, history.pushState로 직접 만들면 안 된다. vue-router는 자기 history 스택을
 * 따로 관리하는데, 라우터가 모르는 엔트리가 끼면 history.back()의 popstate를
 * 라우터가 'route 이동'으로 해석해 다른 화면으로 튕긴다.
 * 그래서 엔트리 생성·소멸을 전부 라우터에게 맡긴다.
 */
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
  router.push({ query: { ...route.query, modal: props.mode } })
  /*
   * 드롭은 날짜만 정해서 왔으므로 시간을 기본값으로 채우지 않는다.
   * 채우면 사용자가 고르지 않은 시간에 그대로 확정될 수 있다.
   * '일정 추가'는 처음부터 시간을 고르는 흐름이라 첫 후보를 채운다.
   */
  form.hour = props.mode === 'drop' ? null : (openHours.value[0] ?? null)
  if (props.mode === 'drop') {
    visitType.value = props.drop?.item?.nextStep ? PROCESS : GENERAL
  }
})

watch(() => form.subjectKind, () => { duplicate.value = null })

/* 날짜가 바뀌면 그 날의 빈 시간이 달라지므로 시간 선택을 비운다 */
watch(() => form.date, () => {
  form.hour = null
  duplicate.value = null
})
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
          <!-- 중복 경고. 확인을 거치면 원래 흐름으로 돌아간다 -->
          <template v-if="duplicate">
            <h2 class="text-title-sm font-semibold">이미 배치된 대상입니다</h2>
            <p class="mt-2 text-body text-text-secondary">
              {{ dayLabel(activeDate) }} {{ duplicate.hour }}에
              <span class="text-text-primary">{{ duplicate.title }}</span> 일정이 이미 있습니다.
              그래도 배치할까요?
            </p>
          </template>

          <template v-else>
            <h2 class="text-title-sm font-semibold">{{ title }}</h2>

            <p v-if="mode === 'drop'" class="mt-2 text-body text-text-secondary">
              {{ dayLabel(activeDate) }}<template v-if="drop.hour"> {{ drop.hour }}</template> ·
              <template v-if="drop.itemKind === 'patient'">
                {{ drop.item.name }} ({{ drop.item.condition }})
              </template>
              <template v-else>{{ drop.item.title }}</template>
            </p>

            <!--
              일정 추가는 대상 종류를 먼저 정한다. 환자면 목록에서 고르게 해서
              제목 자유 입력으로 프로세스 규칙을 우회하지 못하게 한다.
            -->
            <template v-if="mode === 'add-event'">
              <p class="mt-4 text-label font-medium text-text-secondary">대상</p>
              <div class="mt-2 flex gap-2">
                <button
                  v-for="opt in [{ k: 'patient', label: '환자' }, { k: 'work', label: '업무' }]"
                  :key="opt.k"
                  class="flex h-11 items-center"
                  @click="form.subjectKind = opt.k"
                >
                  <span
                    class="flex h-9 items-center rounded-lg border px-3 text-label"
                    :class="form.subjectKind === opt.k
                      ? 'border-border-selected bg-selected-bg text-text-primary'
                      : 'border-border-default text-text-secondary'"
                  >
                    {{ opt.label }}
                  </span>
                </button>
              </div>

              <template v-if="form.subjectKind === 'patient'">
                <p class="mt-4 text-label font-medium text-text-secondary">환자</p>
                <div class="mt-2 flex h-11 items-center gap-4 rounded-lg border border-border-default bg-surface-field px-3">
                  <Search :size="20" class="shrink-0 text-text-disabled" />
                  <input
                    v-model="form.query"
                    type="text"
                    placeholder="환자 검색"
                    class="min-w-0 flex-1 bg-transparent text-body text-text-primary placeholder:text-text-disabled"
                  />
                </div>
                <!-- 리스트는 컨테이너 하나로 묶고 행은 구분선으로만 나눈다 -->
                <p class="mt-2 text-count text-text-secondary">
                  {{ form.query.trim() ? '검색 결과' : '최근' }}
                </p>
                <div class="mt-1 max-h-36 overflow-y-auto rounded-lg border border-border-default">
                  <button
                    v-for="(p, i) in patientResults"
                    :key="p.id"
                    class="flex h-12 w-full items-center justify-between gap-2 px-3 text-left"
                    :class="[
                      i > 0 ? 'border-t border-border-subtle' : '',
                      form.patient?.name === p.name ? 'bg-selected-bg' : '',
                    ]"
                    @click="pickPatient(p)"
                  >
                    <span class="truncate text-body">{{ p.name }}</span>
                    <span class="shrink-0 text-caption text-text-secondary">{{ p.condition }}</span>
                  </button>
                  <p v-if="!patientResults.length" class="px-3 py-3 text-label text-text-secondary">
                    검색 결과가 없습니다
                  </p>
                </div>
              </template>
            </template>

            <!-- 업무 일정 · 할 일은 제목을 직접 쓴다 -->
            <template v-if="mode === 'add-task' || (mode === 'add-event' && form.subjectKind === 'work')">
              <p class="mt-4 text-label font-medium text-text-secondary">제목</p>
              <input
                v-model="form.title"
                type="text"
                :placeholder="mode === 'add-task' ? '할 일 이름' : '일정 이름'"
                class="mt-2 h-11 w-full rounded-lg border border-border-default bg-surface-field px-3 text-body text-text-primary placeholder:text-text-disabled"
              />
              <p class="mt-4 text-label font-medium text-text-secondary">분류 (선택)</p>
              <input
                v-model="form.category"
                type="text"
                placeholder="협업 · 보고 · 저작도구 등"
                class="mt-2 h-11 w-full rounded-lg border border-border-default bg-surface-field px-3 text-body text-text-primary placeholder:text-text-disabled"
              />
            </template>

            <!-- 환자 일정은 드롭이든 추가든 같은 규칙을 탄다 -->
            <template v-if="activePatient">
              <p class="mt-4 text-label font-medium text-text-secondary">유형</p>
              <div class="mt-2 flex flex-wrap gap-2">
                <button
                  v-for="type in [PROCESS, GENERAL]"
                  :key="type"
                  class="flex h-11 items-center"
                  @click="visitType = type"
                >
                  <span
                    class="flex h-9 items-center rounded-lg border px-3 text-label"
                    :class="visitType === type
                      ? 'border-border-selected bg-selected-bg text-text-primary'
                      : 'border-border-default text-text-secondary'"
                  >
                    {{ type }}
                  </span>
                </button>
              </div>
              <!-- 단계는 고르는 게 아니라 환자 데이터가 정한다 -->
              <p v-if="visitType === PROCESS" class="mt-3 text-label text-text-secondary">
                <template v-if="nextStep">다음 단계 · <span class="font-medium text-text-primary">{{ nextStep }}</span></template>
                <template v-else>남은 프로세스 단계가 없습니다</template>
              </p>
            </template>

            <!-- 캘린더 상단에서 열면 날짜가 정해져 있지 않다. 시간보다 먼저 고른다 -->
            <template v-if="needsDate">
              <p class="mt-4 text-label font-medium text-text-secondary">날짜</p>
              <div v-if="dateOptions.length" class="-mx-6 mt-2 flex gap-2 overflow-x-auto px-6">
                <button
                  v-for="key in dateOptions"
                  :key="key"
                  class="flex h-11 shrink-0 items-center"
                  @click="form.date = key"
                >
                  <span
                    class="flex h-9 items-center rounded-lg border px-3 text-label"
                    :class="form.date === key
                      ? 'border-border-selected bg-selected-bg text-text-primary'
                      : 'border-border-default text-text-secondary'"
                  >
                    {{ shortDayLabel(key) }}
                  </span>
                </button>
              </div>
              <p v-else class="mt-2 text-label text-text-secondary">배치할 수 있는 날짜가 없습니다</p>
            </template>

            <!-- 시간이 정해지지 않은 경우에만 고른다. 미배정 할 일은 시간을 갖지 않는다 -->
            <template v-if="needsHour && activeDate">
              <p class="mt-4 text-label font-medium text-text-secondary">시간</p>
              <!-- 9칸이 줄바꿈되면 모달이 화면을 넘긴다. 가로 스크롤로 한 줄에 둔다 -->
              <div v-if="openHours.length" class="-mx-6 mt-2 flex gap-2 overflow-x-auto px-6">
                <button
                  v-for="hour in openHours"
                  :key="hour"
                  class="flex h-11 shrink-0 items-center"
                  @click="form.hour = hour"
                >
                  <span
                    class="flex h-9 items-center rounded-lg border px-3 text-label"
                    :class="form.hour === hour
                      ? 'border-border-selected bg-selected-bg text-text-primary'
                      : 'border-border-default text-text-secondary'"
                  >
                    {{ hour }}
                  </span>
                </button>
              </div>
              <p v-else class="mt-2 text-label text-text-secondary">비어 있는 시간이 없습니다</p>
            </template>
          </template>
        </div>

        <div class="flex shrink-0 justify-end gap-2 border-t border-border-subtle px-6 py-3">
          <button class="flex h-11 items-center" @click="dismiss">
            <span class="flex h-9 items-center rounded-lg border border-border-default px-3 text-body">
              취소
            </span>
          </button>
          <button class="flex h-11 items-center" :disabled="!canConfirm" @click="confirm">
            <span
              class="flex h-9 items-center rounded-lg px-3 text-body"
              :class="canConfirm ? 'bg-surface-inverse text-text-inverse' : 'bg-surface-field text-text-disabled'"
            >
              {{ duplicate ? '그래도 배치' : mode === 'add-task' ? '추가' : '배치' }}
            </span>
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
