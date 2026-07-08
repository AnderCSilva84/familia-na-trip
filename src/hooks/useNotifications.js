import { useMemo, useState, useEffect } from 'react'
import { mockData } from '../data/mockData'
import useAppStore from '../store/useAppStore'
import { canUseMockFallback } from '../utils/runtimeMode'
import {
  deleteNotification,
  getNotificationsByUser,
  markAllNotificationsAsRead,
  markNotificationAsRead,
  subscribeNotificationsByUser,
} from '../services/notificationService'

function mapMockNotification(notification) {
  return {
    id: notification.id,
    title: notification.author,
    message: notification.text,
    type: notification.type,
    targetUsers: [],
    readBy: [],
    relatedId: '',
    createdBy: mockData.currentUser.id,
    createdAt: notification.time,
    avatar: notification.avatar,
  }
}

function useNotifications() {
  const trip = useAppStore((state) => state.trip)
  const userProfile = useAppStore((state) => state.userProfile)
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const usingMockData = canUseMockFallback()

  useEffect(() => {
    if (!trip?.id || !userProfile?.uid || usingMockData) {
      return () => {}
    }

    queueMicrotask(() => {
      setLoading(true)
      setError('')
    })

    const unsubscribe = subscribeNotificationsByUser(
      trip.id,
      userProfile,
      (data) => {
        setNotifications(data)
        setLoading(false)
      },
      (loadError) => {
        setError(loadError.message ?? 'Nao foi possivel carregar notificacoes.')
        setNotifications([])
        setLoading(false)
      },
    )

    return unsubscribe
  }, [trip?.id, userProfile, userProfile?.uid, usingMockData])

  async function refresh() {
    if (!trip?.id || !userProfile?.uid) {
      setNotifications([])
      return
    }
    setNotifications(await getNotificationsByUser(trip.id, userProfile))
  }

  async function markAsRead(id) {
    if (usingMockData) return
    await markNotificationAsRead(id, userProfile.uid)
  }
  async function markAllAsRead() {
    if (usingMockData) return
    await markAllNotificationsAsRead(trip.id, userProfile.uid)
  }
  async function remove(id) {
    if (usingMockData) return
    await deleteNotification(id)
  }

  const unreadCount = useMemo(
    () =>
      (usingMockData ? mockData.notifications.map(mapMockNotification) : notifications).filter(
        (notification) => !(notification.readBy ?? []).includes(userProfile?.uid),
      ).length,
    [notifications, userProfile?.uid, usingMockData],
  )

  return {
    notifications: usingMockData ? mockData.notifications.map(mapMockNotification) : notifications,
    unreadCount,
    loading: trip?.id && userProfile?.uid && !usingMockData ? loading : false,
    error,
    usingMockData,
    markAsRead,
    markAllAsRead,
    delete: remove,
    refresh,
  }
}

export default useNotifications
