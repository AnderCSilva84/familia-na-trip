import {
  collection,
  deleteDoc,
  doc,
  query,
  serverTimestamp,
  setDoc,
  where,
} from 'firebase/firestore'
import { db, ensureFirebaseConfigured } from '../firebase/config'
import { subscribeToQuery } from './firestoreRealtime'

function memberLocationsCollection() {
  ensureFirebaseConfigured()
  return collection(db, 'memberLocations')
}

function normalizeNumber(value) {
  const parsed = Number(value ?? '')
  return Number.isFinite(parsed) ? parsed : null
}

function mapMemberLocation(id, data) {
  return {
    id,
    tripId: data.tripId ?? '',
    userId: data.userId ?? id,
    memberId: data.memberId ?? '',
    name: data.name ?? 'Membro da familia',
    email: data.email ?? '',
    photoURL: data.photoURL ?? '',
    latitude: normalizeNumber(data.latitude),
    longitude: normalizeNumber(data.longitude),
    accuracy: normalizeNumber(data.accuracy) ?? 0,
    sharing: data.sharing !== false,
    source: data.source ?? 'device',
    updatedAt: data.updatedAt ?? null,
  }
}

export async function shareMemberLocation(data) {
  const userId = String(data.userId ?? '').trim()

  if (!userId) {
    throw new Error('Nao foi possivel identificar o usuario para compartilhar a localizacao.')
  }

  const locationRef = doc(memberLocationsCollection(), userId)
  const payload = {
    tripId: data.tripId ?? '',
    userId,
    memberId: data.memberId ?? '',
    name: data.name ?? 'Membro da familia',
    email: String(data.email ?? '').trim().toLowerCase(),
    photoURL: data.photoURL ?? '',
    latitude: normalizeNumber(data.latitude),
    longitude: normalizeNumber(data.longitude),
    accuracy: normalizeNumber(data.accuracy) ?? 0,
    sharing: true,
    source: data.source ?? 'device',
    updatedAt: serverTimestamp(),
  }

  await setDoc(locationRef, payload, { merge: true })
  return {
    ...payload,
    id: userId,
    updatedAt: new Date(),
  }
}

export async function deleteMemberLocation(userId) {
  const normalizedUserId = String(userId ?? '').trim()

  if (!normalizedUserId) {
    return
  }

  await deleteDoc(doc(memberLocationsCollection(), normalizedUserId))
}

export function subscribeMemberLocationsByTrip(tripId, callback, onError) {
  const locationsQuery = query(memberLocationsCollection(), where('tripId', '==', tripId))

  return subscribeToQuery(
    locationsQuery,
    (snapshot) =>
      snapshot.docs
        .map((locationDoc) => mapMemberLocation(locationDoc.id, locationDoc.data()))
        .filter(
          (location) =>
            location.sharing !== false &&
            Number.isFinite(location.latitude) &&
            Number.isFinite(location.longitude),
        ),
    callback,
    onError,
  )
}
