import { useEffect, useState } from 'react'
import useAppStore from '../store/useAppStore'
import { canUseMockFallback } from '../utils/runtimeMode'
import { deleteImportLogRecord, subscribeImportLogsByTrip } from '../services/importLogService'

function useImportLogs() {
  const trip = useAppStore((state) => state.trip)
  const [logs, setLogs] = useState([])
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

    return subscribeImportLogsByTrip(
      trip.id,
      (nextLogs) => {
        setLogs(nextLogs)
        setLoading(false)
      },
      (loadError) => {
        setLogs([])
        setLoading(false)
        setError(loadError.message ?? 'Nao foi possivel carregar o historico de importacao.')
      },
    )
  }, [trip?.id, usingMockData])

  return {
    logs,
    latestLog: logs[0] ?? null,
    loading,
    error,
    deleteLog: deleteImportLogRecord,
  }
}

export default useImportLogs
