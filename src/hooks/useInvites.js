import { useEffect, useState } from 'react'
import useAppStore from '../store/useAppStore'
import { canUseMockFallback } from '../utils/runtimeMode'
import {
  createInvite as createInviteService,
  deleteInvite as deleteInviteService,
  subscribeInvitesByTrip,
} from '../services/inviteService'

function useInvites() {
  const trip = useAppStore((state) => state.trip)
  const userProfile = useAppStore((state) => state.userProfile)
  const [invites, setInvites] = useState([])
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

    const unsubscribe = subscribeInvitesByTrip(
      trip.id,
      (nextInvites) => {
        setInvites(nextInvites)
        setLoading(false)
      },
      (loadError) => {
        setError(loadError.message ?? 'Nao foi possivel carregar os convites.')
        setInvites([])
        setLoading(false)
      },
    )

    return unsubscribe
  }, [trip?.id, usingMockData])

  async function createInvite(data) {
    setError('')
    await createInviteService({
      ...data,
      tripId: trip.id,
      createdBy: userProfile.uid,
    })
  }

  async function deleteInvite(inviteId) {
    setError('')
    await deleteInviteService(inviteId)
  }

  return {
    invites,
    loading: trip?.id && !usingMockData ? loading : false,
    error,
    usingMockData,
    createInvite,
    deleteInvite,
  }
}

export default useInvites
