import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api'
import type { RoleDoc } from '../api/types'
import AuthHeader from '../features/auth/AuthHeader'
import AuthPanel from '../features/auth/AuthPanel'
import TeacherCodeGate from '../features/auth/TeacherCodeGate'
import { useAuthSession } from '../features/auth/session'
import { LanguageToggle, useT } from '../lib/i18n'
import '../features/auth/auth.css'
import styles from '../features/ranking/publicPages.module.css'

// 교사 홈 동선 (vb-352): ① 코드 없이 로그인/회원가입 먼저 → ② 로그인 후 역할(학교 바인딩)이
// 없으면 그때 교사코드 입력 → ③ 바인딩되면 /teacher. 가입만 하고 코드 미입력 시 다음 방문에도
// role 이 없어 ②로 돌아온다(선생님 페이지로 안 감). 어드민(주최) 동선은 /admin 전용.
export default function HomePage() {
  const navigate = useNavigate()
  const t = useT()
  const { user, loading: authLoading, isSignedIn } = useAuthSession()
  const [role, setRole] = useState<RoleDoc | null>(null)
  const [roleLoading, setRoleLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const refreshRole = async () => {
    if (!isSignedIn) {
      setRole(null)
      return
    }
    setRoleLoading(true)
    setError(null)
    try {
      setRole(await api.getMyRole())
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setRoleLoading(false)
    }
  }

  useEffect(() => {
    if (authLoading) return
    void refreshRole()
  }, [authLoading, isSignedIn, user?.uid])

  useEffect(() => {
    if (!isSignedIn || !role) return
    // 교사 입구는 teacher·master 만 통과. admin 계정은 잘못된 입구 → 아래 안내(자동이동 X).
    if (role.role === 'teacher') navigate('/teacher', { replace: true })
    else if (role.role === 'master') navigate('/master', { replace: true })
  }, [isSignedIn, navigate, role])

  const isChecking = authLoading || roleLoading
  // 로그인했는데 역할이 없음 = 가입만 하고 학교 미바인딩 → 교사코드 입력 단계.
  const needsTeacherCode = isSignedIn && !role && !isChecking
  // 어드민 계정이 교사 입구로 로그인 = 잘못된 입구 → 주최자 콘솔로 안내.
  const wrongDoor = isSignedIn && role?.role === 'admin' && !isChecking

  return (
    <main className={styles.shell}>
      <section className={styles.homeHero} aria-labelledby="home-title">
        <div className={styles.brandBar}>
          <span className={styles.brandMark}>VB</span>
          <span>VibeBlocks Techlympics</span>
          <LanguageToggle />
        </div>
        <div className={styles.homeCopy}>
          <p className={styles.kicker}>{t('home.platform')}</p>
          <h1 id="home-title">{t('home.title')}</h1>
          <p>{t('home.description')}</p>
        </div>
        <div className="auth-layout">
          <div className="auth-stack">
            {isChecking ? (
              <section className="auth-panel">
                <p className="auth-eyebrow">{t('home.session')}</p>
                <h2>{t('home.checkingAccount')}</h2>
              </section>
            ) : null}

            {/* ① 코드 없이 로그인/회원가입 (segmented 토글로 둘 다). 주최자 콘솔 링크는 두지 않음. */}
            {!isSignedIn && !isChecking ? (
              <AuthPanel title={t('home.authTitle')} onSignedIn={refreshRole} />
            ) : null}

            {/* 어드민 계정이 교사 입구로 들어옴 → 교사 입구 거부 안내 (주최자 콘솔 버튼은 두지 않음) */}
            {wrongDoor ? (
              <>
                <AuthHeader user={user} role={role} label={t('home.accountLabel')} onRefresh={refreshRole} />
                <section className="auth-panel">
                  <div className="auth-panel-head">
                    <p className="auth-eyebrow">{t('home.accountLabel')}</p>
                    <h2>{t('home.organizerAccountTitle')}</h2>
                    <p>{t('home.organizerAccountBody')}</p>
                  </div>
                </section>
              </>
            ) : null}

            {/* ② 로그인 후 역할 없음 → 교사코드 입력 (가입 뒤 단계) */}
            {needsTeacherCode ? (
              <>
                <AuthHeader user={user} role={role} label={t('home.accountLabel')} onRefresh={refreshRole} />
                <section className="auth-panel">
                  <div className="auth-panel-head">
                    <p className="auth-eyebrow">{t('home.teacherCodeEyebrow')}</p>
                    <h2>{t('home.teacherCodeTitle')}</h2>
                    <p>{t('home.teacherCodeBody')}</p>
                  </div>
                </section>
                <TeacherCodeGate
                  user={user}
                  onBound={async (boundRole) => {
                    await refreshRole()
                    navigate(boundRole === 'admin' ? '/admin' : '/teacher', { replace: true })
                  }}
                />
              </>
            ) : null}

            {error ? <p className={styles.formError}>{error}</p> : null}
          </div>
        </div>
      </section>
    </main>
  )
}
