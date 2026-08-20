/*
 * 도서 콘텐츠 mock (구버전 웹 '문장 명세' 화면 이식).
 *
 * **한 건 = 한 도서에서 뽑은 문단 하나다.** 작품 정보(작품명 · 유형 · 출판사 ·
 * 저자 · 출생연도)와 뽑은 자리(추출 페이지 · 추출 문단), 그리고 그 문단에 붙은
 * **속성값**으로 이루어진다. 웹의 등록 단위를 그대로 따랐다.
 *
 * ⚠️ 같은 도서에서 문단을 여럿 뽑으면 작품 정보가 건마다 되풀이된다. 도서 하나
 *    아래 발췌 여럿으로 묶는 편이 값의 원본을 한 곳에 두는 길이지만, 백엔드가
 *    어느 단위로 내려줄지 확정되지 않아 **웹의 단위를 유지**했다.
 *    6.2절 44번 항목 참조.
 */

import { reactive } from 'vue'

/*
 * **속성 분류는 데이터다. 화면이 아니다.**
 *
 * 45개 항목이 축 다섯 · 소분류 열둘로 나뉘는데, 이 구성은 백엔드와 연구 쪽
 * 방향에 따라 가장 먼저 바뀔 값이다. 화면에 칩을 직접 적어 두면 항목 하나가
 * 늘 때마다 화면을 고쳐야 하므로, **화면은 이 배열을 그리기만 한다** —
 * 축을 더하거나 항목을 갈아끼우는 일이 여기 한 곳에서 끝난다.
 *
 * `group`이 null인 축은 소분류 없이 항목만 늘어놓는다(관계 · 주제어).
 */
export const BOOK_ATTRIBUTES = [
  {
    id: 'plot',
    name: '구성(Plot)',
    groups: [
      { name: '상황의 플롯', values: ['긴장', '수난', '비극', '징벌', '인내', '극복'] },
      { name: '성격의 플롯', values: ['현명', '실수', '동요', '퇴행', '변화', '발견'] },
      { name: '사상의 플롯', values: ['심리', '환멸', '인생'] },
    ],
  },
  {
    id: 'motif',
    name: '소재(Motif)',
    groups: [
      { name: '개인적인 것', values: ['심정', '신체', '타자', '가족'] },
      { name: '사회적인 것', values: ['과거', '현재', '미래'] },
      { name: '자연적인 것', values: ['사물', '추상'] },
    ],
  },
  {
    id: 'emotion',
    name: '감정',
    groups: [
      { name: '긍정적 감정', values: ['유쾌', '감격', '평안'] },
      { name: '부정적 감정', values: ['공포', '증오', '근심', '자책', '불안', '우울'] },
    ],
  },
  {
    id: 'relation',
    name: '관계',
    groups: [
      { name: null, values: ['부모·자녀', '연인', '부부', '친구', '공동체·규범'] },
    ],
  },
  {
    id: 'topic',
    name: '주제어',
    groups: [
      {
        name: null,
        values: ['사랑·성숙', '금기·욕망', '권위·책임', '공감·위로', '오해·편견', '극복·성장', '조력·연대'],
      },
    ],
  },
]

/* 축 하나가 가진 항목 전부 */
export const valuesOfAxis = (axis) => axis.groups.flatMap((g) => g.values)

/*
 * 전체 항목 수. 화면 머리의 `45개 항목`이 이 값이다 —
 * 숫자를 화면에 적어 두면 항목을 늘렸을 때 머리만 옛 수를 말한다.
 */
export const ATTRIBUTE_TOTAL = BOOK_ATTRIBUTES.reduce(
  (n, axis) => n + valuesOfAxis(axis).length,
  0,
)

/*
 * 고른 값은 **평평한 배열 하나**다. 지금 45개 항목의 이름이 축을 넘어 겹치지
 * 않아 이것으로 충분하다. ⚠️ 겹치는 이름이 생기면 축까지 함께 들어야 한다.
 */
export const countInAxis = (axis, picked) =>
  valuesOfAxis(axis).filter((value) => picked.includes(value)).length

/* 작품 유형. ⚠️ 웹에서 확인한 것은 `소설` · `장편소설` 둘이고 나머지는 임의다 */
export const BOOK_TYPES = ['소설', '장편소설', '단편소설', '시', '수필', '희곡']

const B = (id, spec) => ({ id, ...spec })

export const books = reactive([
  B('bk-1', {
    title: '소설로 읽는 인간',
    type: '소설',
    publisher: '문학사상',
    published: 2016,
    author: '홍길동',
    born: 1984,
    pages: '6-79',
    passage:
      '농민들은 낡고 허름한 삶 속에서도 끊임없이 희망을 품었다. 그들의 삶은 고단했지만, '
      + '언제나 내일을 기약하며 오늘을 견뎌냈다. 낮에는 밭에서 땀을 흘리고, 밤이면 작은 등불 '
      + '아래 모여 앉아 서로의 이야기를 나누었다. 가난은 그들을 짓눌렀지만, 공동체의 연대는 '
      + '그 무게를 함께 나누었다. 어려운 이웃이 있으면 자신의 것을 나누고, 슬픔이 있으면 함께 '
      + '울었다. 그렇게 그들은 인내하며 살아갔고, 작은 변화들을 만들어냈다. 봄이 오면 씨앗을 '
      + '뿌리듯, 그들은 희망의 씨앗을 마음에 심었다.',
    /* ⚠️ 웹 화면에서 확인한 것은 구성 다섯 · 소재 둘이고 나머지 여덟은 임의다 */
    attributes: [
      '긴장', '수난', '인내', '동요', '심리',
      '신체', '가족',
      '평안', '근심',
      '부모·자녀', '친구', '공동체·규범',
      '공감·위로', '극복·성장', '조력·연대',
    ],
  }),
  B('bk-2', {
    title: '태평천하',
    type: '장편소설',
    publisher: '문학동네',
    published: 1938,
    author: '채만식',
    born: 1902,
    pages: '45-78',
    passage:
      '윤직원 영감은 자신의 부를 자랑하며 세상이 태평하다고 말했다. 하지만 그의 눈에는 '
      + '가난한 사람들의 고통이 보이지 않았다. 그는 자신의 욕망만을 채우며 살아갔고, 타인의 '
      + '아픔에는 무관심했다. 사회의 모순과 불평등이 심화되는 시대였지만, 그는 오직 자신의 '
      + '안위만을 생각했다. 환멸을 느끼게 하는 인물이었지만, 동시에 그 시대의 현실을 적나라하게 '
      + '보여주었다. 금기시되던 것들이 권력과 돈 앞에서는 무력했다.',
    /* ⚠️ 웹 화면에서 확인한 것은 감정 둘 · 관계 둘 · 주제어 둘이고 나머지 넷은 임의다 */
    attributes: [
      '비극', '징벌', '환멸',
      '현재',
      '감격', '우울',
      '연인', '공동체·규범',
      '사랑·성숙', '권위·책임',
    ],
  }),
])

export const findBook = (id) => books.find((b) => b.id === id) ?? null

/*
 * **문장은 문단에서 끊어 낸다. 따로 저장하지 않는다.**
 *
 * 세션 활동의 `인문 문장` 블록이 문장을 가리키는데(4.8.9절), 문장을 복사해
 * 두면 문단을 고쳤을 때 블록만 옛 문장을 계속 말한다. 가리키는 값은
 * **도서 id + 문장 번호** 둘뿐이고 문장 자체는 읽을 때 여기서 만든다.
 *
 * 끊는 규칙은 마침표 · 물음표 · 느낌표 다음의 공백이다.
 * ⚠️ 임의 규칙이다. 인용부호 안의 마침표나 줄임표는 갈라진다 —
 *    실제 문장 단위가 정해지면 이 함수만 바꾼다. 6.2절 45번 항목 참조.
 */
export function sentencesOf(book) {
  if (!book?.passage) return []
  return book.passage
    .split(/(?<=[.!?])\s+/)
    .map((line) => line.trim())
    .filter(Boolean)
}

/*
 * 가리킨 문장 하나. 문단이 짧아져 번호가 범위를 넘으면 **null이다** —
 * 없는 문장을 지어내지 않고, 읽는 화면이 그 사실을 말한다.
 */
export function sentenceAt(bookId, index) {
  const list = sentencesOf(findBook(bookId))
  return list[index] ?? null
}

/* 목록 한 줄에 붙는 요약 */
export const bookMeta = (b) => [
  b.type,
  b.author,
  `${b.published}`,
  `${b.pages}쪽`,
  `속성 ${b.attributes.length}`,
]

export const nextBookId = () => `bk-${books.length + 1}-${Date.now().toString(36)}`

/*
 * 저장. 오토세이브가 없으므로(3.6절) 저장 버튼에서만 불린다.
 * **분류에서 사라진 값은 걷는다** — 속성 목록을 갈아끼웠을 때 없는 항목을
 * 붙들고 있으면 화면에 그리지도 못하는 값이 개수에만 남는다.
 */
export function saveBook(draft) {
  const known = BOOK_ATTRIBUTES.flatMap(valuesOfAxis)

  const next = {
    id: draft.id,
    title: draft.title.trim(),
    type: draft.type,
    publisher: draft.publisher.trim(),
    published: Number(draft.published) || 0,
    author: draft.author.trim(),
    born: Number(draft.born) || 0,
    pages: draft.pages.trim(),
    passage: draft.passage.trim(),
    attributes: draft.attributes.filter((value) => known.includes(value)),
  }

  const at = books.findIndex((b) => b.id === next.id)
  if (at >= 0) books[at] = next
  else books.unshift(next)
  return next
}
