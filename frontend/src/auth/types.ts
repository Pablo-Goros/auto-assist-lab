import type { User, UserRole } from '../api/types'

export type SignInIntent = Exclude<UserRole, 'ADMIN'>

export interface AuthAdapter {
  getToken(): Promise<string | null>
  signIn(intent: SignInIntent): Promise<string>
  signOut(): Promise<void>
}

export type AuthStatus = 'initializing' | 'anonymous' | 'authenticated'

export interface AuthContextValue {
  status: AuthStatus
  token: string | null
  user: User | null
  error: string | null
  signIn(intent: SignInIntent): Promise<User>
  signOut(): Promise<void>
}
