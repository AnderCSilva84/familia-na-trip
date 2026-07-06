import { useEffect, useState } from 'react'
import { mockData } from '../data/mockData'
import useAppStore from '../store/useAppStore'
import { canUseMockFallback } from '../utils/runtimeMode'
import {
  createTip,
  deleteTip,
  getTipsByTrip,
  subscribeTipsByTrip,
  updateTip,
} from '../services/tipService'

function mapMockTip(tip) {
  return {
    id: tip.id,
    title: tip.title,
    description: `Compartilhado por ${tip.author}`,
    category: 'Outros',
    location: '',
    link: '',
    createdBy: mockData.currentUser.id,
    createdAt: tip.date,
    icon: tip.icon,
  }
}

function useTips() {
  const trip = useAppStore((state) => state.trip)
  const userProfile = useAppStore((state) => state.userProfile)
  const [tips, setTips] = useState([])
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

    const unsubscribe = subscribeTipsByTrip(
      trip.id,
      (data) => {
        setTips(data)
        setLoading(false)
      },
      (loadError) => {
        setError(loadError.message ?? 'Nao foi possivel carregar dicas.')
        setTips([])
        setLoading(false)
      },
    )

    return unsubscribe
  }, [trip?.id, usingMockData])

  async function refresh() {
    if (!trip?.id) {
      setTips([])
      return
    }
    setTips(await getTipsByTrip(trip.id))
  }

  async function create(data) {
    await createTip({ ...data, tripId: trip.id, createdBy: userProfile.uid })
  }
  async function update(id, data) {
    await updateTip(id, data)
  }
  async function remove(id) {
    await deleteTip(id)
  }

  return {
    tips: usingMockData ? mockData.tips.map(mapMockTip) : tips,
    loading: trip?.id && !usingMockData ? loading : false,
    error,
    usingMockData,
    create,
    update,
    delete: remove,
    refresh,
  }
}

export default useTips
