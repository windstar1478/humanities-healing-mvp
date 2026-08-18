/*
 * 인문 프로그램 라이브러리 mock (Figma 178:3788 · 179:4283 · 180:4914).
 *
 * 2단계 '프로그램 처방'이 이 목록에서 하나를 골라 환자에게 붙인다.
 * 치유 프로세스 정의(`processLibrary.js`)와는 다른 층이다 — 프로세스는 단계의
 * 뼈대이고, 여기 있는 것은 그 안의 '프로그램 수행' 단계에 들어갈 내용물이다.
 *
 * ⚠️ **세션·PHASE의 내용은 임의로 지은 목업이다.** Figma에 실제로 적힌 것은
 *    프로그램 4건의 요약 행과 '마음챙김 호흡 이완 훈련'의 세션 6개 이름,
 *    그리고 1세션 PHASE 1의 활동 문구뿐이다. 나머지는 패턴을 따라 채웠다.
 */

/* PHASE는 세션마다 다섯이다. 이름은 Figma의 'PHASE 1 도입 (Introduction)'을 따랐다 */
const PHASE_NAMES = [
  '도입 (Introduction)',
  '전개 (Development)',
  '심화 (Deepening)',
  '정리 (Consolidation)',
  '마무리 (Closing)',
]

/*
 * Figma에 문구가 있는 것은 마음챙김 1세션 PHASE 1 하나뿐이다.
 * 나머지는 아래 생성기가 같은 골격으로 채운다 — 임의값임을 숨기지 않으려고
 * 문장을 그럴듯하게 늘리지 않았다.
 */
const FIGMA_PHASE = {
  place: '상담실',
  people: 1,
  emotions: '불안, 감정, 스트레스',
  supplies: ['감정 기록지', '필기구'],
  caution: '없음',
  staff: '임상심리사 1인',
  activities: [
    {
      title: '프로그램 안내하기',
      steps: [
        '인사를 나누고 프로그램의 취지를 안내한다.',
        '6회기의 전체 프로그램을 비롯하여 애착유형을 통해 나의 관계방식을 점검하고 더 성숙한 관계를 형성하는 것을 목표로 함을 안내한다.',
        '참여자들과 함께 이 프로그램 전체를 아우르는 문장을 낭독한다.',
      ],
    },
  ],
}

const phaseFor = (program, session, index) => ({
  name: PHASE_NAMES[index],
  place: program.form === '그룹' ? '집단상담실' : '상담실',
  people: program.form === '그룹' ? 8 : 1,
  emotions: program.emotions.join(', '),
  supplies: program.supplies.slice(0, 2),
  caution: '없음',
  staff: index === 0 ? '임상심리사 1인' : `${program.field} 치료사 1인`,
  activities: [
    {
      title: `${session} — ${PHASE_NAMES[index].split(' ')[0]} 활동`,
      steps: [
        '앞 단계에서 다룬 내용을 짧게 되짚는다.',
        `${session}의 주제를 ${program.field} 활동으로 다룬다.`,
        '느낀 점을 기록지에 남기고 다음 단계를 예고한다.',
      ],
    },
  ],
})

export function phasesOf(program, sessionIndex) {
  const session = program.sessions[sessionIndex]
  return PHASE_NAMES.map((_, i) => {
    /* 마음챙김 1세션 PHASE 1만 Figma 문구다 */
    if (program.id === 'pg-3' && sessionIndex === 0 && i === 0) {
      return { name: PHASE_NAMES[0], ...FIGMA_PHASE }
    }
    return phaseFor(program, session, i)
  })
}

const P = (id, name, condition, spec) => ({ id, name, condition, ...spec })

export const programs = [
  P('pg-1', '문학 기반 외상 서사 재구성', 'PTSD', {
    rating: 4.6,
    field: '문학치료',
    form: '그룹',
    org: '중앙대학교병원',
    orgPlace: '중앙대학교병원 · 서울',
    emotions: ['불안', '분노', '무력감'],
    topics: ['서사', '외상'],
    supplies: ['감정 기록지', '필기구', '워크북'],
    summary: '자기 서사를 다시 쓰는 과정으로 외상 기억의 의미를 재구성하는 8회기 그룹 프로그램',
    minutes: 90,
    sessions: ['오리엔테이션', '기억의 조각', '나의 문장', '다시 쓰는 장면', '타인의 시선', '용서와 거리', '새로운 결말', '마무리'],
  }),
  P('pg-2', '시 읽기 정서조절 프로그램', 'PTSD', {
    rating: 4.6,
    field: '시치료',
    form: '그룹',
    org: '한국문학치료학회',
    orgPlace: '한국문학치료학회 · 서울',
    emotions: ['불안', '우울'],
    topics: ['정서조절', '시'],
    supplies: ['시 선집', '필기구'],
    summary: '시를 함께 읽고 정서를 언어로 옮기며 조절 능력을 기르는 10회기 그룹 프로그램',
    minutes: 60,
    sessions: ['오리엔테이션', '오늘의 시', '감정에 이름 붙이기', '반복되는 말', '침묵의 자리', '내가 고른 시', '함께 읽기', '나의 시 쓰기', '낭독', '마무리'],
  }),
  P('pg-3', '마음챙김 호흡 이완 훈련', 'PTSD', {
    rating: 4.3,
    field: '명상',
    form: '개인',
    org: '중앙대학교병원',
    orgPlace: '중앙대학교병원 · 서울',
    emotions: ['불안', '감정', '스트레스'],
    topics: ['이완', '애착'],
    supplies: ['색연필', '감정 기록지', '필기구', '스케치북', '아크릴 물감'],
    summary: '마음챙김 호흡 기법으로 신체 각성을 조절하고, 자기 인식과 애착 패턴 이해를 돕는 6회기 그룹 프로그램',
    minutes: 90,
    sessions: ['소개', '환기', '나라는 단어', '나의 충동 마주보기', '나의 애착 이해하기', '마무리'],
  }),
  P('pg-4', '노년층 자서전 쓰기 프로그램', 'PTSD', {
    rating: 3.9,
    field: '서사치료',
    form: '개인',
    org: '중앙대학교병원',
    orgPlace: '중앙대학교병원 · 서울',
    emotions: ['상실감', '무력감'],
    topics: ['생애사', '서사'],
    supplies: ['사진', '필기구', '스크랩북'],
    summary: '생애의 장면을 글로 옮기며 삶의 의미를 정리하는 6회기 개인 프로그램',
    minutes: 60,
    sessions: ['오리엔테이션', '어린 시절', '가장 긴 하루', '고마운 사람', '남기고 싶은 말', '마무리'],
  }),
  P('pg-5', '게임 사용 습관 재구성', '게임과몰입', {
    rating: 4.4,
    field: '인지행동',
    form: '개인',
    org: '중앙대학교병원',
    orgPlace: '중앙대학교병원 · 서울',
    emotions: ['충동', '불안'],
    topics: ['습관', '자기조절'],
    supplies: ['사용 기록지', '필기구'],
    summary: '사용 기록을 함께 살피며 대체 활동을 설계하는 6회기 개인 프로그램',
    minutes: 60,
    sessions: ['오리엔테이션', '나의 사용 시간', '방아쇠 찾기', '대체 활동 설계', '실패 다루기', '마무리'],
  }),
  P('pg-6', '철학 대화로 보는 나의 서사', '게임과몰입', {
    rating: 4.1,
    field: '철학상담',
    form: '그룹',
    org: '한국철학상담치료학회',
    orgPlace: '한국철학상담치료학회 · 서울',
    emotions: ['공허', '무력감'],
    topics: ['자기이해', '대화'],
    supplies: ['토론 카드', '필기구'],
    summary: '묻고 답하는 대화로 몰입의 자리를 다시 보는 8회기 그룹 프로그램',
    minutes: 90,
    sessions: ['오리엔테이션', '나는 무엇에 몰입하는가', '즐거움과 중독', '시간이라는 것', '관계의 자리', '나를 설명하는 말', '다시 고르기', '마무리'],
  }),
]

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
  { key: 'recommend', label: '추천순', compare: (a, b) => b.rating - a.rating },
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
  `효과성 ${p.rating} · ${p.sessions.length}세션 · ${p.field} · ${p.form} · ${p.org}`

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
