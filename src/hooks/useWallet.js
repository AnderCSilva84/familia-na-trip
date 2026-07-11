import { useEffect, useState } from 'react'
import useAppStore from '../store/useAppStore'
import { createWalletDocument, deleteWalletDocument, subscribeWalletDocuments } from '../services/walletService'

function useWallet() {
  const trip = useAppStore((state) => state.trip)
  const userProfile = useAppStore((state) => state.userProfile)
  const [documents, setDocuments] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!trip?.id) return () => {}
    queueMicrotask(() => setLoading(true))
    return subscribeWalletDocuments(trip.id, (items) => {
      setDocuments(items); setLoading(false); setError('')
    }, (loadError) => {
      setError(loadError.message ?? 'Nao foi possivel carregar a carteira.'); setLoading(false)
    })
  }, [trip?.id])

  const addDocument = (data, file) => createWalletDocument({ ...data, tripId: trip.id, createdBy: userProfile.uid }, file)
  return { documents, loading, error, addDocument, deleteDocument: deleteWalletDocument }
}

export default useWallet
