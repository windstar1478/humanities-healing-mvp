import { reactive } from 'vue'

/*
 * 로그인 세션. **Figma 디자인이 없어 임의로 만든 것이다.**
 *
 * 공유 상태를 셋으로 늘린 자리다(`dragState`·`scheduleState` 다음).
 * 목업 모듈로 두지 않은 것은 이것이 '데이터'가 아니라 **앱의 상태**이기
 * 때문이다 — 라우터 가드가 매 이동마다 읽고, 셸이 그릴지 말지를 여기서 정한다.
 *
 * 아이디·비밀번호를 검사하지 않는다. 백엔드가 없는 프로토타입이라 인증을
 * 흉내 내면 실제로 막지도 못하면서 막힌 것처럼 보인다. **역할만 고른다.**
 */
export const COUNSELOR = { name: '강치유', hospital: '중앙대학교 병원' }

/*
 * 새로고침을 견딘다. **sessionStorage**를 쓰는 것은 탭을 닫으면 지워지기
 * 때문이다 — 병원에서 함께 쓰는 태블릿이라 앱을 닫았다 열면 다시 물어야 한다.
 * localStorage였다면 다음 사람이 앞사람 계정으로 들어간다.
 */
const KEY = 'tablet-app:session'
const saved = (() => {
  try { return JSON.parse(sessionStorage.getItem(KEY)) ?? {} } catch { return {} }
})()

export const session = reactive({
  /* null | 'counselor' | 'patient' */
  role: saved.role ?? null,
  name: saved.name ?? '',
  /* 환자 세션일 때 누구인지. 코드가 환자를 가리킨다 */
  patientId: saved.patientId ?? null,
})

function persist() {
  try {
    if (session.role) {
      sessionStorage.setItem(KEY, JSON.stringify({
        role: session.role, name: session.name, patientId: session.patientId,
      }))
    }
    else sessionStorage.removeItem(KEY)
  } catch { /* 저장할 수 없으면 이번 세션만 유지된다 */ }
}

export function signIn(role, { name = '', patientId = null } = {}) {
  session.role = role
  session.name = name || (role === 'counselor' ? COUNSELOR.name : '')
  session.patientId = patientId
  persist()
}

export function signOut() {
  session.role = null
  session.name = ''
  session.patientId = null
  persist()
}

export const isSignedIn = () => session.role !== null
