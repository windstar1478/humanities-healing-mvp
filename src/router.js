import { createRouter, createWebHistory } from 'vue-router'

export default createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/',              component: () => import('./views/HomeView.vue') },
    { path: '/schedule',      component: () => import('./views/ScheduleView.vue') },
    { path: '/patients',      component: () => import('./views/PatientsView.vue') },
    { path: '/effectiveness', component: () => import('./views/EffectivenessView.vue') },
    { path: '/authoring',     component: () => import('./views/AuthoringView.vue') },
  ],
})