# 태블릿 상담사용 앱 — 프로젝트 컨텍스트

## 프로젝트 개요

병원 연계 인문 프로그램 기반 감정 치유 서비스 플랫폼의 **태블릿 상담사용 앱**.
Figma에서 hi-fi 디자인이 대부분 완성된 상태이며, 이를 클릭 가능한 프로토타입으로 구현하는 것이 목표.

- **대상 기기**: Samsung Galaxy Tab S11 Ultra, 가로(landscape) 전용
- **논리 해상도**: 1138×712 (추정값, 실기기 실측 미완료)
- **데이터**: mock 데이터만 사용. 백엔드 연동 없음
- **범위 제외**: 환자용 화면, 웹 리뉴얼

## 기술 스택

Vite + Vue 3 (JavaScript) + Tailwind CSS v4 + vue-router + lucide-vue-next

**의도적으로 제외한 것 — 다시 제안하지 말 것:**
- TypeScript (첫 프론트엔드 작업, 타입 디버깅은 순수 추가 부담)
- Pinia (mock 데이터 규모에서 불필요. 필요해지면 `reactive()` 객체 하나로 시작)
- PrimeVue 등 UI 라이브러리 (디자인 시스템이 이미 확정되어 오버라이드 비용이 더 큼)
- Rolldown (이 규모에서 빌드 속도 이득이 체감되지 않음)

## 레이아웃 규칙 (필수)

- 루트는 `h-dvh`. **고정 px 높이 금지** — 주소창 유무, 소프트 키보드로 높이가 변함
- 3분할 셸: 좌우 패널 고정 폭 + `shrink-0`, 중앙 `flex-1`
- 스크롤은 각 패널 내부(`overflow-y-auto`)만. 페이지 전체 스크롤 금지
- 주소창 없는 PWA standalone 모드로 배포 예정
  - 브라우저 뒤로가기·새로고침이 없으므로 앱 내 이탈 경로가 항상 존재해야 함
  - Android 제스처 뒤로가기가 `history.back()`으로 연결됨 → **모달은 history entry로 등록**
  - 미저장 경고는 라우터 가드 + 뒤로가기 이벤트 **양쪽 모두**에 걸어야 함

## 디자인 원칙 위계

충돌 시 위쪽이 우선한다.

**Safety and Trust > Minimalism > Consistency > Motion and Friction > Efficiency > Experience**

## 확정 설계 규칙 (변경 금지)

- **Accent(brand/500) 용법은 3가지로 동결**: 선택 상태 / 현재 위치 마커 / 드롭 대상. 그 외 사용 금지
- **경고색**: 악화 표현 전용. 개선 표현은 중립색
- **표면 분리는 border로**. 그림자 사용 금지 (다크모드 비호환)
- **터치 타깃**: 최소 44px(하드 플로어), 표준 48px. 히트 에어리어와 시각 경계 분리 허용
- **네비게이션 문법**: 탭 = 탐색(상태 불변), 버튼 = 결정(상태 변경)
- **오버레이**: 무거운 콘텐츠 → 대형 모달 + 뒤로가기 전용 dismiss / 가벼운 콘텐츠 → 팝오버 + 외부 탭 dismiss
- **스테퍼 노드 글리프는 상태만 표시**: 완료=체크, 진행중=accent fill, 대기=빈 점선 원. **순서 숫자 사용 금지**
- **프로세스 화면**: 우측 하단 고정 Primary CTA. 전제조건 미충족 시 비활성
- **오토세이브 없음**. 저장은 명시적 조작으로만. 미저장 이탈 시 3버튼 경고 모달
- **화면 내부 카드**: 라운드 8, `border-border-default`, `bg-surface-card`, 패딩 좌우 12·상하 8
  (셸 패널의 라운드 16과 구분된다)
- **일정 이벤트 블록**: `bg-surface-container`, 라운드 8, `min-h-44`, 우측 패딩 12
  - 좌측 바는 폭 8로 **항상 렌더**한다. 미표시일 때도 `invisible`로 자리를 유지해 텍스트 정렬을 지킬 것
  - 바 색: 지난 일정 `border-border-default` / 예정·진행 중 `border-border-strong`
  - **타임라인에 선택 상태 없음.** accent는 '진행 중' 배지와 드롭 대상에만 쓴다
- **일정 행 명도 2단계**: 지난 일정 = 시간 disabled·제목 secondary / 그 외 = 시간 secondary·제목 primary
  - 메타는 상태와 무관하게 secondary
    (Figma는 지난 일정 메타가 disabled이나 13px 본문 대비가 3.02로 AA 미달이라 격상)
  - **진행 중은 명도가 아니라 accent 배지로 표시**: '진행 중' = `text-interactive-default` + bold

## 색상 · 타이포그래피

`src/style.css`의 2레이어 토큰 시스템을 사용한다.

- **Layer 1 Primitives** (`--color-neutral-*`, `--color-brand-*` 등): 화면 코드에서 **직접 사용 금지**
- **Layer 2 Semantic** (`bg-surface-card`, `text-text-primary`, `border-border-subtle` 등): 화면 코드는 이것만 사용
- **다크모드**: `.dark`에서 Semantic만 재매핑. 화면 코드에 `dark:` 유틸리티를 쓰지 말 것
- 임의 값(`text-[14px]`, `bg-[#fff]`) 사용 금지. 기존 토큰으로 흡수하거나 토큰을 추가

타이포 토큰: `text-count`(11) `text-caption`(12) `text-label`(13) `text-body`(15) `text-title-sm`(17) `text-title-lg`(22) `text-nav`(22) `text-kpi`(40)

- **line-height는 전 토큰 `normal`** (폰트 메트릭). Figma가 전부 Auto이므로 동일하게 맞춘 것.
  Pretendard의 normal 비율은 1.176 — 17px→20px으로 Figma 실측값과 일치한다.
- **px로 고정하지 말 것.** 고정하면 폰트 메트릭과 어긋난다
- 화면 코드에 `leading-*`를 쓰지 말 것 (토큰이 이미 지정)

폰트: Pretendard Variable / 아이콘: Lucide outline

## 셸 확정 치수

외곽 패딩 24 / 패널 간격 24 / 좌측 네비 137 / 우측 패널 274 / 중앙 flex-1
컨테이너 라운드 16 / 네비 항목 높이 48, 라운드 8 / 항목 간격 8, 그룹 간격 16
네비 아이콘 24·간격 8·폰트 17 / 유틸 아이콘 16·간격 12·폰트 15(병원명만 12)

## 작업 방식

- **조기 컴포넌트화 금지**. 화면을 인라인으로 먼저 작성하고, 두 번째 화면에서 반복이 확인된 것만 추출
- 미확인 값은 추측으로 채우지 말고 **"확인 필요"로 명시**할 것
- 확정된 결정은 재논의하지 않는다
- 과도한 엔지니어링 제안 금지

## 현재 상태

완료: 환경 셋업, 토큰 이식, 3분할 셸 + 라우터(5화면 빈 컴포넌트), 좌측 네비 전체,
홈(업무) 화면 중앙 2컬럼(빠른 저작 · 미배정 · 일정 타임라인), 우측 환자 패널(셸 전역)

다음: 코어 프로세스 6단계

미해결:
- 실기기 논리 해상도 실측 (기기 미수령). Figma 프레임 1138×712도 추정값
  - 712에는 상태바 + 제스처바 61이 포함되어 있고, Figma 셸 콘텐츠는 603
  - PWA standalone 뷰포트는 시스템 UI를 제외하므로 `100dvh` ≈ 651 → `p-6` 제하면 603이 자연히 나온다
  - **따라서 603을 하드코딩하지 말 것.** 실기기에서 `innerHeight`가 651 근처인지만 확인하면 확정
- `interactive/pressed`가 다크모드에서 `default`와 동일 (brand/300) → pressed 피드백 소실
- `interactive/primary-fill`(neutral/900) vs 다크 `surface/canvas`(neutral/950) 명도 차 부족
- 효과성 분석 · 저작도구 화면은 Figma 디자인 자체가 미완성
