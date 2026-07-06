import { initializeApp } from 'firebase/app'
import {
  getFirestore,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
} from 'firebase/firestore'
import { getAuth } from 'firebase/auth'
import { getStorage } from 'firebase/storage'

export const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

export const isFirebaseConfigured = Object.values(firebaseConfig).every(Boolean)

export const app = isFirebaseConfigured ? initializeApp(firebaseConfig) : null
export const auth = app ? getAuth(app) : null
export const db = app
  ? initializeFirestore(app, {
      localCache: persistentLocalCache({
        tabManager: persistentMultipleTabManager(),
      }),
    })
  : null
export const storage = app ? getStorage(app) : null
export const firestorePersistenceEnabled = Boolean(db)

export function ensureFirebaseConfigured() {
  if (!isFirebaseConfigured) {
    throw new Error(
      'Firebase nao configurado. Preencha as variaveis VITE_FIREBASE_* no arquivo .env.',
    )
  }
}

export function getFirestoreInstance() {
  return db ?? getFirestore(app)
}

export default firebaseConfig
