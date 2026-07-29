import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore'
import { db, ensureFirebaseConfigured } from '../firebase/config'
import { resolveMapMetadata } from '../utils/locationPresets'
import { createAgendaEvent } from './agendaService'
import { queueNotification } from './notificationService'
import { subscribeToQuery } from './firestoreRealtime'
import { geocodeLocation } from './geocodeService'

function hotelsCollection() {
  ensureFirebaseConfigured()
  return collection(db, 'hotelReservations')
}

function mapHotel(id, data) {
  const mapMetadata = resolveMapMetadata(data)

  return {
    id,
    tripId: data.tripId ?? '',
    title: data.title ?? '',
    hotelName: data.hotelName ?? '',
    address: data.address ?? '',
    checkIn: data.checkIn ?? '',
    checkOut: data.checkOut ?? '',
    estimatedValue: Number(data.estimatedValue ?? 0),
    finalValue: Number(data.finalValue ?? 0),
    link: data.link ?? '',
    image: data.image ?? '',
    mapX: data.mapX ?? mapMetadata.mapX ?? '',
    mapY: data.mapY ?? mapMetadata.mapY ?? '',
    mapQuery: data.mapQuery ?? mapMetadata.mapQuery ?? '',
    latitude: Number(data.latitude ?? '') || '',
    longitude: Number(data.longitude ?? '') || '',
    status: data.status ?? 'pesquisando',
    notes: data.notes ?? '',
    createdBy: data.createdBy ?? '',
    createdAt: data.createdAt ?? null,
    updatedAt: data.updatedAt ?? null,
  }
}

async function enrichHotelLocationData(data) {
  const mapMetadata = resolveMapMetadata(data)
  const geocoded = await geocodeLocation({
    ...data,
    location: data.location ?? data.address ?? data.hotelName ?? '',
    local: data.local ?? data.hotelName ?? '',
    city: data.city ?? '',
  })

  return {
    mapX: data.mapX ?? mapMetadata.mapX ?? '',
    mapY: data.mapY ?? mapMetadata.mapY ?? '',
    mapQuery: geocoded.mapQuery || data.mapQuery || mapMetadata.mapQuery || '',
    latitude: geocoded.latitude,
    longitude: geocoded.longitude,
  }
}

export async function createHotelReservation(data) {
  const hotelRef = doc(hotelsCollection())
  const locationData = await enrichHotelLocationData(data)
  const payload = {
    id: hotelRef.id,
    tripId: data.tripId,
    title: data.title,
    hotelName: data.hotelName,
    address: data.address ?? '',
    checkIn: data.checkIn,
    checkOut: data.checkOut,
    estimatedValue: Number(data.estimatedValue ?? 0),
    finalValue: Number(data.finalValue ?? 0),
    link: data.link ?? '',
    image: data.image ?? '',
    mapX: locationData.mapX,
    mapY: locationData.mapY,
    mapQuery: locationData.mapQuery,
    latitude: locationData.latitude,
    longitude: locationData.longitude,
    status: data.status ?? 'pesquisando',
    notes: data.notes ?? '',
    createdBy: data.createdBy,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  }

  await setDoc(hotelRef, payload)

  if (data.addAgendaEvents !== false) {
    await Promise.all([
      createAgendaEvent({
        tripId: payload.tripId,
        title: `Check-in: ${payload.hotelName}`,
        description: payload.title,
        date: payload.checkIn,
        startTime: '14:00',
        location: payload.address,
        latitude: payload.latitude,
        longitude: payload.longitude,
        mapQuery: payload.mapQuery,
        image: payload.image,
        link: payload.link,
        type: 'hotel',
        relatedId: hotelRef.id,
        createdBy: payload.createdBy,
      }),
      createAgendaEvent({
        tripId: payload.tripId,
        title: `Check-out: ${payload.hotelName}`,
        description: payload.title,
        date: payload.checkOut,
        startTime: '12:00',
        location: payload.address,
        latitude: payload.latitude,
        longitude: payload.longitude,
        mapQuery: payload.mapQuery,
        image: payload.image,
        link: payload.link,
        type: 'hotel',
        relatedId: hotelRef.id,
        createdBy: payload.createdBy,
      }),
    ])
  }

  if (payload.status === 'reservado' || payload.status === 'pago') {
    queueNotification({
      tripId: payload.tripId,
      title: 'Hospedagem atualizada',
      message: `${payload.hotelName} está ${payload.status}.`,
      type: 'hotel',
      relatedId: hotelRef.id,
      createdBy: payload.createdBy,
      targetUsers: [],
    })
  }

  return { ...payload, createdAt: new Date(), updatedAt: new Date() }
}

export async function getHotelsByTrip(tripId) {
  return new Promise((resolve, reject) => {
    const unsubscribe = subscribeHotelsByTrip(
      tripId,
      (hotels) => {
        resolve(hotels)
        unsubscribe()
      },
      reject,
    )
  })
}

export function subscribeHotelsByTrip(tripId, callback, onError) {
  const hotelsQuery = query(hotelsCollection(), where('tripId', '==', tripId))
  return subscribeToQuery(
    hotelsQuery,
    (snapshot) =>
      snapshot.docs
        .map((hotelDoc) => mapHotel(hotelDoc.id, hotelDoc.data()))
        .sort((left, right) => `${left.checkIn}`.localeCompare(`${right.checkIn}`)),
    callback,
    onError,
  )
}

export async function updateHotelReservation(id, data) {
  const hotelRef = doc(hotelsCollection(), id)
  const currentSnapshot = await getDoc(hotelRef)
  const currentData = currentSnapshot.exists() ? currentSnapshot.data() : {}
  const mergedData = {
    ...currentData,
    ...data,
    image: data.image || currentData.image || '',
    link: data.link || currentData.link || '',
  }
  const locationData = await enrichHotelLocationData(mergedData)
  const payload = {
    ...mergedData,
    estimatedValue: Number(data.estimatedValue ?? 0),
    finalValue: Number(data.finalValue ?? 0),
    mapX: locationData.mapX,
    mapY: locationData.mapY,
    mapQuery: locationData.mapQuery,
    latitude: locationData.latitude,
    longitude: locationData.longitude,
    updatedAt: serverTimestamp(),
  }
  await updateDoc(hotelRef, payload)
}

export async function deleteHotelReservation(id) {
  const hotelRef = doc(hotelsCollection(), id)
  await deleteDoc(hotelRef)
}

export async function normalizeHotelLocationsForTrip(tripId) {
  ensureFirebaseConfigured()

  if (!tripId) {
    return 0
  }

  const snapshot = await getDocs(query(hotelsCollection(), where('tripId', '==', tripId)))
  const updates = await Promise.all(
    snapshot.docs.map(async (hotelDoc) => {
      const data = hotelDoc.data()
      const locationData = await enrichHotelLocationData(data)

      return {
        ref: hotelDoc.ref,
        payload: {
          mapX: locationData.mapX,
          mapY: locationData.mapY,
          mapQuery: locationData.mapQuery,
          latitude: locationData.latitude,
          longitude: locationData.longitude,
          updatedAt: serverTimestamp(),
        },
      }
    }),
  )

  if (!updates.length) {
    return 0
  }

  for (let index = 0; index < updates.length; index += 400) {
    const batch = writeBatch(db)
    updates.slice(index, index + 400).forEach((item) => {
      batch.update(item.ref, item.payload)
    })
    await batch.commit()
  }

  return updates.length
}
