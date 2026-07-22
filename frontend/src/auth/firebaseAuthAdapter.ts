import { FirebaseError } from 'firebase/app'
import {
  GoogleAuthProvider,
  onIdTokenChanged,
  signInWithPopup,
  signOut as firebaseSignOut,
} from 'firebase/auth'
import { getFirebaseAuth } from '../firebase'
import type { AuthAdapter } from './types'

const FIREBASE_ERROR_MESSAGES: Record<string, string> = {
  'auth/popup-closed-by-user': 'Google sign-in was cancelled.',
  'auth/cancelled-popup-request': 'Google sign-in was cancelled.',
  'auth/popup-blocked': 'Your browser blocked the Google sign-in window. Allow pop-ups and try again.',
  'auth/network-request-failed': 'Could not reach Google sign-in. Check your connection and try again.',
  'auth/unauthorized-domain': 'This domain is not authorized in Firebase Authentication.',
  'auth/operation-not-allowed': 'Google sign-in is not enabled for this Firebase project.',
  'auth/invalid-api-key': 'The Firebase web configuration is invalid.',
}

function readableAuthError(caught: unknown): Error {
  if (caught instanceof FirebaseError) {
    return new Error(FIREBASE_ERROR_MESSAGES[caught.code] ?? 'Google sign-in failed. Please try again.')
  }
  return caught instanceof Error ? caught : new Error('Google sign-in failed. Please try again.')
}

export const firebaseAuthAdapter: AuthAdapter = {
  subscribe(onTokenChanged, onError) {
    try {
      return onIdTokenChanged(
        getFirebaseAuth(),
        (firebaseUser) => {
          void (async () => {
            try {
              onTokenChanged(firebaseUser ? await firebaseUser.getIdToken() : null)
            } catch (caught) {
              onError(readableAuthError(caught))
            }
          })()
        },
        (caught) => onError(readableAuthError(caught)),
      )
    } catch (caught) {
      onError(readableAuthError(caught))
      return () => undefined
    }
  },

  async signIn() {
    try {
      const result = await signInWithPopup(getFirebaseAuth(), new GoogleAuthProvider())
      return await result.user.getIdToken()
    } catch (caught) {
      throw readableAuthError(caught)
    }
  },

  async signOut() {
    try {
      await firebaseSignOut(getFirebaseAuth())
    } catch (caught) {
      throw readableAuthError(caught)
    }
  },
}
