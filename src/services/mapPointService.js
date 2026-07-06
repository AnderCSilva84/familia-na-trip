import {
  collection,
  deleteDoc,
  doc,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore'
import { db, ensureFirebaseConfigured } from '../firebase/config'
import { subscribeToQuery } from './firestoreRealtime'

function mapPointsCollection() {
  ensureFirebaseConfigured()
  return collection(db, 'mapPoints')
}

function mapMapPoint(id, data) {
  return {
    id,
    tripId: data.tripId ?? '',
    title: data.title ?? '',
    description: data.description ?? '',
    sourceType: data.sourceType ?? 'custom',
    sourceId: data.sourceId ?? '',
    x: data.x ?? '',
    y: data.y ?? '',
    image: data.image ?? '',
    avatar: data.avatar ?? '',
    createdBy: data.createdBy ?? '',
    createdAt: data.createdAt ?? null,
    updatedAt: data.updatedAt ?? null,
  }
}

export async function createMapPoint(data) {
  const pointRef = doc(mapPointsCollection())
  const payload = {
    id: pointRef.id,
    tripId: data.tripId,
    title: data.title,
    description: data.description ?? '',
    sourceType: data.sourceType ?? 'custom',
    sourceId: data.sourceId ?? '',
    x: data.x ?? '',
    y: data.y ?? '',
    image: data.image ?? '',
    avatar: data.avatar ?? '',
    createdBy: data.createdBy,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  }
  await setDoc(pointRef, payload)
  return { ...payload, createdAt: new Date(), updatedAt: new Date() }
}

export async function updateMapPoint(id, data) {
  const pointRef = doc(mapPointsCollection(), id)
  await updateDoc(pointRef, {
    ...data,
    updatedAt: serverTimestamp(),
  })
}

export async function deleteMapPoint(id) {
  const pointRef = doc(mapPointsCollection(), id)
  await deleteDoc(pointRef)
}

export function subscribeMapPointsByTrip(tripId, callback, onError) {
  const pointsQuery = query(mapPointsCollection(), where('tripId', '==', tripId))
  return subscribeToQuery(
    pointsQuery,
    (snapshot) => snapshot.docs.map((pointDoc) => mapMapPoint(pointDoc.id, pointDoc.data())),
    callback,
    onError,
  )
}
