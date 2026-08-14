/*
 * 환자 일정 저장소. 아젠다(홈)와 캘린더(일정)가 모두 여기를 본다.
 *
 * 업무는 여기 없다. 업무는 작업(mocks/tasks.js)이 날짜·시간을 가진 상태이고,
 * 타임라인 블록은 거기서 파생한다. 완료 상태가 두 곳에 생기지 않게 하기 위함이다.
 *
 * 어느 날 누가 있는지는 Figma 일정 화면(86:1243)의 7월 캘린더에서 가져왔다.
 * 월 뷰에는 시각이 없고 셀당 두 건까지만 보이므로, 시간대와 접혀 있던 건들은
 * 임의로 채운 값이다 — 확인 필요. 7/29만 홈 화면(115:1885)의 실제 값이다.
 */

export const HOURS = ['09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00']

export const TODAY_KEY = '2026-07-29'
export const NOW_HOUR = '13:00'

const WEEKDAY_LABELS = ['일', '월', '화', '수', '목', '금', '토']

/* 환자 일정만 bar: true. 업무(작업에서 파생)는 좌측 바가 없다 */
const P = (hour, title, condition, step) => ({
  hour, title, meta: `${condition} · ${step}`, bar: true, badge: null,
})

export const eventsByDate = {
  '2026-07-01': [
    P('10:00', '김서준', '게임과몰입', '감정평가 (사전)'),
    P('14:00', '정유나', 'PTSD', '프로세스 시작'),
  ],
  '2026-07-03': [P('11:00', '이준호', '게임과몰입', '프로그램 처방')],
  '2026-07-06': [
    P('09:00', '나예솔', 'PTSD', '프로그램 수행'),
    P('11:00', '김철수', '게임과몰입', '프로세스 시작'),
  ],
  '2026-07-13': [
    P('10:00', '조민서', '게임과몰입', '프로그램 수행'),
    P('15:00', '정유나', 'PTSD', '감정평가 (사전)'),
  ],
  '2026-07-17': [
    P('09:00', '이준호', '게임과몰입', '프로그램 수행'),
    P('11:00', '나예솔', 'PTSD', '프로그램 수행'),
    P('16:00', '서지원', '게임과몰입', '감정평가 (사후)'),
  ],
  '2026-07-21': [
    P('10:00', '서지원', '게임과몰입', '프로그램 수행'),
    P('14:00', '조민서', '게임과몰입', '감정평가 (사전)'),
  ],
  '2026-07-27': [
    P('09:00', '김서준', '게임과몰입', '프로세스 시작'),
    P('14:00', '이준호', '게임과몰입', '감정평가 (사전)'),
  ],
  /* 홈 화면 타임라인의 실제 값 */
  '2026-07-29': [
    P('09:00', '김서준', '게임과몰입', '감정평가'),
    { hour: '10:00', title: '나예솔', meta: 'PTSD · 프로그램 수행 (5/8)', bar: true, badge: null },
    P('14:00', '서지원', '게임과몰입', '프로세스 종료'),
    P('17:00', '조민서', '게임과몰입', '프로그램 처방'),
  ],
  '2026-07-31': [
    P('14:00', '정유나', 'PTSD', '프로그램 수행'),
    P('15:00', '조민서', '게임과몰입', '프로세스 종료'),
  ],
  '2026-08-03': [P('11:00', '정유나', 'PTSD', '감정평가 (사후)')],
}

export function toKey(year, month, date) {
  return `${year}-${String(month).padStart(2, '0')}-${String(date).padStart(2, '0')}`
}

/* 칩처럼 좁은 자리에 쓰는 짧은 형태. 예: 7/30 (목) */
export function shortDayLabel(key) {
  const [y, m, d] = key.split('-').map(Number)
  return `${m}/${d} (${WEEKDAY_LABELS[new Date(y, m - 1, d).getDay()]})`
}

/* 오늘 기준 며칠 차이인지. 지난 날은 음수 */
export function daysFrom(key) {
  const [y, m, d] = key.split('-').map(Number)
  const [ty, tm, td] = TODAY_KEY.split('-').map(Number)
  return Math.round((new Date(y, m - 1, d) - new Date(ty, tm - 1, td)) / 86400000)
}

/*
 * 목록에 쓰는 날짜 라벨.
 * 어제·오늘·내일만 상대 표기로 줄이고 나머지는 절대 표기를 쓴다.
 * D-3 형태는 자리는 아끼지만 날짜를 다시 계산해야 읽히고,
 * 지난 건이 D+1이 되어 부호가 헷갈린다.
 */
export function relativeDayLabel(key) {
  const diff = daysFrom(key)
  if (diff === -1) return '어제'
  if (diff === 0) return '오늘'
  if (diff === 1) return '내일'
  return shortDayLabel(key)
}

export function dayLabel(key) {
  const [y, m, d] = key.split('-').map(Number)
  const weekday = WEEKDAY_LABELS[new Date(y, m - 1, d).getDay()]
  return `${m}월 ${d}일 (${weekday})`
}

/* 오늘 기준 앞뒤 offset일의 날짜 키 */
export function shiftedKey(offset) {
  const [y, m, d] = TODAY_KEY.split('-').map(Number)
  const dt = new Date(y, m - 1, d + offset)
  return toKey(dt.getFullYear(), dt.getMonth() + 1, dt.getDate())
}
