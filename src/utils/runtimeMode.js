import { isFirebaseConfigured } from '../firebase/config'

export function canUseMockFallback() {
  return import.meta.env.DEV && !isFirebaseConfigured
}

export function shouldUseFirestoreAsPrimarySource() {
  return isFirebaseConfigured
}
