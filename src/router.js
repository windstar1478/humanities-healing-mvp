import { createRouter, createWebHistory } from 'vue-router'
import { session } from './authState.js'
import { findTool } from './mocks/authoring.js'
import { surveys } from './mocks/surveys.js'
import { findGroup } from './mocks/dataFields.js'
import { findProcess } from './mocks/processLibrary.js'
import { findProgram } from './mocks/programs.js'
import { findActivity } from './mocks/activities.js'
import { findBook } from './mocks/books.js'
import { findSpec } from './mocks/dataSpecs.js'

/*
 * 우측 환자 패널은 '환자를 다루는 화면'에만 붙는다.
 *   업무 · 일정 · 환자 분석 → 환자와 관련된 화면이므로 패널이 있다
 *   효과성 분석 · 저작도구  → 프로그램/프로세스를 다루므로 패널이 없다
 * 전체 환자 리스트와 환자 상세는 환자 화면이지만, 화면 자체가 환자 패널이
 * 하던 일을 더 넓게 해서 같이 두면 같은 정보가 두 번 나온다.
 *
 * meta.noPatientPanel이 셸에서 패널을 걷고 중앙 패딩도 36 → 24로 바꾼다.
 */
const router = createRouter({
  history: createWebHistory(),
  routes: [
    /*
     * 첫 화면. 셸을 걷는다 — 아직 누구인지 정해지지 않아 좌측 네비를 그릴 수
     * 없고, 로그인 전에 우측 패널의 환자 명단이 보이면 안 된다.
     */
    {
      path: '/login',
      component: () => import('./views/LoginView.vue'),
      meta: { bare: true, public: true },
    },
    /* 환자로 로그인했을 때. 환자용 화면은 이번 범위 밖이라 안내와 나가는 길만 있다 */
    {
      path: '/patient',
      component: () => import('./views/PatientHomeView.vue'),
      meta: { bare: true, role: 'patient' },
    },
    /*
     * 실기기 논리 해상도 실측용. **제품 화면이 아니다** — 값이 확정되면 걷어낸다.
     * 셸도 로그인도 걷는다: 재려는 것이 셸을 그리기 전의 뷰포트다.
     */
    {
      path: '/measure',
      component: () => import('./views/MeasureView.vue'),
      meta: { bare: true, public: true },
    },
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
    /*
     * 척도 저작. 저작도구 중 **편집 화면이 있는 첫 도구**다 —
     * 일곱을 한꺼번에 열지 않고 하나씩 축소 버전으로 만든다.
     * `new`면 새로 만드는 자리고, 그 밖에는 설문 코드다.
     */
    {
      path: '/authoring/scale/:code',
      component: () => import('./views/ScaleEditorView.vue'),
      meta: { noPatientPanel: true },
      beforeEnter: (to) =>
        to.params.code === 'new' || surveys[to.params.code]
          ? true
          : { path: '/authoring/scale', replace: true },
    },
    /*
     * 데이터 필드 저작. **편집 단위가 필드가 아니라 그룹이다** —
     * 코드명이 그룹 접두 + 순번이라 필드는 자기 그룹 안에서만 뜻이 있다.
     */
    {
      path: '/authoring/field/:group',
      component: () => import('./views/FieldGroupEditorView.vue'),
      meta: { noPatientPanel: true },
      beforeEnter: (to) =>
        to.params.group === 'new' || findGroup(to.params.group)
          ? true
          : { path: '/authoring/field', replace: true },
    },
    /* 데이터 명세 저작. 필드를 만드는 자리가 아니라 고르는 자리다 */
    {
      path: '/authoring/spec/:id',
      component: () => import('./views/SpecEditorView.vue'),
      meta: { noPatientPanel: true },
      beforeEnter: (to) =>
        to.params.id === 'new' || findSpec(to.params.id)
          ? true
          : { path: '/authoring/spec', replace: true },
    },
    /*
     * 프로세스 저작(MVP). 단계 골격은 코어 프로세스가 고정하고 있어
     * 여기서는 그 안의 구성만 정한다.
     */
    {
      path: '/authoring/process/:id',
      component: () => import('./views/ProcessEditorView.vue'),
      meta: { noPatientPanel: true },
      beforeEnter: (to) =>
        to.params.id === 'new' || findProcess(to.params.id)
          ? true
          : { path: '/authoring/process', replace: true },
    },
    /*
     * 프로그램 저작. 회차의 이름과 순서까지가 이 화면의 몫이고
     * 회차 안의 활동은 세션 활동이 맡는다.
     */
    {
      path: '/authoring/program/:id',
      component: () => import('./views/ProgramEditorView.vue'),
      meta: { noPatientPanel: true },
      beforeEnter: (to) =>
        to.params.id === 'new' || findProgram(to.params.id)
          ? true
          : { path: '/authoring/program', replace: true },
    },
    /*
     * 세션 활동 저작. 좌 메타데이터 · 우 블록 구성 두 판이다.
     */
    {
      path: '/authoring/activity/:id',
      component: () => import('./views/ActivityEditorView.vue'),
      meta: { noPatientPanel: true },
      beforeEnter: (to) =>
        to.params.id === 'new' || findActivity(to.params.id)
          ? true
          : { path: '/authoring/activity', replace: true },
    },
    /*
     * 도서 콘텐츠 저작. 한 건 = 한 도서에서 뽑은 문단 하나다.
     */
    {
      path: '/authoring/book/:id',
      component: () => import('./views/BookEditorView.vue'),
      meta: { noPatientPanel: true },
      beforeEnter: (to) =>
        to.params.id === 'new' || findBook(to.params.id)
          ? true
          : { path: '/authoring/book', replace: true },
    },
    /*
     * 저작도구 하나. 어느 도구인지가 경로에 들어간다 —
     * 새로고침·뒤로가기가 같은 도구로 돌아와야 한다(코어 프로세스의 단계와 같다).
     * 없는 키로 들어오면 홈으로 되돌린다. 빈 화면을 남기지 않는다.
     */
    {
      path: '/authoring/:tool',
      component: () => import('./views/AuthoringToolView.vue'),
      meta: { noPatientPanel: true },
      beforeEnter: (to) => (findTool(to.params.tool) ? true : { path: '/authoring', replace: true }),
    },
  ],
})

/*
 * 로그인 가드. 세션이 없으면 어느 화면도 열지 않는다 —
 * 화면마다 검사하면 한 곳만 빠져도 우회로가 된다.
 *
 * 역할도 함께 본다. 환자 세션으로 상담사 화면이 열리면 다른 환자의 명단이
 * 보인다 — 이 앱에서 제일 큰 손실이다(1.2절).
 */
router.beforeEach((to) => {
  if (to.meta.public) return true
  if (!session.role) return { path: '/login', replace: true }
  if (session.role === 'patient' && to.meta.role !== 'patient') {
    /* 설문 수행만 예외다. 상담사가 건네준 화면이라 환자가 조작하는 것이 맞다 */
    if (!to.path.startsWith('/survey/')) return { path: '/patient', replace: true }
  }
  if (session.role === 'counselor' && to.meta.role === 'patient') return { path: '/', replace: true }
  return true
})

export default router
