import { useEffect, useState } from 'react'
import useAppStore from '../store/useAppStore'
import { canUseMockFallback } from '../utils/runtimeMode'
import {
  createEmergencyContact,
  deleteEmergencyContact,
  subscribeEmergencyByTrip,
  updateEmergencyContact,
} from '../services/emergencyService'

function useEmergencyContacts() {
  const trip = useAppStore((state) => state.trip)
  const userProfile = useAppStore((state) => state.userProfile)
  const [contacts, setContacts] = useState([])
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

    return subscribeEmergencyByTrip(
      trip.id,
      (data) => {
        setContacts(data)
        setLoading(false)
      },
      (loadError) => {
        setContacts([])
        setLoading(false)
        setError(loadError.message ?? 'Nao foi possivel carregar os hospitais de emergencia.')
      },
    )
  }, [trip?.id, usingMockData])

  async function create(data) {
    await createEmergencyContact({
      ...data,
      tripId: trip.id,
      createdBy: userProfile.uid,
    })
  }

  async function update(id, data) {
    await updateEmergencyContact(id, data)
  }

  async function remove(id) {
    await deleteEmergencyContact(id)
  }

  return {
    contacts,
    loading: trip?.id && !usingMockData ? loading : false,
    error,
    usingMockData,
    create,
    update,
    delete: remove,
  }
}

export default useEmergencyContacts
