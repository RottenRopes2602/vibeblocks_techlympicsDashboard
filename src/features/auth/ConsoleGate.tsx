import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import type { User } from 'firebase/auth'
import { Navigate } from 'react-router-dom'
import { api } from '../../api'
import type { Role, RoleDoc } from '../../api/types'
import { useT } from '../../lib/i18n'
import { devConsoleRole } from '../../lib/devAuth'
import AuthHeader from './AuthHeader'
import RoleLanding from './RoleLanding'
import { useAuthSession } from './session'
import './auth.css'

function errorText(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

export type ConsoleEntryContext = {
  user: User | null
  role: RoleDoc | null
  isSignedIn: boolean
  onRoleChanged: () => void | Promise<void>
}

export default function ConsoleGate({
  label,
  allowedRoles,
  children,
  entry,
}: {
  label: string
  allowedRoles: Role[]
  children: ReactNode
  /** 미인증/무권한일 때 기본(/ 리다이렉트·RoleLanding) 대신 띄울 콘솔 전용 진입 화면 */
  entry?: (ctx: ConsoleEntryContext) => ReactNode
}) {
  const t = useT()
  const { user, loading: authLoading, isSignedIn } = useAuthSession()
  const [role, setRole] = useState<RoleDoc | null>(null)
  const [roleLoading, setRoleLoading] = useState(false)
  const [error, setError] = useState('')

  const refreshRole = async () => {
    if (!isSignedIn) {
      setRole(null)
      return
    }
    setRoleLoading(true)
    setError('')
    try {
      setRole(await api.getMyRole())
    } catch (err) {
      setError(errorText(err))
    } finally {
      setRoleLoading(false)
    }
  }

  useEffect(() => {
    if (authLoading) return
    void refreshRole()
  }, [authLoading, isSignedIn, user?.uid])

  // DEV 우회 (mock 전용, production 빌드에서 비활성) — 로그인 없이 콘솔 진입
  const devRole = devConsoleRole(allowedRoles)
  if (devRole) {
    return (
      <>
        <div
          style={{
            background: '#b91c1c',
            color: '#fff',
            font: '600 12px/1.4 system-ui, sans-serif',
            padding: '4px 12px',
            textAlign: 'center',
          }}
        >
          DEV · mock · {devRole} — 로그인 우회 중 (배포본에는 없음)
        </div>
        {children}
      </>
    )
  }

  if (authLoading || roleLoading) {
    return (
      <section className="auth-stack">
        <section className="auth-panel">
          <p className="auth-eyebrow">{label}</p>
          <h2>{t('auth.checkingAccess')}</h2>
        </section>
      </section>
    )
  }

  if (!isSignedIn) {
    if (entry) {
      return (
        <section className="auth-stack">
          {entry({ user, role, isSignedIn, onRoleChanged: refreshRole })}
        </section>
      )
    }
    return <Navigate to="/" replace />
  }

  if (error) {
    return (
      <section className="auth-stack">
        <AuthHeader user={user} role={role} label={label} onRefresh={refreshRole} />
        <div className="auth-alert">{error}</div>
      </section>
    )
  }

  if (!role || !allowedRoles.includes(role.role)) {
    if (entry) {
      return (
        <section className="auth-stack">
          {entry({ user, role, isSignedIn, onRoleChanged: refreshRole })}
        </section>
      )
    }
    return (
      <section className="auth-stack">
        <AuthHeader user={user} role={role} label={label} onRefresh={refreshRole} />
        <RoleLanding user={user} title={t('auth.accessRequired', { label })} onRoleChanged={refreshRole} />
      </section>
    )
  }

  return (
    <>
      <AuthHeader user={user} role={role} label={label} onRefresh={refreshRole} />
      {children}
    </>
  )
}
