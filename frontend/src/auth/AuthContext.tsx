import { useCallback, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { api } from '../api/client'
import type { User } from '../api/types'
import { firebaseAuthAdapter } from './firebaseAuthAdapter'
import type { AuthAdapter, AuthContextValue, AuthStatus } from './types'
import { AuthContext } from './useAuth'

interface AuthProviderProps {
  children: ReactNode
  adapter?: AuthAdapter
}

export function AuthProvider({ children, adapter = firebaseAuthAdapter }: AuthProviderProps) {
  const [status, setStatus] = useState<AuthStatus>('initializing')
  const [token, setToken] = useState<string | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [error, setError] = useState<string | null>(null)

  const clearSession = useCallback(async () => {
    try {
      await adapter.signOut()
    } catch {
      // A local session must still be cleared if Firebase sign-out cannot reach the network.
    } finally {
      setToken(null)
      setUser(null)
      setError(null)
      setStatus('anonymous')
    }
  }, [adapter])

  useEffect(() => {
    let active = true
    let revision = 0

    const unsubscribe = adapter.subscribe(
      (nextToken) => {
        const currentRevision = ++revision
        void (async () => {
          if (!nextToken) {
            if (active && currentRevision === revision) {
              setToken(null)
              setUser(null)
              setStatus('anonymous')
            }
            return
          }

          try {
            const restoredUser = await api.getMe(nextToken)
            if (active && currentRevision === revision) {
              setToken(nextToken)
              setUser(restoredUser)
              setError(null)
              setStatus('authenticated')
            }
          } catch (caught) {
            if (active && currentRevision === revision) {
              setToken(null)
              setUser(null)
              setError(caught instanceof Error ? caught.message : 'Your session could not be restored.')
              setStatus('anonymous')
            }
            try {
              await adapter.signOut()
            } catch {
              // Keep the backend session error visible even if Firebase sign-out also fails.
            }
          }
        })()
      },
      (caught) => {
        if (active) {
          setToken(null)
          setUser(null)
          setError(caught.message)
          setStatus('anonymous')
        }
      },
    )

    return () => {
      active = false
      unsubscribe()
    }
  }, [adapter])

  const signIn = useCallback(
    async (): Promise<void> => {
      setError(null)
      try {
        // The auth-state subscription is the single path that exchanges the
        // Firebase token for the application user via /api/me.
        await adapter.signIn()
      } catch (caught) {
        try {
          await adapter.signOut()
        } catch {
          // Preserve the original sign-in or API error for the user.
        }
        const message = caught instanceof Error ? caught.message : 'Sign in failed. Please try again.'
        setToken(null)
        setUser(null)
        setStatus('anonymous')
        setError(message)
        throw caught
      }
    },
    [adapter],
  )

  const value = useMemo<AuthContextValue>(
    () => ({ status, token, user, error, signIn, signOut: clearSession }),
    [status, token, user, error, signIn, clearSession],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
