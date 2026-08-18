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

/* 감정평가 단계는 설문 수가 곧 메타다. 둘이 갈라지지 않게 여기서 센다 */
const EVAL = (name, surveys) => ({
  name,
  meta: `설문 ${surveys.length}종`,
  items: surveys,
})

/* 처방·수행 단계. Figma에서 처방은 메타가 비어 있다 */
const STEP = (name, meta, items) => ({ name, meta, items })

const PTSD_SURVEYS = [
  { code: 'PCL-5', label: 'PTSD 증상 체크리스트' },
  { code: 'CAPS-5', label: '임상가 면담 평가' },
  { code: 'GAD-7', label: '불안 척도' },
  { code: 'PHQ-9', label: '우울 척도' },
]

const GAME_SURVEYS = [
  { code: 'IGDS9-SF', label: '단축형 인터넷 게임 장애 척도' },
  { code: 'YIAS', label: 'Young 인터넷 중독 척도' },
  { code: 'LEC-5', label: '외상 사건 체크리스트' },
  { code: 'BDI-II', label: '벡 우울 척도' },
  { code: 'BAI', label: '벡 불안 척도' },
  { code: 'K-CBCL', label: '아동·청소년 행동 평가' },
  { code: 'RSES', label: '자아존중감 척도' },
]

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

const P = (id, name, condition, author, date, summary, steps, deprecated = false) => ({
  id, name, condition, author, date, summary, steps, deprecated,
})

const ptsdSteps = (total) => [
  EVAL('감정평가(사전)', PTSD_SURVEYS),
  STEP('프로그램 처방', '', PTSD_PROGRAMS),
  STEP('프로그램 수행', `총 ${total}회기·${total}주·주 1회`, sessions(total)),
  EVAL('감정평가(사후)', PTSD_SURVEYS),
]

const gameSteps = (total) => [
  EVAL('감정평가(사전)', GAME_SURVEYS),
  STEP('프로그램 처방', '', GAME_PROGRAMS),
  STEP('프로그램 수행', `총 ${total}회기·${total}주·주 1회`, sessions(total)),
  EVAL('감정평가(사후)', GAME_SURVEYS),
]

/*
 * 구버전은 목록에서 빼지 않는다 — 지난 프로세스로 진행한 환자의 이력을 읽으려면
 * 정의가 남아 있어야 한다. 흐리게 내리고 배지를 붙이는 것으로 구분한다.
 */
export const processLibrary = [
  P(
    'pl-1', 'PTSD 표준 프로세스_v2.1', 'PTSD',
    '강치유·중앙대학교산학협력단', '2026-06-17',
    'PTSD 시연 프로세스 (변형 A: 생체신호 미입력·프로그램 선연결, 사전/사후 감정평가 4종)',
    ptsdSteps(8),
  ),
  P(
    'pl-2', 'PTSD 단축형_v1.3', 'PTSD',
    '김서연 · 중앙대학교병원', '2026-06-14',
    '회기를 절반으로 줄인 단축 프로세스 (사전/사후 감정평가 4종)',
    ptsdSteps(4),
  ),
  P(
    'pl-3', 'PTSD 노년층 대상_v1.0', 'PTSD',
    '강치유·중앙대학교산학협력단', '2026-05-02',
    '60대 이상 대상 (활동 강도 하향, 사전/사후 감정평가 4종)',
    ptsdSteps(6),
  ),
  P(
    'pl-4', '게임과몰입 기존 핵심 A_v1.0', '게임과몰입',
    '강치유·중앙대학교산학협력단', '2026-06-17',
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
    '강치유·중앙대학교산학협력단', '2025-11-20',
    '게임과몰입 핵심 프로세스의 이전 버전',
    gameSteps(6),
    true,
  ),
]

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
