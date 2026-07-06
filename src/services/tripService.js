import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  query,
  orderBy,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore'
import { db, ensureFirebaseConfigured } from '../firebase/config'
import { mockData } from '../data/mockData'

function tripsCollection() {
  ensureFirebaseConfigured()
  return collection(db, 'trips')
}

function mapTrip(id, data) {
  return {
    id,
    name: data.name ?? '',
    destination: data.destination ?? '',
    startDate: data.startDate ?? '',
    endDate: data.endDate ?? '',
    coverImage: data.coverImage ?? '',
    nextStopImage: data.nextStopImage ?? '',
    totalBudget: Number(data.totalBudget ?? 0),
    lastImportFileName: data.lastImportFileName ?? '',
    lastImportFileUrl: data.lastImportFileUrl ?? '',
    lastImportAt: data.lastImportAt ?? null,
    lastImportSource: data.lastImportSource ?? '',
    lastImportSummary: data.lastImportSummary ?? null,
    createdBy: data.createdBy ?? '',
    active: data.active ?? true,
    createdAt: data.createdAt ?? null,
    updatedAt: data.updatedAt ?? null,
  }
}

export async function createTrip(data) {
  const tripRef = doc(tripsCollection())
  const payload = {
    id: tripRef.id,
    name: data.name,
    destination: data.destination,
    startDate: data.startDate,
    endDate: data.endDate,
    coverImage: data.coverImage ?? '',
    nextStopImage: data.nextStopImage ?? '',
    totalBudget: Number(data.totalBudget ?? 0),
    createdBy: data.createdBy,
    active: data.active ?? true,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  }

  await setDoc(tripRef, payload)
  return {
    ...payload,
    createdAt: new Date(),
    updatedAt: new Date(),
  }
}

export async function getTripById(tripId) {
  const tripRef = doc(tripsCollection(), tripId)
  const snapshot = await getDoc(tripRef)

  if (!snapshot.exists()) {
    return null
  }

  return mapTrip(snapshot.id, snapshot.data())
}

export async function getUserTrips(uid) {
  const tripsQuery = query(tripsCollection(), where('createdBy', '==', uid))
  const snapshot = await getDocs(tripsQuery)
  return snapshot.docs
    .map((tripDoc) => mapTrip(tripDoc.id, tripDoc.data()))
    .filter((trip) => trip.active !== false)
}

export async function getPrimaryTrip() {
  const activeTripsQuery = query(
    tripsCollection(),
    where('active', '==', true),
    orderBy('updatedAt', 'desc'),
    limit(1),
  )
  const snapshot = await getDocs(activeTripsQuery)

  if (!snapshot.empty) {
    const tripDoc = snapshot.docs[0]
    return mapTrip(tripDoc.id, tripDoc.data())
  }

  const fallbackSnapshot = await getDocs(query(tripsCollection(), orderBy('createdAt', 'desc'), limit(1)))

  if (fallbackSnapshot.empty) {
    return null
  }

  const tripDoc = fallbackSnapshot.docs[0]
  return mapTrip(tripDoc.id, tripDoc.data())
}

export async function updateTrip(tripId, data) {
  const tripRef = doc(tripsCollection(), tripId)
  const snapshot = await getDoc(tripRef)

  if (snapshot.exists()) {
    await updateDoc(tripRef, {
      ...data,
      updatedAt: serverTimestamp(),
    })
  } else {
    await setDoc(
      tripRef,
      {
        id: tripId,
        name: data.name ?? mockData.trip.name,
        destination: data.destination ?? mockData.trip.destination,
        startDate: data.startDate ?? '2024-06-15',
        endDate: data.endDate ?? '2024-06-22',
        coverImage: data.coverImage ?? mockData.trip.cover,
        nextStopImage: data.nextStopImage ?? mockData.trip.cover,
        totalBudget: Number(data.totalBudget ?? 0),
        createdBy: data.createdBy ?? '',
        active: data.active ?? true,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        ...data,
      },
      { merge: true },
    )
  }

  return getTripById(tripId)
}

export async function ensureDefaultTripForUser(userProfile) {
  const trips = await getUserTrips(userProfile.uid)

  if (trips.length > 0) {
    return trips[0]
  }

  const primaryTrip = await getPrimaryTrip()

  if (primaryTrip) {
    return primaryTrip
  }

  return createTrip({
    name: mockData.trip.name,
    destination: mockData.trip.destination,
    startDate: '2024-06-15',
    endDate: '2024-06-22',
    coverImage: mockData.trip.cover,
    nextStopImage: mockData.trip.cover,
    totalBudget: 0,
    createdBy: userProfile.uid,
    active: true,
  })
}
