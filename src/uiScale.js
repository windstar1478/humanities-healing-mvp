/*
 * 화면 배율과, 그 배율이 갈라놓는 두 좌표계를 잇는 자리.
 *
 * 배율 자체는 `style.css`의 `:root`에 있다(왜 1.25인지도 거기 적혀 있다).
 * 여기서는 그 값을 화면 코드가 계산에 쓸 수 있게 들고 있을 뿐이라, **두 곳이
 * 갈라지지 않게 CSS 변수에서 읽는다.**
 */
const declared = Number(
  getComputedStyle(document.documentElement).getPropertyValue('--ui-scale'),
)

export const UI_SCALE = Number.isFinite(declared) && declared > 0 ? declared : 1

/*
 * **화면 좌표를 CSS가 쓰는 좌표로 옮긴다.**
 *
 * 배율이 걸리면 두 좌표계가 갈린다 — `getBoundingClientRect`와 포인터의
 * `clientX`는 눈에 보이는 화면 픽셀로 돌아오는데, `left`·`top`에 적는 값은
 * 배율이 곱해지기 전의 좌표다. 그대로 넘기면 팝오버와 고스트가 배율만큼
 * 오른쪽 아래로 밀린다.
 *
 * 무엇을 어디에 놓을지 정하는 자리(팝오버·콜아웃·드래그 고스트)는 모두 이
 * 함수를 거친다. **어느 요소 위에 있는지 묻는 자리(`elementFromPoint`)는
 * 거치지 않는다** — 그쪽은 화면 좌표를 그대로 받는다.
 */
export function rectOf(el) {
  const r = el.getBoundingClientRect()
  if (UI_SCALE === 1) return r
  return {
    left: r.left / UI_SCALE, top: r.top / UI_SCALE,
    right: r.right / UI_SCALE, bottom: r.bottom / UI_SCALE,
    width: r.width / UI_SCALE, height: r.height / UI_SCALE,
    x: r.x / UI_SCALE, y: r.y / UI_SCALE,
  }
}

export function toLayout(n) {
  return n / UI_SCALE
}

/*
 * 화면을 벗어나지 않게 가두는 자리가 읽는 값. `window.innerWidth`는 눈에 보이는
 * 화면 픽셀이라, 그대로 쓰면 팝오버가 화면 밖으로 나가거나 너무 일찍 붙는다.
 */
export function viewW() {
  return window.innerWidth / UI_SCALE
}

export function viewH() {
  return window.innerHeight / UI_SCALE
}
