import { CHALLENGE_SLOTS } from './types'
import type { AttemptMetrics, BoardBest, BoardEntryDoc, ChallengeSlot } from './types'

// ============================================================
// 점수 v4 — 시간 기반 (2026-06-12 개정)
// 도전당 최대 N회 시도, 기록 = 가장 빠른 유효 시간.
// 랭킹 v4: 완료 종목 수 내림차순 → (같으면) 완료분 평균 오름차순 → 갱신시각.
// 미시도 포함 전원 표시 (완료 0 = rank 없음 '-', 표 최하단).
// 원칙: raw metrics만 저장, 파생값(평균·순위)은 표시 시점 계산.
// ============================================================

/** 유효 기록 = 완주(성공률 1) + 시간 존재. 실패 런은 시도만 소모 */
export function isValidRecord(m: AttemptMetrics): boolean {
  return m.successRate === 1 && m.averageTimeSec !== null
}

export function recordTimeSec(m: AttemptMetrics): number | null {
  return isValidRecord(m) ? m.averageTimeSec : null
}

/** 후보가 기존 best보다 빠른가 */
export function isBetter(candidate: AttemptMetrics, current: BoardBest | null | undefined): boolean {
  const t = recordTimeSec(candidate)
  if (t === null) return false
  if (!current) return true
  return t < current.timeSec
}

/** 완료(유효 기록 보유) 종목 수 */
export function completedCount(bests: Partial<Record<ChallengeSlot, BoardBest>>): number {
  return CHALLENGE_SLOTS.filter((s) => bests[s]).length
}

/** 완료한 종목들의 평균(초). 완료 0 = null. (v4: 3개 미만도 평균 산출) */
export function averageSec(bests: Partial<Record<ChallengeSlot, BoardBest>>): number | null {
  const times = CHALLENGE_SLOTS.map((s) => bests[s]?.timeSec).filter((t): t is number => t !== undefined)
  if (times.length === 0) return null
  return times.reduce((a, b) => a + b, 0) / times.length
}

/** 랭킹 정렬 v4: 완료 수 ↓ → 완료분 평균 ↑ → 갱신시각 ↑ */
export function compareEntries(a: BoardEntryDoc, b: BoardEntryDoc): number {
  const ac = completedCount(a.bests)
  const bc = completedCount(b.bests)
  if (ac !== bc) return bc - ac
  const aa = averageSec(a.bests)
  const bb = averageSec(b.bests)
  if (aa !== null && bb !== null && aa !== bb) return aa - bb
  return a.updatedAt.localeCompare(b.updatedAt)
}

/** 표시용 시간 포맷 (소수 1자리 초) */
export function formatSec(t: number | null | undefined): string {
  if (t === null || t === undefined) return '-'
  return `${t.toFixed(1)}s`
}
