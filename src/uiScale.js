import { ref } from 'vue'

/*
 * 화면 배율. **실기기에서 크기를 고르기 위한 임시 장치다** —
 * 값이 정해지면 이 모듈과 측정 화면을 함께 걷어내고, 정해진 배율은
 * 화면 코드의 치수에 반영한다(설계문서 6.2절 47번).
 *
 * 논리 해상도가 1691×974로 확정되면서, Figma 값 그대로인 화면 치수가
 * 의도보다 작게 놓이는 것이 드러났다. 숫자로 정할 수 있는 문제가 아니라
 * 기기를 보고 골라야 해서, 실기기에서 눌러가며 비교할 자리를 만든다.
 *
 * **`zoom`으로 건다.** 뷰포트 메타(`initial-scale`)가 더 옳은 자리였지만
 * 실기기에서 반영되지 않았다. `zoom`은 즉시 다시 배치되므로 버튼을 누르는
 * 순간 차이가 보인다 — 비교하는 것이 목적인 화면에서는 이 편이 낫다.
 * 다만 `dvh`까지 줄여주지는 않아 화면 높이는 `h-app`이 배율로 나눈다.
 *
 * 첫 적용은 `index.html`의 head에서 한다. 앱이 뜬 뒤에 걸면 화면이 한 번
 * 작게 그려졌다가 뛴다.
 *
 * `localStorage`를 쓴다 — 로그인 세션(`authState.js`)과 달리 사람이 아니라
 * 기기에 붙는 값이고, 앱을 닫았다 열어도 같은 배율로 이어져야 비교가 된다.
 */
const KEY = 'tablet-app:ui-scale'

export const SCALES = [1, 1.15, 1.25, 1.35, 1.5]

const saved = (() => {
  const v = Number(localStorage.getItem(KEY))
  return SCALES.includes(v) ? v : 1
})()

export const uiScale = ref(saved)

export function setScale(v) {
  uiScale.value = v
  try { localStorage.setItem(KEY, String(v)) } catch { /* 저장 못 해도 이번 세션은 적용된다 */ }
  const el = document.documentElement
  el.style.zoom = v === 1 ? '' : String(v)
  el.style.setProperty('--ui-scale', String(v))
}

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
 *
 * 배율 1에서는 원래 값 그대로다.
 */
export function rectOf(el) {
  const r = el.getBoundingClientRect()
  const s = uiScale.value
  if (s === 1) return r
  return {
    left: r.left / s, top: r.top / s, right: r.right / s, bottom: r.bottom / s,
    width: r.width / s, height: r.height / s, x: r.x / s, y: r.y / s,
  }
}

export function toLayout(n) {
  return n / uiScale.value
}

/*
 * 화면을 벗어나지 않게 가두는 자리가 읽는 값. `window.innerWidth`는 눈에 보이는
 * 화면 픽셀이라, 배율이 걸리면 CSS 좌표와 단위가 어긋난다 — 팝오버가 화면 밖으로
 * 나가거나 반대로 너무 일찍 붙는다. 배율 1에서는 원래 값 그대로다.
 */
export function viewW() {
  return window.innerWidth / uiScale.value
}

export function viewH() {
  return window.innerHeight / uiScale.value
}
