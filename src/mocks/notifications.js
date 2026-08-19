import { reactive } from 'vue'

/*
 * 알림 목업. **Figma 디자인이 없어 임의로 만든 것이다.**
 *
 * 읽음 상태가 런타임에 바뀌므로 평범한 배열이 아니라 reactive다 —
 * 메모(`notes.js`)·설문 응답과 같은 자리이고, 좌측 네비에서만 쓰이므로
 * 공유 상태 둘(`dragState`·`scheduleState`)에 합류시키지 않았다.
 *
 * `kind`가 아이콘과 어디로 가는지를 정한다. 화면이 아이콘을 따로 적으면
 * 알림 종류가 늘 때 두 곳을 고쳐야 한다.
 *
 * ⚠️ 문구·시각은 전부 임의값이다. 실제로는 백엔드가 내려줄 목록이다.
 */
export const notifications = reactive([
  {
    id: 'nt-1',
    kind: 'task',
    title: '기한이 지난 작업이 있습니다',
    detail: '2주차 결과 정리 · 2일 지남',
    when: '오늘 09:12',
    /* 경고색은 악화 표현 전용이다. 기한 초과가 여기 해당한다 */
    warning: true,
    read: false,
    to: '/',
  },
  {
    id: 'nt-2',
    kind: 'survey',
    title: '김서준 환자가 설문을 제출했습니다',
    detail: '감정평가 (사후) · 자아존중감 척도',
    when: '오늘 08:40',
    warning: false,
    read: false,
    to: '/patients/detail/p-4',
  },
  {
    id: 'nt-3',
    kind: 'schedule',
    title: '다음 일정까지 1시간 남았습니다',
    detail: '서지원 · 14:00 · 일반 상담',
    when: '오늘 13:00',
    warning: false,
    read: false,
    to: '/schedule',
  },
  {
    id: 'nt-4',
    kind: 'process',
    title: '윤하람 환자의 프로세스가 종료되었습니다',
    detail: 'PTSD 표준 프로세스_v2.1 · 8회차 완료',
    when: '어제 14:15',
    warning: false,
    read: true,
    to: '/patients/detail/p-12',
  },
  {
    id: 'nt-5',
    kind: 'schedule',
    title: '다음 일정이 잡히지 않은 환자가 있습니다',
    detail: '나예솔 외 6명',
    when: '어제 09:00',
    warning: false,
    read: true,
    to: '/patients/list',
  },
])

export const unreadCount = () => notifications.filter((item) => !item.read).length

/* 읽음은 되돌리지 않는다. 읽지 않은 것을 세는 것이 이 상태의 유일한 쓸모다 */
export function markRead(id) {
  const found = notifications.find((item) => item.id === id)
  if (found) found.read = true
}

export function markAllRead() {
  notifications.forEach((item) => { item.read = true })
}
