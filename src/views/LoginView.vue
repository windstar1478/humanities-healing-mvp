<script setup>
import { ref, computed } from 'vue'
import { rectOf, viewW, viewH } from '../uiScale.js'
import { useRouter, RouterLink } from 'vue-router'
import { Stethoscope, User, ArrowRight } from 'lucide-vue-next'
import { signIn } from '../authState.js'
import { patientByCode, sampleCode } from '../mocks/accessCodes.js'
import { josa } from '../text.js'
import InlineCallout from '../components/InlineCallout.vue'

/*
 * 앱의 첫 화면. **Figma 디자인이 없어 임의로 만든 것이다.**
 *
 * 셸을 걷는다(`meta.bare`). 아직 누구인지 정해지지 않아 좌측 네비를 그릴 수
 * 없고, 우측 환자 패널은 더더욱 그릴 수 없다 — 로그인 전에 환자 명단이
 * 보이면 안 된다.
 *
 * **역할을 먼저 고르고 그 다음에 입력한다.** 두 역할이 요구하는 것이 다르기
 * 때문이다(상담사는 아이디, 환자는 **1회용 접속 코드**). 한 폼에 다 넣고 역할을
 * 나중에 고르게 하면 방금 채운 칸이 쓸모없어지는 경우가 생긴다.
 *
 * **환자는 계정을 만들지 않는다.** 태블릿을 건네받는 자리라 계정을 만들 이유가
 * 없고, 이름·생년월일로 들어가게 하면 아는 사람의 정보로 남의 기록을 열 수 있다.
 *
 * ⚠️ 인증을 흉내 내지 않는다. 백엔드가 없어 무엇을 넣어도 통과하며,
 *    화면에도 그렇게 적어 둔다 — 막히는 것처럼 보이면 고장으로 읽힌다.
 */
const router = useRouter()

const ROLES = [
  {
    key: 'counselor',
    label: '치유사',
    detail: '환자 · 일정 · 치유 프로세스를 관리합니다',
    icon: Stethoscope,
    fields: [
      { key: 'id', label: '아이디', placeholder: '병원 계정 아이디' },
      { key: 'code', label: '소속 코드', placeholder: '예: CAU-01' },
    ],
  },
  {
    key: 'patient',
    label: '환자',
    detail: '배정된 설문과 프로그램에 참여합니다',
    icon: User,
    fields: [
      {
        key: 'code',
        label: '접속 코드',
        placeholder: '숫자 6자리',
        hint: '상담사가 태블릿을 건네줄 때 발급합니다',
      },
    ],
  },
]

const role = ref('counselor')
const form = ref({})

const active = computed(() => ROLES.find((r) => r.key === role.value))

/* 받침 유무로 조사가 갈린다. '(으)로'를 쓰면 화면에 괄호가 남는다 */
const startLabel = computed(() => `${josa(active.value.label, '으로', '로')} 시작하기`)

/* 역할을 바꾸면 입력 칸의 뜻이 달라진다. 앞서 친 값을 그대로 두면 안 된다 */
function pickRole(key) {
  if (role.value === key) return
  role.value = key
  form.value = {}
}

const blocked = ref(null)
function say(event, title, detail) {
  const r = rectOf(event.currentTarget)
  blocked.value = { title, detail, x: r.left + r.width / 2, y: r.top - 64 }
}

function submit(event) {
  const first = active.value.fields[0]
  if (!form.value[first.key]?.trim()) {
    say(event, `${josa(first.label, '을', '를')} 입력해 주세요`, role.value === 'patient'
      ? `시연용 코드: ${sampleCode()}`
      : '프로토타입이라 값은 검사하지 않습니다')
    return
  }

  /*
   * 상담사 쪽은 값을 검사하지 않는다. 환자 쪽은 **코드가 곧 신원**이라
   * 검사할 수밖에 없다 — 아무 코드나 통과시키면 누구의 기록을 열지 정해지지 않는다.
   */
  if (role.value === 'patient') {
    const patient = patientByCode(form.value.code)
    if (!patient) {
      say(event, '확인할 수 없는 코드입니다', `상담사에게 다시 받아 주세요 · 시연용 코드: ${sampleCode()}`)
      return
    }
    signIn('patient', { name: patient.name, patientId: patient.id })
    router.replace('/patient')
    return
  }

  signIn('counselor')
  router.replace('/')
}

const blockedStyle = computed(() => {
  if (!blocked.value) return {}
  const WIDTH = 280
  const MARGIN = 24
  const { x, y } = blocked.value
  return {
    left: `${Math.min(Math.max(MARGIN, x - WIDTH / 2), viewW() - WIDTH - MARGIN)}px`,
    top: `${y}px`,
  }
})
</script>

<template>
  <div class="flex h-app w-full items-center justify-center bg-surface-canvas p-6">
    <div class="flex w-[420px] flex-col">
      <h1 class="text-title-lg font-semibold">인문 치유 상담 지원</h1>
      <p class="mt-1 text-label text-text-secondary">누구로 시작할지 선택해 주세요</p>

      <!-- 역할. 선택 상태는 배경만으로 표현하지 않는다(3.1절) -->
      <div class="mt-6 flex gap-2">
        <button
          v-for="item in ROLES"
          :key="item.key"
          class="flex flex-1 flex-col gap-1 rounded-lg border p-3 text-left"
          :class="role === item.key
            ? 'border-border-selected bg-selected-bg active:bg-selected-bg-pressed'
            : 'border-border-default bg-surface-card active:bg-surface-pressed'"
          @click="pickRole(item.key)"
        >
          <component
            :is="item.icon"
            :size="20"
            :class="role === item.key ? 'text-interactive-default' : 'text-text-secondary'"
          />
          <span class="text-body font-medium">{{ item.label }}</span>
          <span class="text-count text-text-secondary">{{ item.detail }}</span>
        </button>
      </div>

      <!-- 입력. 역할마다 묻는 것이 다르다 -->
      <div class="mt-4 flex flex-col gap-3">
        <label v-for="field in active.fields" :key="field.key" class="flex flex-col gap-1">
          <span class="text-label font-medium text-text-secondary">{{ field.label }}</span>
          <input
            v-model="form[field.key]"
            type="text"
            :placeholder="field.placeholder"
            :inputmode="field.key === 'code' ? 'numeric' : 'text'"
            class="h-11 w-full rounded-lg border border-border-default bg-surface-field px-3 text-body text-text-primary placeholder:text-text-disabled"
            @keyup.enter="submit"
          />
          <span v-if="field.hint" class="text-count text-text-secondary">{{ field.hint }}</span>
        </label>
      </div>

      <button class="mt-6 flex h-12 items-center justify-center gap-1 rounded-lg bg-surface-inverse text-body text-text-inverse active:bg-surface-inverse-pressed" @click="submit">
        {{ startLabel }}
        <ArrowRight :size="16" class="shrink-0" />
      </button>

      <p class="mt-3 text-center text-count text-text-secondary">
        <template v-if="role === 'patient'">
          프로토타입입니다. 코드는 소진되지 않습니다 · 시연용 코드 {{ sampleCode() }}
        </template>
        <template v-else>
          프로토타입입니다. 입력한 값은 검사하지 않고 어디에도 보내지 않습니다.
        </template>
      </p>
      <!--
        실기기 측정으로 가는 임시 문. standalone에는 주소창이 없어 이 링크가
        없으면 측정 화면에 닿을 길이 없다. **논리 해상도가 확정되면 걷어낸다.**
      -->
      <RouterLink
        to="/measure"
        class="mx-auto mt-2 flex h-11 items-center text-count text-text-secondary active:text-text-primary"
      >
        실기기 측정
      </RouterLink>
    </div>

    <Teleport to="body">
      <div v-if="blocked" class="fixed inset-0 z-50" @click="blocked = null">
        <div class="absolute max-w-[280px]" :style="blockedStyle">
          <InlineCallout :title="blocked.title" :detail="blocked.detail" />
        </div>
      </div>
    </Teleport>
  </div>
</template>
