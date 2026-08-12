import { Database, ListChecks, Quote, Workflow } from 'lucide-vue-next'
import { buildDay, shiftedKey } from './schedule.js'

/* 홈(업무) 화면 mock 데이터 */

/* 그리드는 행 우선(2열)이라 이 순서가 Figma의 열 배치와 일치한다 */
export const quickAuthoringItems = [
  { id: 'data-item', label: '데이터 항목', icon: Database },
  { id: 'scale', label: '평가 척도', icon: ListChecks },
  { id: 'excerpt', label: '발췌문', icon: Quote },
  { id: 'process', label: '프로세스 설계', icon: Workflow },
]

/* overdue = 기한 경과. 악화 표현이므로 경고색 대상 */
export const unassignedTasks = [
  { id: 'task-1', title: '인문학 강사 미팅 조율', category: '협업', due: '오늘까지', overdue: false },
  { id: 'task-2', title: '데이터 누수 확인', category: '저작도구', due: null, overdue: false },
  { id: 'task-3', title: '보고서 자료 서치', category: '보고', due: '1일 지남', overdue: true },
  { id: 'task-4', title: '문장 명세 검수 요청', category: '저작도구', due: '내일까지', overdue: false },
  { id: 'task-5', title: '세션활동 저작 초안 작성', category: null, due: null, overdue: false },
]

/*
 * 배치 유형. 치유 프로세스는 단계를 고르는 게 아니라 환자의 nextStep을 따른다.
 * 아직 도달하지 않은 단계에 접근하지 못하게 하려는 구조라 선택지가 아니다.
 */
export const GENERAL = '일반 상담'
export const PROCESS = '치유 프로세스'

/* 아젠다가 보여주는 창: 오늘 기준 앞뒤 3일. 데이터는 schedule.js 하나에서 온다 */
export const scheduleDays = [-3, -2, -1, 0, 1, 2, 3].map((offset) =>
  buildDay(shiftedKey(offset)),
)
