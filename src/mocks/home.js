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
 * 배치 유형. 치유 프로세스는 단계를 고르는 게 아니라 환자의 nextStep을 따른다.
 * 아직 도달하지 않은 단계에 접근하지 못하게 하려는 구조라 선택지가 아니다.
 */
export const GENERAL = '일반 상담'
export const PROCESS = '치유 프로세스'
