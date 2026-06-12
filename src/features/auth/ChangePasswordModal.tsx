import { useState } from 'react'
import type { FormEvent } from 'react'
import { EmailAuthProvider, reauthenticateWithCredential, updatePassword } from 'firebase/auth'
import type { User } from 'firebase/auth'
import type { TFunction } from '../../lib/i18n'
import { useT } from '../../lib/i18n'
import { useToast } from '../../lib/toast'

function errorText(error: unknown, t: TFunction): string {
  const code = typeof error === 'object' && error && 'code' in error ? String(error.code) : ''
  if (code === 'auth/invalid-credential' || code === 'auth/wrong-password') return t('auth.wrongCurrentPassword')
  if (code === 'auth/weak-password') return t('auth.weakPassword')
  if (code === 'auth/too-many-requests') return t('auth.tooManyAttempts')
  if (code === 'auth/network-request-failed') return t('auth.networkError')
  return error instanceof Error ? error.message : String(error)
}

export default function ChangePasswordModal({ user, onClose }: { user: User; onClose: () => void }) {
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const toast = useToast()
  const t = useT()

  const mismatch = confirmPassword.length > 0 && newPassword !== confirmPassword
  const canSubmit = !busy && currentPassword.length >= 6 && newPassword.length >= 6 && newPassword === confirmPassword

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (newPassword !== confirmPassword) {
      setError(t('auth.passwordMismatch'))
      return
    }
    if (newPassword === currentPassword) {
      setError(t('auth.samePassword'))
      return
    }
    setBusy(true)
    setError('')
    try {
      const credential = EmailAuthProvider.credential(user.email ?? '', currentPassword)
      await reauthenticateWithCredential(user, credential)
      await updatePassword(user, newPassword)
      toast(t('auth.passwordChanged'), 'success')
      onClose()
    } catch (err) {
      const message = errorText(err, t)
      setError(message)
      toast(message, 'error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="auth-modal-backdrop" role="presentation">
      <section className="auth-modal" role="dialog" aria-modal="true" aria-labelledby="change-password-title">
        <div className="auth-panel-head">
          <p className="auth-eyebrow">{t('common.account')}</p>
          <h2 id="change-password-title">{t('auth.changePassword')}</h2>
        </div>
        <form className="auth-form" onSubmit={submit}>
          <label>
            {t('auth.currentPassword')}
            <input
              autoFocus
              value={currentPassword}
              onChange={(event) => setCurrentPassword(event.target.value)}
              type="password"
              autoComplete="current-password"
            />
          </label>
          <label>
            {t('auth.newPassword')}
            <input
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              type="password"
              autoComplete="new-password"
            />
          </label>
          <label>
            {t('auth.confirmNewPassword')}
            <input
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              type="password"
              autoComplete="new-password"
            />
          </label>
          {mismatch ? <div className="auth-alert">{t('auth.passwordMismatch')}</div> : null}
          {error ? <div className="auth-alert">{error}</div> : null}
          <div className="auth-actions auth-modal-actions">
            <button className="auth-button" type="button" onClick={onClose} disabled={busy}>
              {t('common.cancel')}
            </button>
            <button className="auth-button primary" type="submit" disabled={!canSubmit}>
              {busy ? t('common.working') : t('auth.changePassword')}
            </button>
          </div>
        </form>
      </section>
    </div>
  )
}
