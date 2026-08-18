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
  /*
   * 현재 단계. **분석 화면의 차트에는 올리지 않는다**(chart: false) —
   * 차트 축을 하나 더 두면 '강조된 구간의 합이 KPI와 같다'는 관계를 읽을 자리가
   * 늘어나 화면이 무거워지고, 프로세스 상태(진행 중/완료…)와 뜻이 겹쳐 보인다.
   *
   * 다만 명단을 거를 때는 이 축이 제일 실용적이다 — '지금 감정평가 단계인 사람'을
   * 찾는 일이 잦다. 그래서 리스트와 우측 패널에서만 쓴다.
   * 구간 순서는 `mocks/process.js`의 단계 순서를 따른다(STATUS_OF_STEP).
   */
  {
    id: 'stage',
    title: '현재 단계',
    chart: false,
    keys: [
      '접수 완료',
      '프로세스 시작',
      '감정평가 (사전)',
      '프로그램 처방',
      '프로그램 수행',
      '감정평가 (사후)',
      '프로세스 종료',
    ],
    value: (patient) => patient.status,
    chipLabel: (values) => values.join('·'),
    labelWidth: 60,
  },
]

/* 분석 화면의 차트가 쓰는 축. 리스트·패널은 위 전체를 쓴다 */
export const chartDimensions = dimensions.filter((d) => d.chart !== false)

/* Figma 127:9495의 초기 상태 — 여성 · 40대 이상 · PTSD · 프로세스 진행 중 */
export const initialFilters = {
  process: ['진행 중'],
  condition: ['PTSD'],
  age: ['40대', '50대', '60대 이상'],
  gender: ['여'],
}
