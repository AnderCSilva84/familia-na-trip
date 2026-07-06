import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Button from '../../components/common/Button'
import EmptyState from '../../components/common/EmptyState'
import Loading from '../../components/common/Loading'
import VehicleCard from '../../components/cards/VehicleCard'
import ErrorState from '../../components/feedback/ErrorState'
import StatusMessage from '../../components/feedback/StatusMessage'
import useAuth from '../../hooks/useAuth'
import useVehicles from '../../hooks/useVehicles'
import { canCreateContent, canDeleteAnyContent, canDeleteOwnContent, canEditAnyContent, canEditOwnContent } from '../../utils/permissions'

function VehiclesPage() {
  const navigate = useNavigate()
  const { userProfile } = useAuth()
  const { vehicles, loading, error, usingMockData, delete: remove } = useVehicles()
  const [feedback, setFeedback] = useState('')

  async function handleDelete(vehicleId) {
    try {
      await remove(vehicleId)
      setFeedback('Veiculo removido com sucesso.')
    } catch (deleteError) {
      setFeedback(deleteError.message ?? 'Nao foi possivel remover o veiculo.')
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        {canCreateContent(userProfile) ? <Button onClick={() => navigate('/vehicles/new')}>Adicionar</Button> : null}
      </div>
      {usingMockData ? <StatusMessage message="Firebase nao configurado. Exibindo veiculos mockados." tone="info" /> : null}
      <StatusMessage message={feedback} tone={feedback.includes('sucesso') ? 'success' : 'error'} />
      {loading ? <Loading /> : null}
      {!loading && error ? <ErrorState title="Falha ao carregar veiculos" description={error} /> : null}
      {!loading && !error && vehicles.length === 0 ? <EmptyState title="Nenhum veiculo cadastrado" description="Adicione locacoes, links e valores para organizar o deslocamento." /> : null}
      {!loading && !error
        ? vehicles.map((vehicle) => {
            const canManage = canEditAnyContent(userProfile) || canEditOwnContent(userProfile, vehicle)
            const canDelete = canDeleteAnyContent(userProfile) || canDeleteOwnContent(userProfile, vehicle)
            return (
              <VehicleCard
                key={vehicle.id}
                vehicle={vehicle}
                canManage={canManage || canDelete}
                onEdit={canManage ? () => navigate(`/vehicles/${vehicle.id}/edit`) : undefined}
                onDelete={canDelete ? () => handleDelete(vehicle.id) : undefined}
              />
            )
          })
        : null}
    </div>
  )
}

export default VehiclesPage
