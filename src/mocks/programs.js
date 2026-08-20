import { reactive } from 'vue'
import { findActivity } from './activities.js'
import { sentenceAt } from './books.js'

/*
 * 인문 프로그램 라이브러리 mock (Figma 178:3788 · 179:4283 · 180:4914).
 *
 * 2단계 '프로그램 처방'이 이 목록에서 하나를 골라 환자에게 붙인다.
 * 치유 프로세스 정의(`processLibrary.js`)와는 다른 층이다 — 프로세스는 단계의
 * 뼈대이고, 여기 있는 것은 그 안의 '프로그램 수행' 단계에 들어갈 내용물이다.
 *
 * **회차 안의 내용은 여기 없다.** 회차는 이름과 붙인 활동만 들고, PHASE와 활동
 * 문구는 세션 활동(`activities.js`)이 원본이다. Figma에 문구가 있던 한 단계
 * (마음챙김 1세션 PHASE 1)도 활동 정의로 옮겼다(`act-4`).
 *
 * ⚠️ Figma에 실제로 적힌 것은 프로그램 4건의 요약 행과 '마음챙김 호흡 이완 훈련'의
 *    세션 6개 이름뿐이다. 나머지 세션 이름은 패턴을 따라 채웠다.
 */

/*
 * 붙은 활동의 치유단계를 PHASE 자리에 옮긴다.
 *
 * **단계의 개수도 활동이 정한다.** 다섯으로 고정하면 세 단계짜리 활동을 붙여도
 * 화면이 다섯 칸을 그려 두 칸이 지어낸 값이 된다.
 */
function phasesFromActivity(program, activity) {
  return activity.phases.map((phase) => ({
    name: phase.title || phase.type,
    /* 장소·인솔은 활동이 들지 않는다. 운영형태에서 나온다 */
    place: program.form === '그룹' ? '집단상담실' : '상담실',
    people: activity.recommended || 1,
    emotions: activity.emotions,
    supplies: activity.supplies,
    /* 메모가 없으면 주의할 것이 없다는 뜻이다 */
    caution: activity.note || '없음',
    staff: `${program.field} 치료사 1인`,
    /*
     * 블록 하나가 활동 한 줄이다. 종류가 제목이고 본문이 그 안의 말이다.
     * **인문 문장은 도서 콘텐츠에서 읽어 온다** — 문단이 짧아져 가리킨 문장이
     * 없어졌으면 그 사실을 말한다. 없는 문장을 지어내지 않는다.
     */
    activities: phase.blocks.map((block) => ({
      title: block.kind === '인문 문장' ? `${block.activity} · 인문 문장` : block.activity,
      steps: block.kind === '인문 문장'
        ? [sentenceAt(block.bookId, block.sentence) ?? '가리킨 문장을 찾을 수 없습니다']
        /* 줄 하나가 절차 한 줄(a · b · c)이다 */
        : block.text.split('\n').map((line) => line.trim()).filter(Boolean),
    })),
  }))
}

/*
 * 이 회차의 PHASE. **붙은 활동이 유일한 출처다.**
 *
 * 예전에는 활동이 없는 회차를 생성기가 그럴듯한 문구로 채웠다
 * (`…의 주제를 문학치료 활동으로 다룬다`). 활동을 붙이는 길이 생긴 뒤로는
 * **그것이 지어낸 값임을 화면이 알 수 없다** — 붙지 않은 회차는 비워 두고
 * 읽는 화면이 그 사실을 말한다.
 */
export function phasesOf(program, sessionIndex) {
  const activity = findActivity(program.sessions[sessionIndex]?.activityId)
  return activity ? phasesFromActivity(program, activity) : []
}

/*
 * 회차 하나 = 이름 + **붙인 세션 활동**(`activityId`).
 *
 * 이름은 프로그램이 정하고(4.8.8절) 그 안에서 무엇을 하는지는 세션 활동이
 * 정한다(4.8.9절). 활동이 붙지 않은 회차는 아직 내용이 정해지지 않은 자리다 —
 * 세션 상세가 `phasesOf`의 골격으로 대신 채운다.
 */
const S = (list) =>
  list.map((item) => (typeof item === 'string' ? { name: item, activityId: null } : item))

const P = (id, name, condition, spec) => ({ id, name, condition, ...spec })

export const programs = reactive([
  P('pg-1', '문학 기반 외상 서사 재구성', 'PTSD', {
    rating: 4.6,
    field: '문학치료',
    form: '그룹',
    org: '중앙대학교병원',
    place: '서울',
    emotions: ['불안', '분노', '무력감'],
    topics: ['서사', '외상'],
    supplies: ['감정 기록지', '필기구', '워크북'],
    summary: '자기 서사를 다시 쓰는 과정으로 외상 기억의 의미를 재구성하는 8회기 그룹 프로그램',
    minutes: 90,
    sessions: S(['오리엔테이션', { name: '기억의 조각', activityId: 'act-1' }, '나의 문장', '다시 쓰는 장면', '타인의 시선', '용서와 거리', '새로운 결말', '마무리']),
  }),
  P('pg-2', '시 읽기 정서조절 프로그램', 'PTSD', {
    rating: 4.6,
    field: '시치료',
    form: '그룹',
    org: '한국문학치료학회',
    place: '서울',
    emotions: ['불안', '우울'],
    topics: ['정서조절', '시'],
    supplies: ['시 선집', '필기구'],
    summary: '시를 함께 읽고 정서를 언어로 옮기며 조절 능력을 기르는 10회기 그룹 프로그램',
    minutes: 60,
    sessions: S(['오리엔테이션', { name: '오늘의 시', activityId: 'act-2' }, '감정에 이름 붙이기', '반복되는 말', '침묵의 자리', '내가 고른 시', '함께 읽기', '나의 시 쓰기', '낭독', '마무리']),
  }),
  P('pg-3', '마음챙김 호흡 이완 훈련', 'PTSD', {
    rating: 4.3,
    field: '명상',
    form: '개인',
    org: '중앙대학교병원',
    place: '서울',
    emotions: ['불안', '감정', '스트레스'],
    topics: ['이완', '애착'],
    supplies: ['색연필', '감정 기록지', '필기구', '스케치북', '아크릴 물감'],
    summary: '마음챙김 호흡 기법으로 신체 각성을 조절하고, 자기 인식과 애착 패턴 이해를 돕는 6회기 개인 프로그램',
    minutes: 90,
    sessions: S([{ name: '소개', activityId: 'act-4' }, '환기', '나라는 단어', '나의 충동 마주보기', '나의 애착 이해하기', '마무리']),
  }),
  P('pg-4', '노년층 자서전 쓰기 프로그램', 'PTSD', {
    rating: 3.9,
    field: '서사치료',
    form: '개인',
    org: '중앙대학교병원',
    place: '서울',
    emotions: ['상실감', '무력감'],
    topics: ['생애사', '서사'],
    supplies: ['사진', '필기구', '스크랩북'],
    summary: '생애의 장면을 글로 옮기며 삶의 의미를 정리하는 6회기 개인 프로그램',
    minutes: 60,
    sessions: S(['오리엔테이션', '어린 시절', '가장 긴 하루', '고마운 사람', '남기고 싶은 말', '마무리']),
  }),
  P('pg-5', '게임 사용 습관 재구성', '게임과몰입', {
    rating: 4.4,
    field: '인지행동',
    form: '개인',
    org: '중앙대학교병원',
    place: '서울',
    emotions: ['충동', '불안'],
    topics: ['습관', '자기조절'],
    supplies: ['사용 기록지', '필기구'],
    summary: '사용 기록을 함께 살피며 대체 활동을 설계하는 6회기 개인 프로그램',
    minutes: 60,
    sessions: S(['오리엔테이션', '나의 사용 시간', '방아쇠 찾기', '대체 활동 설계', '실패 다루기', '마무리']),
  }),
  P('pg-6', '철학 대화로 보는 나의 서사', '게임과몰입', {
    rating: 4.1,
    field: '철학상담',
    form: '그룹',
    org: '한국철학상담치료학회',
    place: '서울',
    emotions: ['공허', '무력감'],
    topics: ['자기이해', '대화'],
    supplies: ['토론 카드', '필기구'],
    summary: '묻고 답하는 대화로 몰입의 자리를 다시 보는 8회기 그룹 프로그램',
    minutes: 90,
    sessions: S(['오리엔테이션', '나는 무엇에 몰입하는가', '즐거움과 중독', '시간이라는 것', '관계의 자리', '나를 설명하는 말', '다시 고르기', '마무리']),
  }),
])

/*
 * 필터 축. Figma에 열린 상태가 없어 선택지 구성은 초안이다.
 * 목록에서 세지 않고 축을 고정해 두면 프로그램을 추가할 때 축이 갈라진다 —
 * 값은 명단에서 뽑는다.
 */
export const PROGRAM_FILTERS = [
  { id: 'emotion', label: '치유대상감정', values: (list) => [...new Set(list.flatMap((p) => p.emotions))] },
  { id: 'topic', label: '주제어', values: (list) => [...new Set(list.flatMap((p) => p.topics))] },
  { id: 'form', label: '운영형태', values: (list) => [...new Set(list.map((p) => p.form))] },
  { id: 'org', label: '기관', values: (list) => [...new Set(list.map((p) => p.org))] },
]

export const PROGRAM_SORTS = [
  { key: 'recommend', label: '추천순', compare: (a, b) => (b.rating ?? -1) - (a.rating ?? -1) },
  { key: 'session', label: '세션 적은순', compare: (a, b) => a.sessions.length - b.sessions.length },
  { key: 'name', label: '이름순', compare: (a, b) => a.name.localeCompare(b.name, 'ko') },
]

export const matchesFilter = (program, id, value) => {
  if (id === 'emotion') return program.emotions.includes(value)
  if (id === 'topic') return program.topics.includes(value)
  if (id === 'form') return program.form === value
  return program.org === value
}

/* 행에 한 줄로 붙는 요약. 목록과 '선택됨' 문구가 같은 문법을 쓴다 */
export const programMeta = (p) =>
  `효과성 ${p.rating ?? '-'} · ${p.sessions.length}세션 · ${p.field} · ${p.form} · ${p.org}`

export function findProgram(id) {
  return programs.find((p) => p.id === id) ?? null
}

/*
 * 감정 지표. 감정평가 결과를 0–100으로 정규화한 다섯 축이고 **높을수록 양호**다.
 *
 * ⚠️ 값은 Figma 실측을 그대로 둔 임시값이다. 설문 점수에서 이 다섯 축을 뽑는
 *    규칙은 확인되지 않았다 — 규칙이 나오면 화면이 계산하도록 바꾼다.
 */
export const emotionAxes = [
  { id: 'frustration', label: '좌절/불안', value: 66 },
  { id: 'arousal', label: '과각성', value: 72 },
  { id: 'withdrawal', label: '대인 위축', value: 68 },
  { id: 'safety', label: '관계 안전', value: 45 },
  { id: 'resilience', label: '회복탄력성', value: 55 },
]

/*
 * 프로그램 저작(저작도구)의 저장. 편집 화면은 `views/ProgramEditorView.vue`다.
 *
 * **회차의 이름과 순서까지가 이 화면의 몫이다.** 회차 안의 PHASE와 활동은
 * 세션 활동 저작이 만든다(4.8.9절) — 회차에 활동을 붙이면 `phasesOf`가 그것을
 * 읽고, 아직 붙지 않은 회차만 생성기가 골격으로 채운다.
 *
 * **효과성(`rating`)은 받지 않는다.** 수행 기록에서 나오는 값이지 만드는 사람이
 * 정하는 값이 아니다. 새 프로그램은 아직 잴 것이 없어 `null`이고 화면이 `-`로
 * 그린다 — 0으로 두면 '효과가 없다'는 측정 결과로 읽힌다.
 */
export function saveProgram(draft) {
  const list = (text) =>
    text.split(',').map((item) => item.trim()).filter(Boolean)

  const found = findProgram(draft.id)
  const next = {
    id: draft.id,
    name: draft.name.trim(),
    condition: draft.condition,
    /* 저작이 정하지 않는 값이라 원본을 그대로 옮긴다 */
    rating: found?.rating ?? null,
    field: draft.field.trim(),
    form: draft.form,
    org: draft.org.trim(),
    place: draft.place.trim(),
    emotions: list(draft.emotions),
    topics: list(draft.topics),
    supplies: list(draft.supplies),
    summary: draft.summary.trim(),
    minutes: Number(draft.minutes) || 0,
    /* 빈 줄은 회차가 아니다. 이름 없는 회차를 남기면 목록에 빈 행이 선다 */
    sessions: draft.sessions
      .map((item) => ({ name: item.name.trim(), activityId: item.activityId }))
      .filter((item) => item.name),
  }

  const at = programs.findIndex((p) => p.id === next.id)
  if (at >= 0) programs[at] = next
  else programs.unshift(next)
  return next
}

/* 새 프로그램의 id. 목록 안에서만 유일하면 된다 */
export const nextProgramId = () => `pg-${programs.length + 1}-${Date.now().toString(36)}`

/* 운영형태. 목록에서 세지 않고 고정한다 — 새로 만들 때 고를 값이 필요하다 */
export const PROGRAM_FORMS = ['개인', '그룹']
