import { useState } from 'react'
import type { FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import type { User } from 'firebase/auth'
import { signOut } from 'firebase/auth'
import { api } from '../../api'
import { normalizeCode } from '../../api/codes'
import { auth } from '../../lib/firebase'
import { useT } from '../../lib/i18n'
import { useToast } from '../../lib/toast'
import TeacherCodeGate from './TeacherCodeGate'

type LandingPanel = 'teacher' | 'invite' | null

function errorText(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

export default function RoleLanding({
  user,
  title,
  onRoleChanged,
}: {
  user: User | null
  title?: string
  onRoleChanged: () => void | Promise<void>
}) {
  const navigate = useNavigate()
  const toast = useToast()
  const t = useT()
  const [panel, setPanel] = useState<LandingPanel>(null)
  const [inviteCode, setInviteCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const displayTitle = title ?? t('auth.chooseEntry')

  const redeemInvite = async (event: FormEvent) => {
    event.preventDefault()
    setBusy(true)
    setError('')
    try {
      await api.redeemAdminInvite(normalizeCode(inviteCode))
      await onRoleChanged()
      toast(t('auth.inviteRedeemed'), 'success')
      navigate('/admin', { replace: true })
    } catch (err) {
      const message = errorText(err)
      setError(message)
      toast(message, 'error')
    } finally {
      setBusy(false)
    }
  }

  const logout = async () => {
    setBusy(true)
    setError('')
    try {
      window.__mockRole?.(null)
      await signOut(auth)
      toast(t('auth.signedOut'), 'success')
      navigate('/', { replace: true })
    } catch (err) {
      const message = errorText(err)
      setError(message)
      toast(message, 'error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="role-landing" aria-label={t('auth.entryChoices')}>
      <div className="auth-panel-head">
        <p className="auth-eyebrow">{t('auth.signedIn')}</p>
        <h2>{displayTitle}</h2>
        <p>{t('auth.roleLandingBody')}</p>
      </div>

      <div className="role-choice-grid">
        <button className="role-choice" type="button" onClick={() => { setPanel('teacher'); setError('') }}>
          <span>{t('common.teacherCode')}</span>
          <strong>{t('auth.addSchool')}</strong>
        </button>
        <button className="role-choice" type="button" onClick={() => { setPanel('invite'); setError('') }}>
          <span>{t('common.adminInvite')}</span>
          <strong>{t('auth.joinHostConsole')}</strong>
        </button>
        <button className="role-choice" type="button" onClick={() => void logout()} disabled={busy}>
          <span>{t('common.account')}</span>
          <strong>{t('auth.signOut')}</strong>
        </button>
      </div>

      {panel === 'teacher' ? (
        <TeacherCodeGate
          user={user}
          onCancel={() => setPanel(null)}
          onBound={async () => {
            await onRoleChanged()
            navigate('/teacher', { replace: true })
          }}
        />
      ) : null}

      {panel === 'invite' ? (
        <form className="auth-panel auth-form" onSubmit={redeemInvite}>
          <label>
            {t('common.adminInviteCode')}
            <input value={inviteCode} onChange={(event) => setInviteCode(event.target.value.toUpperCase())} placeholder="V-..." />
          </label>
          <div className="auth-actions">
            <button className="auth-button" type="button" onClick={() => setPanel(null)}>
              {t('common.cancel')}
            </button>
            <button className="auth-button primary" type="submit" disabled={busy || !inviteCode.trim()}>
              {busy ? t('auth.redeeming') : t('auth.redeemInvite')}
            </button>
          </div>
        </form>
      ) : null}

      {error ? <div className="auth-alert">{error}</div> : null}
    </section>
  )
}
