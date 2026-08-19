import { reactive } from 'vue'

/*
 * 앱 설정 목업. **Figma 디자인이 없어 임의로 만든 것이다.**
 *
 * 테마는 여기 없다 — 좌측 하단에 이미 토글이 있다. 같은 조작을 두 자리에 두면
 * 어느 쪽이 지금 값인지 알 수 없고, 한쪽만 고치면 갈라진다.
 *
 * ⚠️ 항목 구성은 임의값이다. 실제 설정 범위가 확정되면 갈아끼운다.
 */
export const settings = reactive({
  notifySchedule: true,
  notifyTask: true,
  notifySurvey: false,
  sound: false,
  /* 태블릿을 환자에게 건네는 화면이 있어 자동 잠금은 기본으로 켠다 */
  autoLock: true,
})

export const SETTING_ITEMS = [
  { key: 'notifySchedule', label: '일정 알림', detail: '진료 시작 1시간 전에 알립니다' },
  { key: 'notifyTask', label: '작업 기한 알림', detail: '기한이 지난 작업을 알립니다' },
  { key: 'notifySurvey', label: '설문 제출 알림', detail: '환자가 설문을 제출하면 알립니다' },
  { key: 'sound', label: '알림 소리', detail: '진료 중에는 꺼두기를 권합니다' },
  { key: 'autoLock', label: '자동 화면 잠금', detail: '5분간 조작이 없으면 잠급니다' },
]

export const APP_VERSION = '0.1.0 (프로토타입)'

/*
 * 저장은 명시적 조작이다(3.6절). 모달이 사본을 고치고 저장할 때 한 번에 옮긴다 —
 * 스위치를 누를 때마다 반영하면 '취소'가 되돌릴 것이 없다.
 */
export function applySettings(draft) {
  Object.assign(settings, draft)
}
