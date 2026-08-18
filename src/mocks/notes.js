import { reactive } from 'vue'

/*
 * 개인 메모 mock (Figma 188:5004 목록 · 189:8675 편집 중 · 190:8960 삭제 확인).
 *
 * 메모는 추가·수정·삭제가 되는 가변 데이터다. 그런데 환자 상세 화면 하나에서만
 * 쓰이므로 dragState·scheduleState 같은 공유 상태로 올리지 않았다
 * ("공유 상태는 두 개다. 늘리기 전에 재검토할 것").
 * 모듈이 싱글턴이라 reactive 배열 하나면 화면을 나갔다 와도 그대로 남는다.
 *
 * ⚠️ 확인 필요: 맥락 태그(`감정평가 (사전)` · `프로그램 수행 · 4회차`)는 메모를 쓴
 *    시점의 프로세스 단계다. 실제로는 백엔드가 그 시점 값을 함께 저장해야 한다.
 *    여기서는 목업이라 seed에 박아두고, 새 메모는 환자의 현재 단계를 따른다.
 */

let sequence = 0
const nextId = () => `note-${++sequence}`

/* Figma 목업은 한 명분이다. 나머지 환자는 빈 목록으로 시작한다 */
const seed = [
  {
    id: nextId(),
    patientId: 'p-25',
    date: '2026.06.21',
    context: '감정평가 (사전)',
    body: '감정평가 PTSD 증상 체크리스트(PCL-5) 설문 중 불편함 호소, 15분 휴식 후 재개',
  },
  {
    id: nextId(),
    patientId: 'p-25',
    date: '2026.07.24',
    context: '프로그램 수행 · 4회차',
    body: '보호자 상담 요청 있었음. 일정 조율 필요. 통화 가능 시간은 평일 저녁이라고 함.',
  },
]

export const notes = reactive(seed)

/* 최신이 앞에 온다 — 방금 쓴 메모를 찾으러 스크롤하지 않게 한다 */
export function notesOf(patientId) {
  return notes.filter((n) => n.patientId === patientId).slice().reverse()
}

export function addNote({ patientId, date, context, body }) {
  const note = { id: nextId(), patientId, date, context, body }
  notes.push(note)
  return note
}

export function updateNote(id, body) {
  const note = notes.find((n) => n.id === id)
  if (note) note.body = body
}

export function removeNote(id) {
  const index = notes.findIndex((n) => n.id === id)
  if (index >= 0) notes.splice(index, 1)
}
