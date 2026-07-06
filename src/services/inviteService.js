import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  limit,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore'
import { db, ensureFirebaseConfigured } from '../firebase/config'
import { subscribeToQuery } from './firestoreRealtime'
import { createMember, getMembersByTrip } from './memberService'
import { getUserProfile, updateUserRole } from './userService'

function invitesCollection() {
  ensureFirebaseConfigured()
  return collection(db, 'invites')
}

function mapInvite(id, data) {
  return {
    id,
    tripId: data.tripId ?? '',
    name: data.name ?? '',
    email: data.email ?? '',
    role: data.role ?? 'member',
    status: data.status ?? 'pending',
    createdBy: data.createdBy ?? '',
    acceptedAt: data.acceptedAt ?? null,
    acceptedBy: data.acceptedBy ?? '',
    createdAt: data.createdAt ?? null,
    updatedAt: data.updatedAt ?? null,
  }
}

export async function createInvite(data) {
  const inviteRef = doc(invitesCollection())
  const payload = {
    id: inviteRef.id,
    tripId: data.tripId,
    name: data.name ?? '',
    email: String(data.email ?? '').trim().toLowerCase(),
    role: data.role ?? 'member',
    status: data.status ?? 'pending',
    createdBy: data.createdBy,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  }
  await setDoc(inviteRef, payload)
  return { ...payload, createdAt: new Date(), updatedAt: new Date() }
}

export async function updateInvite(id, data) {
  const inviteRef = doc(invitesCollection(), id)
  await updateDoc(inviteRef, {
    ...data,
    email: data.email ? String(data.email).trim().toLowerCase() : data.email,
    updatedAt: serverTimestamp(),
  })
}

export async function deleteInvite(id) {
  const inviteRef = doc(invitesCollection(), id)
  await deleteDoc(inviteRef)
}

export function subscribeInvitesByTrip(tripId, callback, onError) {
  const invitesQuery = query(invitesCollection(), where('tripId', '==', tripId))
  return subscribeToQuery(
    invitesQuery,
    (snapshot) => snapshot.docs.map((inviteDoc) => mapInvite(inviteDoc.id, inviteDoc.data())),
    callback,
    onError,
  )
}

export async function getPendingInvitesByEmail(email) {
  const normalizedEmail = String(email ?? '').trim().toLowerCase()

  if (!normalizedEmail) {
    return []
  }

  const invitesQuery = query(
    invitesCollection(),
    where('email', '==', normalizedEmail),
    where('status', '==', 'pending'),
    limit(10),
  )
  const snapshot = await getDocs(invitesQuery)

  return snapshot.docs.map((inviteDoc) => mapInvite(inviteDoc.id, inviteDoc.data()))
}

export async function acceptPendingInvitesForUser(userProfile) {
  const pendingInvites = await getPendingInvitesByEmail(userProfile?.email)

  if (pendingInvites.length === 0) {
    return []
  }

  const acceptedInvites = []

  for (const invite of pendingInvites) {
    const members = await getMembersByTrip(invite.tripId)
    const existingMember = members.find(
      (member) =>
        member.userId === userProfile.uid ||
        String(member.email ?? '').trim().toLowerCase() === String(userProfile.email ?? '').trim().toLowerCase(),
    )

    if (!existingMember) {
      await createMember({
        tripId: invite.tripId,
        userId: userProfile.uid,
        name: userProfile.name || invite.name || 'Novo membro',
        email: userProfile.email,
        avatar: userProfile.photoURL ?? '',
        roleInTrip: invite.role === 'admin' ? 'admin' : 'member',
        createdBy: userProfile.uid,
        active: true,
      })
    }

    if (invite.role === 'admin' && userProfile.role !== 'superadmin') {
      await updateUserRole(userProfile.uid, 'admin')
    }

    await updateInvite(invite.id, {
      status: 'accepted',
      acceptedAt: serverTimestamp(),
      acceptedBy: userProfile.uid,
    })

    acceptedInvites.push({
      ...invite,
      status: 'accepted',
      acceptedBy: userProfile.uid,
    })
  }

  return acceptedInvites
}

export async function acceptInvite(invite, userProfile) {
  const members = await getMembersByTrip(invite.tripId)
  const normalizedEmail = String(userProfile.email ?? '').trim().toLowerCase()
  const existingMember = members.find(
    (member) =>
      member.userId === userProfile.uid ||
      String(member.email ?? '').trim().toLowerCase() === normalizedEmail,
  )

  if (!existingMember) {
    await createMember({
      tripId: invite.tripId,
      userId: userProfile.uid,
      name: userProfile.name || invite.name || 'Novo membro',
      email: normalizedEmail,
      avatar: userProfile.photoURL ?? '',
      roleInTrip: invite.role === 'admin' ? 'admin' : 'member',
      createdBy: invite.createdBy || userProfile.uid,
      active: true,
    })
  }

  if (invite.role === 'admin' && userProfile.role !== 'superadmin') {
    await updateUserRole(userProfile.uid, 'admin')
  }

  await updateInvite(invite.id, {
    status: 'accepted',
    acceptedAt: serverTimestamp(),
    acceptedBy: userProfile.uid,
  })

  return getUserProfile(userProfile.uid)
}

export async function declineInvite(inviteId, userId) {
  await updateInvite(inviteId, {
    status: 'declined',
    acceptedBy: userId,
    acceptedAt: serverTimestamp(),
  })
}
