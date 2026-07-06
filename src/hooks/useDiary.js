import { useEffect, useState } from 'react'
import { mockData } from '../data/mockData'
import useAppStore from '../store/useAppStore'
import { canUseMockFallback } from '../utils/runtimeMode'
import {
  createDiaryEntry as createDiaryEntryService,
  deleteDiaryEntry as deleteDiaryEntryService,
  getDiaryByTrip,
  subscribeDiaryByTrip,
  updateDiaryEntry as updateDiaryEntryService,
} from '../services/diaryService'

function useDiary() {
  const trip = useAppStore((state) => state.trip)
  const userProfile = useAppStore((state) => state.userProfile)
  const [entries, setEntries] = useState([])
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

    const unsubscribe = subscribeDiaryByTrip(
      trip.id,
      (nextEntries) => {
        setEntries(nextEntries)
        setLoading(false)
      },
      (loadError) => {
        setError(loadError.message ?? 'Nao foi possivel carregar o diario.')
        setEntries([])
        setLoading(false)
      },
    )

    return unsubscribe
  }, [trip?.id, usingMockData])

  async function refreshEntries() {
    if (!trip?.id) {
      setEntries([])
      return
    }
    setEntries(await getDiaryByTrip(trip.id))
  }

  async function createEntry(data, files = []) {
    await createDiaryEntryService(
      {
        ...data,
        tripId: trip.id,
        createdBy: userProfile.uid,
      },
      files,
    )
  }

  async function updateEntry(entryId, data, files = []) {
    await updateDiaryEntryService(
      entryId,
      {
        ...data,
        tripId: trip.id,
      },
      files,
    )
  }

  async function deleteEntry(entryId) {
    await deleteDiaryEntryService(entryId)
  }

  return {
    entries: usingMockData ? mockData.diary : entries,
    loading: trip?.id && !usingMockData ? loading : false,
    error,
    usingMockData,
    createEntry,
    updateEntry,
    deleteEntry,
    refreshEntries,
  }
}

export default useDiary
