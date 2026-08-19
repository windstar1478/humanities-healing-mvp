<script setup>
import { ref, computed } from 'vue'
import { ChevronLeft, ChevronRight, ChevronDown, ArrowUp, ArrowDown } from 'lucide-vue-next'
import {
  CONDITIONS, FNIRS_AREAS, BIO_METRICS, BIO_BLOCKS, effectivenessOf, ALPHA,
} from '../mocks/effectiveness.js'

/*
 * 효과성 분석 (웹 구버전 화면 이식).
 *
 * **프로그램·척도를 다루는 화면이라 우측 환자 패널이 없다**(4.0.1절).
 * 여기서 세는 것은 환자 한 명이 아니라 연구 표본이고, 환자를 집어 오는 일도 없다.
 *
 * 웹에서 옮기며 세 가지를 이 앱의 규칙으로 바꿨다.
 *  1. **accent를 쓰지 않는다.** 웹은 상관계수·유의값·강조를 전부 파랑으로 칠했는데,
 *     accent 용법은 선택 상태·현재 위치·드롭 대상 셋으로 동결돼 있다(3.1절).
 *     값의 크기는 **중립 명도 계단**으로 나타낸다 — 진할수록 강한 상관이다
 *  2. **화면 상단의 상담사 카드를 걷었다.** 좌측 네비 하단에 이미 있다
 *  3. 표가 가로로 길어 **표 안에서만 가로 스크롤**한다. 페이지는 스크롤하지 않는다
 */
const condition = ref(CONDITIONS[0])
const data = computed(() => effectivenessOf(condition.value))

/* ── 전후 효과성 (척도 카드) ─────────────────────────────────
 * 한 번에 셋씩 보여주고 화살표로 넘긴다. 본문 929에 카드 셋이 들어간다.
 */
const PER_PAGE = 3
const page = ref(0)
const pageCount = computed(() => Math.ceil(data.value.scales.length / PER_PAGE))
const pagedScales = computed(() =>
  data.value.scales.slice(page.value * PER_PAGE, page.value * PER_PAGE + PER_PAGE),
)

function movePage(step) {
  page.value = Math.min(Math.max(0, page.value + step), pageCount.value - 1)
}

/* 진단을 바꾸면 척도 구성이 달라진다. 보던 페이지에 남아 있으면 빈 칸이 나온다 */
function pickCondition(next) {
  condition.value = next
  page.value = 0
  openBlock.value = BIO_BLOCKS[0]
}

/* 막대 높이. 두 막대가 같은 자를 쓰도록 척도의 총점으로 나눈다 */
const barHeight = (value, max) => `${Math.max(4, Math.min(100, (value / max) * 100))}%`

/* ── 의과학적 검증 ───────────────────────────────────────────
 * 좋아지는 방향이 지표마다 다르다. 방향을 보고 판정하되 **악화만 경고색**이다.
 */
function trend(item) {
  const up = item.post > item.pre
  const good = item.better === 'up' ? up : !up
  return { up, good }
}

/* ── 상관표 ──────────────────────────────────────────────────
 * 네 블록 중 하나만 펼친다. 넷을 다 펼치면 32행이라 화면이 표만 남는다.
 */
const openBlock = ref(BIO_BLOCKS[0])

/*
 * 값의 크기를 명도로 나타낸다. 부호는 숫자가 이미 말하고 있으므로
 * 색으로 다시 말하지 않는다 — 음의 상관을 경고색으로 칠하면 '나쁨'으로 읽힌다.
 */
function cellClass(value) {
  const size = Math.abs(value)
  if (size >= 0.75) return 'bg-surface-recessed font-medium text-text-primary'
  if (size >= 0.5) return 'bg-surface-field'
  return 'text-text-secondary'
}

/* 피어슨 히트맵도 같은 계단을 쓴다. 여기 값은 전부 양수라 크기만 본다 */
function heatClass(value) {
  if (value >= 0.9) return 'bg-surface-recessed font-medium text-text-primary'
  if (value >= 0.75) return 'bg-surface-field'
  return 'bg-surface-card text-text-secondary'
}

const ttestOpen = ref(true)

/* 유의한 값은 굵게 올린다. 유의미는 악화가 아니므로 경고색을 쓰지 않는다 */
const significant = (p) => p < ALPHA
</script>

<template>
  <div class="flex min-w-0 flex-1 flex-col gap-2 py-3">
    <!-- 머리: 무엇을 보고 있는지 + 진단 전환 -->
    <section class="flex h-14 shrink-0 items-center gap-2 rounded-lg border border-border-default bg-surface-card px-3">
      <h1 class="whitespace-nowrap text-title-sm font-semibold">효과성 분석</h1>
      <p class="min-w-0 flex-1 truncate text-label text-text-secondary">
        인문 치유 프로그램의 전후 효과와 척도 타당도
      </p>
      <!-- 세그먼트 토글. 좌측 하단 테마 토글과 같은 문법이다 -->
      <div class="flex h-11 shrink-0 items-center gap-1 rounded-lg bg-surface-field p-1">
        <button
          v-for="item in CONDITIONS"
          :key="item"
          class="flex h-9 items-center rounded px-3 text-label font-medium"
          :class="condition === item
            ? 'bg-surface-card text-text-primary'
            : 'text-text-secondary active:bg-surface-pressed'"
          @click="pickCondition(item)"
        >
          {{ item }}
        </button>
      </div>
    </section>

    <!-- 본문은 이 안에서만 스크롤한다. 페이지 전체는 스크롤하지 않는다 -->
    <div class="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto">
      <div class="flex shrink-0 gap-2">
        <!-- 전후 효과성 -->
        <section class="flex min-w-0 flex-1 flex-col rounded-lg border border-border-default bg-surface-card px-3 py-2">
          <div class="flex shrink-0 items-center gap-2">
            <span class="flex min-w-0 flex-col">
              <span class="truncate text-title-sm font-semibold">인문학 프로그램 전후 효과성 분석</span>
              <span class="truncate text-count text-text-secondary">인문 설문 척도 응답 T-검정 분석</span>
            </span>
            <span class="flex-1"></span>
            <span class="shrink-0 text-count text-text-secondary">{{ page + 1 }} / {{ pageCount }}</span>
            <button
              v-for="move in [-1, 1]"
              :key="move"
              class="flex size-11 shrink-0 items-center justify-center rounded-lg"
              :class="(move < 0 ? page > 0 : page < pageCount - 1)
                ? 'text-text-secondary active:bg-surface-pressed'
                : 'text-text-disabled'"
              @click="movePage(move)"
            >
              <component :is="move < 0 ? ChevronLeft : ChevronRight" :size="16" />
            </button>
          </div>

          <div class="mt-2 grid grid-cols-3 gap-2">
            <div
              v-for="scale in pagedScales"
              :key="scale.code"
              class="flex flex-col gap-1 rounded-lg border border-border-default px-3 py-2"
            >
              <span class="truncate text-label font-medium">{{ scale.code }}</span>
              <span class="truncate text-count text-text-secondary">{{ scale.name }}</span>
              <!-- 유의값은 굵게만 올린다. 유의미는 악화가 아니다 -->
              <span class="text-count" :class="significant(scale.p) ? 'font-medium text-text-primary' : 'text-text-secondary'">
                p = {{ scale.p.toFixed(3) }}
              </span>

              <div class="mt-1 flex h-[86px] items-end gap-4 px-2">
                <div
                  v-for="bar in [
                    { key: 'pre', label: '사전', value: scale.pre, tone: 'bg-chart-bar-default' },
                    { key: 'post', label: '사후', value: scale.post, tone: 'bg-chart-bar-strong' },
                  ]"
                  :key="bar.key"
                  class="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1"
                >
                  <span class="text-count font-medium">{{ bar.value }}</span>
                  <span class="w-10 rounded-t" :class="bar.tone" :style="{ height: barHeight(bar.value, scale.max) }"></span>
                  <span class="text-count text-text-secondary">{{ bar.label }}</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        <!-- 의과학적 검증 -->
        <section class="flex w-[340px] shrink-0 flex-col rounded-lg border border-border-default bg-surface-card px-3 py-2">
          <span class="shrink-0 truncate text-title-sm font-semibold">전후 의과학적 효과성 검증</span>

          <p class="mt-2 text-count font-medium text-text-secondary">HRV · 자율신경 활성도</p>
          <div class="mt-1 flex flex-col gap-1">
            <div
              v-for="item in data.hrv"
              :key="item.label"
              class="flex items-center gap-2 rounded-lg border border-border-default px-3 py-2"
            >
              <span class="min-w-0 flex-1 truncate text-label">{{ item.label }}</span>
              <span class="shrink-0 text-count text-text-secondary">{{ item.pre }}</span>
              <ChevronRight :size="12" class="shrink-0 text-text-disabled" />
              <span class="shrink-0 text-label font-medium">{{ item.post }}</span>
              <!-- 악화만 경고색이다. 개선은 중립으로 둔다(3.1절) -->
              <component
                :is="trend(item).up ? ArrowUp : ArrowDown"
                :size="14"
                class="shrink-0"
                :class="trend(item).good ? 'text-text-secondary' : 'text-indicator-warning'"
              />
            </div>
          </div>

          <p class="mt-3 text-count font-medium text-text-secondary">fNIRS · 대뇌전두엽 산소화</p>
          <div class="mt-1 flex gap-1">
            <div
              v-for="point in [
                { label: `${data.fnirs.label} (Pre)`, value: data.fnirs.pre },
                { label: `${data.fnirs.label} (Post)`, value: data.fnirs.post },
              ]"
              :key="point.label"
              class="flex min-w-0 flex-1 flex-col items-center gap-0.5 rounded-lg border border-border-default px-3 py-2"
            >
              <span class="truncate text-count text-text-secondary">{{ point.label }}</span>
              <span class="text-title-sm font-semibold">{{ point.value.toFixed(2) }}</span>
            </div>
          </div>

          <div class="mt-3 rounded-lg border border-border-default bg-surface-field px-3 py-2">
            <p class="text-count font-medium text-text-secondary">해석 결과</p>
            <p class="mt-1 text-label text-text-primary">{{ data.note }}</p>
          </div>
        </section>
      </div>

      <!-- 생체신호 상관관계. 네 블록 중 하나만 펼친다 -->
      <section class="flex shrink-0 flex-col rounded-lg border border-border-default bg-surface-card px-3 py-2">
        <span class="shrink-0 truncate text-title-sm font-semibold">
          {{ condition }} 군의 생체신호 데이터 상관관계 분석
        </span>

        <div class="mt-2 flex flex-col">
          <div v-for="block in BIO_BLOCKS" :key="block" class="flex flex-col">
            <!--
              펼쳐지는 목록은 머리와 본문이 한 상자다(3.x절).
              머리는 아래 테두리를 걷고 배경 차이로만 나눈다.
            -->
            <button
              class="flex h-11 items-center gap-2 border border-border-default px-3 text-left"
              :class="[
                openBlock === block ? 'rounded-t-lg border-b-0 bg-surface-field' : 'rounded-lg active:bg-surface-pressed',
                block === BIO_BLOCKS[0] ? '' : 'mt-1',
              ]"
              @click="openBlock = openBlock === block ? null : block"
            >
              <span class="min-w-0 flex-1 truncate text-label font-medium">{{ block }}</span>
              <span class="shrink-0 text-count text-text-secondary">{{ FNIRS_AREAS.length }}개 영역</span>
              <ChevronDown
                :size="16"
                class="shrink-0 text-text-secondary transition-transform duration-150 ease-standard"
                :class="openBlock === block ? 'rotate-180' : ''"
              />
            </button>

            <!-- 표가 가로로 길다. 표 안에서만 가로로 스크롤한다 -->
            <div v-if="openBlock === block" class="overflow-x-auto rounded-b-lg border border-t-0 border-border-default">
              <table class="w-max min-w-full border-collapse text-count">
                <thead>
                  <tr class="border-b border-border-subtle">
                    <th class="sticky left-0 z-10 w-[110px] bg-surface-card px-3 py-2 text-left font-medium text-text-secondary">
                      fNIRS 영역
                    </th>
                    <th
                      v-for="metric in BIO_METRICS"
                      :key="metric"
                      class="w-[104px] px-3 py-2 text-center font-medium text-text-secondary"
                    >
                      {{ metric }}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="(area, row) in FNIRS_AREAS" :key="area" class="border-b border-border-subtle last:border-b-0">
                    <th class="sticky left-0 z-10 bg-surface-card px-3 py-2 text-left font-medium">{{ area }}</th>
                    <td
                      v-for="(value, col) in data.bio[block][row]"
                      :key="col"
                      class="px-3 py-2 text-center tabular-nums"
                      :class="cellClass(value)"
                    >
                      {{ value.toFixed(3) }}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>

      <div class="flex shrink-0 gap-2">
        <!-- 피어슨 상관계수 히트맵 -->
        <section class="flex min-w-0 flex-1 flex-col rounded-lg border border-border-default bg-surface-card px-3 py-2">
          <span class="shrink-0 truncate text-title-sm font-semibold">기존 임상 척도–인문 척도 피어슨 상관계수 (r)</span>

          <div class="mt-2 flex gap-1">
            <span class="flex w-[64px] shrink-0 flex-col gap-1">
              <span
                v-for="label in data.pearson.rows"
                :key="label"
                class="flex h-8 items-center justify-end truncate text-count text-text-secondary"
              >
                {{ label }}
              </span>
            </span>
            <span class="flex min-w-0 flex-1 flex-col gap-1">
              <span v-for="(row, i) in data.pearson.values" :key="i" class="flex gap-1">
                <span
                  v-for="(value, j) in row"
                  :key="j"
                  class="flex h-8 min-w-0 flex-1 items-center justify-center rounded text-count tabular-nums"
                  :class="heatClass(value)"
                >
                  {{ value.toFixed(2) }}
                </span>
              </span>
            </span>
          </div>

          <!-- 열 라벨은 아래에 눕혀 둔다. 세로로 세우면 읽는 각도가 바뀐다 -->
          <div class="mt-1 flex gap-1 pl-[68px]">
            <span
              v-for="label in data.pearson.cols"
              :key="label"
              class="min-w-0 flex-1 truncate text-center text-count text-text-secondary"
            >
              {{ label }}
            </span>
          </div>
        </section>

        <!-- 유사도 -->
        <section class="flex w-[340px] shrink-0 flex-col rounded-lg border border-border-default bg-surface-card px-3 py-2">
          <span class="shrink-0 truncate text-title-sm font-semibold">인문학 설문–임상 지표 유사도</span>

          <div class="mt-2 flex flex-col gap-1">
            <div
              v-for="item in data.similarity"
              :key="item.pair"
              class="flex items-center gap-2 rounded-lg border border-border-default px-3 py-2"
            >
              <span class="min-w-0 flex-1 truncate text-label">{{ item.pair }}</span>
              <span class="shrink-0 rounded-full bg-surface-field px-2 py-0.5 text-count font-medium">
                {{ item.value.toFixed(1) }}%
              </span>
            </div>
          </div>

          <div class="mt-3 rounded-lg border border-border-default bg-surface-field px-3 py-2">
            <p class="text-count font-medium text-text-secondary">해석 결과</p>
            <p class="mt-1 text-label text-text-primary">{{ data.similarityNote }}</p>
          </div>
        </section>
      </div>

      <!-- 대응표본 T-검정 -->
      <section class="flex shrink-0 flex-col rounded-lg border border-border-default bg-surface-card px-3 py-2">
        <button class="flex h-11 items-center gap-2 rounded-lg text-left active:bg-surface-pressed" @click="ttestOpen = !ttestOpen">
          <span class="flex min-w-0 flex-col">
            <span class="truncate text-title-sm font-semibold">기존·인문 척도 대응표본 T-검정 분석</span>
            <span class="truncate text-count text-text-secondary">n = {{ data.ttest.n }}</span>
          </span>
          <span class="flex-1"></span>
          <span class="shrink-0 text-count text-text-secondary">{{ data.ttest.rows.length }}건</span>
          <ChevronDown
            :size="16"
            class="shrink-0 text-text-secondary transition-transform duration-150 ease-standard"
            :class="ttestOpen ? 'rotate-180' : ''"
          />
        </button>

        <table v-if="ttestOpen" class="mt-1 w-full border-collapse text-count">
          <thead>
            <tr class="border-b border-border-default">
              <th class="px-3 py-2 text-left font-medium text-text-secondary">검정 대상군 (기존 vs 인문)</th>
              <th class="w-[120px] px-3 py-2 text-right font-medium text-text-secondary">평균 차이</th>
              <th class="w-[120px] px-3 py-2 text-right font-medium text-text-secondary">t-value</th>
              <th class="w-[120px] px-3 py-2 text-right font-medium text-text-secondary">p-value</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in data.ttest.rows" :key="row.pair" class="border-b border-border-subtle last:border-b-0">
              <td class="px-3 py-2 text-label">{{ row.pair }}</td>
              <td class="px-3 py-2 text-right tabular-nums">{{ row.diff.toFixed(2) }}</td>
              <td class="px-3 py-2 text-right tabular-nums">{{ row.t.toFixed(2) }}</td>
              <td
                class="px-3 py-2 text-right tabular-nums"
                :class="significant(row.p) ? 'font-medium text-text-primary' : 'text-text-secondary'"
              >
                {{ row.p.toFixed(3) }}
              </td>
            </tr>
          </tbody>
        </table>
      </section>
    </div>
  </div>
</template>
