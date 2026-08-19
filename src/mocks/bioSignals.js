import { reactive } from 'vue'

/*
 * 생체신호 측정 기록 (웹 구버전 화면 이식).
 *
 * 감정평가 자리에서 HRV·fNIRS 측정값을 올린다. **측정 장비와 백엔드에 묶인
 * 기능이라 모습만 옮겼다** — 파일은 이름만 남기고 내용을 읽지 않는다.
 *
 * 기록은 런타임에 쌓이므로 reactive다. 환자별·시점별로 갈린다 —
 * 사전에 잰 것과 사후에 잰 것이 같은 자리에 섞이면 비교가 안 된다.
 *
 * ⚠️ 항목 이름·단위·임상 범위는 웹 화면에 적혀 있던 값을 그대로 옮겼다.
 *    fNIRS 쪽 범위는 항목과 짝이 맞지 않아 보이지만 임의로 고치지 않았다.
 */

/* 측정 종류. 탭 하나가 종류 하나다 */
export const BIO_KINDS = [
  { key: 'hrv', label: 'HRV', detail: '심박변이도 · 자율신경 활성도' },
  { key: 'fnirs', label: 'fNIRS', detail: '대뇌전두엽 산소화' },
]

const F = (key, label, unit, min, max) => ({ key, label, unit, min, max })

export const BIO_FIELDS = {
  hrv: [
    F('stress', 'Stress Index', '점수', 10, 95),
    F('hrvIndex', 'HRV Index', '점수', 10, 80),
    F('lf', 'LF', 'ms²', 10, 3000),
    F('hf', 'HF', 'ms²', 10, 3000),
    F('lfhf', 'LF/HF Ratio', '비율값', 0.1, 10),
    F('bpm', 'Mean BPM', 'bpm', 40, 140),
    F('sdnn', 'SDNN', 'ms', 5, 100),
    F('rmssd', 'RMSSD', 'ms', 5, 100),
  ],
  fnirs: [
    F('hboAct', 'HbO Activation', '값', 10, 3000),
    F('hboRoi', 'HbO ROI Mean', '값', 0.1, 10),
    F('hbrAct', 'HbR Activation', '값', 10, 3000),
    F('hbrRoi', 'HbR ROI Mean', '값', 40, 140),
  ],
}

/* fNIRS는 좌우 반구 지도를 함께 올린다. 값만으로는 어디가 켜졌는지 모른다 */
export const FNIRS_MAPS = [
  { key: 'hbo', label: 'HbO', detail: '산소를 가진 혈액 성분' },
  { key: 'hbr', label: 'HbR', detail: '탈산소화 헤모글로빈' },
]

/* 환자 · 시점 · 종류로 갈린다 */
const records = reactive({})
const keyOf = (patientId, phase, kind) => `${patientId}:${phase}:${kind}`

export function recordsOf(patientId, phase, kind) {
  return records[keyOf(patientId, phase, kind)] ?? []
}

/*
 * 저장은 명시적 조작이다(3.6절). 측정 시각은 **잰 시각**이라 저장하는 순간의
 * 시계가 아니라 상담사가 고른 값을 그대로 남긴다.
 */
export function addRecord(patientId, phase, kind, record) {
  const key = keyOf(patientId, phase, kind)
  if (!records[key]) records[key] = []
  records[key].unshift({ id: `bio-${Date.now()}`, ...record })
}

export function removeRecord(patientId, phase, kind, id) {
  const list = records[keyOf(patientId, phase, kind)]
  if (!list) return
  const at = list.findIndex((item) => item.id === id)
  if (at >= 0) list.splice(at, 1)
}

/* 범위를 벗어난 값은 잘못 적은 것이다. 저장을 막지는 않고 알린다 */
export function outOfRange(field, value) {
  if (value === '' || value === null || value === undefined) return false
  const number = Number(value)
  return Number.isNaN(number) || number < field.min || number > field.max
}
