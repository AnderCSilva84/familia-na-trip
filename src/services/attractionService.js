import { collection, deleteDoc, doc, getDocs, query, serverTimestamp, setDoc, updateDoc, where } from 'firebase/firestore'
import { db, ensureFirebaseConfigured } from '../firebase/config'
import { subscribeToQuery } from './firestoreRealtime'

function attractionsCollection() {
  ensureFirebaseConfigured()
  return collection(db, 'attractions')
}

function mapAttraction(id, data) {
  return {
    id,
    tripId: data.tripId ?? '',
    name: data.name ?? '',
    city: data.city ?? '',
    category: data.category ?? 'ponto_turistico',
    description: data.description ?? '',
    address: data.address ?? '',
    link: data.link ?? '',
    image: data.image ?? '',
    sourceItineraryId: data.sourceItineraryId ?? '',
    sourceAgendaId: data.sourceAgendaId ?? '',
    visited: Boolean(data.visited),
    visitedBy: data.visitedBy ?? '',
    visitedAt: data.visitedAt ?? null,
    createdBy: data.createdBy ?? '',
    createdAt: data.createdAt ?? null,
    updatedAt: data.updatedAt ?? null,
  }
}

export function subscribeAttractions(tripId, callback, onError) {
  const attractionsQuery = query(attractionsCollection(), where('tripId', '==', tripId))
  return subscribeToQuery(
    attractionsQuery,
    (snapshot) => callback(
      snapshot.docs
        .map((entry) => mapAttraction(entry.id, entry.data()))
        .sort((left, right) => left.city.localeCompare(right.city) || left.name.localeCompare(right.name)),
    ),
    onError,
  )
}

export async function createAttraction(data) {
  const attractionRef = doc(attractionsCollection())
  const payload = {
    ...data,
    id: attractionRef.id,
    visited: false,
    visitedBy: '',
    visitedAt: null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  }
  await setDoc(attractionRef, payload)
  return payload
}

export async function updateAttraction(id, data) {
  await updateDoc(doc(attractionsCollection(), id), { ...data, updatedAt: serverTimestamp() })
}

export async function toggleAttractionVisited(id, visited, userId) {
  await updateAttraction(id, {
    visited,
    visitedBy: visited ? userId : '',
    visitedAt: visited ? serverTimestamp() : null,
  })
}

export async function deleteAttraction(id) {
  await deleteDoc(doc(attractionsCollection(), id))
}

async function findAttractionByAgendaId(agendaId) {
  const snapshot = await getDocs(query(attractionsCollection(), where('sourceAgendaId', '==', agendaId)))
  return snapshot.docs[0] ?? null
}

export async function syncAttractionFromAgenda(agendaItem) {
  const existing = await findAttractionByAgendaId(agendaItem.id)
  const payload = {
    tripId: agendaItem.tripId,
    name: agendaItem.title,
    city: agendaItem.city || agendaItem.location || 'Cidade nao informada',
    category: 'ponto_turistico',
    description: agendaItem.description || '',
    address: agendaItem.address || '',
    link: agendaItem.link || '',
    image: agendaItem.image || '',
    sourceAgendaId: agendaItem.id,
    createdBy: agendaItem.createdBy,
  }

  if (existing) {
    await updateAttraction(existing.id, payload)
    return existing.id
  }

  const created = await createAttraction(payload)
  return created.id
}

export async function deleteAttractionByAgendaId(agendaId) {
  const existing = await findAttractionByAgendaId(agendaId)
  if (existing) await deleteDoc(existing.ref)
}
