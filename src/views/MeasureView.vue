<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { RouterLink } from 'vue-router'
import { uiScale, setScale, SCALES, currentViewport } from '../uiScale.js'

/*
 * 실기기 논리 해상도 실측용 화면. **제품 화면이 아니다** —
 * 기기를 받아 값을 확정하고 나면 이 파일과 라우트를 걷어낸다.
 *
 * 셸을 걷고(`meta.bare`) 로그인도 요구하지 않는다(`meta.public`) —
 * 재려는 것이 셸을 그리기 전의 뷰포트라 셸이 끼면 그만큼 잘못 잰다.
 *
 * 태블릿에는 개발자 도구를 열 길이 마땅치 않아 **화면이 직접 값을 적는다.**
 * PWA standalone에서 열어야 의미가 있다 — 주소창이 있는 브라우저 탭에서 재면
 * 주소창 높이만큼 작게 나온다.
 */
const v = ref({})

/* 셸 루트가 h-dvh이고 p-6(24)이라 콘텐츠 높이는 dvh - 48이다 */
const probe = ref(null)

function read() {
  const vv = window.visualViewport
  v.value = {
    inner: `${window.innerWidth} × ${window.innerHeight}`,
    visual: vv ? `${Math.round(vv.width)} × ${Math.round(vv.height)}` : '없음',
    dvh: probe.value ? `${Math.round(probe.value.getBoundingClientRect().height)}` : '-',
    scale: uiScale.value.toFixed(2),
    viewport: currentViewport(),
    screen: `${window.screen.width} × ${window.screen.height}`,
    dpr: String(window.devicePixelRatio),
    orientation: window.screen.orientation?.type ?? '알 수 없음',
    standalone: window.matchMedia('(display-mode: standalone)').matches
      ? '예 (주소창 없음)'
      : '아니오 (브라우저 탭)',
    ua: navigator.userAgent,
  }
}

let onResize
onMounted(() => {
  read()
  onResize = () => read()
  window.addEventListener('resize', onResize)
  window.visualViewport?.addEventListener('resize', onResize)
})
onBeforeUnmount(() => {
  window.removeEventListener('resize', onResize)
  window.visualViewport?.removeEventListener('resize', onResize)
})

const ROWS = [
  { key: 'inner', label: '레이아웃 뷰포트 (innerWidth × innerHeight)', want: '배율 1.00에서 1691 × 974' },
  { key: 'scale', label: '적용된 배율', want: '' },
  { key: 'viewport', label: '걸려 있는 뷰포트', want: '' },
  { key: 'dvh', label: '셸 콘텐츠 높이 (레이아웃 단위)', want: '' },
  { key: 'standalone', label: 'standalone 여부', want: '예' },
  { key: 'visual', label: 'visualViewport', want: '' },
  { key: 'screen', label: 'screen (CSS px)', want: '' },
  { key: 'dpr', label: 'devicePixelRatio', want: '' },
  { key: 'orientation', label: '방향', want: 'landscape' },
]
</script>

<template>
  <!-- 100dvh에서 p-6을 뺀 높이를 실제로 재는 자리다. 화면 밖에 둔다 -->
  <div class="pointer-events-none fixed top-0 left-0 h-dvh w-px -translate-x-full p-6">
    <div ref="probe" class="h-full"></div>
  </div>

  <div class="h-dvh overflow-y-auto bg-surface-canvas p-6">
    <div class="mx-auto flex max-w-[720px] flex-col gap-4">
      <div class="flex items-center justify-between">
        <h1 class="text-title-lg font-bold text-text-primary">실기기 측정</h1>
        <RouterLink
          to="/login"
          class="flex h-11 items-center rounded-lg border border-border-default px-3 text-body text-text-secondary active:bg-surface-pressed"
        >
          로그인으로
        </RouterLink>
      </div>

      <!--
        배율 고르기. **임시 장치다** — 숫자로 정할 수 없는 문제라 기기에서
        눌러가며 비교할 자리를 둔다. 고른 값은 기기에 남아 다른 화면에도 그대로 걸린다.
      -->
      <div class="flex flex-col gap-2 rounded-lg border border-border-default bg-surface-card px-3 py-2">
        <span class="text-label text-text-secondary">화면 배율 — 눌러 보고 고르세요</span>
        <div class="flex gap-2">
          <button
            v-for="s in SCALES"
            :key="s"
            class="h-11 flex-1 rounded-lg border text-body font-medium transition-colors duration-100 ease-standard"
            :class="uiScale === s
              ? 'border-border-selected bg-selected-bg text-text-primary active:bg-selected-bg-pressed'
              : 'border-border-default text-text-secondary active:bg-surface-pressed'"
            @click="setScale(s)"
          >
            {{ s.toFixed(2) }}
          </button>
        </div>
        <RouterLink
          to="/"
          class="flex h-11 items-center justify-center rounded-lg bg-surface-inverse text-body text-text-inverse active:bg-surface-inverse-pressed"
        >
          이 배율로 업무 화면 보기
        </RouterLink>
      </div>

      <div class="overflow-hidden rounded-lg border border-border-default bg-surface-card">
        <div
          v-for="(row, i) in ROWS"
          :key="row.key"
          class="flex items-baseline gap-3 px-3 py-2"
          :class="i > 0 && 'border-t border-border-subtle'"
        >
          <span class="w-[260px] shrink-0 text-label text-text-secondary">{{ row.label }}</span>
          <span class="flex-1 text-title-sm font-bold text-text-primary">{{ v[row.key] }}</span>
          <span v-if="row.want" class="text-caption text-text-secondary">기대 {{ row.want }}</span>
        </div>
      </div>

      <p class="text-caption text-text-secondary">{{ v.ua }}</p>
    </div>
  </div>
</template>
