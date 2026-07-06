import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore'
import { deleteObject, getDownloadURL, ref, uploadBytes } from 'firebase/storage'
import { db, ensureFirebaseConfigured, storage } from '../firebase/config'
import { subscribeToQuery } from './firestoreRealtime'

function diaryCollection() {
  ensureFirebaseConfigured()
  return collection(db, 'diary')
}

function mapDiaryEntry(id, data) {
  return {
    id,
    tripId: data.tripId ?? '',
    title: data.title ?? '',
    content: data.content ?? '',
    date: data.date ?? '',
    photos: data.photos ?? [],
    createdBy: data.createdBy ?? '',
    createdAt: data.createdAt ?? null,
    updatedAt: data.updatedAt ?? null,
  }
}

export async function uploadDiaryPhotos(tripId, diaryId, files) {
  ensureFirebaseConfigured()

  if (!storage) {
    throw new Error('Firebase Storage indisponivel.')
  }

  const uploads = await Promise.all(
    files.map(async (file) => {
      const filePath = `trips/${tripId}/diary/${diaryId}/${Date.now()}-${file.name}`
      const fileRef = ref(storage, filePath)
      await uploadBytes(fileRef, file)
      const url = await getDownloadURL(fileRef)

      return {
        name: file.name,
        path: filePath,
        url,
      }
    }),
  )

  return uploads
}

export async function createDiaryEntry(data, files = []) {
  const diaryRef = doc(diaryCollection())
  const uploads = files.length ? await uploadDiaryPhotos(data.tripId, diaryRef.id, files) : []
  const payload = {
    id: diaryRef.id,
    tripId: data.tripId,
    title: data.title,
    content: data.content ?? '',
    date: data.date,
    photos: uploads,
    createdBy: data.createdBy,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  }

  await setDoc(diaryRef, payload)
  return { ...payload, createdAt: new Date(), updatedAt: new Date() }
}

export async function getDiaryByTrip(tripId) {
  return new Promise((resolve, reject) => {
    const unsubscribe = subscribeDiaryByTrip(
      tripId,
      (entries) => {
        resolve(entries)
        unsubscribe()
      },
      reject,
    )
  })
}

export function subscribeDiaryByTrip(tripId, callback, onError) {
  const diaryQuery = query(diaryCollection(), where('tripId', '==', tripId))
  return subscribeToQuery(
    diaryQuery,
    (snapshot) =>
      snapshot.docs
        .map((entryDoc) => mapDiaryEntry(entryDoc.id, entryDoc.data()))
        .sort((left, right) => `${right.date}`.localeCompare(`${left.date}`)),
    callback,
    onError,
  )
}

export async function updateDiaryEntry(id, data, files = []) {
  const diaryRef = doc(diaryCollection(), id)
  const currentSnapshot = await getDoc(diaryRef)
  const currentData = currentSnapshot.exists() ? currentSnapshot.data() : {}
  const existingPhotos = currentData.photos ?? []
  const uploads = files.length ? await uploadDiaryPhotos(data.tripId, id, files) : []

  await updateDoc(diaryRef, {
    ...data,
    photos: [...existingPhotos, ...uploads],
    updatedAt: serverTimestamp(),
  })
}

export async function deleteDiaryEntry(id) {
  const diaryRef = doc(diaryCollection(), id)
  const snapshot = await getDoc(diaryRef)

  if (snapshot.exists() && storage) {
    const { photos = [] } = snapshot.data()
    await Promise.all(
      photos
        .filter((photo) => photo.path)
        .map((photo) => deleteObject(ref(storage, photo.path)).catch(() => null)),
    )
  }

  await deleteDoc(diaryRef)
}
