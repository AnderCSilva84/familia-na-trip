import {
  collection,
  deleteDoc,
  doc,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore'
import { db, ensureFirebaseConfigured } from '../firebase/config'
import { queueNotification } from './notificationService'
import { subscribeToQuery } from './firestoreRealtime'

function pollsCollection() {
  ensureFirebaseConfigured()
  return collection(db, 'polls')
}

function mapPoll(id, data) {
  return {
    id,
    tripId: data.tripId ?? '',
    question: data.question ?? '',
    options: data.options ?? [],
    votes: data.votes ?? {},
    active: data.active ?? true,
    allowMultipleVotes: data.allowMultipleVotes ?? false,
    createdBy: data.createdBy ?? '',
    createdAt: data.createdAt ?? null,
    updatedAt: data.updatedAt ?? null,
  }
}

export async function createPoll(data) {
  const pollRef = doc(pollsCollection())
  const payload = {
    id: pollRef.id,
    tripId: data.tripId,
    question: data.question,
    options: data.options ?? [],
    votes: data.votes ?? {},
    active: data.active ?? true,
    allowMultipleVotes: data.allowMultipleVotes ?? false,
    createdBy: data.createdBy,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  }

  await setDoc(pollRef, payload)
  queueNotification({
    tripId: payload.tripId,
    title: 'Nova enquete disponivel',
    message: payload.question,
    type: 'enquete',
    relatedId: pollRef.id,
    createdBy: payload.createdBy,
    targetUsers: [],
  })

  return { ...payload, createdAt: new Date(), updatedAt: new Date() }
}

export async function getPollsByTrip(tripId) {
  return new Promise((resolve, reject) => {
    const unsubscribe = subscribePollsByTrip(
      tripId,
      (polls) => {
        resolve(polls)
        unsubscribe()
      },
      reject,
    )
  })
}

export function subscribePollsByTrip(tripId, callback, onError) {
  const pollsQuery = query(pollsCollection(), where('tripId', '==', tripId))
  return subscribeToQuery(
    pollsQuery,
    (snapshot) =>
      snapshot.docs
        .map((pollDoc) => mapPoll(pollDoc.id, pollDoc.data()))
        .sort((left, right) => {
          const leftDate =
            typeof left.createdAt?.toDate === 'function' ? left.createdAt.toDate() : new Date(0)
          const rightDate =
            typeof right.createdAt?.toDate === 'function'
              ? right.createdAt.toDate()
              : new Date(0)
          return rightDate - leftDate
        }),
    callback,
    onError,
  )
}

export async function votePoll(pollId, optionId, userId) {
  const pollRef = doc(pollsCollection(), pollId)

  await runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(pollRef)

    if (!snapshot.exists()) {
      throw new Error('Enquete nao encontrada.')
    }

    const poll = snapshot.data()

    if (poll.active === false) {
      throw new Error('Essa enquete esta fechada.')
    }

    const nextVotes = { ...(poll.votes ?? {}) }

    if (poll.allowMultipleVotes) {
      const currentVotes = nextVotes[optionId] ?? []
      nextVotes[optionId] = currentVotes.includes(userId)
        ? currentVotes.filter((id) => id !== userId)
        : [...currentVotes, userId]
    } else {
      Object.keys(nextVotes).forEach((key) => {
        nextVotes[key] = (nextVotes[key] ?? []).filter((id) => id !== userId)
      })

      const currentVotes = nextVotes[optionId] ?? []
      nextVotes[optionId] = currentVotes.includes(userId) ? currentVotes : [...currentVotes, userId]
    }

    transaction.update(pollRef, {
      votes: nextVotes,
      updatedAt: serverTimestamp(),
    })
  })
}

export async function closePoll(pollId) {
  const pollRef = doc(pollsCollection(), pollId)
  await updateDoc(pollRef, {
    active: false,
    updatedAt: serverTimestamp(),
  })
}

export async function reopenPoll(pollId) {
  const pollRef = doc(pollsCollection(), pollId)
  await updateDoc(pollRef, {
    active: true,
    updatedAt: serverTimestamp(),
  })
}

export async function deletePoll(pollId) {
  const pollRef = doc(pollsCollection(), pollId)
  await deleteDoc(pollRef)
}
