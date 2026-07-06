import { useEffect, useState } from 'react'
import { mockData } from '../data/mockData'
import useAppStore from '../store/useAppStore'
import { canUseMockFallback } from '../utils/runtimeMode'
import {
  createMember as createMemberService,
  deleteMember as deleteMemberService,
  getMembersByTrip,
  subscribeMembersByTrip,
  updateMember as updateMemberService,
} from '../services/memberService'

function useMembers() {
  const trip = useAppStore((state) => state.trip)
  const userProfile = useAppStore((state) => state.userProfile)
  const [members, setMembers] = useState([])
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

    const unsubscribe = subscribeMembersByTrip(
      trip.id,
      (nextMembers) => {
        setMembers(nextMembers)
        setLoading(false)
      },
      (loadError) => {
        setError(loadError.message ?? 'Nao foi possivel carregar os membros.')
        setMembers([])
        setLoading(false)
      },
    )

    return unsubscribe
  }, [trip?.id, usingMockData])

  async function refreshMembers() {
    if (!trip?.id) {
      setMembers([])
      return
    }
    setMembers(await getMembersByTrip(trip.id))
  }

  async function createMember(data) {
    setError('')
    await createMemberService({
      ...data,
      tripId: trip.id,
      createdBy: userProfile.uid,
    })
  }

  async function updateMember(memberId, data) {
    setError('')
    await updateMemberService(memberId, data)
  }

  async function deleteMember(memberId) {
    setError('')
    await deleteMemberService(memberId)
  }

  return {
    members: usingMockData ? mockData.members : members,
    loading: trip?.id && !usingMockData ? loading : false,
    error,
    usingMockData,
    createMember,
    updateMember,
    deleteMember,
    refreshMembers,
  }
}

export default useMembers
