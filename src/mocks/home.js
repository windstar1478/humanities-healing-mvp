import { Database, ListChecks, Quote, Workflow } from 'lucide-vue-next'

/* 홈(업무) 화면 mock 데이터. 작업 목록은 mocks/tasks.js에 있다 */

/* 그리드는 행 우선(2열)이라 이 순서가 Figma의 열 배치와 일치한다 */
export const quickAuthoringItems = [
  { id: 'data-item', label: '데이터 항목', icon: Database },
  { id: 'scale', label: '평가 척도', icon: ListChecks },
  { id: 'excerpt', label: '발췌문', icon: Quote },
  { id: 'process', label: '프로세스 설계', icon: Workflow },
]

/*
 * 배치 유형. 단계는 표시하지 않는다 — 상담사와 환자가 대면하는 순간은
 * 감정평가 · 프로그램 수행 · 일반 상담뿐이고, 프로세스 시작 · 프로그램 처방 ·
 * 프로세스 종료는 상담사가 혼자 처리하는 단계라 약속을 잡을 대상이 아니다.
 * 어차피 만나서 무엇을 하는지는 프로세스가 정하므로 유형 둘로 충분하다.
 */
export const GENERAL = '일반 상담'
export const PROCESS = '치유 프로세스'
