import { getApp, getApps, initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import type { Auth } from 'firebase/auth'

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

export function getFirebaseAuth(): Auth {
  const missingVariables = Object.entries(firebaseConfig)
    .filter(([, value]) => !value || value.startsWith('your-'))
    .map(([key]) => key)

  if (missingVariables.length > 0) {
    throw new Error(
      'Firebase is not configured. Add the Firebase web app values to the project .env file.',
    )
  }

  const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig)
  return getAuth(app)
}
