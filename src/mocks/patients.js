/*
 * 우측 환자 패널 mock 데이터 (셸 전역)
 *
 * status   = 지금 어디까지 왔는지 (패널에 표시)
 * nextStep = 다음에 진행할 단계. 실제로는 백엔드가 환자별 프로세스 정의를 보고
 *            내려줄 값이다. 환자마다 단계 구성과 횟수가 달라서 앱이 계산할 수 없고,
 *            아직 도달하지 않은 단계를 임의로 고르지 못하게 하려면 이렇게 하나만
 *            받아야 한다. null이면 남은 단계가 없다.
 */

export const recentPatients = [
  {
    id: 'p-1', name: '이준호', age: 31, sex: '남',
    condition: '게임과몰입', status: '프로그램 수행', nextStep: '감정평가 (사후)',
  },
  {
    id: 'p-2', name: '김철수', age: 27, sex: '남',
    condition: '게임과몰입', status: '감정평가 (사전)', nextStep: '프로그램 처방',
  },
  {
    id: 'p-3', name: '정유나', age: 22, sex: '여',
    condition: 'PTSD', status: '프로그램 처방', nextStep: '프로그램 수행',
  },
]

export const allPatients = [
  {
    id: 'p-4', name: '김서준', age: 19, sex: '남',
    condition: '게임과몰입', status: '감정평가 (사후)', nextStep: '프로세스 종료',
  },
  {
    id: 'p-5', name: '김철수', age: 27, sex: '남',
    condition: '게임과몰입', status: '감정평가 (사전)', nextStep: '프로그램 처방',
  },
  {
    id: 'p-6', name: '나예솔', age: 23, sex: '여',
    condition: 'PTSD', status: '프로그램 수행', nextStep: '감정평가 (사후)',
  },
]
