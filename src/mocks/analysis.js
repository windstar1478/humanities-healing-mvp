import { ageBucket } from './patients.js'

/*
 * 환자 분석의 축 정의. 집계 숫자는 여기 없다 —
 * 화면이 명단(mocks/patients.js)에서 직접 센다.
 *
 * 각 축은 '환자에게서 값을 뽑는 법'(value)과 '구간을 늘어놓는 순서'(keys),
 * 그리고 '칩에 뭐라고 쓸지'(chipLabel)를 안다.
 */

/* 구간 순서는 고정이다. 데이터에 없는 구간도 0으로 자리를 지킨다 */
const AGE_KEYS = ['10대 미만', '10대', '20대', '30대', '40대', '50대', '60대 이상']

/*
 * 연령은 '40대 이상'처럼 뭉쳐 읽는 게 자연스럽다.
 * 고른 구간이 뒤쪽으로 이어져 있으면 그렇게 줄이고, 아니면 그대로 나열한다.
 */
function ageChipLabel(values) {
  const picked = AGE_KEYS.filter((k) => values.includes(k))
  const first = AGE_KEYS.indexOf(picked[0])
  const isTail = picked.length > 1 && first + picked.length === AGE_KEYS.length
  if (isTail) return `${picked[0]} 이상`
  return picked.join('·')
}

export const dimensions = [
  {
    id: 'process',
    title: '프로세스 상태',
    keys: ['시작 전', '진행 중', '완료', '중단'],
    value: (patient) => patient.process,
    chipLabel: (values) => `프로세스 ${values.join('·')}`,
    labelWidth: 50,
  },
  {
    id: 'condition',
    title: '진단 유형',
    keys: ['게임과몰입', 'PTSD', '동반이환'],
    value: (patient) => patient.condition,
    chipLabel: (values) => values.join('·'),
    labelWidth: 60,
    /* 동반이환이 무엇을 겹친 것인지 밝힌다 */
    note: '게임과몰입·PTSD',
  },
  {
    id: 'age',
    title: '연령대',
    keys: AGE_KEYS,
    value: (patient) => ageBucket(patient.age),
    chipLabel: ageChipLabel,
  },
  {
    id: 'gender',
    title: '성별',
    keys: ['남', '여'],
    value: (patient) => patient.sex,
    chipLabel: (values) => values.map((v) => (v === '남' ? '남성' : '여성')).join('·'),
  },
]

/* Figma 127:9495의 초기 상태 — 여성 · 40대 이상 · PTSD · 프로세스 진행 중 */
export const initialFilters = {
  process: ['진행 중'],
  condition: ['PTSD'],
  age: ['40대', '50대', '60대 이상'],
  gender: ['여'],
}
