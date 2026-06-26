// DEV 전용 콘솔 우회 — mock 모드에서 실제 Firebase 로그인 없이 콘솔(teacher/admin/master) 진입.
// 안전: import.meta.env.DEV 는 production 빌드에서 false → 이 경로는 배포본에서 절대 동작하지 않는다.
// 사용: /techlympics/admin?dev=admin  (한 번 들어가면 localStorage 에 저장돼 내비게이션 유지)
import type { Role } from '../api/types'

const MOCK = (import.meta.env.VITE_API_IMPL ?? 'mock') === 'mock'
export const DEV_AUTH_ENABLED = import.meta.env.DEV && MOCK

const STORE_KEY = 'vb-dev-role'

declare global {
  interface Window {
    __mockRole?: (role: Role | null) => void
  }
}

function isRole(v: string | null): v is Role {
  return v === 'teacher' || v === 'admin' || v === 'master'
}

/** URL ?dev= 또는 localStorage 에서 dev 역할을 읽는다 (DEV+mock 일 때만). */
function readDevRole(): Role | null {
  if (!DEV_AUTH_ENABLED || typeof window === 'undefined') return null
  const fromUrl = new URLSearchParams(window.location.search).get('dev')
  if (isRole(fromUrl)) {
    window.localStorage.setItem(STORE_KEY, fromUrl) // 내비게이션 간 유지
    return fromUrl
  }
  const stored = window.localStorage.getItem(STORE_KEY)
  return isRole(stored) ? stored : null
}

/**
 * 이 콘솔(allowed 역할)에 dev 우회로 진입할 수 있으면 그 역할을 반환, 아니면 null.
 * 반환 시 mock api 의 역할도 같이 세팅한다(getMyRole 일관성).
 */
export function devConsoleRole(allowed: Role[]): Role | null {
  const role = readDevRole()
  if (!role || !allowed.includes(role)) return null
  window.__mockRole?.(role)
  return role
}

export function clearDevRole(): void {
  if (typeof window !== 'undefined') window.localStorage.removeItem(STORE_KEY)
}

// ============================================================
// DEV 전용 가짜 로그인 세션 — Firebase 인증 없이 교사 홈 전체 흐름
// (가입/로그인 → 교사코드 → 학교 바인딩) 을 mock 으로 끝까지 테스트.
// 보안: DEV_AUTH_ENABLED 는 production 빌드(import.meta.env.DEV=false)에서
// 상수 false → 이 블록을 쓰는 분기는 전부 dead code 로 tree-shaken 된다.
// 배포본에는 가짜 로그인 경로 자체가 존재하지 않는다(= ?dev= 우회와 동일 모델).
// ============================================================
const USER_KEY = 'vb-dev-user'

export interface DevUser {
  uid: string
  email: string | null
  displayName: string | null
  isAnonymous: boolean
  providerData: { providerId: string }[]
}

const userListeners = new Set<() => void>()
function emitDevUser(): void {
  userListeners.forEach((cb) => cb())
}

/** 가짜 유저 변경 구독 (useAuthSession 재렌더용). */
export function subscribeDevUser(cb: () => void): () => void {
  userListeners.add(cb)
  return () => {
    userListeners.delete(cb)
  }
}

/** 현재 가짜 로그인 유저 (DEV+mock 일 때만). */
export function getDevUser(): DevUser | null {
  if (!DEV_AUTH_ENABLED || typeof window === 'undefined') return null
  const raw = window.localStorage.getItem(USER_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw) as DevUser
  } catch {
    return null
  }
}

function setDevUser(user: DevUser | null): void {
  if (typeof window === 'undefined') return
  if (user) window.localStorage.setItem(USER_KEY, JSON.stringify(user))
  else window.localStorage.removeItem(USER_KEY)
  emitDevUser()
}

/** 가짜 로그인 (가입/로그인 공통 — mock 이라 비번 검증 없음). */
export function devSignIn(email: string): DevUser {
  const normalized = email.trim()
  const user: DevUser = {
    uid: `dev-${normalized || 'user'}`,
    email: normalized || 'dev@mock.local',
    displayName: normalized ? normalized.split('@')[0] : 'Dev User',
    isAnonymous: false,
    providerData: [{ providerId: 'password' }],
  }
  setDevUser(user)
  return user
}

/** 가짜 로그아웃. */
export function devSignOutUser(): void {
  setDevUser(null)
}
