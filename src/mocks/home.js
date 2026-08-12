import { Database, ListChecks, Quote, Workflow } from 'lucide-vue-next'

/* 홈(업무) 화면 mock 데이터 */

/* 그리드는 행 우선(2열)이라 이 순서가 Figma의 열 배치와 일치한다 */
export const quickAuthoringItems = [
  { id: 'data-item', label: '데이터 항목', icon: Database },
  { id: 'scale', label: '평가 척도', icon: ListChecks },
  { id: 'excerpt', label: '발췌문', icon: Quote },
  { id: 'process', label: '프로세스 설계', icon: Workflow },
]

/* overdue = 기한 경과. 악화 표현이므로 경고색 대상 */
export const unassignedTasks = [
  { id: 'task-1', title: '인문학 강사 미팅 조율', category: '협업', due: '오늘까지', overdue: false },
  { id: 'task-2', title: '데이터 누수 확인', category: '저작도구', due: null, overdue: false },
  { id: 'task-3', title: '보고서 자료 서치', category: '보고', due: '1일 지남', overdue: true },
  { id: 'task-4', title: '문장 명세 검수 요청', category: '저작도구', due: '내일까지', overdue: false },
  { id: 'task-5', title: '세션활동 저작 초안 작성', category: null, due: null, overdue: false },
]

const SCHEDULE_HOURS = ['09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00']

/* 미래 날짜는 지난 시간이 없으므로 전부 upcoming이다 */
const emptyDayRows = () =>
  SCHEDULE_HOURS.map((hour) => ({ hour, state: 'upcoming', event: null }))

/* 지나온 날은 전 시간대가 past라 드롭 대상이 될 수 없다 */
const pastDayRows = () =>
  SCHEDULE_HOURS.map((hour) => ({ hour, state: 'past', event: null }))

/* 확인 모달의 세션 종류 선택지 — 기존 환자 상태값에서 뽑은 잠정 목록. 확인 필요 */
export const sessionTypes = [
  '감정평가 (사전)',
  '감정평가 (사후)',
  '프로그램 처방',
  '프로그램 수행',
  '프로세스 종료',
]

/*
 * state: past | current | upcoming
 *   - past    : 시간 disabled, 제목 secondary, 바 border-default
 *   - current : '진행 중' accent 배지로 표시. 나머지는 upcoming과 동일
 *   - upcoming: 시간 secondary, 제목 primary, 바 border-strong
 * bar: 이벤트 블록 좌측 8px 바의 표시 여부. false여도 자리는 차지한다(투명 처리).
 */
const todayRows = [
  {
    hour: '09:00', state: 'past',
    event: { id: 'ev-1', title: '김서준', meta: '게임과몰입 · 감정평가', bar: true, badge: null },
  },
  {
    hour: '10:00', state: 'past',
    event: { id: 'ev-2', title: '나예솔', meta: 'PTSD · 프로그램 수행 (5/8)', bar: true, badge: null },
  },
  { hour: '11:00', state: 'past', event: null },
  { hour: '12:00', state: 'past', event: null },
  {
    hour: '13:00', state: 'current',
    event: { id: 'ev-3', title: '인문학 강사 미팅', meta: '운영팀', bar: false, badge: '진행 중' },
  },
  {
    hour: '14:00', state: 'upcoming',
    event: { id: 'ev-4', title: '서지원', meta: '게임과몰입 · 프로세스 종료', bar: true, badge: null },
  },
  { hour: '15:00', state: 'upcoming', event: null },
  {
    hour: '16:00', state: 'upcoming',
    event: { id: 'ev-5', title: '3주차 보고서 초안', meta: null, bar: false, badge: null },
  },
  {
    hour: '17:00', state: 'upcoming',
    event: { id: 'ev-6', title: '조민서', meta: '게임과몰입 · 프로그램 처방', bar: true, badge: null },
  },
]

/* 특정 시간에 일정을 꽂아 넣는다 */
function withEvents(rows, events) {
  events.forEach(({ hour, ...event }) => {
    const row = rows.find((r) => r.hour === hour)
    if (row) row.event = { ...event, badge: null }
  })
  return rows
}

/*
 * 오늘(2026-07-29) 기준 앞뒤 3일.
 * 어느 날 누구인지는 '일정' 화면(86:1243)의 7월 캘린더에서 가져왔다.
 * 다만 월 뷰에는 시각이 없어 시간대는 임의 배치다 — 확인 필요.
 * 7/31은 캘린더에 '+1'이 있어 한 건이 더 있으나 내용을 알 수 없다.
 */
export const scheduleDays = [
  { label: '7월 26일 (일)', isToday: false, rows: pastDayRows() },
  {
    label: '7월 27일 (월)', isToday: false,
    rows: withEvents(pastDayRows(), [
      { hour: '09:00', id: 'ev-0727-1', title: '김서준', meta: '게임과몰입 · 감정평가', bar: true },
      { hour: '14:00', id: 'ev-0727-2', title: '이준호', meta: '게임과몰입 · 프로그램 수행', bar: true },
    ]),
  },
  { label: '7월 28일 (화)', isToday: false, rows: pastDayRows() },
  { label: '7월 29일 (수)', isToday: true, rows: todayRows },
  { label: '7월 30일 (목)', isToday: false, rows: emptyDayRows() },
  {
    label: '7월 31일 (금)', isToday: false,
    rows: withEvents(emptyDayRows(), [
      { hour: '10:00', id: 'ev-0731-1', title: '월말 결산', meta: null, bar: false },
      { hour: '15:00', id: 'ev-0731-2', title: '조민서', meta: '게임과몰입 · 프로그램 처방', bar: true },
    ]),
  },
  { label: '8월 1일 (토)', isToday: false, rows: emptyDayRows() },
]
