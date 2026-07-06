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
import { createNotification } from './notificationService'
import { subscribeToQuery } from './firestoreRealtime'

function alarmsCollection() {
  ensureFirebaseConfigured()
  return collection(db, 'alarms')
}

function mapAlarm(id, data) {
  return {
    id,
    tripId: data.tripId ?? '',
    title: data.title ?? '',
    description: data.description ?? '',
    date: data.date ?? '',
    time: data.time ?? '',
    notifyMembers: data.notifyMembers ?? false,
    membersToNotify: data.membersToNotify ?? [],
    active: data.active ?? true,
    createdBy: data.createdBy ?? '',
    createdAt: data.createdAt ?? null,
    updatedAt: data.updatedAt ?? null,
  }
}

export async function createAlarm(data) {
  const alarmRef = doc(alarmsCollection())
  const payload = {
    id: alarmRef.id,
    tripId: data.tripId,
    title: data.title,
    description: data.description ?? '',
    date: data.date,
    time: data.time,
    notifyMembers: data.notifyMembers ?? false,
    membersToNotify: data.membersToNotify ?? [],
    active: data.active ?? true,
    createdBy: data.createdBy,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  }

  await setDoc(alarmRef, payload)
  await createNotification({
    tripId: payload.tripId,
    title: 'Novo alarme criado',
    message: `${payload.title} as ${payload.time}`,
    type: 'alarme',
    relatedId: alarmRef.id,
    createdBy: payload.createdBy,
    targetUsers: payload.notifyMembers ? payload.membersToNotify : [],
  })

  return { ...payload, createdAt: new Date(), updatedAt: new Date() }
}

export async function getAlarmsByTrip(tripId) {
  return new Promise((resolve, reject) => {
    const unsubscribe = subscribeAlarmsByTrip(
      tripId,
      (alarms) => {
        resolve(alarms)
        unsubscribe()
      },
      reject,
    )
  })
}

export function subscribeAlarmsByTrip(tripId, callback, onError) {
  const alarmsQuery = query(alarmsCollection(), where('tripId', '==', tripId))
  return subscribeToQuery(
    alarmsQuery,
    (snapshot) =>
      snapshot.docs
        .map((alarmDoc) => mapAlarm(alarmDoc.id, alarmDoc.data()))
        .sort((left, right) => `${left.date} ${left.time}`.localeCompare(`${right.date} ${right.time}`)),
    callback,
    onError,
  )
}

export async function updateAlarm(id, data) {
  const alarmRef = doc(alarmsCollection(), id)
  await updateDoc(alarmRef, {
    ...data,
    updatedAt: serverTimestamp(),
  })
}

export async function deleteAlarm(id) {
  const alarmRef = doc(alarmsCollection(), id)
  await deleteDoc(alarmRef)
}

export async function toggleAlarm(id, active) {
  return updateAlarm(id, { active })
}
