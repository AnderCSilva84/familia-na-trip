import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore'
import { deleteObject, getDownloadURL, ref, uploadBytes } from 'firebase/storage'
import { db, ensureFirebaseConfigured, storage } from '../firebase/config'
import { getCurrentUser } from './authService'

const SUPERADMIN_EMAIL = 'acs@acs.com'

function usersCollection() {
  ensureFirebaseConfigured()
  return collection(db, 'users')
}

function userDocument(uid) {
  ensureFirebaseConfigured()
  return doc(db, 'users', uid)
}

function mapProfile(uid, data) {
  const normalizedEmail = String(data.email ?? '').trim().toLowerCase()
  const resolvedRole = normalizedEmail === SUPERADMIN_EMAIL ? 'superadmin' : data.role ?? 'member'

  return {
    uid,
    name: data.name ?? '',
    email: normalizedEmail,
    photoURL: data.photoURL ?? '',
    photoPath: data.photoPath ?? '',
    role: resolvedRole,
    active: data.active ?? true,
    createdAt: data.createdAt ?? null,
    updatedAt: data.updatedAt ?? null,
  }
}

export async function checkIfFirstUser() {
  const firstUserQuery = query(usersCollection(), limit(1))
  const snapshot = await getDocs(firstUserQuery)
  return snapshot.empty
}

export async function createUserProfile(user, extraData = {}) {
  const profileRef = userDocument(user.uid)
  const normalizedEmail = String(extraData.email ?? user.email ?? '').trim().toLowerCase()
  const isDedicatedSuperAdmin = normalizedEmail === SUPERADMIN_EMAIL
  const role = extraData.role ?? (isDedicatedSuperAdmin ? 'superadmin' : 'member')
  const profileData = {
    uid: user.uid,
    name: extraData.name ?? user.displayName ?? 'Usuario',
    email: normalizedEmail,
    photoURL: extraData.photoURL ?? user.photoURL ?? '',
    photoPath: extraData.photoPath ?? '',
    role,
    active: extraData.active ?? true,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  }

  await setDoc(profileRef, profileData)
  return {
    ...profileData,
    createdAt: new Date(),
    updatedAt: new Date(),
  }
}

export async function getUserProfile(uid) {
  const snapshot = await getDoc(userDocument(uid))

  if (!snapshot.exists()) {
    return null
  }

  return mapProfile(uid, snapshot.data())
}

export async function getUserProfileByEmail(email) {
  const normalizedEmail = String(email ?? '').trim().toLowerCase()

  if (!normalizedEmail) {
    return null
  }

  const usersQuery = query(usersCollection(), where('email', '==', normalizedEmail), limit(1))
  const snapshot = await getDocs(usersQuery)

  if (snapshot.empty) {
    return null
  }

  const userDoc = snapshot.docs[0]
  return mapProfile(userDoc.id, userDoc.data())
}

export async function updateUserProfile(uid, data) {
  const profileRef = userDocument(uid)
  const profileSnapshot = await getDoc(profileRef)
  const authUser = getCurrentUser()
  const payload = {
    ...data,
    updatedAt: serverTimestamp(),
  }

  if (data.email !== undefined) {
    payload.email = String(data.email ?? '').trim().toLowerCase()
  }

  if (!profileSnapshot.exists()) {
    const normalizedEmail = String(payload.email ?? authUser?.email ?? '').trim().toLowerCase()
    const resolvedRole = normalizedEmail === SUPERADMIN_EMAIL ? 'superadmin' : data.role ?? 'member'

    await setDoc(profileRef, {
      uid,
      name: data.name ?? authUser?.displayName ?? 'Usuario',
      email: normalizedEmail,
      photoURL: data.photoURL ?? authUser?.photoURL ?? '',
      photoPath: data.photoPath ?? '',
      role: resolvedRole,
      active: data.active ?? true,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })
  } else {
    await updateDoc(profileRef, {
      ...payload,
    })
  }

  return getUserProfile(uid)
}

export async function ensureUserProfile(user) {
  const existingProfile = await getUserProfile(user.uid)

  if (existingProfile) {
    const normalizedEmail = String(user.email ?? '').trim().toLowerCase()

    if (normalizedEmail === SUPERADMIN_EMAIL && existingProfile.role !== 'superadmin') {
      return updateUserProfile(user.uid, { role: 'superadmin' })
    }

    return existingProfile
  }

  return createUserProfile(user, {
    name: user.displayName ?? 'Usuario',
    email: String(user.email ?? '').trim().toLowerCase(),
    photoURL: user.photoURL ?? '',
  })
}

export async function updateUserRole(uid, role) {
  const allowedRoles = ['superadmin', 'admin', 'member']

  if (!allowedRoles.includes(role)) {
    throw new Error('Perfil invalido para o aplicativo.')
  }

  return updateUserProfile(uid, { role })
}

export async function uploadUserProfilePhoto(uid, file, currentPhotoPath = '') {
  ensureFirebaseConfigured()

  if (!storage) {
    throw new Error('Firebase Storage indisponivel.')
  }

  const sanitizedName = String(file?.name ?? 'avatar.jpg').replace(/\s+/g, '-')
  const filePath = `users/${uid}/profile/${Date.now()}-${sanitizedName}`
  const fileRef = ref(storage, filePath)

  await uploadBytes(fileRef, file)
  const photoURL = await getDownloadURL(fileRef)

  if (currentPhotoPath) {
    await deleteObject(ref(storage, currentPhotoPath)).catch(() => null)
  }

  return {
    photoURL,
    photoPath: filePath,
  }
}
