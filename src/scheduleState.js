import { reactive } from 'vue'
import { eventsByDate, HOURS, TODAY_KEY, NOW_HOUR, dayLabel, toKey } from './mocks/schedule.js'
import { unassignedTasks } from './mocks/home.js'

/*
 * 일정의 유일한 가변 상태. 목업을 한 번 복사해 두고 모든 화면이 함께 읽고 쓴다.
 * 화면마다 사본을 들면 아젠다에서 배치한 일정이 캘린더에 보이지 않는다.
 */
export const scheduleState = reactive({
  byDate: Object.fromEntries(
    Object.entries(eventsByDate).map(([key, events]) => [key, events.map((e) => ({ ...e }))]),
  ),
})

/*
 * 미배정 할 일. 날짜나 시간이 정해지지 않은 업무가 모이는 곳이다.
 * 아젠다 타임라인은 시간 키(HOURS) 기준이라 시간 없는 이벤트를 그릴 자리가 없다.
 * 그래서 '미정' 업무는 일정이 아니라 여기로 간다.
 * 화면 로컬 상태로 두면 캘린더에서 만든 미정 업무가 홈에 나타나지 않는다.
 */
export const taskState = reactive({
  items: unassignedTasks.map((task) => ({ ...task })),
})

export function addTask(task) {
  taskState.items.push(task)
}

export function eventsOn(key) {
  return scheduleState.byDate[key] ?? []
}

function hourState(key, hour) {
  if (key < TODAY_KEY) return 'past'
  if (key > TODAY_KEY) return 'upcoming'
  if (hour < NOW_HOUR) return 'past'
  return hour === NOW_HOUR ? 'current' : 'upcoming'
}

/* 하루치 타임라인 행. 아젠다가 쓰는 형태 */
export function rowsOn(key) {
  const events = eventsOn(key)
  return HOURS.map((hour) => ({
    hour,
    state: hourState(key, hour),
    event: events.find((e) => e.hour === hour) ?? null,
  }))
}

export function dayOn(key) {
  return { key, label: dayLabel(key), isToday: key === TODAY_KEY, rows: rowsOn(key) }
}

/* 비어 있고 지나지 않은 시간. 드롭 가능 규칙과 같은 목록이다 */
export function openHoursOn(key) {
  return rowsOn(key)
    .filter((r) => !r.event && r.state !== 'past')
    .map((r) => r.hour)
}

/* 지난 날짜이거나 빈 시간이 하나도 없으면 그 날엔 배치할 수 없다 */
export function canDropOn(key) {
  return openHoursOn(key).length > 0
}

/* 같은 날 같은 대상이 이미 있는지 */
export function duplicateOn(key, title) {
  return eventsOn(key).find((e) => e.title === title) ?? null
}

export function addEvent(key, event) {
  if (!scheduleState.byDate[key]) scheduleState.byDate[key] = []
  scheduleState.byDate[key].push(event)
}

/*
 * 월 캘린더 42칸(6주 × 7일). 주 시작은 월요일이라 일요일(0)을 7로 민다.
 * 앞뒤 달에 걸친 날짜는 흐리게 표시한다.
 */
export function monthCells({ year, month }) {
  const firstWeekday = ((new Date(year, month - 1, 1).getDay() + 6) % 7) + 1
  const daysInMonth = new Date(year, month, 0).getDate()
  const prevMonthDays = new Date(year, month - 1, 0).getDate()
  const cells = []

  const push = (y, m, d, dimmed) => {
    const key = toKey(y, m, d)
    cells.push({ key, date: d, dimmed, isToday: key === TODAY_KEY, events: eventsOn(key) })
  }

  for (let i = firstWeekday - 1; i > 0; i -= 1) {
    push(month === 1 ? year - 1 : year, month === 1 ? 12 : month - 1, prevMonthDays - i + 1, true)
  }
  for (let d = 1; d <= daysInMonth; d += 1) push(year, month, d, false)
  for (let d = 1; cells.length < 42; d += 1) {
    push(month === 12 ? year + 1 : year, month === 12 ? 1 : month + 1, d, true)
  }
  return cells
}
