import { eventsByDate, toKey, TODAY_KEY } from './schedule.js'

/* '일정' 화면 월 캘린더. 일정 자체는 schedule.js 하나에서 온다 */

export const calendarMonth = {
  label: '2026년 7월',
  year: 2026,
  month: 7,
}

const WEEK_START_MONDAY = 1

/*
 * 6주 × 7일 42칸. 주 시작은 월요일이라 일요일(0)을 7로 민다.
 * 앞뒤 달에 걸친 날짜는 흐리게 표시한다.
 */
export function buildMonthCells({ year, month }) {
  const firstWeekday = ((new Date(year, month - 1, 1).getDay() + 6) % 7) + WEEK_START_MONDAY
  const daysInMonth = new Date(year, month, 0).getDate()
  const cells = []

  const push = (y, m, d, dimmed) => {
    const key = toKey(y, m, d)
    cells.push({ key, date: d, dimmed, isToday: key === TODAY_KEY, events: eventsByDate[key] ?? [] })
  }

  const prevMonthDays = new Date(year, month - 1, 0).getDate()
  for (let i = firstWeekday - 1; i > 0; i -= 1) {
    push(month === 1 ? year - 1 : year, month === 1 ? 12 : month - 1, prevMonthDays - i + 1, true)
  }
  for (let d = 1; d <= daysInMonth; d += 1) push(year, month, d, false)
  for (let d = 1; cells.length < 42; d += 1) {
    push(month === 12 ? year + 1 : year, month === 12 ? 1 : month + 1, d, true)
  }
  return cells
}
