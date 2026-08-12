import { reactive } from 'vue'

/*
 * 셸(우측 환자 패널)과 화면(중앙 일정 타임라인)이 함께 읽는 유일한 공유 상태.
 * 규모가 이 정도라 Pinia 대신 reactive 객체 하나로 시작한다.
 */
export const dragState = reactive({
  /* 꾹 눌러 집어 든 환자. null이면 드래그 중이 아니다 */
  patient: null,
})

/* 꾹 누르기 인식 임계. Figma 정의값이 아니라 잠정값 */
export const LONG_PRESS_MS = 500

/* 이 거리를 넘겨 움직이면 스크롤 의도로 보고 꾹 누르기를 취소한다 */
export const PRESS_MOVE_TOLERANCE = 10
