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
    eventTime: data.eventTime ?? '',
    notifyMembers: data.notifyMembers ?? false,
    membersToNotify: data.membersToNotify ?? [],
    active: data.active ?? true,
    agendaEventId: data.agendaEventId ?? '',
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
    eventTime: data.eventTime ?? '',
    notifyMembers: data.notifyMembers ?? false,
    membersToNotify: data.membersToNotify ?? [],
    active: data.active ?? true,
    agendaEventId: data.agendaEventId ?? '',
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

export async function getAlarmByAgendaEventId(agendaEventId) {
  if (!agendaEventId) {
    return null
  }

  const snapshot = await getDocs(query(alarmsCollection(), where('agendaEventId', '==', agendaEventId)))
  const alarmDoc = snapshot.docs[0]

  if (!alarmDoc) {
    return null
  }

  return mapAlarm(alarmDoc.id, alarmDoc.data())
}

export async function syncAlarmFromAgendaEvent(agendaEvent) {
  if (!agendaEvent?.id) {
    return ''
  }

  const existingAlarm = await getAlarmByAgendaEventId(agendaEvent.id)
  const payload = {
    tripId: agendaEvent.tripId,
    title: agendaEvent.title,
    description: agendaEvent.description ?? '',
    date: agendaEvent.date,
    time: agendaEvent.alarmTime || agendaEvent.startTime || '',
    eventTime: agendaEvent.startTime ?? '',
    notifyMembers: agendaEvent.notifyMembers ?? false,
    membersToNotify: agendaEvent.membersToNotify ?? [],
    active: true,
    agendaEventId: agendaEvent.id,
    createdBy: agendaEvent.createdBy,
  }

  if (existingAlarm?.id) {
    await updateAlarm(existingAlarm.id, payload)
    return existingAlarm.id
  }

  const createdAlarm = await createAlarm(payload)
  return createdAlarm.id
}

export async function deleteAlarmByAgendaEventId(agendaEventId) {
  if (!agendaEventId) {
    return 0
  }

  const snapshot = await getDocs(query(alarmsCollection(), where('agendaEventId', '==', agendaEventId)))

  if (!snapshot.docs.length) {
    return 0
  }

  await Promise.all(snapshot.docs.map((alarmDoc) => deleteDoc(alarmDoc.ref)))
  return snapshot.docs.length
}
