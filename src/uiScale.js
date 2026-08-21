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
 * `initial-scale`이 1보다 크면 레이아웃 뷰포트가 그만큼 좁아지고, 화면 코드의
 * 1px이 물리적으로 그만큼 커진다. `width=device-width`를 함께 주면 안 된다 —
 * 둘 중 넓은 쪽이 이겨서 배율이 무시된다.
 */
export function applyScale() {
  const meta = document.querySelector('meta[name="viewport"]')
  if (!meta) return
  meta.setAttribute('content', uiScale.value === 1
    ? 'width=device-width, initial-scale=1, viewport-fit=cover'
    : `initial-scale=${uiScale.value}, viewport-fit=cover`)
}

export function setScale(v) {
  if (v === uiScale.value) return
  uiScale.value = v
  try { localStorage.setItem(KEY, String(v)) } catch { /* 저장 못 해도 이번 세션은 적용된다 */ }
  applyScale()
  /*
   * 메타를 바꾼 것만으로 다시 배치되지 않는 경우가 있어 확실하게 새로 읽는다.
   * 고른 값은 기기에 남아 있으므로 잃는 것이 없다.
   */
  location.reload()
}
