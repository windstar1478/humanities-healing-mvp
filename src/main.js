import { createApp } from 'vue'
import './style.css'
import App from './App.vue'
import router from './router'
import { seedPatients } from './mocks/seed.js'

/* 목업 명단에 프로세스·감정평가 응답·처방을 심는다. 실제 데이터가 오면 걷어낸다 */
seedPatients()

createApp(App).use(router).mount('#app')