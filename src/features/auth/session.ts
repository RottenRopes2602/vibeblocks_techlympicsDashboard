import { useEffect, useState } from 'react'
import { onAuthStateChanged } from 'firebase/auth'
import type { User } from 'firebase/auth'
import { auth } from '../../lib/firebase'
import { translate } from '../../lib/i18n'
import { DEV_AUTH_ENABLED, getDevUser, subscribeDevUser } from '../../lib/devAuth'

export function isRealUser(user: User | null): user is User {
  return Boolean(user && !user.isAnonymous)
}

export function userLabel(user: User | null): string {
  if (!user) return translate('auth.signedOut')
  return user.displayName || user.email || translate('auth.signedIn')
}

export function useAuthSession() {
  const [user, setUser] = useState<User | null>(
    DEV_AUTH_ENABLED ? (getDevUser() as User | null) : auth.currentUser,
  )
  const [loading, setLoading] = useState(!DEV_AUTH_ENABLED)

  useEffect(() => {
    // DEV+mock: Firebase 없이 가짜 세션 구독 (production 빌드에선 이 분기 제거됨)
    if (DEV_AUTH_ENABLED) {
      setUser(getDevUser() as User | null)
      setLoading(false)
      return subscribeDevUser(() => setUser(getDevUser() as User | null))
    }
    return onAuthStateChanged(auth, (nextUser) => {
      setUser(nextUser)
      setLoading(false)
    })
  }, [])

  return { user, loading, isSignedIn: isRealUser(user) }
}
