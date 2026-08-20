import { surveys } from './surveys.js'
import { processLibrary } from './processLibrary.js'
import { programs } from './programs.js'
import { fieldGroups } from './dataFields.js'

/*
 * 저작도구의 목록 정의.
 *
 * **여기 있는 것은 저작도구가 '무엇을 만드는 화면인가'의 정의뿐이다.**
 * 만들어진 결과물(척도·프로세스·프로그램)은 각자의 목업이 이미 들고 있고,
 * 이 파일은 그것을 가리키기만 한다 — 여기 다시 적으면 저작도구가 보여주는
 * 목록과 실제로 쓰이는 목록이 갈라진다.
 *
 * ## 이름을 다시 붙인 이유
 *
 * 구버전 웹의 저작도구는 일곱 항목이 `저작` · `명세` 두 접미사를 나눠 갖는다
 * (`프로그램 저작` · `세션활동 저작` / `데이터 명세` · `프로세스 명세` · `문장 명세`).
 * 그런데 **저작도구 안은 전부 만드는 화면이라 접미사가 서로를 구분하지 못한다** —
 * 무엇을 만드는지는 접미사 앞의 낱말이 이미 다 말하고 있다.
 * 그래서 접미사를 걷고 **만드는 대상**을 그대로 이름으로 삼았다.
 *
 * 대상 이름은 1.3절 용어 정의를 따른다. 정의에 있는 말(프로세스 · 프로그램 ·
 * 세션 · 필드)은 그대로 두고, 정의와 어긋나거나 다른 화면과 겹치는 둘만 바꿨다
 * (`감정평가` → `척도`, `문장 명세` → `도서 콘텐츠`).
 *
 * ⚠️ 확인 필요: 이름은 구버전 웹 화면과 1.3절 용어 정의만 보고 정한 것이다.
 *    저작도구의 데이터 구조·편집 범위가 확정되면 다시 볼 것.
 */

/*
 * 접미사만 걷은 항목의 설명. 대상 이름은 그대로라 할 말이 같다 —
 * 세 곳에 따로 적으면 한 곳만 고쳐진다.
 */
const SUFFIX_ONLY =
  "'저작' 접미사만 걷었다. 저작도구 안은 전부 만드는 화면이라 " +
  '접미사가 서로를 구분하지 못하고, 무엇을 만드는지는 앞의 낱말이 이미 다 말한다.'

/* 목록 한 줄. meta는 점 구분으로 이어 붙인다 */
const ROW = (id, title, meta, badge = null) => ({ id, title, meta, badge })

export const authoringTools = [
  {
    key: 'scale',
    group: '데이터',
    name: '척도',
    legacy: '감정평가',
    summary: '감정평가 단계에서 쓰는 설문 척도를 만든다',
    /* 왜 이름이 바뀌었는가. 바꾸지 않은 항목은 null이다 */
    rename:
      "'감정평가'는 프로세스 1·4단계의 이름이다. 같은 이름이 단계와 만드는 대상 " +
      '둘을 가리키면 어느 쪽인지 알 수 없다. 1.3절도 이미 척도의 식별자를 ' +
      "'설문 코드 = 감정평가 척도의 고유 식별자'라고 정의하고 있다.",
    /* 결과물은 surveys.js가 들고 있다 */
    items: () =>
      Object.values(surveys).map((s) =>
        ROW(s.code, s.name, [s.code, `${s.questions.length}문항`, `총점 ${s.max}`], s.role),
      ),
    itemLabel: '척도',
    /*
     * 편집 화면이 있는 도구. 일곱을 한꺼번에 열지 않고 **하나씩 축소 버전으로**
     * 만든다 — 편집 화면의 구조는 도구마다 다르고, 한 벌을 끝내 보기 전에는
     * 무엇이 공통인지 알 수 없다.
     */
    editPath: (id) => `/authoring/scale/${id ?? 'new'}`,
  },
  {
    key: 'field',
    group: '데이터',
    name: '데이터 필드',
    legacy: null,
    summary: '그룹명 · 코드명 · 필드명 체계를 만든다',
    rename: null,
    /*
     * **목록의 단위가 필드가 아니라 그룹이다.** 코드명이 그룹 접두 + 순번이라
     * 필드는 자기 그룹 안에서만 뜻이 있고, 낱개로 늘어놓으면 순번이 어디서
     * 온 것인지 읽히지 않는다.
     */
    items: () =>
      fieldGroups.map((g) =>
        ROW(g.id, `${g.name}(${g.id})`, [g.category, `필드 ${g.fields.length}`]),
      ),
    itemLabel: '그룹',
    editPath: (id) => `/authoring/field/${id ?? 'new'}`,
  },
  {
    key: 'spec',
    group: '데이터',
    name: '데이터 명세',
    legacy: null,
    summary: '필드를 증상 · 기관 단위로 묶는다',
    rename: null,
    items: () => null,
    itemLabel: '명세',
  },
  {
    key: 'process',
    group: '데이터',
    name: '프로세스',
    legacy: '프로세스 명세',
    summary: '개시부터 종결까지 6단계 흐름을 만든다',
    rename:
      '이 화면이 만드는 것은 명세가 아니라 프로세스 정의 그 자체다. ' +
      '1.3절이 이미 프로세스를 6단계 치료 흐름 전체로 정의하고 있어 ' +
      '뒤에 붙는 말이 새로 알려주는 것이 없다.',
    items: () =>
      processLibrary.map((p) =>
        ROW(p.id, p.name, [p.condition, p.author, p.date], p.deprecated ? '구버전' : null),
      ),
    itemLabel: '프로세스',
  },
  {
    key: 'program',
    group: '프로그램',
    name: '프로그램',
    legacy: '프로그램 저작',
    summary: '프로세스에서 처방되는 인문 치유 활동을 만든다',
    rename: SUFFIX_ONLY,
    items: () =>
      programs.map((p) =>
        ROW(p.id, p.name, [p.condition, `${p.sessions.length}세션`, `${p.minutes}분`, p.org]),
      ),
    itemLabel: '프로그램',
  },
  {
    key: 'activity',
    group: '프로그램',
    name: '세션 활동',
    legacy: '세션활동 저작',
    summary: '프로그램을 구성하는 회차의 활동을 만든다',
    rename: SUFFIX_ONLY,
    /*
     * ⚠️ 활동 정의 목업이 아직 없다. `programs.js`의 세션 이름을 모아 보여주는
     *    안을 만들었다가 걷었다 — 이름만 있고 내용이 없는 목록이 **정의가 있는
     *    것처럼** 읽힌다. 활동 구조가 확정되면 세션 활동도 자기 목업을 갖고
     *    프로그램이 그것을 참조하게 된다.
     */
    items: () => null,
    itemLabel: '활동',
  },
  {
    key: 'book',
    group: '프로그램',
    name: '도서 콘텐츠',
    legacy: '문장 명세',
    summary: '프로그램이 인용하는 문학 원천을 등록한다',
    rename:
      '등록 단위가 문장이 아니라 도서다 — 구버전 화면도 자기 버튼에 ' +
      "'새로운 도서 콘텐츠 등록'이라고 적고 있다. 문장은 등록한 도서에서 " +
      '이후에 뽑히는 것이라 등록하는 것과 단위가 다르다.',
    items: () => null,
    itemLabel: '도서',
  },
]

/* 화면은 그룹 순서로 그린다. 구버전 웹의 두 묶음(데이터 / 프로그램)을 그대로 뒀다 */
export const authoringGroups = ['데이터', '프로그램']

export const toolsInGroup = (group) => authoringTools.filter((t) => t.group === group)

export const findTool = (key) => authoringTools.find((t) => t.key === key) ?? null
