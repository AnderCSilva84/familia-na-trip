import { collection, deleteDoc, doc, query, serverTimestamp, setDoc, updateDoc, where } from 'firebase/firestore'
import { db, ensureFirebaseConfigured } from '../firebase/config'
import { subscribeToQuery } from './firestoreRealtime'

function itemsCollection() { ensureFirebaseConfigured(); return collection(db, 'travelChecklist') }

export function subscribeChecklist(tripId, callback, onError) {
  return subscribeToQuery(query(itemsCollection(), where('tripId', '==', tripId)), (snapshot) => callback(snapshot.docs.map((entry) => ({ id: entry.id, ...entry.data() })).sort((a, b) => Number(a.done) - Number(b.done) || String(a.dueDate ?? '').localeCompare(String(b.dueDate ?? '')))), onError)
}

export async function createChecklistItem(data) {
  const itemRef = doc(itemsCollection())
  const payload = { ...data, id: itemRef.id, done: false, doneBy: '', doneAt: null, createdAt: serverTimestamp(), updatedAt: serverTimestamp() }
  await setDoc(itemRef, payload); return payload
}

export async function updateChecklistItem(id, data) { await updateDoc(doc(itemsCollection(), id), { ...data, updatedAt: serverTimestamp() }) }
export async function toggleChecklistItem(id, done, userId) { await updateChecklistItem(id, { done, doneBy: done ? userId : '', doneAt: done ? serverTimestamp() : null }) }
export async function deleteChecklistItem(id) { await deleteDoc(doc(itemsCollection(), id)) }
