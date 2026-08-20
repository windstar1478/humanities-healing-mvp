import { reactive } from 'vue'
import { BIO_FIELDS } from './bioSignals.js'
import { surveys } from './surveys.js'

/*
 * 데이터 필드 정의 (웹 구버전 저작도구 이식).
 *
 * 1.3절의 세 낱말이 여기 그대로 있다.
 *   그룹명 = 필드 묶음의 이름과 접두 (기본정보 DS · 심박변이도 HRV)
 *   코드명 = 접두 + 순번 (DS0001) — **사람이 적는 값이 아니라 자리에서 나온다**
 *   필드명 = 실제 항목 이름 (환자ID · 성명)
 *
 * **코드명은 저장하지 않는다.** 그룹 접두와 순서가 이미 그 값을 정하는데
 * 따로 적어두면 순서를 바꾸는 순간 둘이 갈라진다. `codeOf`가 그릴 때 만든다.
 *
 * ⚠️ 기본정보(DS) 14개는 구버전 웹 화면에 적혀 있던 것을 그대로 옮겼고,
 *    단위·유형은 화면에서 확인할 수 있는 첫 항목 외에는 임의로 채웠다.
 *    생체신호 두 그룹은 `bioSignals.js`에서 가져온다 — 같은 항목을 두 곳에
 *    적으면 측정 화면과 저작도구가 다른 항목을 말하게 된다.
 *    감정평가 그룹(EA)은 **설문 코드별 총점을 필드로 본 것**이다. 응답 한 줄 한 줄이
 *    아니라 총점이 필드가 되는 이유는 앱이 읽는 값이 그것이기 때문이다 —
 *    처방의 등급 판정도, 종료 화면의 사전·사후 비교도 총점 하나만 본다.
 *    문항 단위로 필드를 만들면 척도를 고칠 때마다 그룹의 필드 수가 흔들린다.
 *    ⚠️ 임의로 정한 단위다. 수집 단위가 확정되면 여기만 바꾼다.
 */

/* UI 유형. 구버전 JSON의 `uiOption.type`이 그대로 값이다 */
export const FIELD_TYPES = [
  { value: 'text', label: '텍스트' },
  { value: 'number', label: '숫자' },
  { value: 'date', label: '날짜' },
  { value: 'select', label: '선택' },
  { value: 'textarea', label: '여러 줄' },
]

/* 그룹의 분류. 데이터 명세가 이 셋으로 탭을 나눈다 */
export const FIELD_CATEGORIES = ['기본정보', '감정평가', '생체신호']

const F = (name, type = 'text', unit = '', values = []) => ({ name, type, unit, values })

/* 생체신호는 측정 화면과 같은 항목을 쓴다. 단위도 거기서 온다 */
const fromBio = (kind) => BIO_FIELDS[kind].map((f) => F(f.label, 'number', f.unit))

/*
 * 감정평가 그룹의 필드. **척도 목록에서 만든다** —
 * 설문 코드를 여기 다시 적으면 척도 저작에서 척도를 늘렸을 때 그룹만 낡는다.
 * 앞의 둘은 어느 시점의 값인지를 남기는 자리다. 총점만 있고 시점이 없으면
 * 사전·사후가 한 칸에 겹친다.
 */
const emotionFields = () => [
  F('평가 시점', 'select', '', ['사전', '사후']),
  F('평가일자', 'date'),
  ...Object.values(surveys).map((survey) => F(`${survey.code} 총점`, 'number', '점')),
]

export const fieldGroups = reactive([
  {
    id: 'DS',
    name: '기본정보',
    category: '기본정보',
    fields: [
      F('환자ID'),
      F('성명'),
      F('생년월일', 'date'),
      F('성별', 'select', '', ['남', '여']),
      F('학력', 'select', '', ['중졸 이하', '고졸', '대졸', '대학원 이상']),
      F('학력 부가정보'),
      F('결혼 상태', 'select', '', ['미혼', '기혼', '이혼', '사별']),
      F('직업'),
      F('가구 월평균 소득', 'number', '만원'),
      F('증상명'),
      F('증상발현일자', 'date'),
      F('정신과적/신경학적 질환 이력', 'textarea'),
      F('평생 병력', 'textarea'),
      F('복용약', 'textarea'),
    ],
  },
  {
    id: 'EA',
    name: '감정평가',
    category: '감정평가',
    fields: emotionFields(),
  },
  {
    id: 'HRV',
    name: '심박변이도',
    category: '생체신호',
    fields: fromBio('hrv'),
  },
  {
    id: 'FN',
    name: 'fNIRS',
    category: '생체신호',
    fields: fromBio('fnirs'),
  },
])

/* 코드명 = 그룹 접두 + 네 자리 순번 (1.3절) */
export const codeOf = (group, index) => `${group.id}${String(index + 1).padStart(4, '0')}`

export const findGroup = (id) => fieldGroups.find((g) => g.id === id) ?? null

/*
 * 저장. 오토세이브가 없으므로(3.6절) 저장 버튼에서만 불린다.
 * 빈 이름의 필드는 걷는다 — 이름 없는 코드명은 가리키는 것이 없다.
 */
export function saveGroup(draft) {
  const fields = draft.fields
    .filter((f) => f.name.trim())
    .map((f) => ({
      name: f.name.trim(),
      type: f.type,
      unit: f.unit.trim(),
      values: f.type === 'select' ? f.values.filter((v) => v.trim()) : [],
    }))

  const next = {
    id: draft.id.trim().toUpperCase(),
    name: draft.name.trim(),
    category: draft.category,
    fields,
  }

  const at = fieldGroups.findIndex((g) => g.id === next.id)
  if (at >= 0) fieldGroups[at] = next
  else fieldGroups.push(next)
  return next
}
