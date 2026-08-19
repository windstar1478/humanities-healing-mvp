import { GENERAL, PROCESS } from './home.js'
import { processFor } from './processLibrary.js'
import { responseOf } from './surveys.js'
import { programs, findProgram } from './programs.js'
import { historyOf } from './process.js'
import { progressOf } from './sessions.js'

/*
 * '이 환자는 지금 어디까지 왔는가'를 한 줄로 만든다.
 *
 * 배치 모달이 쓴다. 약속을 잡는 자리에서 환자의 현재 상황이 보이지 않으면
 * 아직 프로세스가 없는 환자에게 치유 프로세스 일정을 잡거나, 감정평가를
 * 절반만 하고 멈춘 환자를 처음부터 다시 시작하는 것으로 오해할 수 있다.
 * 단계 이름만으로는 '감정평가 중'이 설문 하나도 안 한 것인지 넷 중 셋을
 * 끝낸 것인지 알 수 없어, **몇 개 중 몇 개인지까지** 함께 낸다.
 *
 * 값은 화면이 따로 들지 않고 전부 원본에서 읽는다 —
 * 설문 응답은 `surveys.js`, 회차 진행은 `sessions.js`가 원본이다.
 */

/* 씨앗. 목업 곳곳과 같은 FNV-1a다 — 새로고침해도 값이 달라지면 안 된다 */
function hash(text) {
  let h = 2166136261
  for (let i = 0; i < text.length; i += 1) {
    h ^= text.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

/* 감정평가 단계의 설문 진행. 프로세스가 정한 구성을 그대로 센다 */
function surveyProgress(patient, phase) {
  const process = processFor(patient)
  const source = (process?.steps ?? []).find((s) =>
    s.name.includes(phase === 'post' ? '사후' : '사전'),
  )
  const items = source?.items ?? []
  if (!items.length) return null
  const done = items.filter((item) => responseOf(patient.id, phase, item.code)?.done).length
  return { done, total: items.length }
}

/*
 * 프로그램 수행 단계의 회차 진행. 처방된 프로그램이 회차 수를 정한다.
 * 환자 상세와 코어 프로세스 3단계가 **같은 값을 말해야 한다** — 상세가 Figma
 * 고정값(8회차 중 5회차)을 쓰고 있어 두 화면이 다른 회차를 말했다.
 */
export function sessionProgress(patient) {
  const program = findProgram(patient.programId)
  if (!program) return null
  const progress = progressOf(patient, program)
  return { done: progress.current, total: program.sessions.length }
}

/*
 * { step, detail, tone }
 * tone = 'warning'이면 배치 전에 알아야 할 상태다(프로세스 미배정 · 중단).
 */
export function progressOfPatient(patient) {
  if (!patient) return null

  if (patient.process === '시작 전') {
    return {
      step: patient.status,
      detail: '치유 프로세스 미배정',
      tone: 'warning',
      unassigned: true,
    }
  }

  if (patient.process === '중단') {
    return { step: patient.status, detail: '프로세스 중단됨', tone: 'warning' }
  }

  if (patient.process === '완료') {
    return { step: '프로세스 종료', detail: '프로세스 완료', tone: 'neutral' }
  }

  if (patient.status.startsWith('감정평가')) {
    const phase = patient.status.includes('사후') ? 'post' : 'pre'
    const survey = surveyProgress(patient, phase)
    return {
      step: patient.status,
      detail: survey ? `설문 ${survey.total}개 중 ${survey.done}개 작성` : null,
      tone: 'neutral',
    }
  }

  if (patient.status === '프로그램 수행') {
    const run = sessionProgress(patient)
    return {
      step: patient.status,
      /* 다 끝냈으면 '몇 번째'가 없다. 없는 회차를 진행 중으로 쓰면 안 된다 */
      detail: !run ? null
        : run.done >= run.total
          ? `${run.total}회차 모두 완료`
          : `${run.total}회차 중 ${run.done + 1}회차 진행 중`,
      tone: 'neutral',
    }
  }

  return { step: patient.status, detail: null, tone: 'neutral' }
}

/*
 * 일정에 남길 '무엇을 하는 자리인가'. 배치하는 순간의 진행 지점을 적어둔다.
 *
 * 일정은 환자의 현재 상태를 참조하지 않는다(3장) — 그때 무엇을 했는지는
 * 일정이 자기 데이터로 들고 있어야 한다. 그리는 시점에 환자에서 읽으면
 * 지난 일정의 회차까지 오늘 값으로 바뀐다.
 *
 * 대면하는 순간은 감정평가 · 프로그램 수행 · 일반 상담 셋뿐이므로(4.1.6절)
 * 여기 나오는 값도 그 셋이다. 아직 대면 내용이 정해지지 않은 단계
 * (프로세스 시작 · 프로그램 처방 · 프로세스 종료)에서는 유형 이름을 그대로 쓴다.
 */
export function visitDetail(patient, type) {
  if (type !== PROCESS || !patient) return GENERAL

  if (patient.status.startsWith('감정평가')) return patient.status

  if (patient.status === '프로그램 수행') {
    const run = sessionProgress(patient)
    if (!run) return PROCESS
    const at = Math.min(run.done + 1, run.total)
    return `프로그램 수행 (${at}/${run.total})`
  }

  return PROCESS
}

/*
 * 환자가 자기 화면에서 보는 **프로그램 단위 기록**.
 *
 * 상담사 화면은 프로세스 이력(`PTSD_v1.0`)을 행으로 세지만, 환자에게 내부
 * 프로세스 이름과 버전을 그대로 보이면 안 된다 — 환자가 참여한 것은 프로그램이고,
 * 프로세스는 그 프로그램을 어떤 절차로 붙였는가에 대한 우리 쪽 관리 단위다.
 *
 * ⚠️ 지난 프로그램이 무엇이었는지는 목업에 없다(이력에는 버전만 있다).
 *    진단에 맞는 프로그램 중에서 **환자 id와 버전을 해시해 결정론적으로** 고른다.
 *    실제 기록이 오면 이 함수만 바꾼다.
 */
function pastProgram(patient, version) {
  const pool = programs.filter((item) => item.condition === patient.condition)
  const list = pool.length ? pool : programs
  return list[hash(`${patient.id}:${version}`) % list.length]
}

export function programRecordsOf(patient) {
  if (!patient) return []
  const running = findProgram(patient.programId)
  const run = sessionProgress(patient)

  return [...historyOf(patient)].reverse().map((entry) => {
    const live = entry.state === '진행 중'
    /* 진행 중인데 아직 처방 전이면 붙일 프로그램이 없다. 지어내지 않는다 */
    const program = live ? running : pastProgram(patient, entry.id)
    const total = program?.sessions.length ?? 0
    const done = live ? (run?.done ?? 0) : total

    return {
      id: entry.id,
      title: program?.name ?? '프로그램 준비 중',
      period: entry.period.trim(),
      state: live ? '진행 중' : '종료',
      running: live,
      sessions: program ? `${total}회차 중 ${done}회 완료` : '상담사가 프로그램을 고르고 있습니다',
      percent: total ? Math.round((done / total) * 100) : 0,
    }
  })
}
