import { ref } from 'vue'

/*
 * 화면 배율. **실기기에서 크기를 고르기 위한 임시 장치다** —
 * 값이 정해지면 이 모듈과 측정 화면을 함께 걷어내고, 정해진 배율은
 * `index.html`의 뷰포트 한 줄로 굳힌다(설계문서 6.2절 47번).
 *
 * 논리 해상도가 1691×974로 확정되면서, Figma 값 그대로인 화면 치수가
 * 의도보다 작게 놓이는 것이 드러났다. 숫자로 정할 수 있는 문제가 아니라
 * 기기를 보고 골라야 해서, 실기기에서 눌러가며 비교할 자리를 만든다.
 *
 * **뷰포트 메타로 건다. `zoom`이나 `transform: scale`이 아니다.**
 * 두 방식은 그려지는 결과만 늘렸다 줄이고 레이아웃이 서는 좌표계는 그대로여서,
 * `dvh`가 화면 높이와 어긋나고 히트 테스트도 갈린다. 뷰포트 메타는 **레이아웃
 * 뷰포트 자체를 바꾸므로** 화면 코드가 아는 세계가 통째로 그 크기가 된다 —
 * `dvh`도 스크롤 상자도 손댈 곳이 없다.
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

/*
 * **배율을 거는 자리는 여기가 아니라 `index.html`의 head다.** 브라우저는 문서를
 * 읽으며 뷰포트를 정하고, 그 뒤에 태그를 고쳐도 다시 잡지 않는다 — 여기서 걸었더니
 * 기기에서 아무 변화가 없었다. 이 모듈은 값을 남기고 문서를 새로 읽게만 한다.
 */
export function setScale(v) {
  if (v === uiScale.value) return
  try { localStorage.setItem(KEY, String(v)) } catch { /* 저장 못 하면 배율을 바꿀 수 없다 */ }
  location.reload()
}

/* 지금 걸려 있는 뷰포트. 기기에서 배율이 실제로 먹었는지 눈으로 확인하는 자리다 */
export function currentViewport() {
  return document.querySelector('meta[name="viewport"]')?.getAttribute('content') ?? '없음'
}
