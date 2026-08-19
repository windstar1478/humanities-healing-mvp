/*
 * 효과성 분석 mock. **웹 구버전 화면에서 옮겨 온 값이다.**
 *
 * 이 화면은 환자 한 명이 아니라 **프로그램·척도 자체**를 다룬다(4.0.1절의 두 번째
 * 갈래) — 그래서 우측 환자 패널이 없고, 값도 환자 명단이 아니라 연구 표본에서 온다.
 *
 * ⚠️ 게임과몰입 쪽 숫자는 웹 화면에 실제로 적혀 있던 값을 그대로 옮겼다.
 *    PTSD 쪽과 상관표의 나머지 세 블록은 **같은 골격으로 생성한 임의값**이다.
 *    실제 분석 결과가 오면 이 파일만 갈아끼운다.
 *
 * **척도 구성은 앱의 감정평가 설문에서 온다.** 웹 화면은 PHQ-9 · BIS-11 ·
 * K-CAARS를 쓰지만, 그러면 같은 진단의 환자를 두 화면이 다른 척도로 말한다.
 * 이름과 총점도 `surveys.js`에서 읽는다 — 여기 다시 적으면 갈라진다.
 * 인문 척도는 그 코드에 `H-`를 붙인 것이고, 기존 임상 척도는 접두 없는 원본이다.
 */

import { surveys } from './surveys.js'
import { SURVEY_CODES } from './processLibrary.js'

/* 씨앗. 목업 곳곳과 같은 FNV-1a다 — 새로고침해도 값이 달라지면 안 된다 */
function hash(text) {
  let h = 2166136261
  for (let i = 0; i < text.length; i += 1) {
    h ^= text.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

/* -1 ~ 1 사이의 상관계수 하나. 소수 셋째 자리까지 */
const corr = (seed) => Math.round((((hash(seed) % 2000) / 1000) - 1) * 1000) / 1000

export const CONDITIONS = ['게임과몰입', 'PTSD']

/* fNIRS 채널. 좌우가 짝이라 순서를 바꾸지 않는다 */
export const FNIRS_AREAS = [
  'DLPFC_L', 'DLPFC_R', 'mPFC_L', 'mPFC_R', 'VLPFC_L', 'VLPFC_R', 'OFC_L', 'OFC_R',
]

export const BIO_METRICS = [
  'HRV (VLF)', 'HRV (LF)', 'HRV (HF)', 'HRV (LF/HF)', 'HRV (mean BPM)',
  'HRV (SDNN)', 'HRV (RMSSD)', '스트레스 지수', '맥박 변동성',
]

/* 상관표의 네 블록. 접히는 단위다 */
export const BIO_BLOCKS = ['HbO activation', 'HbR activation', 'HbO_RCI mean', 'HbR_RCI mean']

/* 웹 화면에 실제로 있던 HbO activation 블록 */
const HBO_ACTIVATION = [
  [-0.850, 0.408, -0.231, 0.686, -0.668, -0.531, -0.408, -0.753, 0.091],
  [-0.268, -0.244, -0.761, -0.499, -0.771, 0.760, -0.660, 0.054, -0.696],
  [0.142, -0.153, -0.840, -0.214, 0.240, -0.553, 0.282, 0.066, -0.182],
  [-0.554, 0.230, 0.083, 0.110, -0.439, -0.754, 0.162, -0.393, 0.608],
  [0.130, -0.536, -0.796, 0.090, -0.257, 0.312, 0.086, 0.323, -0.113],
  [0.503, -0.046, -0.529, 0.578, -0.743, -0.328, 0.778, -0.535, -0.515],
  [-0.011, 0.818, 0.591, 0.344, -0.440, -0.179, 0.480, -0.743, -0.496],
  [0.799, -0.675, -0.078, -0.621, -0.387, 0.508, 0.752, -0.605, 0.181],
]

function blockOf(condition, block) {
  if (condition === '게임과몰입' && block === 'HbO activation') return HBO_ACTIVATION
  return FNIRS_AREAS.map((area) =>
    BIO_METRICS.map((metric) => corr(`${condition}:${block}:${area}:${metric}`)),
  )
}

/*
 * 사전·사후 점수와 유의값. 연구 표본의 결과라 환자 응답에서 나오지 않는다 —
 * 척도 코드를 해시해 결정론적으로 만든다(새로고침해도 값이 달라지면 안 된다).
 * **낮을수록 양호**를 따르므로 사후가 내려간다(4.6.6절).
 */
function scalesOf(condition) {
  return (SURVEY_CODES[condition] ?? []).map((code) => {
    const survey = surveys[code]
    const seed = hash(`${condition}:${code}`)
    const pre = Math.round(survey.max * (0.55 + (seed % 25) / 100))
    const drop = 0.25 + ((seed >>> 5) % 20) / 100
    return {
      code: `H-${code}`,
      name: survey.name,
      p: Math.round((0.005 + ((seed >>> 9) % 55) / 1000) * 1000) / 1000,
      pre,
      post: Math.max(1, Math.round(pre * (1 - drop))),
      max: survey.max,
    }
  })
}

/* 기존 임상 척도 ↔ 인문 척도 상관. 짝이 되는 자리(대각선)가 높게 나온다 */
function pearsonOf(condition) {
  const codes = SURVEY_CODES[condition] ?? []
  return {
    rows: [...codes].reverse(),
    cols: codes.map((code) => `H-${code}`),
    values: [...codes].reverse().map((row) =>
      codes.map((col) => {
        if (row === col) return Math.round((0.9 + (hash(`${row}:${col}`) % 90) / 1000) * 100) / 100
        return Math.round((0.55 + (hash(`${condition}:${row}:${col}`) % 35) / 100) * 100) / 100
      }),
    ),
  }
}

function similarityOf(condition) {
  return (SURVEY_CODES[condition] ?? []).slice(0, 4).map((code) => ({
    pair: `H-${code} ↔ ${surveys[code].name}`,
    value: Math.round((88 + (hash(`sim:${condition}:${code}`) % 100) / 10) * 10) / 10,
  }))
}

function ttestOf(condition) {
  return {
    n: 200 + (hash(`n:${condition}`) % 80),
    rows: (SURVEY_CODES[condition] ?? []).map((code) => {
      const seed = hash(`t:${condition}:${code}`)
      return {
        pair: `${code} ↔ H-${code}`,
        diff: Math.round((0.4 + (seed % 40) / 100) * 100) / 100,
        t: Math.round((0.9 + ((seed >>> 7) % 110) / 100) * 100) / 100,
        /* 두 척도가 다르지 않다는 것이 이 검정의 결론이라 p가 크다 */
        p: Math.round((0.24 + ((seed >>> 13) % 200) / 1000) * 1000) / 1000,
      }
    }),
  }
}

/*
 * 진단별 고정값. 척도에 딸린 것(사전·사후 · 피어슨 · 유사도 · T-검정)은
 * 설문 목록에서 만들고, 여기에는 **척도와 무관한 값**만 남긴다 —
 * HRV·fNIRS 요약과 해석 문구다.
 *
 * ⚠️ 게임과몰입의 HRV·fNIRS 수치와 문구는 웹 화면에 적혀 있던 값이고,
 *    PTSD 쪽은 같은 골격으로 채운 임의값이다.
 */
const SUMMARY = {
  게임과몰입: {
    /* 방향: up이면 값이 커지는 것이 좋아지는 것이다 */
    hrv: [
      { label: 'SDNN (ms)', pre: 42.3, post: 58.7, better: 'up' },
      { label: 'LF/HF Ratio', pre: 2.41, post: 1.82, better: 'down' },
    ],
    fnirs: { label: 'DLPFC', pre: 0.34, post: 0.61 },
    note: '충동 조절 억제 신경망인 DLPFC 활성화가 유의하게 증가하여, 인문 치유 프로그램이 게임과몰입 환자의 전전두엽 기능 회복과 임상적 완화 효과에 기여함을 시사합니다.',
    similarityNote: '인문학 기반 설문 척도가 기존 임상 지표와 높은 유사도를 보여, 증상군별 인문 치유 프로그램 평가에 활용 가능함을 시사합니다.',
  },
  PTSD: {
    hrv: [
      { label: 'SDNN (ms)', pre: 38.6, post: 51.4, better: 'up' },
      { label: 'LF/HF Ratio', pre: 2.87, post: 2.05, better: 'down' },
    ],
    fnirs: { label: 'mPFC', pre: 0.29, post: 0.52 },
    note: '위협 반응 조절에 관여하는 mPFC 활성화가 증가하고 자율신경 균형이 회복되어, 인문 치유 프로그램이 외상 후 과각성 완화에 기여함을 시사합니다.',
    similarityNote: '인문학 기반 설문 척도가 기존 임상 지표와 높은 유사도를 보여, 외상군 인문 치유 프로그램 평가에 활용 가능함을 시사합니다.',
  },
}

export function effectivenessOf(condition) {
  const key = SUMMARY[condition] ? condition : CONDITIONS[0]
  return {
    ...SUMMARY[key],
    scales: scalesOf(key),
    pearson: pearsonOf(key),
    similarity: similarityOf(key),
    ttest: ttestOf(key),
    /* 상관표는 볼 때 만든다. 네 블록을 전부 들고 있을 이유가 없다 */
    bio: Object.fromEntries(BIO_BLOCKS.map((block) => [block, blockOf(key, block)])),
  }
}

/* 유의수준. 이 값보다 작으면 통계적으로 유의하다고 본다 */
export const ALPHA = 0.05
