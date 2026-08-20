/*
 * 세션 활동 정의 mock (구버전 웹 '세션활동 저작' 화면 이식).
 *
 * **프로그램(`programs.js`)과는 다른 층이다.** 프로그램은 회차의 이름과 순서를
 * 정하고(4.8.8절), 여기 있는 것은 그 회차 **안에서 무엇을 하는가**다.
 * 구버전 웹의 `작성 완료 (프로그램 세션에 배치 가능)` 체크가 두 층의 관계를
 * 말해 준다 — **프로그램의 세션이 활동을 가져다 놓는다.**
 *
 * 배치는 프로그램 저작의 회차 행에서 한다. 회차가 `activityId`를 들고, 세션
 * 상세(`phasesOf`)가 붙은 활동의 치유단계를 그대로 읽는다 — 아직 붙지 않은
 * 회차만 생성기가 골격으로 채운다.
 *
 * **`done`(작성 완료)이 배치의 자격이다.** 내용이 덜 채워진 활동이 회차에 붙으면
 * 환자를 만나는 자리에 빈 안내문이 오른다.
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
 * 필요 도구는 **자유 입력이다.** 웹은 고정 체크박스 여덟(연필 · 물감 · 색연필 ·
 * 도화지 · 가위 · 풀 · 노트 · 포스트잇)이지만, 프로그램의 준비물이 자유 입력이라
 * 두 목록이 갈렸다 — 활동을 회차에 붙이면 그 준비물이 세션 상세에 그대로 오르므로
 * 같은 자를 써야 한다. 고정 목록에 없는 물건(시 선집 · 워크북)을 적을 길도 생긴다.
 */

export const DIFFICULTIES = ['초급', '중급', '고급']

/*
 * 블록의 두 종류.
 *
 * **안내문 본문은 여러 줄이 될 수 있다.** 줄 하나가 세션 상세의 절차 한 줄(a · b · c)이
 * 된다 — 절차마다 블록을 나누면 같은 활동 종류가 여러 번 되풀이된다.
 *
 * **안내문은 적고, 인문 문장은 고른다.** 인용하는 원문의 원본은 도서 콘텐츠이고
 * (4.8.10절) 블록은 **도서 id + 문장 번호**로 가리키기만 한다 — 문장을 여기
 * 옮겨 적으면 같은 문장이 자리마다 다시 적히고, 어느 책 몇 쪽에서 온 것인지도
 * 남지 않는다. 데이터 명세가 필드를 가리키는 것과 같은 자리다(4.8.7절).
 */
export const BLOCK_KINDS = ['안내문', '인문 문장']

const B = (kind, activity, text, bookId = null, sentence = null) =>
  ({ kind, activity, text, bookId, sentence })

/* 블록이 내용을 갖췄는가. 종류마다 채워야 하는 자리가 다르다 */
export const blockFilled = (block) =>
  block.kind === '인문 문장'
    ? Boolean(block.bookId) && block.sentence !== null
    : Boolean(block.text.trim())
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
        /* 문장은 도서 콘텐츠에서 가리킨다. 여기 적어 두지 않는다 */
        B('인문 문장', '묵독하기', '', 'bk-1', 5),
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
  A('act-4', '프로그램 안내하기', {
    summary: '프로그램의 취지와 전체 흐름을 안내한다',
    condition: 'PTSD',
    emotions: '불안, 감정, 스트레스',
    minutes: 90,
    difficulty: '초급',
    recommended: 1,
    capacity: 1,
    supplies: ['감정 기록지', '필기구'],
    goal: '프로그램의 목표를 함께 확인한다',
    note: '',
    done: true,
    phases: [
      /*
       * 이 한 단계만 Figma 실측 문구다(마음챙김 1세션 PHASE 1).
       * 예전에는 `programs.js`의 생성기가 이 문구를 들고 있었는데,
       * **활동 정의가 생긴 뒤로는 여기가 그 자리다.**
       */
      PHASE('도입', '도입 (Introduction)', [
        B('안내문', '경청하기', [
          '인사를 나누고 프로그램의 취지를 안내한다.',
          '6회기의 전체 프로그램을 비롯하여 애착유형을 통해 나의 관계방식을 점검하고 더 성숙한 관계를 형성하는 것을 목표로 함을 안내한다.',
        ].join('\n')),
        B('안내문', '낭독하기', '참여자들과 함께 이 프로그램 전체를 아우르는 문장을 낭독한다.'),
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

/*
 * 이 도서의 문장을 가리키고 있는 블록들.
 *
 * 도서의 문단을 고치면 **뒤쪽 문장의 번호가 밀려** 그것을 가리키던 블록이 다른
 * 문장을 말하게 된다. 번호가 범위를 넘는 경우는 읽는 화면이 알아채지만
 * (`가리킨 문장을 찾을 수 없습니다`) 밀린 경우는 조용히 바뀌므로,
 * **고치는 자리에서 미리 알린다.** 막지는 않는다 — 고쳐야 할 오타일 수도 있다.
 */
export function citationsOf(bookId) {
  if (!bookId) return []
  return activities.flatMap((activity) =>
    activity.phases.flatMap((phase) =>
      phase.blocks
        .filter((block) => block.kind === '인문 문장' && block.bookId === bookId)
        .map((block) => ({
          activity: activity.name,
          phase: phase.title || phase.type,
          sentence: block.sentence,
        })),
    ),
  )
}

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
 * 무엇이 채워진 것인지는 종류가 정한다(`blockFilled`).
 */
export function saveActivity(draft) {
  const phases = draft.phases
    .map((phase) => ({
      type: phase.type,
      title: phase.title.trim() || phase.type,
      blocks: phase.blocks
        .filter(blockFilled)
        .map((block) => ({
          kind: block.kind,
          activity: block.activity,
          /* 인문 문장은 가리키기만 하므로 적어 둔 글은 버린다 */
          text: block.kind === '인문 문장' ? '' : block.text.trim(),
          bookId: block.kind === '인문 문장' ? block.bookId : null,
          sentence: block.kind === '인문 문장' ? block.sentence : null,
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
    supplies: draft.supplies.split(',').map((item) => item.trim()).filter(Boolean),
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
