import type { AuthAdapter } from './types'

const TOKEN_KEY = 'autoassist.demo-token'

export const demoAuthAdapter: AuthAdapter = {
  async getToken() {
    return window.localStorage.getItem(TOKEN_KEY)
  },
  async signIn(intent) {
    const token =
      intent === 'OPERATOR'
        ? (import.meta.env.VITE_DEMO_OPERATOR_TOKEN ?? 'your-operator-firebase-uid')
        : (import.meta.env.VITE_DEMO_OWNER_TOKEN ?? 'your-owner-firebase-uid')
    window.localStorage.setItem(TOKEN_KEY, token)
    return token
  },
  async signOut() {
    window.localStorage.removeItem(TOKEN_KEY)
  },
}

