import { initializeApp, getApps } from 'firebase/app'
import { getAuth, GoogleAuthProvider } from 'firebase/auth'

export const SSO_QA_ISOLATED = import.meta.env.VITE_PFC_SSO_ENABLED === 'true' && import.meta.env.VITE_PFC_SSO_QA_ISOLATED === 'true'

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
}

const hasRequiredConfig =
  firebaseConfig.apiKey && firebaseConfig.authDomain && firebaseConfig.projectId && firebaseConfig.appId

if (!SSO_QA_ISOLATED && !hasRequiredConfig) {
  console.warn('[firebase] Config incompleta. Verifique as variaveis VITE_FIREBASE_*.')
}

const app = SSO_QA_ISOLATED ? null : (getApps().length ? getApps()[0] : initializeApp(firebaseConfig))
const auth = SSO_QA_ISOLATED ? null : getAuth(app)
const googleProvider = SSO_QA_ISOLATED ? null : new GoogleAuthProvider()

export { app, auth, googleProvider }
