<script setup>
import { ref, reactive, computed, watch, useTemplateRef, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { Search } from 'lucide-vue-next'
import { GENERAL, PROCESS } from '../mocks/home.js'
import { recentPatients, allPatients } from '../mocks/patients.js'
import { dayLabel, shortDayLabel } from '../mocks/schedule.js'
import { progressOfPatient, visitDetail } from '../mocks/progress.js'
import { openHoursOn, duplicateOn, addEvent, addTask, placeTask, moveEvent } from '../scheduleState.js'
import ModalShell from './ModalShell.vue'

/*
 * 배치 확인 · 일정 추가 · 작업 추가가 쓰는 공용 모달.
 * 대상 선택 · 환자 검색 · 중복 경고까지 전부 여기 있다.
 * 화면마다 다시 구현하면 규칙이 한쪽에만 남아 우회 경로가 생긴다.
 * Figma 화면이 없는 초안이다.
 */
const props = defineProps({
  /* 'drop' | 'add-event' | 'add-task' */
  mode: { type: String, required: true },
  /* 날짜가 정해져 있으면 넘긴다. null이면 모달에서 고른다 */
  dateKey: { type: String, default: null },
  /* 시간까지 정해져 있으면 넘긴다 (아젠다 빈 행 탭) */
  hourKey: { type: String, default: null },
  /* dateKey가 없거나 업무라 날짜를 바꿀 수 있을 때 고를 수 있는 날짜들 */
  dateOptions: { type: Array, default: () => [] },
  /* mode='drop'일 때 { item, itemKind, hour } */
  drop: { type: Object, default: null },
  /* mode='edit'일 때 { dateKey, event } — 이미 놓인 환자 일정을 옮긴다 */
  editing: { type: Object, default: null },
})

const emit = defineEmits(['close', 'placed'])

const router = useRouter()

/* 날짜·시간을 '미정'으로 고른 상태. 업무에서만 고를 수 있다 */
const UNSET = 'unset'

const shell = useTemplateRef('shell')
function dismiss() {
  shell.value?.dismiss()
}

/* 신규 환자 등록은 이 모달의 일이 아니다. 기존 환자 중에서만 고른다 */
const patientOptions = [...recentPatients, ...allPatients].filter(
  (p, i, arr) => arr.findIndex((q) => q.name === p.name) === i,
)

/*
 * date는 여기서 초기화한다. onMounted에서 넣으면 아래 date 워처가 뒤늦게 돌아
 * 기본 시간까지 같이 지운다.
 * '작업 추가'는 언제 할지 정하지 않은 채로 적어두는 흐름이라 미정으로 연다.
 */
const form = reactive({
  subjectKind: 'patient',
  patient: null,
  query: '',
  title: '',
  category: '',
  note: '',
  date: props.mode === 'add-task'
    ? UNSET
    : props.mode === 'edit'
      ? props.editing.dateKey
      : (props.dateKey ?? null),
  hour: null,
})

/* 편집은 지금 잡힌 환자·유형에서 시작한다 */
if (props.mode === 'edit') {
  form.patient = patientOptions.find((p) => p.name === props.editing.event.title) ?? null
}

const duplicate = ref(null)
const visitType = ref(PROCESS)

/*
 * 업무는 언제 할지 정하지 않은 채로 만들 수 있다. 환자 일정은 그럴 수 없다 —
 * 환자를 만나는 일에는 반드시 날짜와 시간이 있다.
 */
const isWork = computed(
  () => props.mode === 'add-task' || (props.mode === 'add-event' && form.subjectKind === 'work'),
)

/*
 * 편집은 이미 놓인 환자 일정을 옮기는 것이다.
 * 대상(환자)은 바꾸지 않는다 — 다른 환자로 바꾸는 것은 지우고 새로 잡는 일이지
 * 같은 약속을 고치는 일이 아니다. 날짜·시간·유형만 고른다.
 */
const isEdit = computed(() => props.mode === 'edit')
const editingId = computed(() => (isEdit.value ? props.editing?.event.id ?? null : null))

/*
 * 날짜가 넘어왔으면 보통 그대로 쓴다. 업무만은 넘어왔더라도 '미정'으로
 * 되돌릴 수 있어야 하므로 선택 구간을 계속 보여준다.
 */
const needsDate = computed(() => props.mode !== 'drop' && (!props.dateKey || isWork.value))
const dateChoices = computed(() => {
  const base = props.dateOptions.length
    ? props.dateOptions
    : (props.dateKey ? [props.dateKey] : [])
  /*
   * 편집 중인 일정이 잡힌 날은 그 자신 때문에 '빈 날' 목록에서 빠질 수 있다.
   * 제자리를 고를 수 없으면 날짜를 안 바꾸고 시간만 옮기는 일이 불가능해진다.
   */
  if (isEdit.value && !base.includes(props.editing.dateKey)) {
    return [...base, props.editing.dateKey].sort()
  }
  return base
})

const activeDate = computed(() => {
  if (!needsDate.value) return props.dateKey ?? null
  return form.date === UNSET ? null : form.date
})

/* 작업은 다른 작업 위에 겹칠 수 있어 고를 수 있는 시간이 더 넓다 */
const placeKind = computed(() => {
  if (props.mode === 'drop') return props.drop?.itemKind === 'task' ? 'task' : 'patient'
  return isWork.value ? 'task' : 'patient'
})

const openHours = computed(() =>
  activeDate.value ? openHoursOn(activeDate.value, placeKind.value, editingId.value) : [],
)

/* 캘린더는 날짜 칸에 놓으므로 시간이 정해지지 않은 채로 온다 */
const needsHour = computed(() => (props.mode === 'drop' ? !props.drop?.hour : true))

/* 날짜든 시간이든 미정이면 일정이 아니라 시간 없는 작업으로 남는다 */
const asTask = computed(() => isWork.value && (form.date === UNSET || form.hour === UNSET))

/*
 * 우측 환자 패널과 같은 구조 — 최근 환자 다음에 전체 환자가 이어진다.
 * 검색 중에는 두 구간을 합쳐 한 덩어리로 보여준다.
 */
const patientGroups = computed(() => {
  const q = form.query.trim()
  if (q) {
    return [{
      label: '검색 결과',
      items: patientOptions.filter((p) => p.name.includes(q) || p.condition.includes(q)),
    }]
  }
  return [
    { label: '최근 환자', items: recentPatients },
    { label: '전체 환자', items: allPatients },
  ]
})

/* 드롭이든 추가든 환자면 같은 규칙을 탄다 */
const activePatient = computed(() => {
  if (props.mode === 'drop') return props.drop?.itemKind === 'patient' ? props.drop.item : null
  if (isEdit.value) return form.patient
  if (props.mode === 'add-event') return form.subjectKind === 'patient' ? form.patient : null
  return null
})

/* 이미 있는 작업을 옮기는 중이면 중복 검사에서 자기 자신을 뺀다 */
const movingTaskId = computed(() =>
  props.mode === 'drop' && props.drop?.itemKind === 'task' ? props.drop.item.id : null,
)

/*
 * 지금 이 환자가 어디까지 왔는지. 약속을 잡는 자리에서 현재 상황이 보이지
 * 않으면 프로세스가 없는 환자에게 프로세스 일정을 잡거나, 절반만 끝낸
 * 감정평가를 처음부터 다시 하는 것으로 오해할 수 있다.
 */
const progress = computed(() => progressOfPatient(activePatient.value))

/*
 * 프로세스가 배정되지 않은 환자를 치유 프로세스로 잡으려 할 때의 확인.
 * 막지 않고 알린다 — 프로세스 개시(0단계)에서 할당하기로 하고 그 뒤의
 * 감정평가 자리를 미리 잡아두는 것은 정상적인 순서다.
 * 중복 경고와 같은 문법이다: 버튼 행만 확인 상태로 바뀌고 '돌아가기'는 닫지 않는다.
 */
const unassigned = ref(false)
const needsAssignWarning = computed(
  () => visitType.value === PROCESS && Boolean(progress.value?.unassigned),
)

/*
 * 배치 유형의 기본값. 프로세스가 끝났거나 끊긴 환자를 만나는 일은
 * 프로세스 안의 일이 아니므로 일반 상담으로 연다.
 */
function defaultTypeFor(patient) {
  if (!patient) return PROCESS
  return patient.process === '완료' || patient.process === '중단' ? GENERAL : PROCESS
}

const canConfirm = computed(() => {
  if (needsDate.value && !form.date) return false
  /* 날짜가 미정이면 고를 시간 자체가 없다 */
  if (needsHour.value && activeDate.value && !form.hour) return false
  if (isWork.value) return form.title.trim().length > 0 || props.mode === 'drop'
  if (props.mode === 'add-event' || isEdit.value) return Boolean(form.patient)
  return true
})

const title = computed(() => {
  if (props.mode === 'add-task') return '작업 추가'
  if (props.mode === 'add-event') return '일정 추가'
  if (isEdit.value) return '일정 편집'
  return '이 시간에 배치할까요?'
})

function pickPatient(patient) {
  form.patient = patient
  visitType.value = defaultTypeFor(patient)
}

/*
 * 프로세스가 없는 환자는 **먼저 배정하러 간다.** 여기서 그대로 배치하면
 * 무엇을 하는 자리인지 정해지지 않은 일정이 남는다 — 프로세스가 붙어야
 * 감정평가든 프로그램 수행이든 할 일이 생긴다.
 * 잡던 일정은 배정을 마친 뒤 다시 잡는다.
 */
const leaveTo = ref(null)
function goAssign() {
  leaveTo.value = `/process/${activePatient.value.id}/0`
  dismiss()
}

/*
 * 이동은 모달이 닫힌 **뒤에** 한다. 셸이 올려둔 history 엔트리를 라우터가
 * 걷어내기 전에 push하면 모달 엔트리가 스택에 남는다.
 */
function onClose() {
  emit('close')
  if (leaveTo.value) router.push(leaveTo.value)
}

/* 경고에서 '돌아가기'는 모달을 닫지 않는다. 고르던 자리로 되돌린다 */
function stepBack() {
  if (duplicate.value) duplicate.value = null
  else if (unassigned.value) unassigned.value = false
  else dismiss()
}

function subjectName() {
  if (props.mode === 'drop') {
    return props.drop.itemKind === 'patient' ? props.drop.item.name : props.drop.item.title
  }
  return activePatient.value ? activePatient.value.name : form.title.trim()
}

function newTask(key, hour) {
  return {
    id: `task-${Date.now()}`,
    title: form.title.trim(),
    category: form.category.trim() || null,
    note: form.note.trim() || null,
    date: key,
    hour,
    done: false,
  }
}

function confirm() {
  /* 미정이 하나라도 있으면 타임라인에 그릴 자리가 없다. 시간 없는 작업으로 남긴다 */
  if (asTask.value) {
    addTask(newTask(form.date === UNSET ? null : form.date, null))
    dismiss()
    return
  }

  const hour = props.mode === 'drop' ? (props.drop.hour ?? form.hour) : form.hour

  /* 프로세스가 없는 환자를 치유 프로세스로 잡는 것은 확인을 거친다 */
  if (needsAssignWarning.value && !unassigned.value) {
    unassigned.value = true
    return
  }

  if (!duplicate.value) {
    const found = duplicateOn(activeDate.value, subjectName(), movingTaskId.value, editingId.value)
    if (found) {
      duplicate.value = found
      return
    }
  }

  if (isEdit.value) {
    /* 같은 약속을 옮기는 것이다. 새로 만들지 않는다 */
    moveEvent(props.editing.dateKey, editingId.value, activeDate.value, buildPatientEvent(hour))
    emit('placed', { dateKey: activeDate.value, hour })
    dismiss()
    return
  }

  if (movingTaskId.value) {
    /* 이미 있는 작업을 배치하는 것이다. 새로 만들지 않는다 */
    placeTask(movingTaskId.value, activeDate.value, hour)
  } else if (isWork.value) {
    addTask(newTask(activeDate.value, hour))
  } else {
    addEvent(activeDate.value, buildPatientEvent(hour))
  }

  emit('placed', { dateKey: activeDate.value, hour })
  dismiss()
}

function buildPatientEvent(hour) {
  const patient = activePatient.value
  return {
    hour,
    title: patient.name,
    /* 그때 무엇을 하는 자리였는지는 일정이 자기 데이터로 들고 있어야 한다 */
    meta: `${patient.condition} · ${visitDetail(patient, visitType.value)}`,
    bar: true,
    badge: null,
  }
}

onMounted(() => {
  /*
   * 드롭은 날짜만 정해서 왔으므로 시간을 기본값으로 채우지 않는다.
   * 채우면 사용자가 고르지 않은 시간에 그대로 확정될 수 있다.
   * 빈 행을 눌러 열면 그 시간이, 그 밖에는 첫 후보가 들어간다.
   */
  if (props.mode === 'drop') {
    form.hour = null
    visitType.value = defaultTypeFor(props.drop?.itemKind === 'patient' ? props.drop.item : null)
  } else if (props.mode === 'add-task') {
    form.hour = UNSET
  } else if (isEdit.value) {
    /* 제자리에서 시작한다. 편집을 열자마자 시간이 바뀌어 있으면 안 된다 */
    form.hour = props.editing.event.hour
    visitType.value = props.editing.event.meta?.includes(GENERAL) ? GENERAL : PROCESS
  } else {
    form.hour = props.hourKey ?? openHours.value[0] ?? null
  }
})

/* 환자로 되돌아오면 '미정'은 고를 수 없는 값이 된다. 원래 날짜로 되돌린다 */
watch(() => form.subjectKind, () => {
  duplicate.value = null
  unassigned.value = false
  if (form.date === UNSET) form.date = props.dateKey ?? null
  if (form.hour === UNSET) form.hour = null
})

/* 날짜가 바뀌면 그 날의 빈 시간이 달라지므로 시간 선택을 비운다 */
watch(() => form.date, () => {
  form.hour = null
  duplicate.value = null
  unassigned.value = false
})

/* 유형을 바꾸면 경고의 전제가 사라진다 */
watch(visitType, () => {
  unassigned.value = false
})
</script>

<template>
  <ModalShell ref="shell" :name="mode" @close="onClose">
    <!-- 중복 경고. 취소하면 모달을 닫지 않고 원래 폼으로 돌아간다 -->
    <template v-if="duplicate">
      <h2 class="text-title-sm font-semibold">이미 배치된 대상입니다</h2>
      <p class="mt-2 text-body text-text-secondary">
        {{ dayLabel(activeDate) }} {{ duplicate.hour }}에
        <span class="text-text-primary">{{ duplicate.title }}</span> 일정이 이미 있습니다.
        그래도 배치할까요?
      </p>
    </template>

    <!--
      프로세스 미배정 경고. 막지 않고 알린다 — 프로세스 할당은 0단계에서 하고,
      그 뒤의 감정평가 자리를 미리 잡아두는 것은 정상적인 순서다.
    -->
    <template v-else-if="unassigned">
      <h2 class="text-title-sm font-semibold">치유 프로세스가 배정되지 않았습니다</h2>
      <p class="mt-2 text-body text-text-secondary">
        <span class="text-text-primary">{{ activePatient?.name }}</span> 환자는 아직
        <span class="text-text-primary">{{ progress?.step }}</span> 상태입니다.
      </p>
      <p class="mt-1 text-body text-text-secondary">
        프로세스를 배정해야 이 자리에서 진행할 단계가 정해집니다.
      </p>
      <p class="mt-3 text-body text-text-secondary">
        <span class="text-text-primary">프로세스 시작</span> 단계로 이동할까요?
      </p>
    </template>

    <template v-else>
      <h2 class="text-title-sm font-semibold">{{ title }}</h2>

      <p v-if="mode === 'drop'" class="mt-2 text-body text-text-secondary">
        {{ dayLabel(activeDate) }}{{ drop.hour ? ` ${drop.hour}` : '' }} ·
        <template v-if="drop.itemKind === 'patient'">
          {{ drop.item.name }} ({{ drop.item.condition }})
        </template>
        <template v-else>{{ drop.item.title }}</template>
      </p>

      <!-- 편집은 대상을 바꾸지 않는다. 누구의 약속인지만 알려준다 -->
      <p v-if="isEdit" class="mt-2 text-body text-text-secondary">
        <span class="text-text-primary">{{ editing.event.title }}</span>
        · 지금 {{ dayLabel(editing.dateKey) }} {{ editing.event.hour }}
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
                ? 'border-border-selected bg-selected-bg text-text-primary active:bg-selected-bg-pressed'
                : 'border-border-default text-text-secondary active:bg-surface-pressed'"
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
          <!--
            우측 환자 패널과 같은 구조: 최근 환자 다음에 전체 환자가 이어지고
            스크롤로 내려간다. 리스트는 구간마다 컨테이너 하나로 묶고
            행은 라운드 없이 구분선으로만 나눈다.
          -->
          <div class="mt-2 flex max-h-48 flex-col gap-2 overflow-y-auto">
            <div v-for="group in patientGroups" :key="group.label">
              <p class="text-count text-text-secondary">{{ group.label }}</p>
              <div class="mt-1 rounded-lg border border-border-default">
                <button
                  v-for="(p, i) in group.items"
                  :key="p.id"
                  class="flex h-12 w-full items-center justify-between gap-2 px-3 text-left"
                  :class="[
                    i > 0 ? 'border-t border-border-subtle' : '',
                    form.patient?.id === p.id ? 'bg-selected-bg active:bg-selected-bg-pressed' : 'active:bg-surface-pressed',
                  ]"
                  @click="pickPatient(p)"
                >
                  <span class="truncate text-body">{{ p.name }}</span>
                  <span class="shrink-0 text-caption text-text-secondary">{{ p.condition }}</span>
                </button>
                <p v-if="!group.items.length" class="px-3 py-3 text-label text-text-secondary">
                  검색 결과가 없습니다
                </p>
              </div>
            </div>
          </div>
        </template>
      </template>

      <!-- 업무는 제목을 직접 쓴다 -->
      <template v-if="isWork && mode !== 'drop'">
        <p class="mt-4 text-label font-medium text-text-secondary">제목</p>
        <input
          v-model="form.title"
          type="text"
          :placeholder="mode === 'add-task' ? '작업 이름' : '일정 이름'"
          class="mt-2 h-11 w-full rounded-lg border border-border-default bg-surface-field px-3 text-body text-text-primary placeholder:text-text-disabled"
        />
        <p class="mt-4 text-label font-medium text-text-secondary">분류 (선택)</p>
        <input
          v-model="form.category"
          type="text"
          placeholder="협업 · 보고 · 저작도구 등"
          class="mt-2 h-11 w-full rounded-lg border border-border-default bg-surface-field px-3 text-body text-text-primary placeholder:text-text-disabled"
        />
        <p class="mt-4 text-label font-medium text-text-secondary">설명 (선택)</p>
        <input
          v-model="form.note"
          type="text"
          placeholder="무엇을 하는 작업인지"
          class="mt-2 h-11 w-full rounded-lg border border-border-default bg-surface-field px-3 text-body text-text-primary placeholder:text-text-disabled"
        />
      </template>

      <!-- 환자 일정은 드롭이든 추가든 같은 규칙을 탄다 -->
      <template v-if="activePatient">
        <!--
          단계 이름만으로는 '감정평가 중'이 하나도 안 한 것인지 넷 중 셋을 끝낸
          것인지 알 수 없다. 몇 개 중 몇 개인지까지 함께 낸다.
        -->
        <p v-if="progress" class="mt-4 flex flex-wrap items-baseline gap-x-2 text-label">
          <span class="font-medium text-text-secondary">현재 진행</span>
          <span class="text-text-primary">{{ progress.step }}</span>
          <span
            v-if="progress.detail"
            :class="progress.tone === 'warning' ? 'text-indicator-warning' : 'text-text-secondary'"
          >· {{ progress.detail }}</span>
        </p>

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
                ? 'border-border-selected bg-selected-bg text-text-primary active:bg-selected-bg-pressed'
                : 'border-border-default text-text-secondary active:bg-surface-pressed'"
            >
              {{ type }}
            </span>
          </button>
        </div>
      </template>

      <!-- 날짜가 정해지지 않았거나(캘린더 상단) 바꿀 수 있으면(업무) 고른다 -->
      <template v-if="needsDate">
        <p class="mt-4 text-label font-medium text-text-secondary">날짜</p>
        <div v-if="dateChoices.length || isWork" class="-mx-6 mt-2 flex gap-2 overflow-x-auto px-6">
          <!-- 업무만 미정을 고를 수 있다. 맨 앞에 둔다 -->
          <button v-if="isWork" class="flex h-11 shrink-0 items-center" @click="form.date = UNSET">
            <span
              class="flex h-9 items-center rounded-lg border px-3 text-label"
              :class="form.date === UNSET
                ? 'border-border-selected bg-selected-bg text-text-primary active:bg-selected-bg-pressed'
                : 'border-border-default text-text-secondary active:bg-surface-pressed'"
            >
              미정
            </span>
          </button>
          <button
            v-for="key in dateChoices"
            :key="key"
            class="flex h-11 shrink-0 items-center"
            @click="form.date = key"
          >
            <span
              class="flex h-9 items-center rounded-lg border px-3 text-label"
              :class="form.date === key
                ? 'border-border-selected bg-selected-bg text-text-primary active:bg-selected-bg-pressed'
                : 'border-border-default text-text-secondary active:bg-surface-pressed'"
            >
              {{ shortDayLabel(key) }}
            </span>
          </button>
        </div>
        <p v-else class="mt-2 text-label text-text-secondary">배치할 수 있는 날짜가 없습니다</p>
        <p v-if="asTask" class="mt-2 text-label text-text-secondary">
          시간 없는 작업으로 추가됩니다
        </p>
      </template>

      <!-- 시간이 정해지지 않은 경우에만 고른다 -->
      <template v-if="needsHour && activeDate">
        <p class="mt-4 text-label font-medium text-text-secondary">시간</p>
        <!-- 9칸이 줄바꿈되면 모달이 화면을 넘긴다. 가로 스크롤로 한 줄에 둔다 -->
        <div v-if="openHours.length || isWork" class="-mx-6 mt-2 flex gap-2 overflow-x-auto px-6">
          <button v-if="isWork" class="flex h-11 shrink-0 items-center" @click="form.hour = UNSET">
            <span
              class="flex h-9 items-center rounded-lg border px-3 text-label"
              :class="form.hour === UNSET
                ? 'border-border-selected bg-selected-bg text-text-primary active:bg-selected-bg-pressed'
                : 'border-border-default text-text-secondary active:bg-surface-pressed'"
            >
              미정
            </span>
          </button>
          <button
            v-for="hour in openHours"
            :key="hour"
            class="flex h-11 shrink-0 items-center"
            @click="form.hour = hour"
          >
            <span
              class="flex h-9 items-center rounded-lg border px-3 text-label"
              :class="form.hour === hour
                ? 'border-border-selected bg-selected-bg text-text-primary active:bg-selected-bg-pressed'
                : 'border-border-default text-text-secondary active:bg-surface-pressed'"
            >
              {{ hour }}
            </span>
          </button>
        </div>
        <p v-else class="mt-2 text-label text-text-secondary">비어 있는 시간이 없습니다</p>
      </template>
    </template>

    <template #actions>
      <!-- 중복 경고의 취소는 모달을 닫지 않는다. 고르던 자리로 되돌린다 -->
      <button class="flex h-11 items-center" @click="stepBack">
        <span class="flex h-9 items-center rounded-lg border border-border-default px-3 text-body active:bg-surface-pressed">
          {{ duplicate || unassigned ? '돌아가기' : '취소' }}
        </span>
      </button>
      <button class="flex h-11 items-center" :disabled="!canConfirm" @click="unassigned ? goAssign() : confirm()">
        <span
          class="flex h-9 items-center rounded-lg px-3 text-body"
          :class="canConfirm ? 'bg-surface-inverse text-text-inverse active:bg-surface-inverse-pressed' : 'bg-surface-field text-text-disabled'"
        >
          {{ duplicate ? '그래도 배치' : unassigned ? '프로세스 배정하러 가기' : asTask ? '추가' : isEdit ? '저장' : '배치' }}
        </span>
      </button>
    </template>
  </ModalShell>
</template>
