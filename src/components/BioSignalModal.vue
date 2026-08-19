<script setup>
import { ref, reactive, computed, watch, useTemplateRef } from 'vue'
import { Paperclip, Trash2, ChevronDown } from 'lucide-vue-next'
import {
  BIO_KINDS, BIO_FIELDS, FNIRS_MAPS, recordsOf, addRecord, removeRecord, outOfRange,
} from '../mocks/bioSignals.js'
import ModalShell from './ModalShell.vue'

/*
 * 생체신호 측정 데이터 목록 및 등록 (웹 구버전 화면 이식).
 *
 * 감정평가 화면에서 연다. **시점(사전·사후)을 물려받는다** — 어느 시점에 잰
 * 값인지가 정해지지 않으면 전후 비교가 성립하지 않는다.
 *
 * 무거운 콘텐츠라 대형 모달(690×480)이다. 왼쪽이 이미 올린 기록,
 * 오른쪽이 새로 올리는 자리다 — 웹 화면의 두 열을 그대로 옮겼다.
 *
 * ⚠️ 측정 장비·백엔드에 묶인 기능이라 **모습만** 옮겼다. 첨부한 파일은
 *    이름만 남기고 내용을 읽지 않으며, fNIRS 지도는 자리만 잡아 둔다.
 */
const props = defineProps({
  patient: { type: Object, required: true },
  /* 'pre' | 'post' */
  phase: { type: String, required: true },
})

const emit = defineEmits(['close'])

const shell = useTemplateRef('shell')

const kind = ref(BIO_KINDS[0].key)
const fields = computed(() => BIO_FIELDS[kind.value])
const records = computed(() => recordsOf(props.patient.id, props.phase, kind.value))

/* 측정 시각의 기본값은 지금이다. 대개 방금 잰 것을 올린다 */
function nowLocal() {
  const d = new Date()
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

const form = reactive({ at: nowLocal(), values: {}, file: null })

/* 종류를 바꾸면 항목이 통째로 달라진다. 앞서 친 값을 그대로 두면 안 된다 */
watch(kind, () => {
  form.values = {}
  form.file = null
  form.at = nowLocal()
})

const filled = computed(() => fields.value.filter((f) => String(form.values[f.key] ?? '').trim() !== ''))
const invalid = computed(() => fields.value.filter((f) => outOfRange(f, form.values[f.key])))

/* 파일은 이름만 남긴다. 내용을 읽지 않는다는 사실을 화면에도 적어 둔다 */
function attach(event) {
  const file = event.target.files?.[0]
  if (file) form.file = file.name
}

function save() {
  if (!filled.value.length) return
  addRecord(props.patient.id, props.phase, kind.value, {
    at: form.at.replace('T', ' '),
    values: { ...form.values },
    file: form.file,
  })
  form.values = {}
  form.file = null
}

/* 목록의 한 건을 펼쳐 값을 본다. 시각만 보이면 무엇을 올렸는지 알 수 없다 */
const openRecord = ref(null)

const phaseLabel = computed(() => (props.phase === 'post' ? '사후' : '사전'))
</script>

<template>
  <ModalShell ref="shell" name="bio-signal" variant="large" @close="emit('close')">
    <!--
      머리와 종류 전환은 고정이다. 폼이 길어 셸이 통째로 스크롤되면
      HRV·fNIRS 전환이 화면 밖으로 밀려난다.
    -->
    <div class="flex h-full flex-col">
    <div class="flex shrink-0 items-center gap-2 py-2">
      <span class="flex min-w-0 flex-col">
        <span class="truncate text-title-sm font-semibold">생체신호</span>
        <span class="truncate text-count text-text-secondary">
          {{ patient.name }} · 감정평가 {{ phaseLabel }} · HRV · fNIRS 측정 데이터 목록 및 등록
        </span>
      </span>
      <span class="flex-1"></span>
      <!-- 종류 전환. 좌측 하단 테마 토글과 같은 세그먼트 문법이다 -->
      <div class="flex h-11 shrink-0 items-center gap-1 rounded-lg bg-surface-field p-1">
        <button
          v-for="item in BIO_KINDS"
          :key="item.key"
          class="flex h-9 items-center rounded px-3 text-label font-medium"
          :class="kind === item.key
            ? 'bg-surface-card text-text-primary'
            : 'text-text-secondary active:bg-surface-pressed'"
          @click="kind = item.key"
        >
          {{ item.label }}
        </button>
      </div>
    </div>

    <div class="flex min-h-0 flex-1 gap-3 pb-2">
      <!-- 이미 올린 기록 -->
      <section class="flex w-[180px] shrink-0 flex-col overflow-y-auto">
        <p class="text-label font-medium text-text-secondary">기록 목록</p>

        <div v-if="records.length" class="mt-2 flex flex-col gap-1">
          <div v-for="item in records" :key="item.id" class="flex flex-col rounded-lg border border-border-default">
            <button
              class="flex h-11 items-center gap-1 px-3 text-left active:bg-surface-pressed"
              :class="openRecord === item.id ? 'rounded-t-lg bg-surface-field' : 'rounded-lg'"
              @click="openRecord = openRecord === item.id ? null : item.id"
            >
              <span class="min-w-0 flex-1 truncate text-count">{{ item.at }}</span>
              <ChevronDown
                :size="12"
                class="shrink-0 text-text-secondary transition-transform duration-150 ease-standard"
                :class="openRecord === item.id ? 'rotate-180' : ''"
              />
            </button>

            <div v-if="openRecord === item.id" class="flex flex-col gap-1 px-3 py-2">
              <span
                v-for="field in fields.filter((f) => item.values[f.key] !== undefined && item.values[f.key] !== '')"
                :key="field.key"
                class="flex items-baseline gap-1 text-count"
              >
                <span class="min-w-0 flex-1 truncate text-text-secondary">{{ field.label }}</span>
                <span class="shrink-0 font-medium">{{ item.values[field.key] }}</span>
              </span>
              <span v-if="item.file" class="truncate text-count text-text-secondary">첨부 · {{ item.file }}</span>
              <!-- 삭제는 완료와 다른 일이다. 테두리만 둔 채 아래에 떨어뜨린다 -->
              <button
                class="mt-1 flex h-9 items-center justify-center gap-1 rounded-lg border border-border-default text-count text-text-secondary active:bg-surface-pressed"
                @click="removeRecord(patient.id, phase, kind, item.id)"
              >
                <Trash2 :size="12" class="shrink-0" />삭제
              </button>
            </div>
          </div>
        </div>

        <p v-else class="mt-2 text-count text-text-secondary">
          등록된 {{ BIO_KINDS.find((k) => k.key === kind).label }} 기록이 없습니다.
        </p>
      </section>

      <!-- 새로 올리는 자리 -->
      <section class="flex min-w-0 flex-1 flex-col overflow-y-auto">
        <p class="text-label font-medium text-text-secondary">새 기록 등록</p>

        <label class="mt-2 flex flex-col gap-1">
          <span class="text-count text-text-secondary">측정 시각</span>
          <input
            v-model="form.at"
            type="datetime-local"
            class="h-11 w-[240px] rounded-lg border border-border-default bg-surface-field px-3 text-label text-text-primary"
          />
        </label>

        <div class="mt-3 flex flex-col rounded-lg border border-border-default px-3 py-2">
          <div class="flex items-center gap-2">
            <span class="min-w-0 flex-1 truncate text-label font-medium">
              {{ BIO_KINDS.find((k) => k.key === kind).label }} 측정 데이터
            </span>
            <!-- 첨부는 이름만 남는다. 내용을 읽지 않는다는 것을 아래에 적는다 -->
            <label class="flex h-11 shrink-0 cursor-pointer items-center">
              <span class="flex h-9 items-center gap-1 rounded-lg border border-border-default px-3 text-label font-medium text-text-secondary active:bg-surface-pressed">
                <Paperclip :size="16" class="shrink-0" />파일 첨부
              </span>
              <input type="file" class="hidden" @change="attach" />
            </label>
          </div>

          <!-- fNIRS는 좌우 반구 지도가 함께 온다. 지금은 자리만 잡는다 -->
          <div v-if="kind === 'fnirs'" class="mt-2 flex gap-2">
            <div v-for="map in FNIRS_MAPS" :key="map.key" class="flex min-w-0 flex-1 flex-col gap-1">
              <span class="truncate text-label font-medium">{{ map.label }}</span>
              <span class="truncate text-count text-text-secondary">{{ map.detail }}</span>
              <div class="flex h-[72px] items-center justify-center rounded-lg border border-dashed border-border-default bg-surface-field">
                <span class="px-3 text-center text-count text-text-secondary">
                  파일을 첨부하면 활성화 지도가 표시됩니다
                </span>
              </div>
            </div>
          </div>

          <div class="mt-2 grid grid-cols-2 gap-x-3 gap-y-2">
            <label v-for="field in fields" :key="field.key" class="flex flex-col gap-1">
              <span class="text-count font-medium">{{ field.label }}</span>
              <input
                v-model="form.values[field.key]"
                type="text"
                inputmode="decimal"
                :placeholder="field.unit"
                class="h-11 w-full rounded-lg border bg-surface-field px-3 text-label text-text-primary placeholder:text-text-disabled"
                :class="outOfRange(field, form.values[field.key]) ? 'border-indicator-warning' : 'border-border-default'"
              />
              <!-- 범위를 벗어난 값은 잘못 적은 것이다. 막지 않고 알린다 -->
              <span
                class="text-count"
                :class="outOfRange(field, form.values[field.key]) ? 'text-indicator-warning' : 'text-text-secondary'"
              >
                임상 범위: {{ field.min }} ~ {{ field.max }}
              </span>
            </label>
          </div>

          <p v-if="form.file" class="mt-2 truncate text-count text-text-secondary">
            첨부 · {{ form.file }} (프로토타입이라 파일 내용은 읽지 않습니다)
          </p>
        </div>
      </section>
    </div>
    </div>

    <template #actions>
      <p v-if="invalid.length" class="min-w-0 flex-1 self-center truncate text-count text-indicator-warning">
        임상 범위를 벗어난 항목이 {{ invalid.length }}개 있습니다. 그대로 저장할 수 있습니다.
      </p>
      <p v-else class="min-w-0 flex-1 self-center truncate text-count text-text-secondary">
        채운 항목만 저장됩니다.
      </p>
      <button class="flex h-11 items-center" @click="shell?.dismiss()">
        <span class="flex h-9 items-center rounded-lg border border-border-default px-3 text-body active:bg-surface-pressed">
          닫기
        </span>
      </button>
      <button class="flex h-11 items-center" :disabled="!filled.length" @click="save">
        <span
          class="flex h-9 items-center rounded-lg px-3 text-body"
          :class="filled.length
            ? 'bg-surface-inverse text-text-inverse active:bg-surface-inverse-pressed'
            : 'bg-surface-field text-text-disabled'"
        >
          저장
        </span>
      </button>
    </template>
  </ModalShell>
</template>
