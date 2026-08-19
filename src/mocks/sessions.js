import { reactive } from 'vue'
import { TODAY_KEY } from './schedule.js'
import { visitDatesOf } from '../scheduleState.js'
import { stepIndexOf } from './process.js'

/*
 * 프로그램 수행(3단계)의 회차 진행 상태 (Figma 148:8311).
 *
 * 회차의 **이름과 개수는 처방된 프로그램이 정한다**(`mocks/programs.js`).
 * 여기 있는 것은 '그 회차를 언제 했고 무엇을 기록했는가'다 — 프로그램 정의는
 * 아무에게도 붙지 않은 내용이고, 이것은 붙은 뒤의 기록이다.
 * 프로세스 정의(`processLibrary.js`)와 이력(`process.js`)의 관계와 같다.
 *
 * 상태는 **런타임에 바뀐다**(회차 완료 · 수행 내역 저장). 그래서 목업 배열이
 * 아니라 reactive 저장소이고, 환자별로 처음 열 때 결정론적으로 채운다 —
 * 메모·설문 응답과 같은 자리다.
 */
const state = reactive({})

function hash(text) {
  let h = 2166136261
  for (let i = 0; i < text.length; i += 1) {
    h ^= text.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

/* 완료된 회차에 남아 있는 기록. 임의 문장이고 회차 이름만 갈아 끼운다 */
const NOTES = [
  '차분히 참여했고 활동을 끝까지 마쳤다. 다음 회차에서 이어 볼 지점을 함께 정했다.',
  '초반에 말수가 적었으나 중반부터 이야기를 이어갔다. 과제 수행에 어려움은 없었다.',
  '감정 표현이 이전보다 구체적이었다. 활동 중 불편감을 말로 표현했고 스스로 조절했다.',
  '집중이 흔들리는 구간이 있었으나 안내 후 회복했다. 기록지 작성까지 완료.',
]

/*
 * 회차 날짜는 **일정에서 온다**. 회차를 언제 하는지는 상담사가 잡은 약속이
 * 정하는 값이지 회차 기록이 스스로 만들어낼 값이 아니다 — 여기서 날짜를
 * 지어내면 일정 화면과 프로그램 수행 화면이 서로 다른 날을 말한다.
 *
 * 끝낸 회차는 지난 진료일을 뒤에서부터, 남은 회차는 앞으로 잡힌 진료일을
 * 앞에서부터 가져간다. **약속이 모자라면 그 회차는 날짜가 없다** —
 * 없는 약속을 있는 것처럼 그리지 않는다. 잡아야 할 것이 남았다는 뜻이다.
 * (일정을 다시 잡으면 그 자리에서 따라오도록 열 때마다 다시 매긴다)
 */
function applyDates(patient, progress) {
  const { past, upcoming } = visitDatesOf(patient.name)
  const done = progress.current
  /* 끝낸 회차 수보다 지난 진료가 적을 수 있다. 뒤에서부터 맞춘다 */
  const behind = past.slice(-done)
  const offset = done - behind.length
  progress.entries.forEach((entry, i) => {
    const next = i < done ? behind[i - offset] ?? null : upcoming[i - done] ?? null
    /* 같은 값을 다시 쓰지 않는다. 읽는 자리(computed)에서 부르므로 조용해야 한다 */
    if (entry.date !== next) entry.date = next
  })
}

function init(patient, program) {
  const seed = hash(`${patient.id}:${program.id}`)
  const total = program.sessions.length
  const step = stepIndexOf(patient)

  /*
   * 지나온 단계는 회차가 다 끝났고, 아직 오지 않은 단계는 하나도 시작하지 않았다.
   * 수행 단계에 있는 환자만 중간에 있다 — 적어도 한 회차는 끝냈고 마지막은 남긴다.
   */
  const current = step > 3 ? total
    : step < 3 ? 0
      : 1 + (seed % Math.max(1, total - 1))

  const entries = program.sessions.map((name, i) => ({
    name,
    date: null,
    done: i < current,
    note: i < current ? NOTES[(seed + i) % NOTES.length] : '',
    savedAt: null,
  }))

  state[patient.id] = { programId: program.id, current, entries }
}

export function progressOf(patient, program) {
  const saved = state[patient.id]
  /* 프로그램이 바뀌면(재처방) 기록도 새로 시작한다 */
  if (!saved || saved.programId !== program.id) init(patient, program)
  applyDates(patient, state[patient.id])
  return state[patient.id]
}

/*
 * 회차 라벨. 오늘·예정을 앞에 붙여 언제인지 한눈에 읽히게 한다.
 * 약속이 아직 없는 회차는 '일정 미정'이다 — 잡아야 할 것이 남았다는 뜻이라
 * 날짜를 지어내 채우면 안 된다.
 */
export function sessionWhen(entry) {
  if (!entry.date) return '일정 미정'
  if (entry.done) return entry.date
  if (entry.date === TODAY_KEY) return `오늘 · ${entry.date}`
  return `예정 · ${entry.date}`
}

/*
 * 회차 완료. 다음 회차가 '진행 중'이 된다.
 * 저장은 명시적 조작이므로(3.6절) 완료도 버튼을 눌러야 일어난다.
 */
export function completeSession(patient, program, index) {
  const progress = progressOf(patient, program)
  progress.entries[index].done = true
  progress.current = Math.min(program.sessions.length, index + 1)
}

export function saveSessionNote(patient, program, index, note) {
  const progress = progressOf(patient, program)
  const entry = progress.entries[index]
  entry.note = note
  const d = new Date()
  const pad = (n) => String(n).padStart(2, '0')
  entry.savedAt = `${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export const NOTE_LIMIT = 1000
