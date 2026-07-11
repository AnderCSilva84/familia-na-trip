import { collection, deleteDoc, doc, getDoc, query, serverTimestamp, setDoc, where } from 'firebase/firestore'
import { deleteObject, getDownloadURL, ref, uploadBytes } from 'firebase/storage'
import { db, ensureFirebaseConfigured, storage } from '../firebase/config'
import { subscribeToQuery } from './firestoreRealtime'

function walletCollection() {
  ensureFirebaseConfigured()
  return collection(db, 'walletDocuments')
}

function mapDocument(id, data) {
  return { id, ...data, name: data.name ?? '', category: data.category ?? 'outros' }
}

export function subscribeWalletDocuments(tripId, callback, onError) {
  const walletQuery = query(walletCollection(), where('tripId', '==', tripId))
  return subscribeToQuery(
    walletQuery,
    (snapshot) => snapshot.docs.map((item) => mapDocument(item.id, item.data()))
      .sort((a, b) => String(b.createdAt?.seconds ?? 0).localeCompare(String(a.createdAt?.seconds ?? 0))),
    callback,
    onError,
  )
}

export async function createWalletDocument(data, file) {
  ensureFirebaseConfigured()
  if (!storage) throw new Error('Firebase Storage indisponivel.')
  if (!file || file.type !== 'application/pdf') throw new Error('Selecione um arquivo PDF valido.')
  if (file.size > 15 * 1024 * 1024) throw new Error('O PDF deve ter no maximo 15 MB.')

  const documentRef = doc(walletCollection())
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '-')
  const path = `trips/${data.tripId}/wallet/${documentRef.id}/${safeName}`
  const fileRef = ref(storage, path)
  await uploadBytes(fileRef, file, { contentType: 'application/pdf' })
  const url = await getDownloadURL(fileRef)
  const payload = { ...data, id: documentRef.id, fileName: file.name, size: file.size, path, url, createdAt: serverTimestamp() }
  await setDoc(documentRef, payload)
  return payload
}

export async function deleteWalletDocument(id) {
  const documentRef = doc(walletCollection(), id)
  const snapshot = await getDoc(documentRef)
  if (snapshot.exists() && snapshot.data().path && storage) {
    await deleteObject(ref(storage, snapshot.data().path)).catch(() => null)
  }
  await deleteDoc(documentRef)
}
