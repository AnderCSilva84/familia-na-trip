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
  writeBatch,
} from 'firebase/firestore'
import { db, ensureFirebaseConfigured } from '../firebase/config'
import { resolveMapMetadata } from '../utils/locationPresets'
import { createAgendaEvent } from './agendaService'
import { queueNotification } from './notificationService'
import { subscribeToQuery } from './firestoreRealtime'
import { geocodeLocation } from './geocodeService'

function vehiclesCollection() {
  ensureFirebaseConfigured()
  return collection(db, 'vehicleRental')
}

function mapVehicle(id, data) {
  const mapMetadata = resolveMapMetadata(data)

  return {
    id,
    tripId: data.tripId ?? '',
    title: data.title ?? '',
    rentalCompany: data.rentalCompany ?? '',
    vehicleModel: data.vehicleModel ?? '',
    pickupLocation: data.pickupLocation ?? '',
    returnLocation: data.returnLocation ?? '',
    pickupDate: data.pickupDate ?? '',
    returnDate: data.returnDate ?? '',
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

async function enrichVehicleLocationData(data) {
  const mapMetadata = resolveMapMetadata(data)
  const geocoded = await geocodeLocation({
    ...data,
    address: data.address ?? data.pickupLocation ?? data.returnLocation ?? '',
    location: data.location ?? data.pickupLocation ?? data.returnLocation ?? '',
    local: data.local ?? data.vehicleModel ?? data.rentalCompany ?? '',
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

export async function createVehicleRental(data) {
  const vehicleRef = doc(vehiclesCollection())
  const locationData = await enrichVehicleLocationData(data)
  const payload = {
    id: vehicleRef.id,
    tripId: data.tripId,
    title: data.title,
    rentalCompany: data.rentalCompany,
    vehicleModel: data.vehicleModel,
    pickupLocation: data.pickupLocation ?? '',
    returnLocation: data.returnLocation ?? '',
    pickupDate: data.pickupDate,
    returnDate: data.returnDate,
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

  await setDoc(vehicleRef, payload)

  if (data.addAgendaEvents !== false) {
    await Promise.all([
      createAgendaEvent({
        tripId: payload.tripId,
        title: `Retirada do veiculo: ${payload.vehicleModel}`,
        description: payload.title,
        date: payload.pickupDate,
        startTime: '09:00',
        location: payload.pickupLocation,
        latitude: payload.latitude,
        longitude: payload.longitude,
        mapQuery: payload.mapQuery,
        type: 'veiculo',
        relatedId: vehicleRef.id,
        createdBy: payload.createdBy,
      }),
      createAgendaEvent({
        tripId: payload.tripId,
        title: `Devolucao do veiculo: ${payload.vehicleModel}`,
        description: payload.title,
        date: payload.returnDate,
        startTime: '18:00',
        location: payload.returnLocation,
        latitude: payload.latitude,
        longitude: payload.longitude,
        mapQuery: payload.mapQuery,
        type: 'veiculo',
        relatedId: vehicleRef.id,
        createdBy: payload.createdBy,
      }),
    ])
  }

  if (payload.status === 'reservado' || payload.status === 'pago') {
    queueNotification({
      tripId: payload.tripId,
      title: 'Veiculo atualizado',
      message: `${payload.vehicleModel} esta ${payload.status}.`,
      type: 'veiculo',
      relatedId: vehicleRef.id,
      createdBy: payload.createdBy,
      targetUsers: [],
    })
  }

  return { ...payload, createdAt: new Date(), updatedAt: new Date() }
}

export async function getVehiclesByTrip(tripId) {
  return new Promise((resolve, reject) => {
    const unsubscribe = subscribeVehiclesByTrip(
      tripId,
      (vehicles) => {
        resolve(vehicles)
        unsubscribe()
      },
      reject,
    )
  })
}

export function subscribeVehiclesByTrip(tripId, callback, onError) {
  const vehiclesQuery = query(vehiclesCollection(), where('tripId', '==', tripId))
  return subscribeToQuery(
    vehiclesQuery,
    (snapshot) =>
      snapshot.docs
        .map((vehicleDoc) => mapVehicle(vehicleDoc.id, vehicleDoc.data()))
        .sort((left, right) => `${left.pickupDate}`.localeCompare(`${right.pickupDate}`)),
    callback,
    onError,
  )
}

export async function updateVehicleRental(id, data) {
  const vehicleRef = doc(vehiclesCollection(), id)
  const locationData = await enrichVehicleLocationData(data)
  await updateDoc(vehicleRef, {
    ...data,
    estimatedValue: Number(data.estimatedValue ?? 0),
    finalValue: Number(data.finalValue ?? 0),
    mapX: locationData.mapX,
    mapY: locationData.mapY,
    mapQuery: locationData.mapQuery,
    latitude: locationData.latitude,
    longitude: locationData.longitude,
    updatedAt: serverTimestamp(),
  })
}

export async function deleteVehicleRental(id) {
  const vehicleRef = doc(vehiclesCollection(), id)
  await deleteDoc(vehicleRef)
}

export async function normalizeVehicleLocationsForTrip(tripId) {
  ensureFirebaseConfigured()

  if (!tripId) {
    return 0
  }

  const snapshot = await getDocs(query(vehiclesCollection(), where('tripId', '==', tripId)))
  const updates = await Promise.all(
    snapshot.docs.map(async (vehicleDoc) => {
      const data = vehicleDoc.data()
      const locationData = await enrichVehicleLocationData(data)

      return {
        ref: vehicleDoc.ref,
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
