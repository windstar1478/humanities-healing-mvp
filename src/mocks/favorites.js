/*
 * 저작도구 즐겨찾기. **단위는 도구다** — 척도 · 데이터 필드 · 데이터 명세 ·
 * 프로세스 · 프로그램 · 세션 활동 · 도서 콘텐츠 일곱 중에서 고른다.
 *
 * **홈의 '빠른 저작'이 여기서 온다.** 예전에는 홈이 네 항목을 고정 목록으로 들고
 * 있었는데, 이름이 저작도구의 것과 갈라진 데다 눌러도 가는 곳이 없었다.
 * 네 칸의 자리는 그대로 두고 **무엇을 둘지를 쓰는 사람이 정하게** 바꾼 것이다.
 *
 * **이름을 저장하지 않는다.** 도구 키만 남기고 이름·아이콘은 그릴 때
 * `authoring.js`에서 읽는다 — 복사해 두면 도구 이름을 바꿨을 때 홈만 옛 이름을
 * 계속 말한다. 없는 키는 조용히 걷는다.
 *
 * **넷까지다.** 홈의 칸은 좌측 컬럼(폭 247)의 맨 위 두 줄이고, 그 아래가 작업
 * 목록이다. 일곱을 다 담으면 칸이 네 줄이 되어 작업이 밀려난다 — '자주 쓰는 것'을
 * 고르는 자리가 '전부'가 되면 고른 의미도 없어진다.
 *
 * 메모(`notes.js`)와 같은 자리다 — 화면 여럿이 함께 쓰는 가변 상태이지만
 * 배치·드래그처럼 앱의 동작을 정하는 값이 아니라서 공유 상태 셋에 합류시키지 않았다.
 * 모듈이 싱글턴이라 화면을 나갔다 와도 별표가 남는다.
 *
 * ⚠️ 실제로는 사용자 계정에 붙는 값이다. 지금은 새로고침하면 아래 기본값으로
 *    돌아간다 — 저장 위치가 정해지면 이 파일만 바꾼다.
 */

import { reactive } from 'vue'
import { findTool } from './authoring.js'

/*
 * 기본 별표 넷. 홈이 고정 목록으로 들고 있던 네 칸을 지금 이름으로 옮긴 것이다
 * (데이터 항목 → 데이터 필드 · 평가 척도 → 척도 · 발췌문 → 도서 콘텐츠 ·
 * 프로세스 설계 → 프로세스). ⚠️ 시연용 임의값이다.
 */
export const favorites = reactive(['field', 'scale', 'book', 'process'])

/* 홈의 칸 수. 2열 두 줄이다 */
export const FAVORITE_MAX = 4

export const isFavorite = (key) => favorites.includes(key)

export const isFull = () => favorites.length >= FAVORITE_MAX

/*
 * 같은 별을 다시 누르면 풀린다. 넣는 자리와 빼는 자리가 하나여야 한다.
 * **빼는 것은 언제나 된다** — 가득 찬 상태에서 뺄 수 없으면 갈아끼울 길이 없다.
 * 넣을 자리가 없으면 `false`를 돌려주고 화면이 사유를 말한다(무반응 금지).
 */
export function toggleFavorite(key) {
  const at = favorites.indexOf(key)
  if (at >= 0) {
    favorites.splice(at, 1)
    return true
  }
  if (isFull()) return false
  favorites.push(key)
  return true
}

/* 홈이 그리는 칸. 이름·아이콘은 도구 정의에서 그때그때 읽는다 */
export function favoriteTools() {
  return favorites.map((key) => findTool(key)).filter(Boolean)
}
