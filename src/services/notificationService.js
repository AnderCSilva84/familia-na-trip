import {
  arrayUnion,
  collection,
  deleteDoc,
  doc,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore'
import { db, ensureFirebaseConfigured } from '../firebase/config'
import { subscribeToQuery } from './firestoreRealtime'

function notificationsCollection() {
  ensureFirebaseConfigured()
  return collection(db, 'notifications')
}

function mapNotification(id, data) {
  return {
    id,
    tripId: data.tripId ?? '',
    title: data.title ?? '',
    message: data.message ?? '',
    type: data.type ?? 'info',
    targetUsers: data.targetUsers ?? [],
    readBy: data.readBy ?? [],
    relatedId: data.relatedId ?? '',
    createdBy: data.createdBy ?? '',
    createdAt: data.createdAt ?? null,
  }
}

export async function createNotification(data) {
  const notificationRef = doc(notificationsCollection())
  const payload = {
    id: notificationRef.id,
    tripId: data.tripId,
    title: data.title,
    message: data.message,
    type: data.type ?? 'info',
    targetUsers: data.targetUsers ?? [],
    readBy: data.readBy ?? [],
    relatedId: data.relatedId ?? '',
    createdBy: data.createdBy ?? '',
    createdAt: serverTimestamp(),
  }

  await setDoc(notificationRef, payload)
  return { ...payload, createdAt: new Date() }
}

export async function getNotificationsByUser(tripId, userId) {
  return new Promise((resolve, reject) => {
    const unsubscribe = subscribeNotificationsByUser(
      tripId,
      userId,
      (notifications) => {
        resolve(notifications)
        unsubscribe()
      },
      reject,
    )
  })
}

export function subscribeNotificationsByUser(tripId, userId, callback, onError) {
  const notificationsQuery = query(notificationsCollection(), where('tripId', '==', tripId))
  return subscribeToQuery(
    notificationsQuery,
    (snapshot) =>
      snapshot.docs
        .map((notificationDoc) => mapNotification(notificationDoc.id, notificationDoc.data()))
        .filter(
          (notification) =>
            notification.targetUsers.length === 0 || notification.targetUsers.includes(userId),
        )
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

export async function markNotificationAsRead(notificationId, userId) {
  const notificationRef = doc(notificationsCollection(), notificationId)
  await updateDoc(notificationRef, {
    readBy: arrayUnion(userId),
  })
}

export async function markAllNotificationsAsRead(tripId, userId) {
  const notifications = await getNotificationsByUser(tripId, userId)
  await Promise.all(
    notifications
      .filter((notification) => !notification.readBy.includes(userId))
      .map((notification) => markNotificationAsRead(notification.id, userId)),
  )
}

export async function deleteNotification(notificationId) {
  const notificationRef = doc(notificationsCollection(), notificationId)
  await deleteDoc(notificationRef)
}
