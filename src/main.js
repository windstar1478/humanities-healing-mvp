import { createApp } from 'vue'
import './style.css'
import App from './App.vue'
import router from './router'
import { seedPatients } from './mocks/seed.js'

/* 목업 명단에 프로세스·감정평가 응답·처방을 심는다. 실제 데이터가 오면 걷어낸다 */
seedPatients()

createApp(App).use(router).mount('#app')

/*
 * standalone(홈 화면에 추가)으로 띄우기 위한 등록. 워커는 캐시하지 않는다 —
 * 배포한 것과 다른 화면이 태블릿에 남으면 실측이 어긋난다.
 */
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('/sw.js'))
}