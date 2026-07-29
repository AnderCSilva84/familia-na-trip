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
import { queueNotification } from './notificationService'
import { subscribeToQuery } from './firestoreRealtime'

function tipsCollection() {
  ensureFirebaseConfigured()
  return collection(db, 'tips')
}

function mapTip(id, data) {
  return {
    id,
    tripId: data.tripId ?? '',
    title: data.title ?? '',
    description: data.description ?? '',
    category: data.category ?? 'Outros',
    location: data.location ?? '',
    link: data.link ?? '',
    mapX: data.mapX ?? '',
    mapY: data.mapY ?? '',
    importSource: data.importSource ?? '',
    importSheetName: data.importSheetName ?? '',
    importKey: data.importKey ?? '',
    createdBy: data.createdBy ?? '',
    createdAt: data.createdAt ?? null,
    updatedAt: data.updatedAt ?? null,
  }
}

export async function createTip(data) {
  const tipRef = doc(tipsCollection())
  const payload = {
    id: tipRef.id,
    tripId: data.tripId,
    title: data.title,
    description: data.description ?? '',
    category: data.category ?? 'Outros',
    location: data.location ?? '',
    link: data.link ?? '',
    mapX: data.mapX ?? '',
    mapY: data.mapY ?? '',
    createdBy: data.createdBy,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  }

  await setDoc(tipRef, payload)
  return { ...payload, createdAt: new Date(), updatedAt: new Date() }
}

export async function getTipsByTrip(tripId) {
  return new Promise((resolve, reject) => {
    const unsubscribe = subscribeTipsByTrip(
      tripId,
      (tips) => {
        resolve(tips)
        unsubscribe()
      },
      reject,
    )
  })
}

export function subscribeTipsByTrip(tripId, callback, onError) {
  const tipsQuery = query(tipsCollection(), where('tripId', '==', tripId))
  return subscribeToQuery(
    tipsQuery,
    (snapshot) =>
      snapshot.docs
        .map((tipDoc) => mapTip(tipDoc.id, tipDoc.data()))
        .sort((left, right) => `${right.title}`.localeCompare(`${left.title}`)),
    callback,
    onError,
  )
}

export async function updateTip(id, data) {
  const tipRef = doc(tipsCollection(), id)
  await updateDoc(tipRef, {
    ...data,
    updatedAt: serverTimestamp(),
  })
}

export async function deleteTip(id) {
  const tipRef = doc(tipsCollection(), id)
  await deleteDoc(tipRef)
}

export async function importTipsBatch({ tripId, createdBy, tips, replaceExisting = false }) {
  const batch = writeBatch(db)

  if (replaceExisting) {
    const existingTipsSnapshot = await getDocs(query(tipsCollection(), where('tripId', '==', tripId)))
    existingTipsSnapshot.docs.forEach((tipDoc) => {
      batch.delete(tipDoc.ref)
    })
  }

  tips.forEach((tip) => {
    const tipRef = doc(tipsCollection())
    batch.set(tipRef, {
      id: tipRef.id,
      tripId,
      title: tip.title,
      description: tip.description ?? '',
      category: tip.category ?? 'Outros',
      location: tip.location ?? '',
      link: tip.link ?? '',
      mapX: tip.mapX ?? '',
      mapY: tip.mapY ?? '',
      importSource: 'spreadsheet',
      importSheetName: tip.sheetName ?? '',
      importKey: tip.importKey ?? '',
      createdBy,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })
  })

  await batch.commit()

  if (tips.length) {
    queueNotification({
      tripId,
      title: 'Dicas importadas',
      message: `${tips.length} dica(s) sincronizada(s) da planilha oficial.`,
      type: 'info',
      relatedId: '',
      createdBy,
      targetUsers: [],
    })
  }

  return tips.length
}

export async function clearImportedTipsByTrip(tripId) {
  ensureFirebaseConfigured()

  if (!tripId) {
    return { deletedCount: 0, usedFallback: false }
  }

  const snapshot = await getDocs(query(tipsCollection(), where('tripId', '==', tripId)))
  const docs = snapshot.docs
  const importedDocs = docs.filter((tipDoc) => {
    const data = tipDoc.data()
    return data.importSource === 'spreadsheet' || Boolean(data.importSheetName) || Boolean(data.importKey)
  })

  const docsToDelete = importedDocs.length > 0 ? importedDocs : docs
  const usedFallback = importedDocs.length === 0 && docs.length > 0

  for (let index = 0; index < docsToDelete.length; index += 400) {
    const batch = writeBatch(db)
    docsToDelete.slice(index, index + 400).forEach((tipDoc) => {
      batch.delete(tipDoc.ref)
    })
    await batch.commit()
  }

  return {
    deletedCount: docsToDelete.length,
    usedFallback,
  }
}
