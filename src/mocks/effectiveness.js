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
 * ⚠️ 여기 쓰는 척도 구성(PHQ-9 · BIS-11 · K-CAARS …)은 앱의 감정평가 설문
 *    목록(`surveys.js`)과 다르다. 웹 화면의 구성을 그대로 옮긴 것이라,
 *    어느 쪽이 맞는지 확인이 필요하다.
 */

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

const S = (code, name, p, pre, post, max) => ({ code, name, p, pre, post, max })

const GAME = {
  scales: [
    S('H-PHQ-9', '우울증 자가 검사', 0.023, 42, 28, 50),
    S('H-GAD-7', '범불안장애척도', 0.013, 62, 46, 70),
    S('H-BIS-11', 'Barratt 충동성 척도', 0.036, 41, 23, 50),
    S('H-K-CAARS', '한국판 성인 ADHD 척도', 0.041, 55, 38, 60),
    S('H-IGDS9-SF', '인터넷 게임장애 척도', 0.008, 34, 19, 40),
    S('H-YIAS', '인터넷 중독 척도', 0.019, 68, 45, 80),
  ],
  /* 방향: up이면 값이 커지는 것이 좋아지는 것이다 */
  hrv: [
    { label: 'SDNN (ms)', pre: 42.3, post: 58.7, better: 'up' },
    { label: 'LF/HF Ratio', pre: 2.41, post: 1.82, better: 'down' },
  ],
  fnirs: { label: 'DLPFC', pre: 0.34, post: 0.61 },
  note: '충동 조절 억제 신경망인 DLPFC 활성화가 유의하게 증가하여, 인문 치유 프로그램이 게임과몰입 환자의 전전두엽 기능 회복과 임상적 완화 효과에 기여함을 시사합니다.',
  pearson: {
    rows: ['K-CAARS', 'BIS-11', 'GAD-7', 'PHQ-9', 'YIAS', 'IGDS9-SF'],
    cols: ['H-IGDS9-SF', 'H-YIAS', 'H-PHQ-9', 'H-GAD-7', 'H-BIS-11', 'H-K-CAARS'],
    values: [
      [0.62, 0.66, 0.63, 0.70, 0.82, 0.89],
      [0.62, 0.83, 0.59, 0.69, 0.90, 0.58],
      [0.75, 0.81, 0.63, 0.97, 0.89, 0.76],
      [0.69, 0.84, 0.96, 0.56, 0.66, 0.75],
      [0.58, 0.97, 0.73, 0.78, 0.78, 0.75],
      [0.90, 0.79, 0.58, 0.70, 0.59, 0.57],
    ],
  },
  similarity: [
    { pair: 'H-IGDS9-SF ↔ 인터넷 게임장애 척도', value: 95.3 },
    { pair: 'H-YIAS ↔ 인터넷 중독 척도', value: 91.2 },
    { pair: 'H-PHQ-9 ↔ 우울증 자가 검사', value: 91.5 },
    { pair: 'H-GAD-7 ↔ 범불안장애척도', value: 94.7 },
  ],
  similarityNote: '인문학 기반 설문 척도가 기존 임상 지표와 높은 유사도를 보여, 증상군별 인문 치유 프로그램 평가에 활용 가능함을 시사합니다.',
  ttest: {
    n: 250,
    rows: [
      { pair: 'IGDS9-SF ↔ H-IGDS9-SF', diff: 0.62, t: 1.71, p: 0.301 },
      { pair: 'YIAS ↔ H-YIAS', diff: 0.50, t: 1.49, p: 0.352 },
      { pair: 'PHQ-9 ↔ H-PHQ-9', diff: 0.57, t: 1.83, p: 0.246 },
      { pair: 'GAD-7 ↔ H-GAD-7', diff: 0.68, t: 0.99, p: 0.316 },
      { pair: 'BIS-11 ↔ H-BIS-11', diff: 0.60, t: 1.42, p: 0.419 },
      { pair: 'K-CAARS ↔ H-K-CAARS', diff: 0.52, t: 1.82, p: 0.279 },
    ],
  },
}

/* PTSD 쪽은 같은 골격으로 채운 임의값이다 */
const PTSD = {
  scales: [
    S('H-PCL-5', 'PTSD 증상 체크리스트', 0.011, 58, 37, 80),
    S('H-CAPS-5', '임상가 면담 평가', 0.029, 31, 19, 40),
    S('H-GAD-7', '범불안장애척도', 0.018, 16, 9, 21),
    S('H-BDI-II', '벡 우울 척도', 0.044, 29, 18, 63),
    S('H-WHOQOL', '삶의 질 척도', 0.033, 44, 66, 100),
    S('H-RSES', '자아존중감 척도', 0.052, 22, 31, 40),
  ],
  hrv: [
    { label: 'SDNN (ms)', pre: 38.6, post: 51.4, better: 'up' },
    { label: 'LF/HF Ratio', pre: 2.87, post: 2.05, better: 'down' },
  ],
  fnirs: { label: 'mPFC', pre: 0.29, post: 0.52 },
  note: '위협 반응 조절에 관여하는 mPFC 활성화가 증가하고 자율신경 균형이 회복되어, 인문 치유 프로그램이 외상 후 과각성 완화에 기여함을 시사합니다.',
  pearson: {
    rows: ['RSES', 'WHOQOL', 'BDI-II', 'GAD-7', 'CAPS-5', 'PCL-5'],
    cols: ['H-PCL-5', 'H-CAPS-5', 'H-GAD-7', 'H-BDI-II', 'H-WHOQOL', 'H-RSES'],
    values: [
      [0.55, 0.61, 0.58, 0.64, 0.79, 0.93],
      [0.59, 0.63, 0.60, 0.72, 0.95, 0.71],
      [0.66, 0.70, 0.68, 0.94, 0.74, 0.62],
      [0.72, 0.77, 0.96, 0.71, 0.65, 0.60],
      [0.81, 0.95, 0.74, 0.69, 0.62, 0.58],
      [0.94, 0.83, 0.70, 0.66, 0.60, 0.57],
    ],
  },
  similarity: [
    { pair: 'H-PCL-5 ↔ PTSD 증상 체크리스트', value: 96.1 },
    { pair: 'H-CAPS-5 ↔ 임상가 면담 평가', value: 93.4 },
    { pair: 'H-GAD-7 ↔ 범불안장애척도', value: 94.7 },
    { pair: 'H-BDI-II ↔ 벡 우울 척도', value: 90.8 },
  ],
  similarityNote: '인문학 기반 설문 척도가 기존 임상 지표와 높은 유사도를 보여, 외상군 인문 치유 프로그램 평가에 활용 가능함을 시사합니다.',
  ttest: {
    n: 214,
    rows: [
      { pair: 'PCL-5 ↔ H-PCL-5', diff: 0.58, t: 1.64, p: 0.288 },
      { pair: 'CAPS-5 ↔ H-CAPS-5', diff: 0.47, t: 1.22, p: 0.374 },
      { pair: 'GAD-7 ↔ H-GAD-7', diff: 0.61, t: 1.55, p: 0.302 },
      { pair: 'BDI-II ↔ H-BDI-II', diff: 0.55, t: 1.78, p: 0.261 },
      { pair: 'WHOQOL ↔ H-WHOQOL', diff: 0.49, t: 1.31, p: 0.398 },
      { pair: 'RSES ↔ H-RSES', diff: 0.53, t: 1.69, p: 0.284 },
    ],
  },
}

const DATA = { 게임과몰입: GAME, PTSD: PTSD }

export function effectivenessOf(condition) {
  const base = DATA[condition] ?? GAME
  return {
    ...base,
    /* 상관표는 볼 때 만든다. 네 블록을 전부 들고 있을 이유가 없다 */
    bio: Object.fromEntries(BIO_BLOCKS.map((block) => [block, blockOf(condition, block)])),
  }
}

/* 유의수준. 이 값보다 작으면 통계적으로 유의하다고 본다 */
export const ALPHA = 0.05
