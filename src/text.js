/*
 * 한국어 조사 선택. 앞말의 받침 유무로 갈린다.
 *
 * 화면에 `(으)로` · `을(를)`처럼 괄호를 남기지 않으려고 만든 것이다.
 * 세 화면(감정평가 다음 단계 · 로그인 · 스테퍼 안내)이 같은 규칙을 쓰고 있어
 * 한 곳으로 올렸다 — 복제해 두면 한쪽만 고쳐진다.
 */
export function hasFinal(word) {
  if (!word) return false
  const code = word.charCodeAt(word.length - 1)
  return code >= 0xac00 && code <= 0xd7a3 && (code - 0xac00) % 28 !== 0
}

/* josa('이름', '을', '를') → '이름을' */
export const josa = (word, withFinal, withoutFinal) =>
  `${word}${hasFinal(word) ? withFinal : withoutFinal}`
