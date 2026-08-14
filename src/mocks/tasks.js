/*
 * 작업 단일 저장소.
 *
 * 업무는 '미배정 할 일'과 '일정에 놓인 업무'로 나뉘지 않는다. 하나의 작업이
 * 날짜·시간을 갖거나 갖지 않을 뿐이다. 배치해도 목록에서 사라지지 않고
 * 리마인더로 남으며, 목록에서 내려가는 유일한 길은 완료다.
 *
 * 그래서 완료 상태는 여기 한 곳에만 있다. 타임라인의 업무 블록은 이 목록에서
 * 파생한다 — 일정 쪽에 사본을 두면 완료가 한쪽에만 반영된다.
 * (환자 일정은 다르다. 그건 schedule.js가 갖는다)
 *
 * date  = 언제 할지. null이면 미정
 * hour  = 그 날 몇 시. null이면 시간 미정 → 타임라인에 그리지 않는다
 * done  = 완료. 완료 아코디언으로 내려간다
 * note  = 상세 모달에 보여줄 짧은 설명. Figma 화면이 없는 초안이다
 */

export const tasks = [
  {
    id: 'task-1', title: '인문학 강사 미팅 조율', category: '협업',
    date: '2026-07-29', hour: null, done: false,
    note: '8월 회차 강사 가능 일정을 확인하고 운영팀에 회신한다.',
  },
  {
    id: 'task-2', title: '데이터 누수 확인', category: '저작도구',
    date: null, hour: null, done: false,
    note: '문항 응답 로그에서 중복 저장이 의심되는 건을 추린다.',
  },
  {
    id: 'task-3', title: '보고서 자료 서치', category: '보고',
    date: '2026-07-28', hour: null, done: false,
    note: '3주차 보고서에 넣을 선행 연구와 통계 자료를 모은다.',
  },
  {
    id: 'task-4', title: '문장 명세 검수 요청', category: '저작도구',
    date: '2026-07-30', hour: null, done: false,
    note: '발췌문 문장 명세 초안을 검수 담당자에게 넘긴다.',
  },
  {
    id: 'task-5', title: '세션활동 저작 초안 작성', category: null,
    date: null, hour: null, done: false,
    note: '2회차 세션활동 흐름을 초안으로 잡는다.',
  },
  /* 아래는 이미 시간까지 정해져 타임라인에 그려지는 작업들 */
  {
    id: 'task-6', title: '주간 보고서 정리', category: '보고',
    date: '2026-07-06', hour: '16:00', done: true,
    note: '1주차 진행 상황을 정리해 공유한다.',
  },
  {
    id: 'task-7', title: '데이터 검수 확인', category: '저작도구',
    date: '2026-07-08', hour: '10:00', done: true,
    note: '평가 척도 데이터 항목 검수 결과를 확인한다.',
  },
  {
    id: 'task-8', title: '문항 검수 회의', category: '협업',
    date: '2026-07-17', hour: '14:00', done: true,
    note: '검수 담당자와 문항 수정 사항을 맞춘다.',
  },
  {
    id: 'task-9', title: '연구실 정기 회의', category: '협업',
    date: '2026-07-23', hour: '13:00', done: true,
    note: '연구실 주간 정기 회의.',
  },
  {
    id: 'task-10', title: '인문학 강사 미팅', category: '운영팀',
    date: '2026-07-29', hour: '13:00', done: false,
    note: '8월 회차 강사와 프로그램 구성을 논의한다.',
  },
  {
    id: 'task-11', title: '3주차 보고서 초안', category: null,
    date: '2026-07-29', hour: '16:00', done: false,
    note: '3주차 보고서 초안을 작성한다.',
  },
  {
    id: 'task-12', title: '월말 결산', category: '보고',
    date: '2026-07-31', hour: '10:00', done: false,
    note: '7월 프로그램 운영 결산을 정리한다.',
  },
]
