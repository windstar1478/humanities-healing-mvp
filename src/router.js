import { createRouter, createWebHistory } from 'vue-router'

export default createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/',              component: () => import('./views/HomeView.vue') },
    { path: '/schedule',      component: () => import('./views/ScheduleView.vue') },
    { path: '/patients',      component: () => import('./views/PatientsView.vue') },
    /*
     * 전체 환자 리스트는 우측 환자 패널을 쓰지 않는다.
     * 리스트 자체가 환자 패널이 하던 일을 더 넓게 하는 화면이라
     * 같이 두면 같은 정보가 두 번 나온다 (Figma 127:8671도 패널이 없다).
     */
    {
      path: '/patients/list',
      component: () => import('./views/PatientListView.vue'),
      meta: { fullWidth: true },
    },
    { path: '/effectiveness', component: () => import('./views/EffectivenessView.vue') },
    { path: '/authoring',     component: () => import('./views/AuthoringView.vue') },
  ],
})