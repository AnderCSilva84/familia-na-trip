import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Button from '../../components/common/Button'
import EmptyState from '../../components/common/EmptyState'
import Loading from '../../components/common/Loading'
import ItineraryCard from '../../components/cards/ItineraryCard'
import ErrorState from '../../components/feedback/ErrorState'
import StatusMessage from '../../components/feedback/StatusMessage'
import useAuth from '../../hooks/useAuth'
import useItinerary from '../../hooks/useItinerary'
import {
  canCreateContent,
  canEditAnyContent,
  canEditOwnContent,
} from '../../utils/permissions'

const filters = [
  { value: 'all', label: 'Todos' },
  { value: 'planejado', label: 'Planejado' },
  { value: 'concluido', label: 'Concluido' },
]

function ItineraryPage() {
  const navigate = useNavigate()
  const { userProfile } = useAuth()
  const { items, loading, error, deleteItem, usingMockData } = useItinerary()
  const [filter, setFilter] = useState('all')
  const [feedback, setFeedback] = useState('')
  const filteredItems =
    filter === 'all' ? items : items.filter((item) => item.status === filter)

  async function handleDelete(itemId) {
    if (!window.confirm('Tem certeza que deseja excluir este item do roteiro?')) return
    try {
      await deleteItem(itemId)
      setFeedback('Item do roteiro removido com sucesso.')
    } catch (deleteError) {
      setFeedback(deleteError.message ?? 'Nao foi possivel remover o item.')
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {filters.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setFilter(option.value)}
              className={`rounded-full px-4 py-2 text-xs font-semibold ${
                filter === option.value
                  ? 'bg-teal-700 text-white'
                  : 'bg-slate-100 text-slate-600'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
        {canCreateContent(userProfile) ? (
          <Button onClick={() => navigate('/itinerary/new')}>Adicionar</Button>
        ) : null}
      </div>

      {usingMockData ? (
        <StatusMessage
          message="Firebase nao configurado. O roteiro abaixo esta em modo mock."
          tone="info"
        />
      ) : null}

      <StatusMessage
        message={feedback}
        tone={feedback.includes('sucesso') ? 'success' : 'error'}
      />

      {loading ? <Loading /> : null}

      {!loading && error ? (
        <ErrorState title="Falha ao carregar roteiro" description={error} />
      ) : null}

      {!loading && !error && filteredItems.length === 0 ? (
        <EmptyState
          title="Seu roteiro ainda esta vazio"
          description="Adicione a primeira parada da viagem para comecar a organizar dias e horarios."
        />
      ) : null}

      {!loading && !error
        ? filteredItems.map((item) => {
            const canManageItem =
              canEditAnyContent(userProfile) || canEditOwnContent(userProfile, item)

            return (
              <ItineraryCard
                key={item.id}
                item={item}
                canManage={canManageItem}
                onEdit={() => navigate(`/itinerary/${item.id}/edit`)}
                onDelete={() => handleDelete(item.id)}
              />
            )
          })
        : null}
    </div>
  )
}

export default ItineraryPage
