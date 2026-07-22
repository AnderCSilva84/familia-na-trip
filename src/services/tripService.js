import {
  collection,
  deleteDoc,
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
  writeBatch,
} from 'firebase/firestore'
import { db, ensureFirebaseConfigured } from '../firebase/config'
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage'
import { storage } from '../firebase/config'
import { mockData } from '../data/mockData'

function tripsCollection() {
  ensureFirebaseConfigured()
  return collection(db, 'trips')
}

export async function uploadTripCover(tripId, file) {
  ensureFirebaseConfigured()
  if (!storage) throw new Error('Firebase Storage indisponível.')
  if (!file?.type?.startsWith('image/')) throw new Error('Escolha um arquivo de imagem válido.')
  if (file.size > 15 * 1024 * 1024) throw new Error('A imagem de capa deve ter no máximo 15 MB.')

  const safeName = String(file.name || 'capa.jpg').replace(/[^a-zA-Z0-9._-]/g, '-')
  const fileRef = ref(storage, `trips/${tripId}/covers/${Date.now()}-${safeName}`)
  await uploadBytes(fileRef, file, { contentType: file.type })
  return getDownloadURL(fileRef)
}

function mapTrip(id, data) {
  const isLegacyMaragogiTrip = String(data.name ?? '').trim().toLowerCase().includes('maragogi')
  return {
    id,
    name: isLegacyMaragogiTrip ? 'Salvador em família' : data.name ?? '',
    destination: isLegacyMaragogiTrip ? 'Salvador, BA' : data.destination ?? '',
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
    status: data.status ?? 'planned',
    cities: Array.isArray(data.cities) ? data.cities : [],
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
    status: data.status ?? 'planned',
    cities: Array.isArray(data.cities) ? data.cities : [],
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

export async function getAllTrips() {
  const snapshot = await getDocs(tripsCollection())
  return snapshot.docs
    .map((tripDoc) => mapTrip(tripDoc.id, tripDoc.data()))
    .filter((trip) => trip.active !== false)
    .sort((left, right) => String(right.startDate).localeCompare(String(left.startDate)))
}

export async function getTripsByIds(tripIds = []) {
  const uniqueIds = [...new Set(tripIds.filter(Boolean))]
  const trips = await Promise.all(uniqueIds.map((tripId) => getTripById(tripId)))
  return trips.filter(Boolean).sort((left, right) => String(right.startDate).localeCompare(String(left.startDate)))
}

const tripDataCollections = [
  'members', 'memberLocations', 'itinerary', 'attractions', 'diary', 'expenses',
  'hotelReservations', 'walletDocuments', 'travelChecklist', 'vehicleRental', 'tips',
  'polls', 'agenda', 'agendaReviews', 'emergencyContacts', 'alarms', 'notifications',
  'invites', 'mapPoints', 'importLogs',
]

export async function deleteTripCompletely(tripId) {
  ensureFirebaseConfigured()
  const snapshots = await Promise.all(
    tripDataCollections.map((collectionName) =>
      getDocs(query(collection(db, collectionName), where('tripId', '==', tripId))),
    ),
  )
  const references = snapshots.flatMap((snapshot) => snapshot.docs.map((entry) => entry.ref))

  for (let index = 0; index < references.length; index += 450) {
    const batch = writeBatch(db)
    references.slice(index, index + 450).forEach((reference) => batch.delete(reference))
    await batch.commit()
  }

  await deleteDoc(doc(tripsCollection(), tripId))
  return { deletedDocuments: references.length + 1 }
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
        startDate: data.startDate ?? '2026-07-18',
        endDate: data.endDate ?? '2026-07-29',
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
    startDate: '2026-07-18',
    endDate: '2026-07-29',
    coverImage: mockData.trip.cover,
    nextStopImage: mockData.trip.cover,
    totalBudget: 0,
    createdBy: userProfile.uid,
    active: true,
  })
}
