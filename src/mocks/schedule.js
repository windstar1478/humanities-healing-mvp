/*
 * 일정 단일 저장소. 아젠다(홈)와 캘린더(일정)가 모두 여기를 본다.
 *
 * 어느 날 누가 있는지는 Figma 일정 화면(86:1243)의 7월 캘린더에서 가져왔다.
 * 월 뷰에는 시각이 없고 셀당 두 건까지만 보이므로, 시간대와 접혀 있던 건들은
 * 임의로 채운 값이다 — 확인 필요. 7/29만 홈 화면(115:1885)의 실제 값이다.
 */

export const HOURS = ['09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00']

export const TODAY_KEY = '2026-07-29'
export const NOW_HOUR = '13:00'

const WEEKDAY_LABELS = ['일', '월', '화', '수', '목', '금', '토']

/* 환자 일정만 bar: true. 업무는 좌측 바가 없다 */
const P = (hour, title, condition, step) => ({
  hour, title, meta: `${condition} · ${step}`, bar: true, badge: null,
})
const W = (hour, title, meta = null) => ({ hour, title, meta, bar: false, badge: null })

export const eventsByDate = {
  '2026-07-01': [
    P('10:00', '김서준', '게임과몰입', '감정평가 (사전)'),
    P('14:00', '정유나', 'PTSD', '프로세스 시작'),
  ],
  '2026-07-03': [P('11:00', '이준호', '게임과몰입', '프로그램 처방')],
  '2026-07-06': [
    P('09:00', '나예솔', 'PTSD', '프로그램 수행'),
    P('11:00', '김철수', '게임과몰입', '프로세스 시작'),
    W('16:00', '주간 보고서 정리', '보고'),
  ],
  '2026-07-08': [W('10:00', '데이터 검수 확인', '저작도구')],
  '2026-07-13': [
    P('10:00', '조민서', '게임과몰입', '프로그램 수행'),
    P('15:00', '정유나', 'PTSD', '감정평가 (사전)'),
  ],
  '2026-07-17': [
    P('09:00', '이준호', '게임과몰입', '프로그램 수행'),
    P('11:00', '나예솔', 'PTSD', '프로그램 수행'),
    W('14:00', '문항 검수 회의', '협업'),
    P('16:00', '서지원', '게임과몰입', '감정평가 (사후)'),
  ],
  '2026-07-21': [
    P('10:00', '서지원', '게임과몰입', '프로그램 수행'),
    P('14:00', '조민서', '게임과몰입', '감정평가 (사전)'),
  ],
  '2026-07-23': [W('13:00', '연구실 정기 회의', '협업')],
  '2026-07-27': [
    P('09:00', '김서준', '게임과몰입', '프로세스 시작'),
    P('14:00', '이준호', '게임과몰입', '감정평가 (사전)'),
  ],
  /* 홈 화면 타임라인의 실제 값 */
  '2026-07-29': [
    P('09:00', '김서준', '게임과몰입', '감정평가'),
    { hour: '10:00', title: '나예솔', meta: 'PTSD · 프로그램 수행 (5/8)', bar: true, badge: null },
    { hour: '13:00', title: '인문학 강사 미팅', meta: '운영팀', bar: false, badge: '진행 중' },
    P('14:00', '서지원', '게임과몰입', '프로세스 종료'),
    W('16:00', '3주차 보고서 초안'),
    P('17:00', '조민서', '게임과몰입', '프로그램 처방'),
  ],
  '2026-07-31': [
    W('10:00', '월말 결산', '보고'),
    P('14:00', '정유나', 'PTSD', '프로그램 수행'),
    P('15:00', '조민서', '게임과몰입', '프로세스 종료'),
  ],
  '2026-08-03': [P('11:00', '정유나', 'PTSD', '감정평가 (사후)')],
}

export function toKey(year, month, date) {
  return `${year}-${String(month).padStart(2, '0')}-${String(date).padStart(2, '0')}`
}

export function dayLabel(key) {
  const [y, m, d] = key.split('-').map(Number)
  const weekday = WEEKDAY_LABELS[new Date(y, m - 1, d).getDay()]
  return `${m}월 ${d}일 (${weekday})`
}

/* 오늘 기준으로 지난 시간인지 */
function hourState(key, hour) {
  if (key < TODAY_KEY) return 'past'
  if (key > TODAY_KEY) return 'upcoming'
  if (hour < NOW_HOUR) return 'past'
  return hour === NOW_HOUR ? 'current' : 'upcoming'
}

/* 하루치 타임라인 행을 만든다. 아젠다가 쓰는 형태 */
export function buildDay(key) {
  const events = eventsByDate[key] ?? []
  return {
    key,
    label: dayLabel(key),
    isToday: key === TODAY_KEY,
    rows: HOURS.map((hour) => ({
      hour,
      state: hourState(key, hour),
      event: events.find((e) => e.hour === hour) ?? null,
    })),
  }
}

/* 오늘 기준 앞뒤 offset일의 날짜 키 */
export function shiftedKey(offset) {
  const [y, m, d] = TODAY_KEY.split('-').map(Number)
  const dt = new Date(y, m - 1, d + offset)
  return toKey(dt.getFullYear(), dt.getMonth() + 1, dt.getDate())
}
