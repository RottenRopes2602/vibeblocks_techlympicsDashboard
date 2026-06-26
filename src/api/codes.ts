// 코드 체계 — CONTRACT.md §2. 변경은 Claude 승인 경유.
// 0/O/1/I/L 제외 알파벳 (현장 구두 전달·칠판 판서 오독 방지)
export const CODE_ALPHABET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ'

function randomCode(len: number): string {
  const buf = new Uint32Array(len)
  crypto.getRandomValues(buf)
  return Array.from(buf, (n) => CODE_ALPHABET[n % CODE_ALPHABET.length]).join('')
}

export const newJoinCode = () => randomCode(6) // 학급코드: K7XM3Q
export const newTeacherCode = () => `T-${randomCode(8)}` // 교사코드 (가입 게이트)
export const newRecoveryCode = () => `R-${randomCode(12)}` // 복구코드 (비밀)
export const newPublicId = () => `P-${randomCode(4)}` // 참가자 공개 ID
export const newInviteCode = () => `V-${randomCode(10)}` // organizer 초대코드

// 입력칸 하나에서 코드 종류 자동 구분 (prefix 기반)
export type CodeKind = 'join' | 'teacher' | 'recovery' | 'invite' | 'unknown'
export function classifyCode(input: string): CodeKind {
  const s = input.trim().toUpperCase()
  if (/^T-[A-Z2-9]{8}$/.test(s)) return 'teacher'
  if (/^R-[A-Z2-9]{12}$/.test(s)) return 'recovery'
  if (/^V-[A-Z2-9]{10}$/.test(s)) return 'invite'
  if (/^[A-Z2-9]{6}$/.test(s)) return 'join'
  return 'unknown'
}

export function normalizeCode(input: string): string {
  return input.trim().toUpperCase()
}

// DEV/mock 전용 느슨한 형식 검사 — 실코드 알파벳(0/1/O/I/L 제외)을 무시하고
// prefix+길이만 본다(테스트 입력 편의: T-12345678 같이 1·0 포함도 허용).
// production 경로(firestore·실 게이트)에선 절대 호출하지 않는다 — classifyCode(엄격)만.
export function isDevTeacherCode(input: string): boolean {
  return /^T-[A-Z0-9]{8}$/i.test(input.trim())
}
export function isDevInviteCode(input: string): boolean {
  return /^V-[A-Z0-9]{10}$/i.test(input.trim())
}

export async function sha256Hex(text: string): Promise<string> {
  const data = new TextEncoder().encode(text)
  const digest = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('')
}
