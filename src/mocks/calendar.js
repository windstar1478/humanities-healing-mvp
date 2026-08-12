/*
 * '일정' 화면의 월 캘린더 mock 데이터.
 * 어느 날 무엇이 있는지는 Figma 일정 화면(86:1243)의 7월 캘린더에서 가져왔다.
 * 셀에는 두 건까지만 보이고 나머지는 '+N'으로 접히므로, 캘린더에서 읽을 수 없는
 * 나머지 건수는 more로만 들고 있다 — 실제 내용은 미정.
 */

export const calendarMonth = {
  label: '2026년 7월',
  year: 2026,
  month: 7,
  /* 오늘. 홈 화면 타임라인과 같은 날이다 */
  today: 29,
  /* 7월 1일이 수요일. 주 시작은 월요일 */
  firstWeekday: 3,
  daysInMonth: 31,
  prevMonthDays: 30,
}

/* bar: 환자 일정만 좌측 바를 갖는다 — 아젠다와 같은 규칙 */
export const monthEvents = {
  1: { events: [{ title: '김서준', bar: true }, { title: '정유나', bar: true }] },
  3: { events: [{ title: '이준호', bar: true }] },
  6: { events: [{ title: '나예솔', bar: true }, { title: '김철수', bar: true }], more: 1 },
  8: { events: [{ title: '데이터 검수 확인', bar: false }] },
  13: { events: [{ title: '조민서', bar: true }, { title: '정유나', bar: true }] },
  17: { events: [{ title: '이준호', bar: true }, { title: '나예솔', bar: true }], more: 2 },
  21: { events: [{ title: '서지원', bar: true }, { title: '조민서', bar: true }] },
  23: { events: [{ title: '연구실 정기 회의', bar: false }] },
  27: { events: [{ title: '김서준', bar: true }, { title: '이준호', bar: true }] },
  29: { events: [{ title: '김서준', bar: true }, { title: '나예솔', bar: true }], more: 4 },
  31: { events: [{ title: '월말 결산', bar: false }, { title: '조민서', bar: true }], more: 1 },
}

/* 다음 달 앞부분에 걸친 일정 (흐리게 표시되는 칸) */
export const nextMonthEvents = {
  3: { events: [{ title: '정유나', bar: true }] },
}
