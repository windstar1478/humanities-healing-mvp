/*
 * 치유 프로세스와 평가 지표 mock (Figma 130:3152 · 148:5384).
 *
 * ⚠️ 확인 필요: 프로세스 단계 구성은 원래 환자마다 다르고 백엔드가 내려줄 값이다.
 *    상세 치유 프로세스 목업이 나오기 전까지는 아래 기본 6단계를 모두에게 적용한다.
 * ⚠️ 확인 필요: 이력 버전과 평가 지표도 Figma 한 명분을 모든 환자에게 그대로 쓴다.
 */

import { reactive } from 'vue'

/* 기본 프로세스. 감정평가가 두 번 나오는 것은 사전·사후이기 때문이다 */
export const PROCESS_STEPS = [
  '프로세스 시작',
  '감정평가',
  '프로그램 처방',
  '프로그램 수행',
  '감정평가',
  '프로세스 종료',
]

/*
 * 환자의 status가 몇 번째 단계인지. 명단의 status 문자열이 그대로 들어온다.
 * 사전·사후 감정평가가 각각 1번·4번으로 갈린다.
 */
const STEP_OF_STATUS = {
  '접수 완료': 0,
  '프로세스 시작': 0,
  '감정평가 (사전)': 1,
  '프로그램 처방': 2,
  '프로그램 수행': 3,
  '감정평가 (사후)': 4,
  '프로세스 종료': 5,
}

/*
 * 단계 번호 → 상태 문자열. 위 표의 역방향이다.
 * 단계를 넘길 때 환자의 status·nextStep을 여기서 가져간다 —
 * 화면이 문자열을 직접 적으면 두 표가 갈라진다.
 */
export const STATUS_OF_STEP = [
  '프로세스 시작',
  '감정평가 (사전)',
  '프로그램 처방',
  '프로그램 수행',
  '감정평가 (사후)',
  '프로세스 종료',
]

export function stepIndexOf(patient) {
  return STEP_OF_STATUS[patient.status] ?? 0
}

/*
 * 노드 하나의 상태. 환자 상세의 큰 스테퍼와 코어 프로세스의 컴팩트 스테퍼가
 * **같은 판정을 써야 한다.** 두 곳에 복제돼 있던 것을 여기로 올렸다 —
 * 시작 전 환자가 아무 단계도 열지 못하던 문제가 양쪽에 똑같이 있었다.
 *
 * 시작 전 환자는 완료된 단계가 하나도 없고, **프로세스 시작이 지금 할 차례**다.
 * 여기를 waiting으로 두면 첫 단계조차 열리지 않아 프로세스를 시작할 길이 없다.
 * 완료·중단 환자는 '진행 중' 단계가 없다.
 */
export function stepStateOf(patient, index) {
  if (patient.process === '시작 전') return index === 0 ? 'current' : 'waiting'
  if (patient.process !== '진행 중') return index <= stepIndexOf(patient) ? 'done' : 'waiting'
  const current = stepIndexOf(patient)
  if (index < current) return 'done'
  return index === current ? 'current' : 'waiting'
}

/* 프로그램 수행 회차. Figma 값(8회차 중 5회차) */
export const SESSION_TOTAL = 8
export const SESSION_CURRENT = 5

/*
 * 프로세스 이력. 최신이 마지막이다.
 * 이름은 진단에 따라 달라지므로 버전만 두고 화면이 앞을 붙인다
 * (PTSD 환자면 PTSD_v1.0, 게임과몰입 환자면 게임과몰입_v1.0).
 */
export const processHistory = [
  {
    id: 'v0.3',
    state: '종료',
    period: '2025.03.10 ~ 2025.08.22',
    entries: [
      { date: '2025.03.10', text: '프로세스 시작' },
      { date: '2025.03.18', label: '감정평가(사전)', value: '중등도 2군, 경도 3건' },
      { date: '2025.04.02', label: '프로그램 처방', version: 'v0.3' },
      { date: '2025.08.14', label: '프로그램 수행', value: '6회차 중 6회차 완료' },
      { date: '2025.08.22', label: '감정평가(사후)', value: '경도 1군 — 2군 개선' },
    ],
  },
  {
    id: 'v0.5',
    state: '종료',
    period: '2025.09.01 ~ 2026.03.12',
    entries: [
      { date: '2025.09.01', text: '프로세스 시작' },
      { date: '2025.09.09', label: '감정평가(사전)', value: '중등도 3군' },
      { date: '2025.09.24', label: '프로그램 처방', version: 'v0.5' },
      { date: '2026.02.27', label: '프로그램 수행', value: '8회차 중 5회차 진행 후 중단' },
      { date: '2026.03.12', label: '프로세스 종료', value: '재처방 필요' },
    ],
  },
  {
    id: 'v1.0',
    state: '진행 중',
    period: '2026.06.12 ~',
    entries: [
      { date: '2026.06.17', text: '프로세스 시작' },
      /* 경고색은 악화 표현 전용이다. 고위험군 판정이 여기 해당한다 */
      { date: '2026.06.21', label: '감정평가(사전)', value: '고위험 4군, 중증도-중증 2건', warning: true },
      { date: '2026.07.16', label: '프로그램 처방', version: 'v1.0' },
    ],
  },
]

/* 지금 진행 중인 프로세스의 버전 */
export const CURRENT_VERSION = 'v1.0'

/*
 * 프로세스를 새로 할당하면 이력이 바뀐다 — 돌아가던 프로세스는 **종료로 닫히고**
 * 새 프로세스가 열린다. 중단된 것을 재시작하는 경우도 같다. 끊긴 자리에
 * 이어붙이지 않고 새 항목을 여는 것이 재시작의 정의이기 때문이다(4.5.1절).
 *
 * 위 `processHistory`는 모든 환자가 함께 보는 목업이라 **직접 고치면 안 된다.**
 * 한 명을 재시작했는데 40명의 이력이 같이 바뀐다. 환자별 변경분만 여기 쌓고
 * `historyOf`가 읽는 시점에 합친다.
 */
const processChanges = reactive({})

function todayDot() {
  const d = new Date()
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}.${pad(d.getMonth() + 1)}.${pad(d.getDate())}`
}

export function recordAssignment(patient, process) {
  const date = todayDot()
  processChanges[patient.id] = {
    closed: {
      date,
      /* 왜 닫혔는지가 남아야 나중에 이력을 읽을 때 재시작인지 교체인지 구분된다 */
      reason: patient.process === '중단' ? '중단 후 재시작' : '재할당으로 종료',
    },
    opened: {
      id: process.id,
      name: process.name,
      state: '진행 중',
      period: `${date} ~`,
      entries: [{ date, text: '프로세스 시작' }],
    },
  }
}

export function historyOf(patient) {
  const change = processChanges[patient.id]
  if (!change) return processHistory
  /* 돌아가던 항목을 닫는다. 원본은 건드리지 않고 사본을 만든다 */
  const closed = processHistory.map((entry) => {
    if (entry.state !== '진행 중') return entry
    return {
      ...entry,
      state: '종료',
      /* 진행 중 항목의 기간은 `2026.06.12 ~`로 끝난다. 뒤에 종료일을 붙인다 */
      period: `${entry.period.trim()} ${change.closed.date}`,
      entries: [
        ...entry.entries,
        { date: change.closed.date, label: '프로세스 종료', value: change.closed.reason },
      ],
    }
  })
  return [...closed, change.opened]
}

/*
 * 핵심 지표. delta는 사전 대비 변화량이다.
 * 지표마다 좋아지는 방향이 달라(우울은 낮을수록, 회복탄력성은 높을수록)
 * 화살표는 증감만 나타내고 색은 중립으로 둔다 — Figma도 그렇다.
 */
export const keyMetrics = [
  { id: 'depression', label: '우울 · 불안', value: 58, delta: -14 },
  { id: 'obsession', label: '강박성', value: 67, delta: 3 },
  { id: 'existence', label: '존재 인정', value: 43, delta: -2 },
  { id: 'control', label: '감정 통제감', value: 52, delta: 14 },
  { id: 'resilience', label: '회복탄력성', value: 51, delta: 6 },
]

/* 추이 그래프의 x축. 사전 → 8회차 → 종료 */
export const metricPoints = [
  '사전', '1회차', '2회차', '3회차', '4회차', '5회차', '6회차', '7회차', '8회차', '종료',
]

/*
 * 아직 도달하지 않은 회차는 값이 없다.
 * 첫 값이 사전, 마지막 값이 keyMetrics의 현재값과 같다 (차이가 delta다).
 * 우울·불안만 Figma 실측이고 나머지 넷은 임의로 채웠다 — 확인 필요.
 */
export const metricSeries = {
  depression: [72, 70, 66, 61, 59, 58],
  obsession: [64, 65, 63, 66, 66, 67],
  existence: [45, 44, 46, 45, 44, 43],
  control: [38, 41, 44, 47, 50, 52],
  resilience: [45, 46, 48, 49, 50, 51],
}

/* 눈금은 20 폭에 5칸으로 고정한다. 지표마다 값의 범위가 달라 화면이 계산한다 */
export const SCALE_SPAN = 20
export const SCALE_STEPS = 4
