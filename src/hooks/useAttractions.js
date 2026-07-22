import { useEffect, useState } from 'react'
import useAppStore from '../store/useAppStore'
import {
  createAttraction,
  deleteAttraction,
  subscribeAttractions,
  toggleAttractionVisited,
  updateAttraction,
} from '../services/attractionService'

export default function useAttractions() {
  const trip = useAppStore((state) => state.trip)
  const user = useAppStore((state) => state.userProfile)
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!trip?.id) return () => {}
    queueMicrotask(() => setLoading(true))
    return subscribeAttractions(
      trip.id,
      (nextItems) => {
        setItems(nextItems)
        setLoading(false)
        setError('')
      },
      (loadError) => {
        setError(loadError.message ?? 'Nao foi possivel carregar as atracoes.')
        setLoading(false)
      },
    )
  }, [trip?.id])

  return {
    items,
    loading,
    error,
    createItem: (data) => createAttraction({ ...data, tripId: trip.id, createdBy: user.uid }),
    updateItem: updateAttraction,
    toggleVisited: (id, visited) => toggleAttractionVisited(id, visited, user.uid),
    deleteItem: deleteAttraction,
  }
}
