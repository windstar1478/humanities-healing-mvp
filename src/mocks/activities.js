/*
 * 세션 활동 정의 mock (구버전 웹 '세션활동 저작' 화면 이식).
 *
 * **프로그램(`programs.js`)과는 다른 층이다.** 프로그램은 회차의 이름과 순서를
 * 정하고(4.8.8절), 여기 있는 것은 그 회차 **안에서 무엇을 하는가**다.
 * 구버전 웹의 `작성 완료 (프로그램 세션에 배치 가능)` 체크가 두 층의 관계를
 * 말해 준다 — **프로그램의 세션이 활동을 가져다 놓는다.**
 *
 * ⚠️ 배치(프로그램 세션 ↔ 활동 연결)는 아직 붙이지 않았다. 프로그램의 세션이
 *    지금은 이름 문자열이라, 연결을 붙이려면 세션의 자료형부터 바꿔야 한다.
 *    그때까지 세션 상세는 `programs.js`의 `phasesOf`가 골격으로 채운다.
 *    6.2절 42번 항목 참조.
 */

import { reactive } from 'vue'

/*
 * 활동 종류. 구버전 웹의 칩 세 묶음을 그대로 옮겼다.
 * **블록마다 하나씩 고른다** — 활동 하나에 여러 블록이 있고 블록마다 하는 일이 다르다.
 */
export const ACTIVITY_KINDS = [
  { group: '읽기·듣기', values: ['묵독하기', '낭독하기', '경청하기', '필사하기'] },
  { group: '창작·표현', values: ['글쓰기', '그리기', '만들기', '연기하기'] },
  { group: '상호작용', values: ['대화하기', '토론하기', '발표하기'] },
]

export const allKinds = () => ACTIVITY_KINDS.flatMap((g) => g.values)

/*
 * 치유단계 유형.
 * ⚠️ 웹 화면에서 확인한 것은 `도입` · `투사` 둘이고 나머지 셋은 임의로 채웠다.
 *    프로그램의 PHASE 이름(`programs.js`의 `PHASE_NAMES`)과 같은 축인지도
 *    확정되지 않았다 — 활동이 세션에 배치되면 이것이 PHASE 자리에 들어간다.
 *    6.2절 43번 항목 참조.
 */
export const PHASE_TYPES = ['도입', '투사', '통찰', '통합', '마무리']

/*
 * 필요 도구. 웹은 고정 체크박스 여덟이다.
 * ⚠️ 프로그램의 준비물은 자유 입력이라 두 목록이 갈린다(4.8.8절). 배치가 붙으면
 *    한 목록에서 와야 한다 — 6.2절 42번 항목 참조.
 */
export const SUPPLY_CHOICES = [
  '연필', '물감', '색연필', '도화지', '가위', '풀', '노트', '포스트잇',
]

export const DIFFICULTIES = ['초급', '중급', '고급']

/* 블록의 두 종류. 안내문은 치유사가 읽어 주는 말, 인문 문장은 인용하는 원문이다 */
export const BLOCK_KINDS = ['안내문', '인문 문장']

const B = (kind, activity, text) => ({ kind, activity, text })
const PHASE = (type, title, blocks) => ({ type, title, blocks })

const A = (id, name, spec) => ({ id, name, ...spec })

export const activities = reactive([
  A('act-1', '내 머릿속 기억의 구조', {
    summary: '기억을 도식화',
    condition: 'PTSD',
    emotions: '불안, 혼란',
    minutes: 60,
    difficulty: '고급',
    recommended: 4,
    capacity: 8,
    supplies: ['연필', '도화지', '포스트잇'],
    goal: '기억 구조를 정리한다',
    note: '',
    done: true,
    phases: [
      PHASE('도입', '도입', [
        B('안내문', '낭독하기', '기억 지도를 그린다.'),
      ]),
      PHASE('투사', '투사', [
        B('안내문', '그리기', '떠오르는 장면을 종이 한가운데에 놓고 주변에 이어 붙인다.'),
        B('인문 문장', '묵독하기', '기억은 지나간 시간이 아니라, 지금 다시 놓이는 자리다.'),
      ]),
    ],
  }),
  A('act-2', '오늘의 시 한 편', {
    summary: '시를 함께 읽고 떠오른 말을 나눈다',
    condition: 'PTSD',
    emotions: '불안, 우울',
    minutes: 60,
    difficulty: '초급',
    recommended: 6,
    capacity: 10,
    supplies: ['노트', '연필'],
    goal: '정서를 언어로 옮겨 본다',
    note: '낭독을 부담스러워하면 묵독으로 바꾼다',
    done: true,
    phases: [
      PHASE('도입', '오늘의 시 고르기', [
        B('안내문', '경청하기', '치유사가 시 두 편을 읽어 주고, 마음에 남는 쪽을 고르게 한다.'),
      ]),
      PHASE('통찰', '나의 문장 찾기', [
        B('안내문', '대화하기', '고른 시에서 한 줄을 옮겨 적고 왜 그 줄이었는지 이야기한다.'),
      ]),
    ],
  }),
  A('act-3', '사용 시간 되짚기', {
    summary: '한 주의 사용 기록을 함께 살핀다',
    condition: '게임과몰입',
    emotions: '충동, 불안',
    minutes: 45,
    difficulty: '중급',
    recommended: 1,
    capacity: 1,
    supplies: ['노트', '연필', '포스트잇'],
    goal: '방아쇠가 되는 순간을 찾는다',
    note: '',
    done: false,
    phases: [
      PHASE('도입', '기록 펼치기', [
        B('안내문', '묵독하기', '지난 한 주의 기록지를 펼쳐 놓고 눈에 띄는 날을 표시한다.'),
      ]),
    ],
  }),
])

export const findActivity = (id) => activities.find((a) => a.id === id) ?? null

/* 목록 한 줄에 붙는 요약. 저작도구 목록과 다른 화면이 같은 문법을 쓴다 */
export const activityMeta = (a) => [
  a.condition,
  `${a.phases.length}단계`,
  `${a.phases.reduce((n, p) => n + p.blocks.length, 0)}블록`,
  `${a.minutes}분`,
  a.difficulty,
]

export const nextActivityId = () => `act-${activities.length + 1}-${Date.now().toString(36)}`

/*
 * 저장. 오토세이브가 없으므로(3.6절) 저장 버튼에서만 불린다.
 * **빈 블록·빈 단계는 걷는다** — 내용이 없는 자리는 치유사가 읽을 것이 없다.
 */
export function saveActivity(draft) {
  const phases = draft.phases
    .map((phase) => ({
      type: phase.type,
      title: phase.title.trim() || phase.type,
      blocks: phase.blocks
        .filter((block) => block.text.trim())
        .map((block) => ({
          kind: block.kind,
          activity: block.activity,
          text: block.text.trim(),
        })),
    }))
    .filter((phase) => phase.blocks.length)

  const next = {
    id: draft.id,
    name: draft.name.trim(),
    summary: draft.summary.trim(),
    condition: draft.condition,
    emotions: draft.emotions.trim(),
    minutes: Number(draft.minutes) || 0,
    difficulty: draft.difficulty,
    recommended: Number(draft.recommended) || 0,
    capacity: Number(draft.capacity) || 0,
    supplies: [...draft.supplies],
    goal: draft.goal.trim(),
    note: draft.note.trim(),
    done: draft.done,
    phases,
  }

  const at = activities.findIndex((a) => a.id === next.id)
  if (at >= 0) activities[at] = next
  else activities.unshift(next)
  return next
}
