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
import { createAgendaEvent } from './agendaService'
import { createNotification } from './notificationService'
import { subscribeToQuery } from './firestoreRealtime'

function vehiclesCollection() {
  ensureFirebaseConfigured()
  return collection(db, 'vehicleRental')
}

function mapVehicle(id, data) {
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
    mapX: data.mapX ?? '',
    mapY: data.mapY ?? '',
    status: data.status ?? 'pesquisando',
    notes: data.notes ?? '',
    createdBy: data.createdBy ?? '',
    createdAt: data.createdAt ?? null,
    updatedAt: data.updatedAt ?? null,
  }
}

export async function createVehicleRental(data) {
  const vehicleRef = doc(vehiclesCollection())
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
    mapX: data.mapX ?? '',
    mapY: data.mapY ?? '',
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
        type: 'veiculo',
        relatedId: vehicleRef.id,
        createdBy: payload.createdBy,
      }),
    ])
  }

  if (payload.status === 'reservado' || payload.status === 'pago') {
    await createNotification({
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
  await updateDoc(vehicleRef, {
    ...data,
    estimatedValue: Number(data.estimatedValue ?? 0),
    finalValue: Number(data.finalValue ?? 0),
    updatedAt: serverTimestamp(),
  })
}

export async function deleteVehicleRental(id) {
  const vehicleRef = doc(vehiclesCollection(), id)
  await deleteDoc(vehicleRef)
}
