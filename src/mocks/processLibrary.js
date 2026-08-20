/*
 * 치유 프로세스 라이브러리 mock (Figma 148:7242 · 172:2899 · 172:4483).
 *
 * 코어 프로세스 0단계 '프로세스 시작'이 이 목록에서 하나를 골라 환자에게 할당한다.
 * 환자가 지금 어디까지 왔는지(`mocks/patients.js`의 status)나 진행 중인 프로세스의
 * 이력(`mocks/process.js`)과는 다른 데이터다 — 여기 있는 것은 **아직 아무에게도
 * 붙지 않은 프로세스 정의**다.
 *
 * ⚠️ 확인 필요: 상세 치유 프로세스 목업이 나오기 전까지는 전부 임시값이다.
 *    Figma에 실제로 적힌 것은 PTSD 5건의 표 내용과 두 프로세스(PTSD 표준 v2.1 ·
 *    게임과몰입 기존 핵심 A v1.0)의 구성뿐이고, 나머지는 임의로 채웠다.
 *    Figma 부제의 `PSTD`·`감정평가 3종`은 오타로 보고 고쳤다 —
 *    같은 화면의 단계 메타가 `설문 4종`이다.
 */

import { reactive } from 'vue'
import { surveys } from './surveys.js'

/* 감정평가 단계는 설문 수가 곧 메타다. 둘이 갈라지지 않게 여기서 센다 */
const EVAL = (name, items) => ({
  name,
  meta: `설문 ${items.length}종`,
  items,
})

/* 처방·수행 단계. Figma에서 처방은 메타가 비어 있다 */
const STEP = (name, meta, items) => ({ name, meta, items })

/*
 * 설문은 코드만 들고 이름은 `mocks/surveys.js`에서 가져온다.
 * 이름을 여기 다시 적으면 프로세스 상세 모달과 감정평가 화면이 갈라진다.
 */
const pick = (codes) => codes.map((code) => ({ code, label: surveys[code].name }))

const PTSD_SURVEYS = pick(['PCL-5', 'CAPS-5', 'GAD-7', 'WHOQOL-BREF'])

/* 진단별 감정평가 구성. 효과성 분석 화면도 이 목록을 센다 */
export const SURVEY_CODES = {
  PTSD: ['PCL-5', 'CAPS-5', 'GAD-7', 'WHOQOL-BREF'],
  게임과몰입: ['IGDS9-SF', 'YIAS', 'LEC-5', 'BDI-II', 'BAI', 'K-CBCL', 'RSES'],
}

const GAME_SURVEYS = pick(['IGDS9-SF', 'YIAS', 'LEC-5', 'BDI-II', 'BAI', 'K-CBCL', 'RSES'])

/* 프로그램 처방·수행의 내용은 전부 임시값이다 */
const PTSD_PROGRAMS = [
  { code: '문학', label: '이야기 다시 쓰기' },
  { code: '미술', label: '감정 색채 작업' },
  { code: '음악', label: '호흡 · 이완 듣기' },
]

const GAME_PROGRAMS = [
  { code: '철학', label: '자기 서사 대화' },
  { code: '미술', label: '몰입 대상 재구성' },
]

const sessions = (total) =>
  Array.from({ length: total }, (_, i) => ({
    code: `${i + 1}회기`,
    label: i === 0 ? '오리엔테이션 · 목표 설정' : `핵심 활동 ${i}`,
  }))

/*
 * `bio` = 이 프로세스가 **생체신호를 함께 재는가**.
 *
 * 환자마다 장비를 대는 것이 아니라 프로세스가 정하는 값이다 — 설문 구성을
 * 프로세스가 정하는 것과 같은 자리다. 감정평가 화면의 '생체신호' 버튼은
 * 언제나 보이되, 이 값이 false면 눌렀을 때 사유를 말한다(무반응 금지).
 *
 * ⚠️ 실제로는 백엔드가 내려줄 값이다. 지금은 정의에 박아 두고 두 상태를
 *    모두 시연할 수 있게 해 두었다 — v2.1은 요약에 '생체신호 미입력'이라
 *    적혀 있어 false다.
 */
const P = (id, name, condition, author, date, summary, steps, deprecated = false, bio = true) => ({
  id, name, condition, author, date, summary, steps, deprecated, bio,
})

const ptsdSteps = (total) => [
  EVAL('감정평가(사전)', PTSD_SURVEYS),
  STEP('프로그램 처방', '', PTSD_PROGRAMS),
  STEP('프로그램 수행', `총 ${total}회기`, sessions(total)),
  EVAL('감정평가(사후)', PTSD_SURVEYS),
]

const gameSteps = (total) => [
  EVAL('감정평가(사전)', GAME_SURVEYS),
  STEP('프로그램 처방', '', GAME_PROGRAMS),
  STEP('프로그램 수행', `총 ${total}회기`, sessions(total)),
  EVAL('감정평가(사후)', GAME_SURVEYS),
]

/*
 * 구버전은 목록에서 빼지 않는다 — 지난 프로세스로 진행한 환자의 이력을 읽으려면
 * 정의가 남아 있어야 한다. 흐리게 내리고 배지를 붙이는 것으로 구분한다.
 */
export const processLibrary = reactive([
  P(
    'pl-1', 'PTSD 표준 프로세스_v2.1', 'PTSD',
    '강치유 · 중앙대학교산학협력단', '2026-06-17',
    'PTSD 시연 프로세스 (변형 A: 생체신호 미입력·프로그램 선연결, 사전/사후 감정평가 4종)',
    ptsdSteps(8), false, false,
  ),
  P(
    'pl-2', 'PTSD 단축형_v1.3', 'PTSD',
    '김서연 · 중앙대학교병원', '2026-06-14',
    '회기를 절반으로 줄인 단축 프로세스 (사전/사후 감정평가 4종)',
    ptsdSteps(4),
  ),
  P(
    'pl-3', 'PTSD 노년층 대상_v1.0', 'PTSD',
    '강치유 · 중앙대학교산학협력단', '2026-05-02',
    '60대 이상 대상 (활동 강도 하향, 사전/사후 감정평가 4종)',
    ptsdSteps(6),
  ),
  P(
    'pl-4', '게임과몰입 기존 핵심 A_v1.0', '게임과몰입',
    '강치유 · 중앙대학교산학협력단', '2026-06-17',
    '게임과몰입 핵심 프로세스 (사전/사후 감정평가 7종)',
    gameSteps(6),
  ),
  P(
    'pl-5', '게임과몰입 청소년 대상_v1.1', '게임과몰입',
    '김서연 · 중앙대학교병원', '2026-04-28',
    '중·고등학생 대상 (보호자 면담 포함, 사전/사후 감정평가 7종)',
    gameSteps(8),
  ),
  P(
    'pl-6', 'PTSD 표준 프로세스_v1.8', 'PTSD',
    '김서연 · 중앙대학교병원', '2026-02-11',
    'PTSD 표준 프로세스의 이전 버전',
    ptsdSteps(8),
    true,
  ),
  P(
    'pl-7', 'PTSD 노년층 대상_v0.5', 'PTSD',
    '김서연 · 중앙대학교병원', '2025-12-05',
    'PTSD 노년층 프로세스의 이전 버전',
    ptsdSteps(6),
    true,
  ),
  P(
    'pl-8', '게임과몰입 기존 핵심 A_v0.9', '게임과몰입',
    '강치유 · 중앙대학교산학협력단', '2025-11-20',
    '게임과몰입 핵심 프로세스의 이전 버전',
    gameSteps(6),
    true,
  ),
])

/*
 * 정렬 기준. 기본은 최신순이고, Figma에는 열린 상태가 없어 나머지는 초안이다.
 * ⚠️ 확인 필요: 선택지 구성
 */
export const PROCESS_SORTS = [
  { key: 'recent', label: '최신순', compare: (a, b) => b.date.localeCompare(a.date) },
  { key: 'oldest', label: '오래된순', compare: (a, b) => a.date.localeCompare(b.date) },
  { key: 'name', label: '이름순', compare: (a, b) => a.name.localeCompare(b.name, 'ko') },
]

export function findProcess(id) {
  return processLibrary.find((p) => p.id === id) ?? null
}

/*
 * 이미 진행 중인 환자는 언제 무엇을 할당받았는지가 목업에 없다.
 * 진단에 맞는 최신 프로세스가 붙어 있다고 보고 떨어뜨린다 —
 * 이것이 없으면 기존 환자의 감정평가 화면에 설문이 하나도 뜨지 않는다.
 * ⚠️ 임시값이다. 환자 레코드가 프로세스 id를 들고 오면 걷어낼 것
 */
export function processFor(patient) {
  if (patient.processId) return findProcess(patient.processId)
  const matched = processLibrary
    .filter((p) => !p.deprecated && p.condition === patient.condition)
    .sort((a, b) => b.date.localeCompare(a.date))
  /* 동반이환처럼 딱 맞는 정의가 없으면 가장 최근 것을 쓴다 */
  return matched[0] ?? processLibrary.find((p) => !p.deprecated) ?? null
}

/*
 * 프로세스 저작(저작도구)의 저장.
 *
 * **단계 구성은 고정이 아니다.** 감정평가 · 프로그램 처방 · 프로그램 수행 노드를
 * 몇 개든, 어떤 순서로든 이을 수 있다 — 구버전 웹이 노드 편집기로 설계된 이유가
 * 그것이다. 표준형(사전 평가 → 처방 → 수행 → 사후 평가)은 흔한 한 가지일 뿐이다.
 *
 * 단계 메타(`설문 N종`)는 구성에서 만든다. 손으로 적게 하면 구성과 갈라진다.
 *
 * ⚠️ 코어 프로세스 화면은 아직 표준형 네 노드를 전제로 그린다. 노드 수가 다른
 *    정의를 환자에게 붙이면 스테퍼가 그대로 따라가지 못한다(6.2절 38번).
 */
export function saveProcess(draft) {
  const next = {
    id: draft.id,
    name: draft.name.trim(),
    condition: draft.condition,
    author: draft.author.trim(),
    date: draft.date,
    summary: draft.summary.trim(),
    steps: draft.nodes.map((node) => {
      if (node.type === '감정평가') {
        /*
         * 시점이 정해지지 않은 노드는 이름에 아무것도 붙이지 않는다.
         * 사전·사후를 읽는 화면들이 이름으로 찾기 때문에(`includes('사전')`)
         * 임의로 붙이면 엉뚱한 노드가 사전으로 잡힌다.
         */
        const name = node.phase ? `감정평가(${node.phase})` : '감정평가'
        return EVAL(name, pick(node.surveyCodes))
      }
      if (node.type === '프로그램 처방') {
        return STEP('프로그램 처방', '', node.programs.map((p) => ({ code: p.field, label: p.name })))
      }
      /*
       * **수행 노드는 회차를 적지 않는다.** 회차의 이름·개수는 처방된 프로그램이
       * 정하고 날짜는 일정이 정한다(4.6.4절). 정의에 적어두면 세 곳이 같은 사실을
       * 들고 있게 되고, 주기(`주 1회`)처럼 일정에 달린 값을 정의가 약속하게 된다.
       */
      return STEP('프로그램 수행', '', [])
    }),
    deprecated: false,
    bio: draft.bio,
  }

  const at = processLibrary.findIndex((p) => p.id === next.id)
  if (at >= 0) processLibrary[at] = next
  else processLibrary.unshift(next)
  return next
}

/* 새 정의의 id. 목록 안에서만 유일하면 된다 */
export const nextProcessId = () => `pl-${processLibrary.length + 1}-${Date.now().toString(36)}`
