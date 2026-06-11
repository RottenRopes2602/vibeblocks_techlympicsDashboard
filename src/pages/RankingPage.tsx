import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
import { api } from '../api'
import { normalizeCode } from '../api/codes'
import { formatSec } from '../api/scoring'
import type { ChallengeDef, ChallengeSlot, JoinInfo, LeaderboardRow } from '../api/types'
import styles from '../features/ranking/publicPages.module.css'

type LoadState = 'loading' | 'ready' | 'error'

const FALLBACK_CHALLENGES: ChallengeDef[] = [
  { slot: 'c1', missionId: 201, name: 'C1' },
  { slot: 'c2', missionId: 202, name: 'C2' },
  { slot: 'c3', missionId: 203, name: 'C3' },
]

function errorCode(error: unknown): string {
  return error instanceof Error ? error.message : 'UNKNOWN_ERROR'
}

function totalAttempts(row: LeaderboardRow): number {
  return row.attemptsUsed.c1 + row.attemptsUsed.c2 + row.attemptsUsed.c3
}

function completedChallenges(row: LeaderboardRow, challenges: ChallengeDef[]): number {
  return challenges.filter((challenge) => row.bests[challenge.slot] !== undefined).length
}

function statusLabel(status: LeaderboardRow['status']): string {
  if (status === 'approved') return 'Registered'
  if (status === 'pending') return 'Pending'
  return 'Rejected'
}

function challengeShortLabel(slot: ChallengeSlot): string {
  return slot.toUpperCase()
}

// Owned by task vb-116-web-ranking (CONTRACT.md §7)
export default function RankingPage() {
  const params = useParams()
  const location = useLocation()
  const joinCode = useMemo(() => normalizeCode(params.joinCode ?? ''), [params.joinCode])
  const isJoinLanding = location.pathname.startsWith('/join/')
  const [includePending, setIncludePending] = useState(false)
  const [state, setState] = useState<LoadState>('loading')
  const [info, setInfo] = useState<JoinInfo | null>(null)
  const [rows, setRows] = useState<LeaderboardRow[]>([])
  const [error, setError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [lastUpdated, setLastUpdated] = useState<string | null>(null)
  const requestId = useRef(0)

  const load = useCallback(
    async (mode: 'initial' | 'refresh' = 'initial') => {
      const id = requestId.current + 1
      requestId.current = id
      if (mode === 'initial') setState('loading')
      if (mode === 'refresh') setRefreshing(true)
      setError(null)

      try {
        const [classInfo, leaderboard] = await Promise.all([
          api.getClassByJoinCode(joinCode),
          api.getLeaderboard(joinCode, { includePending }),
        ])
        if (requestId.current !== id) return
        setInfo(classInfo)
        setRows(leaderboard)
        setLastUpdated(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }))
        setState('ready')
      } catch (caught) {
        if (requestId.current !== id) return
        setError(errorCode(caught))
        setState('error')
      } finally {
        if (requestId.current === id) setRefreshing(false)
      }
    },
    [includePending, joinCode],
  )

  useEffect(() => {
    void load('initial')
  }, [load])

  useEffect(() => {
    const timer = window.setInterval(() => {
      void load('refresh')
    }, 60_000)
    return () => window.clearInterval(timer)
  }, [load])

  const visibleRows = rows.filter((row) => row.rank !== null || totalAttempts(row) > 0)
  const rankedRows = visibleRows.filter((row) => row.rank !== null).length
  const unrankedRows = visibleRows.length - rankedRows
  const pendingRows = visibleRows.filter((row) => row.status === 'pending').length
  const challengeColumns = info?.event.challenges ?? FALLBACK_CHALLENGES
  const maxAttempts = (info?.event.attemptsPerChallenge ?? 3) * challengeColumns.length

  if (state === 'error' && error === 'CLASS_NOT_FOUND') {
    return (
      <main className={styles.shell}>
        <section className={styles.messagePanel}>
          <p className={styles.kicker}>Class code not found</p>
          <h1>Check the code and try again.</h1>
          <p>The class code may have been mistyped or replaced by your teacher.</p>
          <Link className={styles.primaryLink} to="/">
            Enter another code
          </Link>
        </section>
      </main>
    )
  }

  return (
    <main className={styles.shell}>
      {isJoinLanding ? (
        <section className={styles.joinPanel} aria-labelledby="join-title">
          <div>
            <p className={styles.kicker}>Class code {joinCode}</p>
            <h1 id="join-title">Join in the VibeBlocks app.</h1>
            <p>Open the app on this device, enter your class code, and submit your FC-1 run.</p>
          </div>
          <div className={styles.joinActions}>
            <a className={styles.primaryLink} href="#">
              App Store
            </a>
            <a className={styles.secondaryLink} href="#">
              Google Play
            </a>
            <Link className={styles.secondaryLink} to={`/r/${joinCode}`}>
              View ranking
            </Link>
          </div>
        </section>
      ) : null}

      <section className={styles.rankingHeader} aria-labelledby="ranking-title">
        <Link className={styles.backLink} to="/">
          Enter another code
        </Link>
        <div className={styles.classMeta}>
          <p className={styles.kicker}>{info?.event.name ?? 'Techlympics 2026'}</p>
          <h1 id="ranking-title">{info ? `${info.school.name} - ${info.classInfo.name}` : 'Loading leaderboard'}</h1>
          <p>Class code {joinCode}</p>
        </div>
        <button className={styles.refreshButton} type="button" onClick={() => void load('refresh')} disabled={refreshing}>
          {refreshing ? 'Refreshing...' : 'Refresh'}
        </button>
      </section>

      <section className={styles.toolbar} aria-label="Leaderboard filters">
        <div className={styles.segmented} role="group" aria-label="Registration filter">
          <button
            type="button"
            className={!includePending ? styles.activeSegment : undefined}
            onClick={() => setIncludePending(false)}
          >
            Registered
          </button>
          <button
            type="button"
            className={includePending ? styles.activeSegment : undefined}
            onClick={() => setIncludePending(true)}
          >
            Include pending
          </button>
        </div>
        <p>
          {rankedRows} ranked
          {unrankedRows > 0 ? ` - ${unrankedRows} unranked` : ''}
          {includePending && pendingRows > 0 ? ` - ${pendingRows} pending` : ''}
          {lastUpdated ? ` - updated ${lastUpdated}` : ''}
        </p>
      </section>

      <section className={styles.boardPanel} aria-live="polite">
        {state === 'loading' ? (
          <div className={styles.emptyState}>Loading current results...</div>
        ) : state === 'error' ? (
          <div className={styles.emptyState}>
            <h2>Leaderboard is unavailable.</h2>
            <p>{error ?? 'Try again in a moment.'}</p>
          </div>
        ) : visibleRows.length === 0 ? (
          <div className={styles.emptyState}>No participants are visible yet.</div>
        ) : (
          <div className={styles.tableWrap}>
            <table className={styles.boardTable}>
              <thead>
                <tr>
                  <th>Rank</th>
                  <th>Name</th>
                  {challengeColumns.map((challenge) => (
                    <th key={challenge.slot}>{challenge.name}</th>
                  ))}
                  <th>Average</th>
                  <th>Attempts</th>
                </tr>
              </thead>
              <tbody>
                {visibleRows.map((row, index) => (
                  <Fragment key={row.publicId}>
                    {row.rank === null && visibleRows[index - 1]?.rank !== null ? (
                      <tr className={styles.groupRow}>
                        <td colSpan={challengeColumns.length + 4}>Unranked - complete all 3 challenges to enter the ranking</td>
                      </tr>
                    ) : null}
                    <tr className={row.rank === null ? styles.unrankedRow : undefined}>
                      <td className={styles.rankCell}>
                        <span className={styles.cellLabel}>Rank</span>
                        <span className={styles.cellValue}>{row.rank ?? '-'}</span>
                      </td>
                      <td className={styles.participantCell}>
                        <span className={styles.nameCell}>{row.name}</span>
                        <span className={styles.publicId}>{row.publicId}</span>
                        <span className={styles.statusChip}>{statusLabel(row.status)}</span>
                        {row.rank === null ? (
                          <span className={styles.progressChip}>
                            Challenge {completedChallenges(row, challengeColumns)}/{challengeColumns.length}
                          </span>
                        ) : null}
                      </td>
                      {challengeColumns.map((challenge) => (
                        <td key={challenge.slot} className={styles.challengeCell}>
                          <span className={styles.cellLabel}>{challenge.name}</span>
                          <span className={styles.cellValue}>{formatSec(row.bests[challenge.slot])}</span>
                        </td>
                      ))}
                      <td className={styles.averageCell}>
                        <span className={styles.cellLabel}>Average</span>
                        <span className={styles.cellValue}>{formatSec(row.averageSec)}</span>
                      </td>
                      <td className={styles.attemptCell}>
                        <span className={styles.cellLabel}>Attempts</span>
                        <span className={styles.cellValue}>
                          {totalAttempts(row)}/{maxAttempts}
                        </span>
                        <span className={styles.attemptBreakdown}>
                          {challengeColumns.map((challenge) => (
                            <span key={challenge.slot}>
                              {challengeShortLabel(challenge.slot)} {row.attemptsUsed[challenge.slot]}/
                              {info?.event.attemptsPerChallenge ?? 3}
                            </span>
                          ))}
                        </span>
                      </td>
                    </tr>
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  )
}
