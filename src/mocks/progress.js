import { GENERAL, PROCESS } from './home.js'
import { processFor } from './processLibrary.js'
import { responseOf } from './surveys.js'
import { findProgram } from './programs.js'
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
