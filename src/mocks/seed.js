import { patients } from './patients.js'
import { stepIndexOf } from './process.js'
import { processLibrary } from './processLibrary.js'
import { programs } from './programs.js'
import { surveys, draftOf, submitSurvey, saveSurveyDraft } from './surveys.js'

/*
 * 명단 40명에 프로세스 · 감정평가 응답 · 프로그램 처방을 채워 넣는다.
 *
 * 목업 명단에는 이름·진단·현재 단계밖에 없어서, 화면을 열면 프로세스는 '미할당',
 * 설문은 전부 '작성하기', 등급은 전부 '미작성'으로 비어 보였다. 프로토타입은
 * 화면이 채워져 있어야 흐름을 볼 수 있으므로 여기서 한 번에 심는다.
 *
 * **값은 결정론적이다.** `Math.random`을 쓰면 새로고침마다 점수와 배정이 달라져
 * 화면을 실측으로 검증할 수 없고, 같은 환자를 두 번 보면 다른 사람이 된다.
 * 환자 id를 해시해 씨앗으로 쓴다.
 *
 * **채우는 범위는 현재 단계가 정한다.** 지나온 단계만 값이 있고, 지금 단계는
 * 진행 중이라 일부만 있거나 비어 있다. 아직 오지 않은 단계는 손대지 않는다 —
 * 그래야 스테퍼가 말하는 상태와 화면의 내용이 어긋나지 않는다.
 *
 * ⚠️ 여기서 만든 점수·응답은 전부 임의값이다. 실제 데이터가 들어오면 이 파일을
 *    걷어내면 된다 — 다른 목업은 이 파일을 참조하지 않는다.
 */

/* FNV-1a. 같은 id는 언제나 같은 수가 된다 */
function seedOf(text) {
  let h = 2166136261
  for (let i = 0; i < text.length; i += 1) {
    h ^= text.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

/* seed는 32비트 무부호다. `>>`로 자르면 음수가 되어 인덱스가 빗나가므로 `>>>`를 쓴다 */
const pick = (list, seed) => list[(seed >>> 0) % list.length]

/*
 * 응답을 채운다. 점수를 직접 적지 않고 **문항 응답을 만들어 합계를 내는** 이유는,
 * 진행률(N/M)과 점수가 같은 원본에서 나와야 화면 두 곳이 갈라지지 않기 때문이다.
 *
 * severity가 척도의 어느 쪽을 고를지 정한다 — 셋으로 갈라야 등급 배지
 * (고위험 / 중증도 / 정상)가 명단 전체에 고루 섞인다.
 */
function fillSurvey(patient, phase, code, seed, { severity, ratio }) {
  const survey = surveys[code]
  const draft = draftOf(patient.id, phase, code)
  const total = survey.questions.length
  const count = Math.max(1, Math.round(total * ratio))

  /* 낮음은 척도의 아래쪽, 높음은 위쪽에서 고른다 */
  const scale = survey.scale
  const half = Math.ceil(scale.length / 2)
  const band = severity === 'low' ? scale.slice(0, half)
    : severity === 'high' ? scale.slice(-half)
      : scale

  for (let i = 0; i < count; i += 1) {
    draft.answers[i] = band[(seed + i * 7) % band.length].score
  }

  if (ratio >= 1) submitSurvey(patient.id, phase, code)
  else saveSurveyDraft(patient.id, phase, code)
}

function surveysAt(process, phase) {
  const step = process.steps.find((s) => s.name.includes(phase === 'pre' ? '사전' : '사후'))
  return step?.items ?? []
}

/*
 * 진단에 맞는 프로세스·프로그램을 고른다. 동반이환은 딱 맞는 정의가 없어
 * 두 진단 중 하나로 떨어뜨린다 — 목업의 한계이고 확인이 필요하다.
 */
function candidatesFor(list, condition, seed) {
  const matched = list.filter((item) => !item.deprecated && item.condition === condition)
  if (matched.length) return matched
  const fallback = seed % 2 === 0 ? 'PTSD' : '게임과몰입'
  return list.filter((item) => !item.deprecated && item.condition === fallback)
}

export function seedPatients() {
  patients.forEach((patient) => {
    const seed = seedOf(patient.id)

    /* 시작 전 환자는 붙은 프로세스가 없다 — 0단계 화면이 할 일이 남아 있어야 한다 */
    if (patient.process === '시작 전') return

    const process = pick(candidatesFor(processLibrary, patient.condition, seed), seed)
    patient.processId = process.id
    patient.processName = process.name

    const step = stepIndexOf(patient)
    const severity = ['low', 'mid', 'high'][seed % 3]

    /*
     * 사전 감정평가(1단계). 지나왔으면 전부 채우고, 지금 그 단계면 진행 중이라
     * 일부만 채운다 — 셋 중 하나는 아직 손도 대지 않은 상태로 둔다.
     */
    if (step >= 1) {
      const list = surveysAt(process, 'pre')
      list.forEach((item, i) => {
        if (step === 1) {
          /* 진행 중: 앞쪽부터 끝내고, 뒤쪽은 작성 중이거나 비어 있다 */
          const done = i < (seed % (list.length + 1))
          if (done) fillSurvey(patient, 'pre', item.code, seed + i, { severity, ratio: 1 })
          else if (i === (seed % (list.length + 1))) {
            fillSurvey(patient, 'pre', item.code, seed + i, { severity, ratio: 0.4 })
          }
          return
        }
        fillSurvey(patient, 'pre', item.code, seed + i, { severity, ratio: 1 })
      })
    }

    /* 프로그램은 처방 단계를 지나야 붙는다. 처방 단계에 있는 환자는 아직 고르는 중이다 */
    if (step >= 3) {
      const program = pick(candidatesFor(programs, patient.condition, seed), seed >>> 3)
      patient.programId = program.id
      patient.programName = program.name
    }

    /* 사후 감정평가(4단계). 사전과 같은 규칙이고, 사후는 대개 점수가 내려간다 */
    if (step >= 4) {
      const after = severity === 'high' ? 'mid' : 'low'
      const list = surveysAt(process, 'post')
      list.forEach((item, i) => {
        if (step === 4) {
          const done = i < (seed % (list.length + 1))
          if (done) fillSurvey(patient, 'post', item.code, seed + i, { severity: after, ratio: 1 })
          else if (i === (seed % (list.length + 1))) {
            fillSurvey(patient, 'post', item.code, seed + i, { severity: after, ratio: 0.4 })
          }
          return
        }
        fillSurvey(patient, 'post', item.code, seed + i, { severity: after, ratio: 1 })
      })
    }
  })
}
