import { useEffect, useState } from 'react'
import { mockData } from '../data/mockData'
import useAppStore from '../store/useAppStore'
import { canUseMockFallback } from '../utils/runtimeMode'
import {
  createItineraryItem as createItineraryItemService,
  deleteItineraryItem as deleteItineraryItemService,
  getItineraryByTrip,
  subscribeItineraryByTrip,
  updateItineraryItem as updateItineraryItemService,
} from '../services/itineraryService'

function useItinerary() {
  const trip = useAppStore((state) => state.trip)
  const userProfile = useAppStore((state) => state.userProfile)
  const [items, setItems] = useState([])
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

    const unsubscribe = subscribeItineraryByTrip(
      trip.id,
      (nextItems) => {
        setItems(nextItems)
        setLoading(false)
      },
      (loadError) => {
        setError(loadError.message ?? 'Nao foi possivel carregar o roteiro.')
        setItems([])
        setLoading(false)
      },
    )

    return unsubscribe
  }, [trip?.id, usingMockData])

  async function refreshItems() {
    if (!trip?.id) {
      setItems([])
      return
    }
    setItems(await getItineraryByTrip(trip.id))
  }

  async function createItem(data) {
    await createItineraryItemService({
      ...data,
      tripId: trip.id,
      createdBy: userProfile.uid,
    })
  }

  async function updateItem(itemId, data) {
    await updateItineraryItemService(itemId, data)
  }

  async function deleteItem(itemId) {
    await deleteItineraryItemService(itemId)
  }

  return {
    items: usingMockData ? mockData.itinerary : items,
    loading: trip?.id && !usingMockData ? loading : false,
    error,
    usingMockData,
    createItem,
    updateItem,
    deleteItem,
    refreshItems,
  }
}

export default useItinerary
