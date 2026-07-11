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
import { compareEventChronology, getDefaultEventImage } from '../utils/eventDefaults'
import { resolveMapMetadata } from '../utils/locationPresets'
import { createAgendaEvent } from './agendaService'
import { subscribeToQuery } from './firestoreRealtime'
import { geocodeLocation } from './geocodeService'

function itineraryCollection() {
  ensureFirebaseConfigured()
  return collection(db, 'itinerary')
}

async function enrichItineraryLocationData(item) {
  const mapMetadata = resolveMapMetadata(item)
  const geocoded = await geocodeLocation(item)

  return {
    mapX: item.mapX ?? mapMetadata.mapX,
    mapY: item.mapY ?? mapMetadata.mapY,
    mapQuery: geocoded.mapQuery || item.mapQuery || mapMetadata.mapQuery,
    latitude: geocoded.latitude,
    longitude: geocoded.longitude,
  }
}

function mapItinerary(id, data) {
  const mapMetadata = resolveMapMetadata(data)

  return {
    id,
    tripId: data.tripId ?? '',
    title: data.title ?? '',
    description: data.description ?? '',
    location: data.location ?? '',
    city: data.city ?? '',
    local: data.local ?? '',
    address: data.address ?? '',
    postalCode: data.postalCode ?? '',
    date: data.date ?? '',
    startTime: data.startTime ?? '',
    endTime: data.endTime ?? '',
    link: data.link ?? '',
    image: getDefaultEventImage({
      title: data.title,
      description: data.description,
      location: data.location,
      image: data.image,
    }),
    mapX: data.mapX ?? mapMetadata.mapX ?? '',
    mapY: data.mapY ?? mapMetadata.mapY ?? '',
    mapQuery: data.mapQuery ?? mapMetadata.mapQuery ?? '',
    latitude: Number(data.latitude ?? '') || '',
    longitude: Number(data.longitude ?? '') || '',
    status: data.status ?? 'planejado',
    createdBy: data.createdBy ?? '',
    createdAt: data.createdAt ?? null,
    updatedAt: data.updatedAt ?? null,
  }
}

export async function createItineraryItem(data) {
  const itemRef = doc(itineraryCollection())
  const { createAgenda = true, ...itemData } = data
  const locationData = await enrichItineraryLocationData(itemData)
  const payload = {
    id: itemRef.id,
    tripId: itemData.tripId,
    title: itemData.title,
    description: itemData.description ?? '',
    location: itemData.location ?? '',
    city: itemData.city ?? '',
    local: itemData.local ?? '',
    address: itemData.address ?? '',
    postalCode: itemData.postalCode ?? '',
    date: itemData.date,
    startTime: itemData.startTime ?? '',
    endTime: itemData.endTime ?? '',
    link: itemData.link ?? '',
    image: getDefaultEventImage({
      title: itemData.title,
      description: itemData.description,
      location: itemData.location,
      image: itemData.image,
    }),
    mapX: locationData.mapX,
    mapY: locationData.mapY,
    mapQuery: locationData.mapQuery,
    latitude: locationData.latitude,
    longitude: locationData.longitude,
    status: itemData.status ?? 'planejado',
    createdBy: itemData.createdBy,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  }

  await setDoc(itemRef, payload)

  if (createAgenda) {
    await createAgendaEvent({
      tripId: payload.tripId,
      title: payload.title,
      description: payload.description,
      date: payload.date,
      startTime: payload.startTime,
      endTime: payload.endTime,
      location: payload.location,
      city: payload.city,
      local: payload.local,
      address: payload.address,
      postalCode: payload.postalCode,
      link: payload.link,
      image: payload.image,
      mapX: payload.mapX,
      mapY: payload.mapY,
      mapQuery: payload.mapQuery,
      latitude: payload.latitude,
      longitude: payload.longitude,
      type: 'roteiro',
      relatedId: itemRef.id,
      createdBy: payload.createdBy,
    })
  }

  return { ...payload, createdAt: new Date(), updatedAt: new Date() }
}

export async function getItineraryByTrip(tripId) {
  return new Promise((resolve, reject) => {
    const unsubscribe = subscribeItineraryByTrip(
      tripId,
      (items) => {
        resolve(items)
        unsubscribe()
      },
      reject,
    )
  })
}

export function subscribeItineraryByTrip(tripId, callback, onError) {
  const itineraryQuery = query(itineraryCollection(), where('tripId', '==', tripId))
  return subscribeToQuery(
    itineraryQuery,
    (snapshot) =>
      snapshot.docs
        .map((itemDoc) => mapItinerary(itemDoc.id, itemDoc.data()))
        .sort(compareEventChronology),
    callback,
    onError,
  )
}

export async function updateItineraryItem(id, data) {
  const itemRef = doc(itineraryCollection(), id)
  const currentSnapshot = await getDoc(itemRef)
  const currentData = currentSnapshot.exists() ? currentSnapshot.data() : {}
  const payload = {
    ...currentData,
    ...data,
    image: data.image || currentData.image || '',
    link: data.link || currentData.link || '',
  }
  const locationData = await enrichItineraryLocationData(payload)
  await updateDoc(itemRef, {
    ...payload,
    mapX: locationData.mapX,
    mapY: locationData.mapY,
    mapQuery: locationData.mapQuery,
    latitude: locationData.latitude,
    longitude: locationData.longitude,
    updatedAt: serverTimestamp(),
  })
}

export async function deleteItineraryItem(id) {
  const itemRef = doc(itineraryCollection(), id)
  await deleteDoc(itemRef)
}

export async function normalizeItineraryLocationsForTrip(tripId) {
  ensureFirebaseConfigured()

  if (!tripId) {
    return 0
  }

  const snapshot = await getDocs(query(itineraryCollection(), where('tripId', '==', tripId)))
  const updates = await Promise.all(
    snapshot.docs.map(async (itemDoc) => {
      const data = itemDoc.data()
      const locationData = await enrichItineraryLocationData(data)

      return {
        ref: itemDoc.ref,
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
