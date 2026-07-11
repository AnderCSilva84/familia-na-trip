import { useEffect, useState } from 'react'
import useAppStore from '../store/useAppStore'
import { createChecklistItem, deleteChecklistItem, subscribeChecklist, toggleChecklistItem } from '../services/checklistService'

export default function useChecklist() {
  const trip = useAppStore((state) => state.trip); const user = useAppStore((state) => state.userProfile)
  const [items, setItems] = useState([]); const [loading, setLoading] = useState(false); const [error, setError] = useState('')
  useEffect(() => { if (!trip?.id) return () => {}; queueMicrotask(() => setLoading(true)); return subscribeChecklist(trip.id, (next) => { setItems(next); setLoading(false); setError('') }, (err) => { setError(err.message ?? 'Nao foi possivel carregar a lista.'); setLoading(false) }) }, [trip?.id])
  return { items, loading, error, addItem: (data) => createChecklistItem({ ...data, tripId: trip.id, createdBy: user.uid }), toggleItem: (id, done) => toggleChecklistItem(id, done, user.uid), deleteItem: deleteChecklistItem }
}
