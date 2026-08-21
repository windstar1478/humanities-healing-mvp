import { reactive } from 'vue'

/*
 * 셸(우측 환자 패널)과 화면(미배정 목록 · 일정 타임라인)이 함께 쓰는 공유 상태.
 * 규모가 이 정도라 Pinia 대신 reactive 객체 하나로 시작한다.
 * 꾹 누르기 로직도 여기 두어 환자와 할 일이 같은 문법을 쓰게 한다.
 */
export const dragState = reactive({
  /* 집어 든 대상. null이면 배치 모드가 아니다 */
  item: null,
  /* 'patient' | 'task' */
  itemKind: null,
  /* 고스트가 따라갈 포인터 좌표 */
  x: 0,
  y: 0,
  /* 손가락 아래에 있는 드롭 가능한 시간. 없으면 null (아젠다) */
  hoverHour: null,
  /* 손가락 아래에 있는 드롭 가능한 날짜 키. 없으면 null (캘린더) */
  hoverDate: null,
  /* 손을 뗀 뒤 확인 대기 중인 배치. { item, itemKind, hour, dateKey } */
  pending: null,
  /*
   * 놓을 수 없는 자리에 놓았을 때의 사유. { title, detail, x, y }
   * 드롭 상태가 blocked인 것은 드래그하는 동안 보이지만, 손을 떼는 순간
   * 그 표현이 통째로 사라진다. 아무 일도 일어나지 않으면 고장으로 읽히므로
   * 비활성 사유 콜아웃과 같은 문법으로 이유를 남긴다.
   */
  rejected: null,
})

/* 꾹 누르기 인식 임계. Figma 정의값이 아니라 잠정값 */
export const LONG_PRESS_MS = 500

/* 이 거리를 넘겨 움직이면 스크롤 의도로 보고 꾹 누르기를 취소한다 */
export const PRESS_MOVE_TOLERANCE = 10

let pressTimer = null
let pressOrigin = null

/*
 * 꾹 눌러 배치한 직후에도 pointerup 뒤에 click이 한 번 더 온다.
 * 같은 행이 탭(상세 열기)과 꾹 누르기(배치)를 둘 다 받으므로,
 * 배치로 끝난 제스처의 click은 여기서 한 번 삼킨다.
 */
let swallowNextClick = false

/*
 * 손을 뗀 자리가 누른 자리와 다르면 click이 아예 오지 않는다.
 * 그때 플래그가 남으면 그 다음 탭을 엉뚱하게 삼키므로,
 * 새 제스처가 시작될 때 반드시 푼다.
 */
export function beginGesture() {
  swallowNextClick = false
}

export function swallowDragClick(event) {
  if (!swallowNextClick) return
  swallowNextClick = false
  event.stopPropagation()
  event.preventDefault()
}

function clearPress() {
  if (pressTimer) clearTimeout(pressTimer)
  pressTimer = null
  pressOrigin = null
}

function resetDrag() {
  dragState.item = null
  dragState.itemKind = null
  dragState.hoverHour = null
  dragState.hoverDate = null
}

/*
 * 아젠다는 시간 칸이, 캘린더는 날짜 칸이 드롭 대상이다.
 * 두 화면이 같은 드래그를 쓰므로 여기서 한 번에 판정한다.
 */
function targetUnder(x, y) {
  const el = document.elementFromPoint(x, y)
  /*
   * 놓을 수 없는 자리도 표시를 달고 있다. 놓을 수 있는 자리만 표시하면
   * '막힌 자리'와 '아무것도 없는 빈 화면'을 구분할 수 없어서,
   * 빗나간 드롭까지 경고가 뜬다.
   */
  const blocked = el?.closest('[data-blocked-title]')
  return {
    hour: el?.closest('[data-drop-hour]')?.dataset.dropHour ?? null,
    date: el?.closest('[data-drop-date]')?.dataset.dropDate ?? null,
    blocked: blocked
      ? { title: blocked.dataset.blockedTitle, detail: blocked.dataset.blockedDetail ?? null }
      : null,
  }
}

export function startPress(event, item, kind) {
  pressOrigin = { x: event.clientX, y: event.clientY }
  dragState.x = event.clientX
  dragState.y = event.clientY
  pressTimer = setTimeout(() => {
    dragState.item = item
    dragState.itemKind = kind
    pressTimer = null
  }, LONG_PRESS_MS)
}

/* 임계 시간 전에 손가락이 움직이면 스크롤 의도이므로 넘겨준다 */
export function trackPress(event) {
  if (!pressTimer || !pressOrigin) return
  const dx = event.clientX - pressOrigin.x
  const dy = event.clientY - pressOrigin.y
  if (Math.hypot(dx, dy) > PRESS_MOVE_TOLERANCE) clearPress()
}

/*
 * 배치 모드에서는 손가락이 행을 벗어나므로 window에서 추적한다.
 * 고스트는 pointer-events-none이라 elementFromPoint를 방해하지 않는다.
 */
export function trackDrag(event) {
  if (!dragState.item) return
  dragState.x = event.clientX
  dragState.y = event.clientY
  const { hour, date } = targetUnder(event.clientX, event.clientY)
  dragState.hoverHour = hour
  dragState.hoverDate = date
}

/* 손을 뗀 좌표로 다시 판정한다. 직전 hover 값을 그대로 쓰면 안 된다 */
export function endPress(event) {
  clearPress()
  if (dragState.item) {
    swallowNextClick = true
    const live = Number.isFinite(event?.clientX)
      ? targetUnder(event.clientX, event.clientY)
      : { hour: dragState.hoverHour, date: dragState.hoverDate }
    /* 날짜 칸에 놓으면 시간은 확인 모달에서 고른다 */
    if (live.hour || live.date) {
      dragState.pending = {
        item: dragState.item,
        itemKind: dragState.itemKind,
        hour: live.hour,
        dateKey: live.date,
      }
    } else if (live.blocked) {
      /* 놓을 수 없는 자리다. 왜 안 되는지 손 뗀 자리에 남긴다 */
      dragState.rejected = { ...live.blocked, x: dragState.x, y: dragState.y }
    }
  }
  resetDrag()
}

/*
 * 배치 중에는 브라우저가 이 제스처를 스크롤로 가져가지 못하게 막는다.
 *
 * 패널도 목록도 스크롤 상자라, 꾹 누르기가 걸린 뒤 손가락이 움직이면
 * 브라우저가 스크롤을 시작하면서 `pointercancel`을 쏜다 — 배치가 그
 * 자리에서 끊긴다. 마우스에는 이 이벤트가 없어 PC에서는 드러나지 않는다.
 *
 * `touch-action`으로는 막을 수 없다. 제스처가 시작될 때 한 번 읽는 값이라
 * 도중에 바꿔도 이미 진행 중인 제스처에는 걸리지 않고, 행에 미리 걸어두면
 * 목록을 손가락으로 굴릴 수 없게 된다. **첫 움직임을 취소해** 스크롤이
 * 시작되지 못하게 하는 것이 유일하게 맞는 자리다.
 *
 * 등록할 때 `passive: false`를 반드시 줄 것 — 기본값이 passive라
 * `preventDefault`가 조용히 무시된다.
 */
export function suppressTouchScroll(event) {
  if (dragState.item && event.cancelable) event.preventDefault()
}

export function clearRejected() {
  dragState.rejected = null
}

/* 취소는 배치하지 않고 빠져나온다 */
export function cancelDrag() {
  clearPress()
  resetDrag()
}
