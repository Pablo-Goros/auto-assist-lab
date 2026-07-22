import type { User } from '../api/types'

export interface AuthAdapter {
  subscribe(
    onTokenChanged: (token: string | null) => void,
    onError: (error: Error) => void,
  ): () => void
  signIn(): Promise<string>
  signOut(): Promise<void>
}

export type AuthStatus = 'initializing' | 'anonymous' | 'authenticated'

export interface AuthContextValue {
  status: AuthStatus
  token: string | null
  user: User | null
  error: string | null
  signIn(): Promise<void>
  signOut(): Promise<void>
}
