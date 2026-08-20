import { reactive } from 'vue'
import { fieldGroups, codeOf, findGroup } from './dataFields.js'

/*
 * 데이터 명세 (웹 구버전 저작도구 이식).
 *
 * **명세는 필드를 골라 묶은 것이다.** 무엇을 수집할지 정하는 자리이고,
 * 필드 자체를 만드는 자리는 데이터 필드(4.8.5절)다. 그래서 명세는
 * **필드를 복제하지 않고 코드명으로 가리킨다** — 필드명을 여기 다시 적으면
 * 필드를 고칠 때 명세가 옛 이름을 들고 남는다.
 *
 * 분류(기본정보 · 감정평가 · 생체신호)는 그룹에서 온다. 명세가 자기 분류를
 * 따로 들면 그룹과 어긋난 조합이 만들어진다.
 *
 * ⚠️ 구버전 웹 화면에서 확인할 수 있는 것은 카드의 요약 줄(이름 · 버전 · 증상 ·
 *    필드수 · 생성일 · 기관 · 작성자)뿐이다. 어떤 필드가 담겼는지는 보이지
 *    않아 **그룹의 필드를 그대로 담은 것으로 두었다.** 임의값이다.
 */

/* 명세를 만든 기관. 웹 카드에 적혀 있던 값들이다 */
export const SPEC_ORGS = [
  '중앙대학교산학협력단',
  '중앙대학교병원',
  '한국문화예술위원회',
  '국립중앙의료원',
  '한국전자통신연구원',
]

const S = (id, name, groupId, condition, org, date) => ({
  id, name, groupId, condition, org, date,
  /* 담긴 필드는 코드명으로 가리킨다 */
  codes: (findGroup(groupId)?.fields ?? []).map((_, i) => codeOf(findGroup(groupId), i)),
})

export const dataSpecs = reactive([
  S('spec-1', '기본명세', 'DS', '게임과몰입', '중앙대학교산학협력단', '2026-07-13'),
  S('spec-2', '기본명세', 'DS', '게임과몰입', '한국문화예술위원회', '2026-07-24'),
  S('spec-3', 'HRV 표준 수집', 'HRV', '게임과몰입', '중앙대학교병원', '2026-07-24'),
  S('spec-4', 'fNIRS 표준 수집', 'FN', 'PTSD', '한국전자통신연구원', '2026-07-24'),
])

/* 명세의 분류는 그룹이 정한다 */
export const categoryOf = (spec) => findGroup(spec.groupId)?.category ?? '기본정보'

/* 이 명세가 가리키는 필드. 그룹이 원본이고 명세는 코드만 든다 */
export function fieldsOf(spec) {
  const group = findGroup(spec.groupId)
  if (!group) return []
  return group.fields
    .map((field, i) => ({ ...field, code: codeOf(group, i) }))
    .filter((field) => spec.codes.includes(field.code))
}

export const findSpec = (id) => dataSpecs.find((s) => s.id === id) ?? null

export const nextSpecId = () => `spec-${dataSpecs.length + 1}-${Date.now().toString(36)}`

/* 그룹 목록은 필드 저작이 만든 것을 그대로 쓴다 */
export const groupChoices = () => fieldGroups

/*
 * 저장. 오토세이브가 없으므로(3.6절) 저장 버튼에서만 불린다.
 * **그룹에 없는 코드는 걷는다** — 그룹에서 지워진 필드를 명세가 붙들고 있으면
 * 필드수가 실제와 어긋난다.
 */
export function saveSpec(draft) {
  const group = findGroup(draft.groupId)
  const valid = (group?.fields ?? []).map((_, i) => codeOf(group, i))

  const next = {
    id: draft.id,
    name: draft.name.trim(),
    groupId: draft.groupId,
    condition: draft.condition,
    org: draft.org,
    date: draft.date,
    codes: draft.codes.filter((code) => valid.includes(code)),
  }

  const at = dataSpecs.findIndex((s) => s.id === next.id)
  if (at >= 0) dataSpecs[at] = next
  else dataSpecs.unshift(next)
  return next
}
