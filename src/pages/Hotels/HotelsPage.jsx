import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Button from '../../components/common/Button'
import EmptyState from '../../components/common/EmptyState'
import Loading from '../../components/common/Loading'
import HotelCard from '../../components/cards/HotelCard'
import ErrorState from '../../components/feedback/ErrorState'
import StatusMessage from '../../components/feedback/StatusMessage'
import useAuth from '../../hooks/useAuth'
import useHotels from '../../hooks/useHotels'
import { canCreateContent, canDeleteAnyContent, canDeleteOwnContent, canEditAnyContent, canEditOwnContent } from '../../utils/permissions'

function HotelsPage() {
  const navigate = useNavigate()
  const { userProfile } = useAuth()
  const { hotels, loading, error, usingMockData, delete: remove } = useHotels()
  const [feedback, setFeedback] = useState('')

  async function handleDelete(hotelId) {
    try {
      await remove(hotelId)
      setFeedback('Hospedagem removida com sucesso.')
    } catch (deleteError) {
      setFeedback(deleteError.message ?? 'Nao foi possivel remover a hospedagem.')
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        {canCreateContent(userProfile) ? <Button onClick={() => navigate('/hotels/new')}>Adicionar</Button> : null}
      </div>
      {usingMockData ? <StatusMessage message="Firebase nao configurado. Exibindo hospedagens mockadas." tone="info" /> : null}
      <StatusMessage message={feedback} tone={feedback.includes('sucesso') ? 'success' : 'error'} />
      {loading ? <Loading /> : null}
      {!loading && error ? <ErrorState title="Falha ao carregar hospedagens" description={error} /> : null}
      {!loading && !error && hotels.length === 0 ? <EmptyState title="Nenhuma hospedagem cadastrada" description="Adicione reservas, links e valores para acompanhar a estadia." /> : null}
      {!loading && !error
        ? hotels.map((hotel) => {
            const canManage = canEditAnyContent(userProfile) || canEditOwnContent(userProfile, hotel)
            const canDelete = canDeleteAnyContent(userProfile) || canDeleteOwnContent(userProfile, hotel)
            return (
              <HotelCard
                key={hotel.id}
                hotel={hotel}
                canManage={canManage || canDelete}
                onEdit={canManage ? () => navigate(`/hotels/${hotel.id}/edit`) : undefined}
                onDelete={canDelete ? () => handleDelete(hotel.id) : undefined}
              />
            )
          })
        : null}
    </div>
  )
}

export default HotelsPage
