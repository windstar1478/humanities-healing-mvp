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
export const accessCodes = {
  '482173': 'p-2',
  '509264': 'p-1',
  '671408': 'p-4',
  '330951': 'p-5',
}

/* 시연용으로 화면에 보여 줄 코드 하나 */
export const SAMPLE_CODE = '482173'

export function patientByCode(code) {
  const id = accessCodes[String(code).replace(/\D/g, '')]
  return id ? patients.find((p) => p.id === id) ?? null : null
}
