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

export const scheduleDate = '7월 29일 (수)'

/*
 * state: past | current | upcoming — 시간 라벨·제목·메타의 명도 단계를 결정한다.
 * bar: 이벤트 블록 좌측 8px 바의 표시 여부. false여도 자리는 차지한다(투명 처리).
 */
export const scheduleRows = [
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

/* 14:00 행이 selected/bg + border/selected 토큰을 쓰므로 선택 상태로 확정 */
export const selectedEventId = 'ev-4'
