import { useEffect, useState } from 'react'
import { mockData } from '../data/mockData'
import useAppStore from '../store/useAppStore'
import { canUseMockFallback } from '../utils/runtimeMode'
import { createAlarm, deleteAlarm, getAlarmsByTrip, subscribeAlarmsByTrip, toggleAlarm, updateAlarm } from '../services/alarmService'

function mapMockAlarm(item) {
  return {
    id: item.id,
    title: item.title,
    description: item.subtitle ?? '',
    date: '2024-06-17',
    time: item.time ?? '',
    notifyMembers: false,
    membersToNotify: [],
    active: item.active ?? true,
    createdBy: mockData.currentUser.id,
  }
}

function useAlarms() {
  const trip = useAppStore((state) => state.trip)
  const userProfile = useAppStore((state) => state.userProfile)
  const [alarms, setAlarms] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const usingMockData = canUseMockFallback()

  useEffect(() => {
    if (!trip?.id || usingMockData) {
      return () => {}
    }

    queueMicrotask(() => {
      setLoading(true)
      setError('')
    })

    const unsubscribe = subscribeAlarmsByTrip(
      trip.id,
      (data) => {
        setAlarms(data)
        setLoading(false)
      },
      (loadError) => {
        setError(loadError.message ?? 'Nao foi possivel carregar alarmes.')
        setAlarms([])
        setLoading(false)
      },
    )

    return unsubscribe
  }, [trip?.id, usingMockData])

  async function refresh() {
    if (!trip?.id) {
      setAlarms([])
      return
    }
    setAlarms(await getAlarmsByTrip(trip.id))
  }

  async function create(data) {
    await createAlarm({ ...data, tripId: trip.id, createdBy: userProfile.uid })
  }
  async function update(id, data) {
    await updateAlarm(id, data)
  }
  async function remove(id) {
    await deleteAlarm(id)
  }
  async function toggle(id, active) {
    await toggleAlarm(id, active)
  }

  return {
    alarms: usingMockData ? mockData.agenda.map(mapMockAlarm) : alarms,
    loading: trip?.id && !usingMockData ? loading : false,
    error,
    usingMockData,
    create,
    update,
    delete: remove,
    toggle,
    refresh,
  }
}

export default useAlarms
