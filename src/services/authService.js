import { deleteApp, initializeApp } from 'firebase/app'
import {
  EmailAuthProvider,
  inMemoryPersistence,
  browserLocalPersistence,
  createUserWithEmailAndPassword,
  getAuth,
  onAuthStateChanged,
  reauthenticateWithCredential,
  sendPasswordResetEmail,
  setPersistence,
  signInWithEmailAndPassword,
  signOut,
  updatePassword,
  updateProfile,
} from 'firebase/auth'
import { auth, ensureFirebaseConfigured, firebaseConfig } from '../firebase/config'

function ensureAuth() {
  ensureFirebaseConfigured()

  if (!auth) {
    throw new Error('Firebase Auth indisponivel.')
  }
}

export async function loginWithEmail(email, password) {
  ensureAuth()
  await setPersistence(auth, browserLocalPersistence)
  const credential = await signInWithEmailAndPassword(auth, email, password)
  return credential.user
}

export async function registerWithEmail(email, password, name) {
  ensureAuth()
  await setPersistence(auth, browserLocalPersistence)
  const credential = await createUserWithEmailAndPassword(auth, email, password)

  if (name?.trim()) {
    await updateProfile(credential.user, { displayName: name.trim() })
  }

  return credential.user
}

export async function createManagedUserAccount({ email, password, name }) {
  ensureFirebaseConfigured()

  const normalizedEmail = String(email ?? '').trim().toLowerCase()
  const trimmedName = String(name ?? '').trim()
  const secondaryApp = initializeApp(firebaseConfig, `familia-na-trip-managed-${Date.now()}`)
  const secondaryAuth = getAuth(secondaryApp)

  try {
    await setPersistence(secondaryAuth, inMemoryPersistence)
    const credential = await createUserWithEmailAndPassword(secondaryAuth, normalizedEmail, password)

    if (trimmedName) {
      await updateProfile(credential.user, { displayName: trimmedName })
    }

    return {
      uid: credential.user.uid,
      email: credential.user.email ?? normalizedEmail,
      displayName: trimmedName || credential.user.displayName || 'Usuario',
      photoURL: credential.user.photoURL ?? '',
    }
  } finally {
    await signOut(secondaryAuth).catch(() => null)
    await deleteApp(secondaryApp).catch(() => null)
  }
}

export async function syncCurrentAuthProfile(data = {}) {
  ensureAuth()

  if (!auth.currentUser) {
    return null
  }

  const payload = {}

  if (data.name !== undefined) {
    payload.displayName = String(data.name ?? '').trim()
  }

  if (data.photoURL !== undefined) {
    payload.photoURL = String(data.photoURL ?? '').trim()
  }

  await updateProfile(auth.currentUser, payload)
  return auth.currentUser
}

export async function changeCurrentUserPassword(currentPassword, newPassword) {
  ensureAuth()

  if (!auth.currentUser) {
    throw new Error('Nenhum usuario autenticado para atualizar a senha.')
  }

  const email = String(auth.currentUser.email ?? '').trim().toLowerCase()

  if (!email) {
    throw new Error('Nao foi possivel identificar o e-mail da conta atual.')
  }

  const normalizedCurrentPassword = String(currentPassword ?? '')
  const normalizedNewPassword = String(newPassword ?? '')

  if (normalizedNewPassword.length < 6) {
    throw new Error('A nova senha precisa ter pelo menos 6 caracteres.')
  }

  const credential = EmailAuthProvider.credential(email, normalizedCurrentPassword)
  await reauthenticateWithCredential(auth.currentUser, credential)
  await updatePassword(auth.currentUser, normalizedNewPassword)
  return true
}

export async function requestPasswordReset(email) {
  ensureAuth()

  const normalizedEmail = String(email ?? '').trim().toLowerCase()

  if (!normalizedEmail) {
    throw new Error('Informe o e-mail da conta para redefinir a senha.')
  }

  await sendPasswordResetEmail(auth, normalizedEmail)
  return true
}

export async function logoutUser() {
  ensureAuth()
  await signOut(auth)
}

export function getCurrentUser() {
  return auth?.currentUser ?? null
}

export function listenAuthChanges(callback) {
  if (!auth) {
    callback(null)
    return () => {}
  }

  return onAuthStateChanged(auth, callback)
}
