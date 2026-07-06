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

function hotelsCollection() {
  ensureFirebaseConfigured()
  return collection(db, 'hotelReservations')
}

function mapHotel(id, data) {
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
    mapX: data.mapX ?? '',
    mapY: data.mapY ?? '',
    status: data.status ?? 'pesquisando',
    notes: data.notes ?? '',
    createdBy: data.createdBy ?? '',
    createdAt: data.createdAt ?? null,
    updatedAt: data.updatedAt ?? null,
  }
}

export async function createHotelReservation(data) {
  const hotelRef = doc(hotelsCollection())
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
    mapX: data.mapX ?? '',
    mapY: data.mapY ?? '',
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
        type: 'hotel',
        relatedId: hotelRef.id,
        createdBy: payload.createdBy,
      }),
    ])
  }

  if (payload.status === 'reservado' || payload.status === 'pago') {
    await createNotification({
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
  await updateDoc(hotelRef, {
    ...data,
    estimatedValue: Number(data.estimatedValue ?? 0),
    finalValue: Number(data.finalValue ?? 0),
    updatedAt: serverTimestamp(),
  })
}

export async function deleteHotelReservation(id) {
  const hotelRef = doc(hotelsCollection(), id)
  await deleteDoc(hotelRef)
}
