/*
 * 환자 분석 화면 mock 데이터. Figma 127:9495의 값을 그대로 옮겼다.
 *
 * 숫자는 백엔드가 내려줄 집계다. 화면이 환자 한 명 한 명을 들고 세는 게 아니라
 * 구간별 합계를 받아 그린다.
 *
 * ⚠️ 칩을 지우면 이 집계도 다시 계산되어야 하지만, 그건 백엔드 몫이라
 * 지금은 값이 그대로 남는다. 칩 제거는 강조(accent)만 바꾼다 — 확인 필요.
 */

/*
 * 필터. 각 항목이 어느 차트의 어느 구간을 강조하는지도 여기서 정한다.
 * 차트의 accent는 '선택 상태'이고, 그 선택은 곧 지금 걸린 필터다.
 */
export const filterDefs = [
  { id: 'gender', label: '여성', dimension: 'gender', keys: ['여'] },
  { id: 'age', label: '40대 이상', dimension: 'age', keys: ['40대', '50대', '60대 이상'] },
  { id: 'condition', label: 'PTSD', dimension: 'condition', keys: ['PTSD'] },
  { id: 'process', label: '프로세스 진행 중', dimension: 'process', keys: ['진행 중'] },
]

/* KPI. 강조된 구간의 합과 같다 (진행 중 128 = PTSD 128 = 여 128 = 40대 이상 128) */
export const summary = { count: 128, total: 532, percent: 24 }

export const processStatus = [
  { key: '시작 전', count: 82 },
  { key: '진행 중', count: 128 },
  { key: '완료', count: 104 },
  { key: '중단', count: 27 },
]

export const conditionTypes = [
  { key: '게임과몰입', count: 23 },
  { key: 'PTSD', count: 128 },
  { key: '동반이환', count: 15 },
]

/* 동반이환이 무엇을 겹친 것인지 밝히는 주석 */
export const conditionNote = '게임과몰입·PTSD'

export const ageGroups = [
  { key: '10대 미만', count: 4 },
  { key: '10대', count: 17 },
  { key: '20대', count: 46 },
  { key: '30대', count: 59 },
  { key: '40대', count: 68 },
  { key: '50대', count: 38 },
  { key: '60대 이상', count: 22 },
]

export const genders = [
  { key: '남', count: 47 },
  { key: '여', count: 128 },
]
