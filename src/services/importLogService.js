import {
  collection,
  deleteDoc,
  doc,
  query,
  serverTimestamp,
  setDoc,
  where,
} from 'firebase/firestore'
import { deleteObject, getDownloadURL, ref, uploadBytes } from 'firebase/storage'
import { db, ensureFirebaseConfigured, storage } from '../firebase/config'
import { subscribeToQuery } from './firestoreRealtime'

function importLogsCollection() {
  ensureFirebaseConfigured()
  return collection(db, 'importLogs')
}

function mapImportLog(id, data) {
  return {
    id,
    tripId: data.tripId ?? '',
    fileName: data.fileName ?? '',
    fileUrl: data.fileUrl ?? '',
    filePath: data.filePath ?? '',
    totalRows: Number(data.totalRows ?? 0),
    agendaCount: Number(data.agendaCount ?? 0),
    expenseCount: Number(data.expenseCount ?? 0),
    tipCount: Number(data.tipCount ?? 0),
    sheetNames: data.sheetNames ?? [],
    replaceExisting: Boolean(data.replaceExisting),
    budgetValue: Number(data.budgetValue ?? 0),
    source: data.source ?? 'manual',
    createdBy: data.createdBy ?? '',
    createdAt: data.createdAt ?? null,
    updatedAt: data.updatedAt ?? null,
  }
}

function resolveTimestampValue(value) {
  if (!value) {
    return 0
  }

  if (typeof value?.toMillis === 'function') {
    return value.toMillis()
  }

  const parsed = new Date(value).getTime()
  return Number.isFinite(parsed) ? parsed : 0
}

export async function uploadImportSpreadsheet(tripId, file) {
  ensureFirebaseConfigured()

  if (!storage) {
    throw new Error('Firebase Storage indisponivel.')
  }

  const safeName = String(file?.name ?? 'importacao.xlsx').replace(/\s+/g, '-')
  const filePath = `trips/${tripId}/imports/${Date.now()}-${safeName}`
  const fileRef = ref(storage, filePath)

  await uploadBytes(fileRef, file)
  const fileUrl = await getDownloadURL(fileRef)

  return {
    filePath,
    fileUrl,
    fileName: file?.name ?? safeName,
  }
}

export async function createImportLog(data) {
  const importLogRef = doc(importLogsCollection())
  const payload = {
    id: importLogRef.id,
    tripId: data.tripId,
    fileName: data.fileName ?? '',
    fileUrl: data.fileUrl ?? '',
    filePath: data.filePath ?? '',
    totalRows: Number(data.totalRows ?? 0),
    agendaCount: Number(data.agendaCount ?? 0),
    expenseCount: Number(data.expenseCount ?? 0),
    tipCount: Number(data.tipCount ?? 0),
    sheetNames: data.sheetNames ?? [],
    replaceExisting: Boolean(data.replaceExisting),
    budgetValue: Number(data.budgetValue ?? 0),
    source: data.source ?? 'manual',
    createdBy: data.createdBy ?? '',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  }

  await setDoc(importLogRef, payload)
  return {
    ...payload,
    createdAt: new Date(),
    updatedAt: new Date(),
  }
}

export async function deleteImportLogRecord(logId, filePath = '') {
  ensureFirebaseConfigured()

  if (filePath && storage) {
    await deleteObject(ref(storage, filePath)).catch(() => null)
  }

  await deleteDoc(doc(importLogsCollection(), logId))
}

export function subscribeImportLogsByTrip(tripId, callback, onError) {
  const importLogsQuery = query(importLogsCollection(), where('tripId', '==', tripId))
  return subscribeToQuery(
    importLogsQuery,
    (snapshot) =>
      snapshot.docs
        .map((importLogDoc) => mapImportLog(importLogDoc.id, importLogDoc.data()))
        .sort((left, right) => resolveTimestampValue(right.createdAt) - resolveTimestampValue(left.createdAt)),
    callback,
    onError,
  )
}
