import { reactive } from 'vue'
import { patients } from './patients.js'

/*
 * 환자 접속 코드. **Figma 디자인이 없어 임의로 만든 것이다.**
 *
 * 환자는 아이디·비밀번호를 만들지 않는다. 병원에서 태블릿을 건네받는 자리라
 * 계정을 새로 만들 이유가 없고, 이름·생년월일로 들어가게 하면 **아는 사람의
 * 정보로 남의 기록을 열 수 있다** — 이 앱에서 제일 큰 손실이다(1.2절).
 * 상담사가 그 자리에서 발급한 코드만 통한다.
 *
 * ⚠️ 발급·소멸은 백엔드의 일이다. 여기서는 미리 박아 둔 코드 몇 개를 쓰고,
 *    프로토타입이라 **소진되지 않는다**(한 번 쓰면 못 들어오면 시연이 끊긴다).
 *    로그인 화면이 그 사실을 그대로 밝힌다.
 */
/*
 * 코드는 상담사가 환자 상세에서 발급한다. 발급이 런타임에 일어나므로 reactive다.
 */
export const accessCodes = reactive({
  '482173': 'p-2',
  '509264': 'p-1',
  '671408': 'p-4',
  '330951': 'p-5',
})

/*
 * 시연용으로 로그인 화면에 보여 줄 코드 하나.
 * 상수로 박아 두면 그 환자에게 코드를 다시 발급한 순간 안내가 거짓말이 된다.
 */
export const sampleCode = () => Object.keys(accessCodes)[0] ?? null

export function patientByCode(code) {
  const id = accessCodes[String(code).replace(/\D/g, '')]
  return id ? patients.find((p) => p.id === id) ?? null : null
}

/*
 * 코드 발급. **1회용이므로 새로 내면 그 환자의 이전 코드는 무효가 된다** —
 * 둘 다 살아 있으면 회수하지 못한 종이 한 장이 계속 열쇠로 남는다.
 * (프로토타입이라 '한 번 쓰면 소멸'까지는 하지 않는다 — 시연이 끊긴다)
 */
export function issueCode(patient) {
  Object.keys(accessCodes).forEach((code) => {
    if (accessCodes[code] === patient.id) delete accessCodes[code]
  })
  let code
  do {
    code = String(Math.floor(100000 + Math.random() * 900000))
  } while (accessCodes[code])
  accessCodes[code] = patient.id
  return code
}

/* 지금 이 환자에게 살아 있는 코드 */
export function codeOf(patient) {
  return Object.keys(accessCodes).find((code) => accessCodes[code] === patient.id) ?? null
}
