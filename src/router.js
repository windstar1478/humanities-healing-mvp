import { createRouter, createWebHistory } from 'vue-router'

/*
 * 우측 환자 패널은 '환자를 다루는 화면'에만 붙는다.
 *   업무 · 일정 · 환자 분석 → 환자와 관련된 화면이므로 패널이 있다
 *   효과성 분석 · 저작도구  → 프로그램/프로세스를 다루므로 패널이 없다
 * 전체 환자 리스트와 환자 상세는 환자 화면이지만, 화면 자체가 환자 패널이
 * 하던 일을 더 넓게 해서 같이 두면 같은 정보가 두 번 나온다.
 *
 * meta.noPatientPanel이 셸에서 패널을 걷고 중앙 패딩도 36 → 24로 바꾼다.
 */
export default createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/',         component: () => import('./views/HomeView.vue') },
    { path: '/schedule', component: () => import('./views/ScheduleView.vue') },
    { path: '/patients', component: () => import('./views/PatientsView.vue') },
    {
      path: '/patients/list',
      component: () => import('./views/PatientListView.vue'),
      meta: { noPatientPanel: true },
    },
    {
      path: '/patients/detail/:id',
      component: () => import('./views/PatientDetailView.vue'),
      meta: { noPatientPanel: true },
    },
    /*
     * 코어 프로세스 6단계. 프로세스를 다루는 화면이라 우측 패널이 없다
     * (Figma 148:7242의 본문도 929로, 패널 자리가 없다).
     * 단계는 경로에 들어간다 — 새로고침·뒤로가기가 같은 단계로 돌아와야 한다.
     */
    {
      path: '/process/:id/:step',
      component: () => import('./views/ProcessView.vue'),
      meta: { noPatientPanel: true },
    },
    /*
     * 설문 수행. 조작자가 상담사가 아니라 환자라서 **셸 전체를 걷는다** —
     * 좌측 내비도 우측 패널도 없다. meta.bare가 App.vue에서 셸을 통째로 건너뛴다.
     * 화면 하나만 다르게 두는 것이 아니라 라우트 메타로 선언하는 이유는,
     * 누락됐을 때의 손실이 가장 큰 화면이기 때문이다.
     */
    {
      path: '/survey/:patientId/:phase/:code',
      component: () => import('./views/SurveyView.vue'),
      meta: { bare: true },
    },
    {
      path: '/effectiveness',
      component: () => import('./views/EffectivenessView.vue'),
      meta: { noPatientPanel: true },
    },
    {
      path: '/authoring',
      component: () => import('./views/AuthoringView.vue'),
      meta: { noPatientPanel: true },
    },
  ],
})
