import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore'
import { db, ensureFirebaseConfigured } from '../firebase/config'
import { subscribeToQuery } from './firestoreRealtime'

function membersCollection() {
  ensureFirebaseConfigured()
  return collection(db, 'members')
}

function mapMember(id, data) {
  return {
    id,
    tripId: data.tripId ?? '',
    userId: data.userId ?? '',
    name: data.name ?? '',
    email: String(data.email ?? '').trim().toLowerCase(),
    avatar: data.avatar ?? '',
    roleInTrip: data.roleInTrip ?? 'member',
    createdBy: data.createdBy ?? '',
    active: data.active ?? true,
    createdAt: data.createdAt ?? null,
    updatedAt: data.updatedAt ?? null,
  }
}

export async function createMember(data) {
  const memberRef = doc(membersCollection())
  const normalizedEmail = String(data.email ?? '').trim().toLowerCase()
  const payload = {
    id: memberRef.id,
    tripId: data.tripId,
    userId: data.userId ?? '',
    name: data.name,
    email: normalizedEmail,
    avatar: data.avatar ?? '',
    roleInTrip: data.roleInTrip ?? 'member',
    createdBy: data.createdBy,
    active: data.active ?? true,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  }

  await setDoc(memberRef, payload)
  return { ...payload, createdAt: new Date(), updatedAt: new Date() }
}

export async function getMembersByTrip(tripId) {
  return new Promise((resolve, reject) => {
    const unsubscribe = subscribeMembersByTrip(
      tripId,
      (members) => {
        resolve(members)
        unsubscribe()
      },
      reject,
    )
  })
}

export async function getMembershipsForUser(uid, email = '') {
  const normalizedEmail = String(email ?? '').trim().toLowerCase()
  const [membersByUidSnapshot, membersByEmailSnapshot] = await Promise.all([
    uid
      ? getDocs(query(membersCollection(), where('userId', '==', uid)))
      : Promise.resolve({ docs: [] }),
    normalizedEmail
      ? getDocs(query(membersCollection(), where('email', '==', normalizedEmail)))
      : Promise.resolve({ docs: [] }),
  ])

  const uniqueMembers = new Map()

  for (const memberDoc of [...membersByUidSnapshot.docs, ...membersByEmailSnapshot.docs]) {
    const member = mapMember(memberDoc.id, memberDoc.data())

    if (member.active !== false) {
      uniqueMembers.set(member.id, member)
    }
  }

  return Array.from(uniqueMembers.values())
}

export function subscribeMembersByTrip(tripId, callback, onError) {
  const membersQuery = query(membersCollection(), where('tripId', '==', tripId))
  return subscribeToQuery(
    membersQuery,
    (snapshot) =>
      snapshot.docs
        .map((memberDoc) => mapMember(memberDoc.id, memberDoc.data()))
        .filter((member) => member.active !== false),
    callback,
    onError,
  )
}

export async function updateMember(memberId, data) {
  const memberRef = doc(membersCollection(), memberId)
  const payload = {
    ...data,
    updatedAt: serverTimestamp(),
  }

  if (data.email !== undefined) {
    payload.email = String(data.email ?? '').trim().toLowerCase()
  }

  await updateDoc(memberRef, {
    ...payload,
  })
}

export async function syncMemberProfile(userId, data = {}, email = '') {
  const normalizedEmail = String(email ?? '').trim().toLowerCase()
  const snapshots = await Promise.all([
    userId ? getDocs(query(membersCollection(), where('userId', '==', userId))) : Promise.resolve({ docs: [] }),
    normalizedEmail
      ? getDocs(query(membersCollection(), where('email', '==', normalizedEmail)))
      : Promise.resolve({ docs: [] }),
  ])

  const processedIds = new Set()

  for (const snapshot of snapshots) {
    for (const memberDoc of snapshot.docs) {
      if (processedIds.has(memberDoc.id)) {
        continue
      }

      processedIds.add(memberDoc.id)
      await updateDoc(doc(membersCollection(), memberDoc.id), {
        ...data,
        updatedAt: serverTimestamp(),
      })
    }
  }
}

export async function ensureMembershipForTrip(trip, userProfile) {
  if (!trip?.id || !userProfile?.uid) {
    return null
  }

  const normalizedEmail = String(userProfile.email ?? '').trim().toLowerCase()
  const memberships = await getMembershipsForUser(userProfile.uid, normalizedEmail)
  const existingMember = memberships.find((member) => member.tripId === trip.id)
  const desiredRole =
    userProfile.role === 'superadmin' || userProfile.role === 'admin' ? 'admin' : 'member'
  const profilePayload = {
    userId: userProfile.uid,
    name: userProfile.name ?? 'Usuario',
    email: normalizedEmail,
    avatar: userProfile.photoURL ?? '',
    roleInTrip: existingMember?.roleInTrip ?? desiredRole,
    active: true,
  }

  if (existingMember) {
    await updateMember(existingMember.id, profilePayload)
    return {
      ...existingMember,
      ...profilePayload,
    }
  }

  return createMember({
    ...profilePayload,
    tripId: trip.id,
    createdBy: trip.createdBy ?? userProfile.uid,
  })
}

export async function deleteMember(memberId) {
  const memberRef = doc(membersCollection(), memberId)
  await deleteDoc(memberRef)
}
