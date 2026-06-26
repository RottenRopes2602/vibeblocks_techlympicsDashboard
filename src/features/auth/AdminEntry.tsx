import { useState } from 'react'
import type { FormEvent } from 'react'
import type { User } from 'firebase/auth'
import { useNavigate } from 'react-router-dom'
import { api } from '../../api'
import { classifyCode, isDevInviteCode, normalizeCode } from '../../api/codes'
import { DEV_AUTH_ENABLED } from '../../lib/devAuth'
import type { RoleDoc } from '../../api/types'
import { useT } from '../../lib/i18n'
import { useToast } from '../../lib/toast'
import AuthHeader from './AuthHeader'
import AuthPanel from './AuthPanel'
import { isRealUser } from './session'

function errorText(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

/**
 * 어드민(주최자) 전용 진입 화면. ConsoleGate 가 미인증/무권한일 때 렌더.
 * 교사 홈(/)과 분리된 별도 동선 — 로그인 우선, 초대코드(V-)는 보조.
 */
export default function AdminEntry({
  user,
  role,
  onRoleChanged,
}: {
  user: User | null
  role: RoleDoc | null
  isSignedIn: boolean
  onRoleChanged: () => void | Promise<void>
}) {
  const t = useT()
  const toast = useToast()
  const navigate = useNavigate()
  const signedIn = isRealUser(user)
  const [inviteOpen, setInviteOpen] = useState(!signedIn ? false : true)
  const [inviteCode, setInviteCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const redeem = async (event: FormEvent) => {
    event.preventDefault()
    setBusy(true)
    setError('')
    try {
      const normalized = normalizeCode(inviteCode)
      const isInvite = classifyCode(normalized) === 'invite' || (DEV_AUTH_ENABLED && isDevInviteCode(normalized))
      if (!isInvite) {
        const message = t('adminEntry.inviteCodeError')
        setError(message)
        toast(message, 'error')
        return
      }
      await api.validateAdminInvite(normalized)
      if (!signedIn) {
        // 계정이 먼저 필요 — 검증만 하고 가입/로그인 안내
        const message = t('adminEntry.noAdminRoleBody')
        setError(message)
        toast(message, 'error')
        return
      }
      await api.redeemAdminInvite(normalized)
      toast(t('auth.inviteRedeemed'), 'success')
      setInviteCode('')
      await onRoleChanged()
    } catch (err) {
      const message = errorText(err)
      setError(message)
      toast(message, 'error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      {signedIn ? (
        <AuthHeader user={user} role={role} label={t('adminEntry.title')} onRefresh={onRoleChanged} />
      ) : null}

      <section className="auth-panel" aria-label={t('adminEntry.title')}>
        <div className="auth-panel-head">
          <p className="auth-eyebrow">{t('admin.console')}</p>
          <h2>{t('adminEntry.title')}</h2>
          <p>{signedIn ? t('adminEntry.noAdminRole') : t('adminEntry.subtitle')}</p>
        </div>

        {signedIn ? (
          <p className="auth-subtle">{t('adminEntry.noAdminRoleBody')}</p>
        ) : (
          <AuthPanel title={t('auth.signIn')} onSignedIn={onRoleChanged} />
        )}

        {/* 초대코드(V-) — 보조 동선 */}
        {inviteOpen ? (
          <form className="auth-form" onSubmit={redeem}>
            <label>
              {t('adminEntry.inviteCodeLabel')}
              <input
                value={inviteCode}
                onChange={(event) => setInviteCode(event.target.value.toUpperCase())}
                placeholder={t('adminEntry.invitePlaceholder')}
                autoComplete="one-time-code"
              />
            </label>
            <button className="auth-button primary" type="submit" disabled={busy || inviteCode.trim().length === 0}>
              {busy ? t('auth.redeeming') : t('auth.redeemInvite')}
            </button>
          </form>
        ) : (
          <button className="auth-link-button" type="button" onClick={() => setInviteOpen(true)}>
            {t('adminEntry.haveInvite')}
          </button>
        )}

        {error ? <div className="auth-alert">{error}</div> : null}

        <div className="auth-actions">
          <button className="auth-button" type="button" onClick={() => navigate('/', { replace: true })}>
            {t('adminEntry.backToTeacher')}
          </button>
        </div>
      </section>
    </>
  )
}
