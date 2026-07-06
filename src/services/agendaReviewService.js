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
import { db, ensureFirebaseConfigured } from '../firebase/config'
import { subscribeToQuery } from './firestoreRealtime'

function reviewsCollection() {
  ensureFirebaseConfigured()
  return collection(db, 'agendaReviews')
}

function mapReview(id, data) {
  return {
    id,
    tripId: data.tripId ?? '',
    eventId: data.eventId ?? '',
    eventTitle: data.eventTitle ?? '',
    eventDate: data.eventDate ?? '',
    eventImage: data.eventImage ?? '',
    userId: data.userId ?? '',
    userName: data.userName ?? 'Membro da familia',
    userAvatar: data.userAvatar ?? '',
    actualCost: Number(data.actualCost ?? 0),
    rating: Number(data.rating ?? 0),
    note: data.note ?? '',
    likes: data.likes ?? [],
    comments: data.comments ?? [],
    createdAt: data.createdAt ?? null,
    updatedAt: data.updatedAt ?? null,
  }
}

function sortReviews(reviews) {
  return reviews.sort((left, right) => {
    const leftTime =
      typeof left.updatedAt?.toDate === 'function'
        ? left.updatedAt.toDate().getTime()
        : new Date(left.updatedAt ?? left.createdAt ?? 0).getTime()
    const rightTime =
      typeof right.updatedAt?.toDate === 'function'
        ? right.updatedAt.toDate().getTime()
        : new Date(right.updatedAt ?? right.createdAt ?? 0).getTime()

    return rightTime - leftTime
  })
}

export function subscribeAgendaReviewsByTrip(tripId, callback, onError) {
  const reviewsQuery = query(reviewsCollection(), where('tripId', '==', tripId))

  return subscribeToQuery(
    reviewsQuery,
    (snapshot) => sortReviews(snapshot.docs.map((reviewDoc) => mapReview(reviewDoc.id, reviewDoc.data()))),
    callback,
    onError,
  )
}

export async function createOrUpdateAgendaReview(data) {
  const reviewId = `${data.tripId}-${data.eventId}-${data.userId}`
  const reviewRef = doc(reviewsCollection(), reviewId)
  const snapshot = await getDoc(reviewRef)
  const payload = {
    id: reviewId,
    tripId: data.tripId,
    eventId: data.eventId,
    eventTitle: data.eventTitle,
    eventDate: data.eventDate ?? '',
    eventImage: data.eventImage ?? '',
    userId: data.userId,
    userName: data.userName ?? 'Membro da familia',
    userAvatar: data.userAvatar ?? '',
    actualCost: Number(data.actualCost ?? 0),
    rating: Number(data.rating ?? 0),
    note: data.note ?? '',
    updatedAt: serverTimestamp(),
  }

  if (snapshot.exists()) {
    await updateDoc(reviewRef, payload)
    return reviewId
  }

  await setDoc(reviewRef, {
    ...payload,
    likes: [],
    comments: [],
    createdAt: serverTimestamp(),
  })

  return reviewId
}

export async function toggleAgendaReviewLike(reviewId, user) {
  const reviewRef = doc(reviewsCollection(), reviewId)
  const snapshot = await getDoc(reviewRef)

  if (!snapshot.exists()) {
    throw new Error('Avaliacao nao encontrada.')
  }

  const data = snapshot.data()
  const currentLikes = data.likes ?? []
  const nextLikes = currentLikes.includes(user.uid)
    ? currentLikes.filter((likeId) => likeId !== user.uid)
    : [...currentLikes, user.uid]

  await updateDoc(reviewRef, {
    likes: nextLikes,
    updatedAt: serverTimestamp(),
  })
}

export async function addAgendaReviewComment(reviewId, data) {
  const reviewRef = doc(reviewsCollection(), reviewId)
  const snapshot = await getDoc(reviewRef)

  if (!snapshot.exists()) {
    throw new Error('Avaliacao nao encontrada.')
  }

  const review = snapshot.data()
  const comments = review.comments ?? []
  const nextComment = {
    id: `${Date.now()}-${data.userId}`,
    userId: data.userId,
    userName: data.userName ?? 'Membro da familia',
    userAvatar: data.userAvatar ?? '',
    text: data.text,
    createdAt: new Date().toISOString(),
  }

  await updateDoc(reviewRef, {
    comments: [...comments, nextComment],
    updatedAt: serverTimestamp(),
  })
}

export async function deleteAgendaReview(reviewId) {
  await deleteDoc(doc(reviewsCollection(), reviewId))
}
