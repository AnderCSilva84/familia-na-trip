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
import { deleteObject, getDownloadURL, ref, uploadBytes } from 'firebase/storage'
import { db, ensureFirebaseConfigured, storage } from '../firebase/config'
import { compareEventChronology, getDefaultEventImage } from '../utils/eventDefaults'
import { normalizeDisplayTime } from '../utils/formatters'
import { resolveMapMetadata } from '../utils/locationPresets'
import { deleteAlarmByAgendaEventId, syncAlarmFromAgendaEvent } from './alarmService'
import { createNotification } from './notificationService'
import { subscribeToQuery } from './firestoreRealtime'
import { deleteAgendaActualExpense, syncAgendaActualExpense } from './expenseService'
import { geocodeLocation } from './geocodeService'

function agendaCollection() {
  ensureFirebaseConfigured()
  return collection(db, 'agenda')
}

function normalizeContextText(...values) {
  return values
    .map((value) =>
      String(value ?? '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .trim()
        .toLowerCase(),
    )
    .filter(Boolean)
    .join(' ')
}

function applyAgendaTimeHeuristics(timeValue, item = {}) {
  const normalized = normalizeDisplayTime(timeValue)

  if (!normalized) {
    return ''
  }

  const match = normalized.match(/^(\d{2}):(\d{2})(?::(\d{2}))?$/)

  if (!match) {
    return normalized
  }

  let hours = Number(match[1])
  const minutes = match[2]
  const seconds = match[3] ?? '00'
  const context = normalizeContextText(item.title, item.local, item.description, item.location)

  if (hours < 12) {
    if (/(jantar|noite|ceia|show|bar|happy hour|balada)/.test(context)) {
      hours += 12
    } else if (/(almoco|almoco|restaurante)/.test(context) && hours < 11) {
      hours += 12
    } else if (/(hotel|check-in|check in|descanso)/.test(context) && hours < 12) {
      hours += 12
    }
  }

  return `${String(hours).padStart(2, '0')}:${minutes}:${seconds}`
}

async function enrichAgendaLocationData(item) {
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

function mapAgendaItem(id, data) {
  const mapMetadata = resolveMapMetadata(data)

  return {
    id,
    tripId: data.tripId ?? '',
    title: data.title ?? '',
    description: data.description ?? '',
    weekday: data.weekday ?? '',
    city: data.city ?? '',
    local: data.local ?? '',
    address: data.address ?? '',
    postalCode: data.postalCode ?? '',
    date: data.date ?? '',
    startTime: data.startTime ?? data.time ?? data.hora ?? '',
    endTime: data.endTime ?? '',
    estimatedCost: Number(data.estimatedCost ?? 0),
    actualCost: Number(data.actualCost ?? 0),
    catRating: Number(data.catRating ?? 0),
    expenseCategory: data.expenseCategory ?? 'Outros',
    location: data.location ?? '',
    link: data.link ?? '',
    image: getDefaultEventImage({
      title: data.title,
      description: data.description,
      location: data.location,
      image: data.image,
    }),
    imagePath: data.imagePath ?? '',
    mapX: data.mapX ?? mapMetadata.mapX,
    mapY: data.mapY ?? mapMetadata.mapY,
    mapQuery: data.mapQuery ?? mapMetadata.mapQuery,
    latitude: Number(data.latitude ?? '') || '',
    longitude: Number(data.longitude ?? '') || '',
    type: data.type ?? 'outro',
    notifyMembers: data.notifyMembers ?? false,
    membersToNotify: data.membersToNotify ?? [],
    alarmTime: data.alarmTime ?? '',
    alarmId: data.alarmId ?? '',
    relatedId: data.relatedId ?? '',
    importSource: data.importSource ?? '',
    importSheetName: data.importSheetName ?? '',
    importKey: data.importKey ?? '',
    createdBy: data.createdBy ?? '',
    createdAt: data.createdAt ?? null,
    updatedAt: data.updatedAt ?? null,
  }
}

async function uploadAgendaEventImage(tripId, eventId, file) {
  ensureFirebaseConfigured()

  if (!storage) {
    throw new Error('Firebase Storage indisponivel.')
  }

  const safeName = String(file?.name ?? 'evento.jpg').replace(/\s+/g, '-')
  const imagePath = `trips/${tripId}/agenda/${eventId}/${Date.now()}-${safeName}`
  const imageRef = ref(storage, imagePath)

  await uploadBytes(imageRef, file)
  const image = await getDownloadURL(imageRef)

  return {
    image,
    imagePath,
  }
}

export async function createAgendaEvent(data, imageFile = null) {
  const { createNotification: shouldNotify = true, ...eventData } = data
  const eventRef = doc(agendaCollection())
  const locationData = await enrichAgendaLocationData(eventData)
  const payload = {
    id: eventRef.id,
    tripId: eventData.tripId,
    title: eventData.title,
    description: eventData.description ?? '',
    weekday: eventData.weekday ?? '',
    city: eventData.city ?? '',
    local: eventData.local ?? '',
    address: eventData.address ?? '',
    postalCode: eventData.postalCode ?? '',
    date: eventData.date,
    startTime: eventData.startTime ?? '',
    endTime: eventData.endTime ?? '',
    estimatedCost: Number(eventData.estimatedCost ?? 0),
    actualCost: Number(eventData.actualCost ?? 0),
    catRating: Number(eventData.catRating ?? 0),
    expenseCategory: eventData.expenseCategory ?? 'Outros',
    location: eventData.location ?? '',
    link: eventData.link ?? '',
    image: getDefaultEventImage({
      title: eventData.title,
      description: eventData.description,
      location: eventData.location,
      image: eventData.image,
    }),
    imagePath: eventData.imagePath ?? '',
    mapX: locationData.mapX,
    mapY: locationData.mapY,
    mapQuery: locationData.mapQuery,
    latitude: locationData.latitude,
    longitude: locationData.longitude,
    type: eventData.type ?? 'evento',
    notifyMembers: eventData.notifyMembers ?? false,
    membersToNotify: eventData.membersToNotify ?? [],
    alarmTime: eventData.alarmTime ?? '',
    alarmId: eventData.alarmId ?? '',
    relatedId: eventData.relatedId ?? '',
    createdBy: eventData.createdBy,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  }

  await setDoc(eventRef, payload)

  if (imageFile) {
    const uploadedImage = await uploadAgendaEventImage(eventData.tripId, eventRef.id, imageFile)

    await updateDoc(eventRef, {
      image: uploadedImage.image,
      imagePath: uploadedImage.imagePath,
      updatedAt: serverTimestamp(),
    })

    payload.image = uploadedImage.image
    payload.imagePath = uploadedImage.imagePath
  }

  if (payload.type === 'alarme') {
    const alarmId = await syncAlarmFromAgendaEvent({
      ...payload,
      id: eventRef.id,
    })

    await updateDoc(eventRef, {
      alarmId,
      updatedAt: serverTimestamp(),
    })

    payload.alarmId = alarmId
  }

  if (shouldNotify) {
    await createNotification({
      tripId: payload.tripId,
      title: 'Novo evento na agenda',
      message: payload.title,
      type: 'agenda',
      relatedId: eventRef.id,
      createdBy: payload.createdBy,
      targetUsers: [],
    })
  }

  if (Number(payload.actualCost ?? 0) > 0) {
    await syncAgendaActualExpense({
      tripId: payload.tripId,
      agendaId: eventRef.id,
      title: payload.title,
      city: payload.city,
      local: payload.local,
      category: payload.expenseCategory,
      actualCost: payload.actualCost,
      date: payload.date,
      createdBy: payload.createdBy,
    })
  }

  return { ...payload, createdAt: new Date(), updatedAt: new Date() }
}

export async function getAgendaByTrip(tripId) {
  return new Promise((resolve, reject) => {
    const unsubscribe = subscribeAgendaByTrip(
      tripId,
      (agendaItems) => {
        resolve(agendaItems)
        unsubscribe()
      },
      reject,
    )
  })
}

export function subscribeAgendaByTrip(tripId, callback, onError) {
  const agendaQuery = query(agendaCollection(), where('tripId', '==', tripId))
  return subscribeToQuery(
    agendaQuery,
    (snapshot) =>
      snapshot.docs
        .map((agendaDoc) => mapAgendaItem(agendaDoc.id, agendaDoc.data()))
        .sort(compareEventChronology),
    callback,
    onError,
  )
}

export async function updateAgendaEvent(id, data) {
  const eventRef = doc(agendaCollection(), id)
  const currentSnapshot = await getDoc(eventRef)
  const currentData = currentSnapshot.exists() ? currentSnapshot.data() : {}
  const imageFile = data.imageFile ?? null
  const currentImagePath = data.currentImagePath ?? ''
  const payload = { ...data }

  delete payload.imageFile
  delete payload.currentImagePath

  const locationData = await enrichAgendaLocationData(payload)

  if (imageFile && data.tripId) {
    const uploadedImage = await uploadAgendaEventImage(data.tripId, id, imageFile)
    payload.image = uploadedImage.image
    payload.imagePath = uploadedImage.imagePath

    if (currentImagePath) {
      await deleteObject(ref(storage, currentImagePath)).catch(() => null)
    }
  }

  const actualExpenseId = await syncAgendaActualExpense({
    tripId: payload.tripId,
    agendaId: id,
    title: payload.title,
      city: payload.city,
      local: payload.local,
    category: payload.expenseCategory,
    actualCost: payload.actualCost,
    date: payload.date,
    createdBy: payload.createdBy,
  })

  let alarmId = currentData.alarmId ?? payload.alarmId ?? ''

  if (payload.type === 'alarme') {
    alarmId = await syncAlarmFromAgendaEvent({
      ...currentData,
      ...payload,
      id,
    })
  } else if (currentData.type === 'alarme' || currentData.alarmId) {
    await deleteAlarmByAgendaEventId(id)
    alarmId = ''
  }

  await updateDoc(eventRef, {
    ...payload,
    mapX: locationData.mapX,
    mapY: locationData.mapY,
    mapQuery: locationData.mapQuery,
    latitude: locationData.latitude,
    longitude: locationData.longitude,
    alarmId,
    actualExpenseId,
    updatedAt: serverTimestamp(),
  })
}

export async function deleteAgendaEvent(id) {
  const eventRef = doc(agendaCollection(), id)
  const snapshot = await getDoc(eventRef)

  if (snapshot.exists()) {
    const eventData = snapshot.data()

    if (eventData.imagePath && storage) {
      await deleteObject(ref(storage, eventData.imagePath)).catch(() => null)
    }
  }

  await deleteAlarmByAgendaEventId(id)
  await deleteAgendaActualExpense(id)
  await deleteDoc(eventRef)
}

export async function importAgendaBatch({ tripId, createdBy, agendaItems, replaceExisting = false }) {
  const batch = writeBatch(db)

  if (replaceExisting) {
    const existingAgendaSnapshot = await getDocs(query(agendaCollection(), where('tripId', '==', tripId)))
    existingAgendaSnapshot.docs.forEach((agendaDoc) => {
      batch.delete(agendaDoc.ref)
    })
  }

  const enrichedItems = await Promise.all(
    agendaItems.map(async (item) => ({
      ...item,
      ...(await enrichAgendaLocationData(item)),
    })),
  )

  enrichedItems.forEach((item) => {
    const eventRef = doc(agendaCollection())
    batch.set(eventRef, {
      id: eventRef.id,
      tripId,
      title: item.title,
      description: item.description ?? '',
      weekday: item.weekday ?? '',
      city: item.city ?? '',
      local: item.local ?? '',
      address: item.address ?? '',
      postalCode: item.postalCode ?? '',
      date: item.date,
      startTime: item.startTime ?? '',
      endTime: item.endTime ?? '',
      estimatedCost: Number(item.estimatedCost ?? 0),
      actualCost: Number(item.actualCost ?? 0),
      catRating: Number(item.catRating ?? 0),
      expenseCategory: item.expenseCategory ?? 'Outros',
      location: item.location ?? '',
      link: item.link ?? '',
      image: getDefaultEventImage({
        title: item.title,
        description: item.description,
        location: item.location,
        image: item.image,
      }),
      imagePath: item.imagePath ?? '',
      mapX: item.mapX ?? '',
      mapY: item.mapY ?? '',
      mapQuery: item.mapQuery ?? '',
      latitude: item.latitude ?? '',
      longitude: item.longitude ?? '',
      type: item.type ?? 'evento',
      relatedId: item.relatedId ?? '',
      importSource: 'spreadsheet',
      importSheetName: item.sheetName ?? '',
      importKey: item.importKey ?? '',
      createdBy,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })
  })

  await batch.commit()

  if (enrichedItems.length > 0) {
    await createNotification({
      tripId,
      title: 'Agenda importada da planilha',
      message: `${enrichedItems.length} evento(s) atualizado(s) na viagem.`,
      type: 'agenda',
      relatedId: '',
      createdBy,
      targetUsers: [],
    })
  }

  return enrichedItems.length
}

export async function clearImportedAgendaByTrip(tripId) {
  ensureFirebaseConfigured()

  if (!tripId) {
    return { deletedCount: 0, usedFallback: false }
  }

  const snapshot = await getDocs(query(agendaCollection(), where('tripId', '==', tripId)))
  const docs = snapshot.docs
  const importedDocs = docs.filter((agendaDoc) => {
    const data = agendaDoc.data()
    return data.importSource === 'spreadsheet' || Boolean(data.importSheetName) || Boolean(data.importKey)
  })

  const docsToDelete = importedDocs.length > 0 ? importedDocs : docs
  const usedFallback = importedDocs.length === 0 && docs.length > 0

  for (const agendaDoc of docsToDelete) {
    await deleteAgendaActualExpense(agendaDoc.id)
  }

  for (let index = 0; index < docsToDelete.length; index += 400) {
    const batch = writeBatch(db)
    docsToDelete.slice(index, index + 400).forEach((agendaDoc) => {
      batch.delete(agendaDoc.ref)
    })
    await batch.commit()
  }

  return {
    deletedCount: docsToDelete.length,
    usedFallback,
  }
}

export async function normalizeAgendaTimesForTrip(tripId) {
  ensureFirebaseConfigured()

  if (!tripId) {
    return 0
  }

  const snapshot = await getDocs(query(agendaCollection(), where('tripId', '==', tripId)))
  const updates = snapshot.docs
    .map((agendaDoc) => {
      const data = agendaDoc.data()
      const normalizedStartTime = applyAgendaTimeHeuristics(data.startTime ?? data.time ?? data.hora ?? '', data)
      const normalizedEndTime = normalizeDisplayTime(data.endTime ?? '')
      const nextPayload = {}

      if (normalizedStartTime && normalizedStartTime !== (data.startTime ?? '')) {
        nextPayload.startTime = normalizedStartTime
      }

      if (normalizedEndTime && normalizedEndTime !== (data.endTime ?? '')) {
        nextPayload.endTime = normalizedEndTime
      }

      if (!Object.keys(nextPayload).length) {
        return null
      }

      return {
        ref: agendaDoc.ref,
        payload: {
          ...nextPayload,
          updatedAt: serverTimestamp(),
        },
      }
    })
    .filter(Boolean)

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

export async function normalizeAgendaLocationsForTrip(tripId) {
  ensureFirebaseConfigured()

  if (!tripId) {
    return 0
  }

  const snapshot = await getDocs(query(agendaCollection(), where('tripId', '==', tripId)))
  const updates = await Promise.all(
    snapshot.docs.map(async (agendaDoc) => {
      const data = agendaDoc.data()
      const locationData = await enrichAgendaLocationData(data)

      return {
        ref: agendaDoc.ref,
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

export async function normalizeImportedAgendaValuesForTrip(tripId) {
  ensureFirebaseConfigured()

  if (!tripId) {
    return { updatedCount: 0, usedFallback: false }
  }

  const snapshot = await getDocs(query(agendaCollection(), where('tripId', '==', tripId)))
  const docs = snapshot.docs
  const importedDocs = docs.filter((agendaDoc) => {
    const data = agendaDoc.data()
    return data.importSource === 'spreadsheet' || Boolean(data.importSheetName) || Boolean(data.importKey)
  })

  const docsToCheck = importedDocs.length > 0 ? importedDocs : docs
  const updates = docsToCheck
    .map((agendaDoc) => {
      const data = agendaDoc.data()
      const estimatedCost = Number(data.estimatedCost ?? 0)
      const actualCost = Number(data.actualCost ?? 0)
      const payload = {}

      if (Number.isInteger(estimatedCost) && Math.abs(estimatedCost) >= 1000) {
        payload.estimatedCost = estimatedCost / 100
      }

      if (Number.isInteger(actualCost) && Math.abs(actualCost) >= 1000) {
        payload.actualCost = actualCost / 100
      }

      if (!Object.keys(payload).length) {
        return null
      }

      return {
        ref: agendaDoc.ref,
        payload: {
          ...payload,
          updatedAt: serverTimestamp(),
        },
      }
    })
    .filter(Boolean)

  for (let index = 0; index < updates.length; index += 400) {
    const batch = writeBatch(db)
    updates.slice(index, index + 400).forEach((item) => {
      batch.update(item.ref, item.payload)
    })
    await batch.commit()
  }

  return {
    updatedCount: updates.length,
    usedFallback: importedDocs.length === 0 && updates.length > 0,
  }
}
