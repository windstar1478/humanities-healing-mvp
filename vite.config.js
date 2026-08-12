import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [vue(), tailwindcss()],
  // 실행 도구가 PORT를 지정하면 그 포트를 그대로 쓴다.
  // (없으면 vite 기본 동작 — 5173부터 비어 있는 포트를 찾는다)
  server: process.env.PORT
    ? { port: Number(process.env.PORT), strictPort: true }
    : {},
})