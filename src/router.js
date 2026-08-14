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
