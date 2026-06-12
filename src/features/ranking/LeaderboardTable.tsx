import { useState } from 'react'
import { formatSec } from '../../api/scoring'
import type { ChallengeDef, ChallengeSlot, LeaderboardRow } from '../../api/types'
import type { TFunction } from '../../lib/i18n'
import { useT } from '../../lib/i18n'
import styles from './publicPages.module.css'

const FALLBACK_CHALLENGES: ChallengeDef[] = [
  { slot: 'c1', missionId: 201, name: 'Challenge 1' },
  { slot: 'c2', missionId: 202, name: 'Challenge 2' },
  { slot: 'c3', missionId: 203, name: 'Challenge 3' },
]

function totalAttempts(row: LeaderboardRow): number {
  return row.attemptsUsed.c1 + row.attemptsUsed.c2 + row.attemptsUsed.c3
}

function statusLabel(status: LeaderboardRow['status'], t: TFunction): string {
  if (status === 'approved') return t('common.registered')
  if (status === 'pending') return t('common.pending')
  if (status === 'withdrawn') return t('common.withdrawn')
  return t('common.rejected')
}

function challengeShortLabel(slot: ChallengeSlot): string {
  return slot.toUpperCase()
}

function maxAttemptsLabel(attemptsPerChallenge: number | null, challengeCount: number, t: TFunction): string {
  return attemptsPerChallenge === null ? t('common.unlimited') : String(attemptsPerChallenge * challengeCount)
}

function slotLimitLabel(attemptsPerChallenge: number | null, t: TFunction): string {
  return attemptsPerChallenge === null ? t('common.unlimited') : String(attemptsPerChallenge)
}

function sortedRows(rows: LeaderboardRow[]): LeaderboardRow[] {
  return rows
    .map((row, index) => ({ row, index }))
    .sort((a, b) => {
      if (b.row.completedCount !== a.row.completedCount) return b.row.completedCount - a.row.completedCount
      const aAverage = a.row.averageSec ?? Number.POSITIVE_INFINITY
      const bAverage = b.row.averageSec ?? Number.POSITIVE_INFINITY
      if (aAverage !== bAverage) return aAverage - bAverage
      return a.index - b.index
    })
    .map(({ row }) => row)
}

function rankLabel(row: LeaderboardRow): string | number {
  return row.completedCount > 0 ? row.rank ?? '-' : '-'
}

export default function LeaderboardTable({
  rows,
  challenges = FALLBACK_CHALLENGES,
  attemptsPerChallenge = 3,
}: {
  rows: LeaderboardRow[]
  challenges?: ChallengeDef[]
  attemptsPerChallenge?: number | null
}) {
  const t = useT()
  const [expandedPublicId, setExpandedPublicId] = useState<string | null>(null)
  const visibleRows = sortedRows(rows)
  const maxAttempts = maxAttemptsLabel(attemptsPerChallenge, challenges.length, t)

  if (visibleRows.length === 0) {
    return <div className={styles.emptyState}>{t('ranking.noParticipants')}</div>
  }

  return (
    <div className={styles.tableWrap}>
      <div className={styles.mobileLeaderboard} aria-label={t('ranking.compactLabel')}>
        {visibleRows.map((row) => {
          const expanded = expandedPublicId === row.publicId
          return (
            <article key={row.publicId} className={`${styles.mobileRowCard} ${row.completedCount === 0 ? styles.mobileUnranked : ''}`}>
              <button
                className={styles.mobileRowButton}
                type="button"
                aria-expanded={expanded}
                onClick={() => setExpandedPublicId(expanded ? null : row.publicId)}
              >
                <span className={styles.mobileRank}>{rankLabel(row)}</span>
                <span className={styles.mobileIdentity}>
                  <span className={styles.mobileName}>{row.name}</span>
                  <span className={styles.mobilePublicId}>{row.publicId}</span>
                </span>
                <span className={styles.mobileProgress}>{row.completedCount}/{challenges.length}</span>
                <span className={styles.mobileAverage}>{formatSec(row.averageSec)}</span>
              </button>
              {expanded ? (
                <div className={styles.mobileDetails}>
                  {challenges.map((challenge) => (
                    <div key={challenge.slot} className={styles.mobileDetailRow}>
                      <span>{challenge.name}</span>
                      <strong>{formatSec(row.bests[challenge.slot])}</strong>
                      <em>
                        {row.attemptsUsed[challenge.slot]}/{slotLimitLabel(attemptsPerChallenge, t)} {t('ranking.attemptsSuffix')}
                      </em>
                    </div>
                  ))}
                  <div className={styles.mobileAttemptTotal}>
                    <span>{t('ranking.totalAttempts')}</span>
                    <strong>
                      {totalAttempts(row)}/{maxAttempts}
                    </strong>
                  </div>
                </div>
              ) : null}
            </article>
          )
        })}
      </div>
      <table className={styles.boardTable}>
        <thead>
          <tr>
            <th>{t('common.rank')}</th>
            <th>{t('common.name')}</th>
            {challenges.map((challenge) => (
              <th key={challenge.slot}>{challenge.name}</th>
            ))}
            <th>{t('common.completed')}</th>
            <th>{t('common.average')}</th>
            <th>{t('common.attempts')}</th>
          </tr>
        </thead>
        <tbody>
          {visibleRows.map((row) => (
            <tr key={row.publicId} className={row.completedCount === 0 ? styles.unrankedRow : undefined}>
              <td className={styles.rankCell}>
                <span className={styles.cellLabel}>{t('common.rank')}</span>
                <span className={styles.cellValue}>{rankLabel(row)}</span>
              </td>
              <td className={styles.participantCell}>
                <span className={styles.nameCell}>{row.name}</span>
                <span className={styles.publicId}>{row.publicId}</span>
                <span className={styles.statusChip}>{statusLabel(row.status, t)}</span>
                <span className={styles.progressChip}>
                  {t('ranking.completedChip', { completed: row.completedCount, total: challenges.length })}
                </span>
              </td>
              {challenges.map((challenge) => (
                <td key={challenge.slot} className={styles.challengeCell}>
                  <span className={styles.cellLabel}>{challenge.name}</span>
                  <span className={styles.cellValue}>{formatSec(row.bests[challenge.slot])}</span>
                </td>
              ))}
              <td className={styles.completedCell}>
                <span className={styles.cellLabel}>{t('common.completed')}</span>
                <span className={styles.cellValue}>
                  {row.completedCount}/{challenges.length}
                </span>
              </td>
              <td className={styles.averageCell}>
                <span className={styles.cellLabel}>{t('common.average')}</span>
                <span className={styles.cellValue}>{formatSec(row.averageSec)}</span>
              </td>
              <td className={styles.attemptCell}>
                <span className={styles.cellLabel}>{t('common.attempts')}</span>
                <span className={styles.cellValue}>
                  {totalAttempts(row)}/{maxAttempts}
                </span>
                <span className={styles.attemptBreakdown}>
                  {challenges.map((challenge) => (
                    <span key={challenge.slot}>
                      {challengeShortLabel(challenge.slot)} {row.attemptsUsed[challenge.slot]}/{slotLimitLabel(attemptsPerChallenge, t)}
                    </span>
                  ))}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
