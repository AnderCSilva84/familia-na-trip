import { useEffect, useMemo, useState } from 'react'
import useAppStore from '../store/useAppStore'
import {
  calculateDistanceSummary,
  createDistance,
  deleteDistance,
  subscribeDistancesByTrip,
  updateDistanceKilometers,
} from '../services/distanceService'

function useDistances() {
  const trip = useAppStore((state) => state.trip)
  const userProfile = useAppStore((state) => state.userProfile)
  const [distances, setDistances] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    if (!trip?.id) return () => {}
    queueMicrotask(() => setLoading(true))
    return subscribeDistancesByTrip(trip.id, (items) => {
      setDistances(items)
      setLoading(false)
    }, (loadError) => {
      setError(loadError.message ?? 'Não foi possível carregar as distâncias.')
      setLoading(false)
    })
  }, [trip?.id])

  useEffect(() => {
    const timerId = window.setInterval(() => setNow(Date.now()), 60 * 1000)
    return () => window.clearInterval(timerId)
  }, [])

  return {
    distances,
    summary: useMemo(() => calculateDistanceSummary(distances, now), [distances, now]),
    loading,
    error,
    create: (data) => createDistance({ ...data, tripId: trip.id, createdBy: userProfile.uid }),
    updateKilometers: updateDistanceKilometers,
    remove: deleteDistance,
  }
}

export default useDistances
