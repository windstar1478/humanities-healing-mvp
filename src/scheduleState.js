import { reactive } from 'vue'
import {
  eventsByDate, HOURS, TODAY_KEY, NOW_HOUR, dayLabel, toKey, daysFrom, relativeDayLabel,
} from './mocks/schedule.js'
import { tasks } from './mocks/tasks.js'

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
 * 작업의 유일한 가변 상태.
 *
 * 업무는 배치해도 이 목록에서 사라지지 않는다 — 리마인더로 남고,
 * 내려가는 유일한 길은 완료다. 그래서 같은 업무가 목록과 타임라인 양쪽에 보인다.
 * 완료 상태가 두 곳에 생기지 않도록 타임라인 쪽을 여기서 파생시킨다.
 */
export const taskState = reactive({
  items: tasks.map((task) => ({ ...task })),
})

export function addTask(task) {
  taskState.items.push(task)
}

export function findTask(id) {
  return taskState.items.find((t) => t.id === id) ?? null
}

/* 완료는 명시적 조작이다. 되돌리기도 같은 자리에서 한다 */
export function setTaskDone(id, done) {
  const task = findTask(id)
  if (task) task.done = done
}

/* 배치는 작업에 날짜·시간을 채우는 일이다. 새 이벤트를 만들지 않는다 */
export function placeTask(id, key, hour) {
  const task = findTask(id)
  if (!task) return
  task.date = key
  task.hour = hour
}

/*
 * 작업 행에 붙는 시점 라벨.
 * 기한이 지난 미완료 작업만 경고색을 쓴다 — 악화 표현 전용 규칙이다.
 * 완료된 작업은 지난 날짜여도 악화가 아니므로 중립색으로 둔다.
 */
export function taskWhen(task) {
  if (!task.date) return null
  const diff = daysFrom(task.date)
  if (diff < 0 && !task.done) return { text: `${-diff}일 지남`, overdue: true }
  const day = relativeDayLabel(task.date)
  return { text: task.hour ? `${day} ${task.hour}` : day, overdue: false }
}

/* 시간까지 정해진 작업만 타임라인에 자리를 갖는다 */
function taskEvent(task) {
  return {
    hour: task.hour,
    title: task.title,
    meta: task.category,
    bar: false,
    /* 진행 중 배지는 지금 시각에서 나온다. 작업 데이터가 들고 있을 값이 아니다 */
    badge: task.date === TODAY_KEY && task.hour === NOW_HOUR ? '진행 중' : null,
    taskId: task.id,
    done: task.done,
  }
}

/*
 * 한 시간에 작업은 여러 개 들어갈 수 있다. 환자 일정은 그럴 수 없다 —
 * 그 시간에 그 환자를 만나는 일이라 겹칠 수가 없다.
 * 목록 순서는 추가한 순이다. 아젠다가 대표 한 건을 고를 때 이 순서를 쓴다.
 */
export function eventsOn(key) {
  const placed = taskState.items
    .filter((task) => task.date === key && task.hour)
    .map(taskEvent)
  return [...(scheduleState.byDate[key] ?? []), ...placed].sort((a, b) =>
    a.hour < b.hour ? -1 : 1,
  )
}

/*
 * 여러 건이 있을 때 아젠다에 내보낼 한 건.
 * 완료되지 않은 것이 먼저고, 그 안에서는 마지막으로 추가된 것이 먼저다.
 * (환자 일정은 애초에 한 건뿐이라 이 규칙을 탈 일이 없다)
 */
export function leadEvent(events) {
  if (events.length < 2) return events[0] ?? null
  const open = events.filter((e) => !e.done)
  const pool = open.length ? open : events
  return pool[pool.length - 1]
}

function hourState(key, hour) {
  if (key < TODAY_KEY) return 'past'
  if (key > TODAY_KEY) return 'upcoming'
  if (hour < NOW_HOUR) return 'past'
  return hour === NOW_HOUR ? 'current' : 'upcoming'
}

/*
 * 하루치 타임라인 행. 아젠다가 쓰는 형태.
 * 한 행이 여러 건을 가질 수 있으므로 events 배열을 그대로 넘기고,
 * 대표 한 건은 화면이 leadEvent로 고른다.
 */
export function rowsOn(key) {
  const events = eventsOn(key)
  return HOURS.map((hour) => ({
    hour,
    state: hourState(key, hour),
    events: events.filter((e) => e.hour === hour),
  }))
}

export function dayOn(key) {
  return { key, label: dayLabel(key), isToday: key === TODAY_KEY, rows: rowsOn(key) }
}

/*
 * 그 시간에 놓을 수 있는지. 지나지 않았고,
 * - 환자는 아무것도 없어야 한다
 * - 작업은 다른 작업 위에는 겹칠 수 있다. 환자 일정이 있는 시간만 막는다
 */
export function isOpenHour(row, kind = 'patient') {
  if (row.state === 'past') return false
  if (!row.events.length) return true
  return kind === 'task' && row.events.every((e) => e.taskId)
}

export function openHoursOn(key, kind = 'patient') {
  return rowsOn(key)
    .filter((row) => isOpenHour(row, kind))
    .map((row) => row.hour)
}

/* 지난 날짜이거나 놓을 시간이 하나도 없으면 그 날엔 배치할 수 없다 */
export function canDropOn(key, kind = 'patient') {
  return openHoursOn(key, kind).length > 0
}

/*
 * 같은 날 같은 대상이 이미 있는지.
 * 이미 배치된 작업을 다른 시간으로 옮길 때 자기 자신이 걸리면 안 되므로 제외한다.
 */
export function duplicateOn(key, title, exceptTaskId = null) {
  return eventsOn(key).find(
    (e) => e.title === title && (!exceptTaskId || e.taskId !== exceptTaskId),
  ) ?? null
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
