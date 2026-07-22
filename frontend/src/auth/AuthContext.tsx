import { useCallback, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { api } from '../api/client'
import type { User } from '../api/types'
import { demoAuthAdapter } from './demoAuthAdapter'
import type { AuthAdapter, AuthContextValue, AuthStatus, SignInIntent } from './types'
import { AuthContext } from './useAuth'

interface AuthProviderProps {
  children: ReactNode
  adapter?: AuthAdapter
}

export function AuthProvider({ children, adapter = demoAuthAdapter }: AuthProviderProps) {
  const [status, setStatus] = useState<AuthStatus>('initializing')
  const [token, setToken] = useState<string | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [error, setError] = useState<string | null>(null)

  const clearSession = useCallback(async () => {
    await adapter.signOut()
    setToken(null)
    setUser(null)
    setError(null)
    setStatus('anonymous')
  }, [adapter])

  useEffect(() => {
    let active = true

    void (async () => {
      try {
        const restoredToken = await adapter.getToken()
        if (!restoredToken) {
          if (active) setStatus('anonymous')
          return
        }
        const restoredUser = await api.getMe(restoredToken)
        if (active) {
          setToken(restoredToken)
          setUser(restoredUser)
          setStatus('authenticated')
        }
      } catch {
        await adapter.signOut()
        if (active) {
          setToken(null)
          setUser(null)
          setStatus('anonymous')
        }
      }
    })()

    return () => {
      active = false
    }
  }, [adapter])

  const signIn = useCallback(
    async (intent: SignInIntent): Promise<User> => {
      setError(null)
      try {
        const nextToken = await adapter.signIn(intent)
        const nextUser = await api.getMe(nextToken)
        setToken(nextToken)
        setUser(nextUser)
        setStatus('authenticated')
        return nextUser
      } catch (caught) {
        await adapter.signOut()
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
