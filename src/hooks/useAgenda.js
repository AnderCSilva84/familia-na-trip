import { useCallback, useEffect, useState } from 'react'
import { mockData } from '../data/mockData'
import useAppStore from '../store/useAppStore'
import { canUseMockFallback } from '../utils/runtimeMode'
import { createAgendaEvent, deleteAgendaEvent, getAgendaByTrip, settleAgendaExpense, subscribeAgendaByTrip, updateAgendaEvent } from '../services/agendaService'

function mapMockAgenda(item) {
  return {
    id: item.id,
    title: item.title,
    description: item.subtitle ?? '',
    date: '2024-06-17',
    startTime: item.time ?? '',
    endTime: '',
    location: '',
    type: 'evento',
    relatedId: '',
    createdBy: mockData.currentUser.id,
  }
}

function useAgenda() {
  const trip = useAppStore((state) => state.trip)
  const userProfile = useAppStore((state) => state.userProfile)
  const [agenda, setAgenda] = useState([])
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

    const unsubscribe = subscribeAgendaByTrip(
      trip.id,
      (data) => {
        setAgenda(data)
        setLoading(false)
      },
      (loadError) => {
        setError(loadError.message ?? 'Nao foi possivel carregar a agenda.')
        setAgenda([])
        setLoading(false)
      },
    )

    return unsubscribe
  }, [trip?.id, usingMockData])

  async function refresh() {
    if (!trip?.id) {
      setAgenda([])
      return
    }
    setAgenda(await getAgendaByTrip(trip.id))
  }

  async function create(data) {
    await createAgendaEvent(
      { ...data, tripId: trip.id, createdBy: userProfile.uid },
      data.imageFile ?? null,
    )
  }
  async function update(id, data) {
    await updateAgendaEvent(id, { ...data, tripId: trip.id })
  }
  async function remove(id) {
    await deleteAgendaEvent(id)
  }
  const updateExpense = useCallback(async (id, actualCost, options = {}) => {
    await settleAgendaExpense(id, actualCost, {
      ...options,
      createdBy: userProfile?.uid,
    })
  }, [userProfile?.uid])

  return {
    agenda: usingMockData ? mockData.agenda.map(mapMockAgenda) : agenda,
    loading: trip?.id && !usingMockData ? loading : false,
    error,
    usingMockData,
    create,
    update,
    updateExpense,
    delete: remove,
    refresh,
  }
}

export default useAgenda
