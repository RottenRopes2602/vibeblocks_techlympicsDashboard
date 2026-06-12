import { useState } from 'react'
import type { FormEvent } from 'react'
import {
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
} from 'firebase/auth'
import { auth } from '../../lib/firebase'
import type { TFunction } from '../../lib/i18n'
import { useT } from '../../lib/i18n'
import { useToast } from '../../lib/toast'

type AuthMode = 'sign-in' | 'sign-up'

const googleProvider = new GoogleAuthProvider()

function GoogleIcon() {
  return (
    <svg className="auth-google-icon" viewBox="0 0 18 18" aria-hidden="true" focusable="false">
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.91c1.7-1.57 2.69-3.88 2.69-6.62z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.91-2.26c-.8.54-1.84.86-3.05.86-2.35 0-4.34-1.58-5.05-3.72H.94v2.33A9 9 0 0 0 9 18z"
      />
      <path
        fill="#FBBC05"
        d="M3.95 10.7A5.41 5.41 0 0 1 3.67 9c0-.59.1-1.16.28-1.7V4.97H.94A9 9 0 0 0 0 9c0 1.45.34 2.82.94 4.03l3.01-2.33z"
      />
      <path
        fill="#EA4335"
        d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58C13.46.9 11.42 0 9 0A9 9 0 0 0 .94 4.97L3.95 7.3C4.66 5.16 6.65 3.58 9 3.58z"
      />
    </svg>
  )
}

function errorText(error: unknown, t: TFunction): string {
  const code = typeof error === 'object' && error && 'code' in error ? String(error.code) : ''
  if (code === 'auth/user-not-found') return t('auth.noAccount')
  if (code === 'auth/invalid-email') return t('auth.invalidEmail')
  if (code === 'auth/too-many-requests') return t('auth.tooManyAttempts')
  if (code === 'auth/network-request-failed') return t('auth.networkError')
  if (code === 'auth/invalid-credential' || code === 'auth/wrong-password') return t('auth.badCredential')
  return error instanceof Error ? error.message : String(error)
}

export default function AuthPanel({
  title,
  mode,
  onSignedIn,
}: {
  title?: string
  mode?: AuthMode
  onSignedIn?: () => void | Promise<void>
}) {
  const [selectedMode, setSelectedMode] = useState<AuthMode>(mode ?? 'sign-in')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [resetOpen, setResetOpen] = useState(false)
  const [resetEmail, setResetEmail] = useState('')
  const [resetBusy, setResetBusy] = useState(false)
  const [resetError, setResetError] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const toast = useToast()
  const t = useT()
  const authMode = mode ?? selectedMode
  const isFixedMode = Boolean(mode)
  const panelTitle = title ?? t('auth.signIn')

  const finish = async () => {
    if (onSignedIn) await onSignedIn()
  }

  const signInWithGoogle = async () => {
    setBusy(true)
    setError('')
    try {
      await signInWithPopup(auth, googleProvider)
      await finish()
      toast(authMode === 'sign-up' ? t('auth.accountReady') : t('auth.signedIn'), 'success')
    } catch (err) {
      const message = errorText(err, t)
      setError(message)
      toast(message, 'error')
    } finally {
      setBusy(false)
    }
  }

  const signInWithEmail = async (event: FormEvent) => {
    event.preventDefault()
    setBusy(true)
    setError('')
    try {
      if (authMode === 'sign-up') {
        await createUserWithEmailAndPassword(auth, email.trim(), password)
      } else {
        await signInWithEmailAndPassword(auth, email.trim(), password)
      }
      await finish()
      toast(authMode === 'sign-up' ? t('auth.accountCreated') : t('auth.signedIn'), 'success')
    } catch (err) {
      const message = errorText(err, t)
      setError(message)
      toast(message, 'error')
    } finally {
      setBusy(false)
    }
  }

  const resetPassword = async (event: FormEvent) => {
    event.preventDefault()
    setResetBusy(true)
    setResetError('')
    try {
      await sendPasswordResetEmail(auth, resetEmail.trim())
      setResetOpen(false)
      toast(t('auth.resetEmailSent'), 'success')
    } catch (err) {
      const message = errorText(err, t)
      setResetError(message)
      toast(message, 'error')
    } finally {
      setResetBusy(false)
    }
  }

  return (
    <section className="auth-panel" aria-label={panelTitle}>
      <div className="auth-panel-head">
        <p className="auth-eyebrow">{t('common.account')}</p>
        <h2>{panelTitle}</h2>
      </div>
      {!isFixedMode ? (
        <div className="auth-segmented" role="group" aria-label={t('auth.authenticationMode')}>
          <button type="button" className={authMode === 'sign-in' ? 'active' : ''} onClick={() => setSelectedMode('sign-in')}>
            {t('auth.signIn')}
          </button>
          <button type="button" className={authMode === 'sign-up' ? 'active' : ''} onClick={() => setSelectedMode('sign-up')}>
            {t('auth.createAccount')}
          </button>
        </div>
      ) : null}
      <button className="auth-button google" type="button" onClick={signInWithGoogle} disabled={busy}>
        <GoogleIcon />
        <span>{authMode === 'sign-up' ? t('auth.signUpGoogle') : t('auth.signInGoogle')}</span>
      </button>
      <form className="auth-form" onSubmit={signInWithEmail}>
        <label>
          {t('common.email')}
          <input value={email} onChange={(event) => setEmail(event.target.value)} type="email" autoComplete="email" />
        </label>
        <label>
          <span>{t('common.password')}</span>
          <div className="auth-password-field">
            <input
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              type={showPassword ? 'text' : 'password'}
              autoComplete={authMode === 'sign-up' ? 'new-password' : 'current-password'}
            />
            <button
              className="auth-icon-button"
              type="button"
              aria-label={showPassword ? t('auth.hidePassword') : t('auth.showPassword')}
              title={showPassword ? t('auth.hidePassword') : t('auth.showPassword')}
              onClick={() => setShowPassword((value) => !value)}
            >
              {showPassword ? '🙈' : '👁'}
            </button>
          </div>
        </label>
        <button className="auth-button primary" type="submit" disabled={busy || !email.trim() || password.length < 6}>
          {busy ? t('common.working') : authMode === 'sign-up' ? t('auth.createAccount') : t('auth.signIn')}
        </button>
      </form>
      {authMode === 'sign-in' ? (
        <div className="auth-reset">
          <button
            className="auth-link-button"
            type="button"
            onClick={() => {
              setResetEmail(email.trim())
              setResetError('')
              setResetOpen(true)
            }}
          >
            {t('auth.forgotPassword')}
          </button>
        </div>
      ) : null}
      {error ? <div className="auth-alert">{error}</div> : null}
      {resetOpen ? (
        <div className="auth-modal-backdrop" role="presentation">
          <section className="auth-modal" role="dialog" aria-modal="true" aria-labelledby="password-reset-title">
            <div className="auth-panel-head">
              <p className="auth-eyebrow">{t('auth.passwordReset')}</p>
              <h2 id="password-reset-title">{t('auth.sendResetEmail')}</h2>
            </div>
            <form className="auth-form" onSubmit={resetPassword}>
              <label>
                {t('common.email')}
                <input
                  autoFocus
                  value={resetEmail}
                  onChange={(event) => setResetEmail(event.target.value)}
                  type="email"
                  autoComplete="email"
                />
              </label>
              {resetError ? <div className="auth-alert">{resetError}</div> : null}
              <div className="auth-actions auth-modal-actions">
                <button className="auth-button" type="button" onClick={() => setResetOpen(false)} disabled={resetBusy}>
                  {t('common.cancel')}
                </button>
                <button className="auth-button primary" type="submit" disabled={resetBusy || !resetEmail.trim()}>
                  {resetBusy ? t('auth.sending') : t('auth.sendEmail')}
                </button>
              </div>
            </form>
          </section>
        </div>
      ) : null}
    </section>
  )
}
