import { useState } from 'react'
import { FiCalendar, FiEdit3, FiMapPin, FiPlus, FiTrash2 } from 'react-icons/fi'
import { Link, useNavigate } from 'react-router-dom'
import AppImage from '../../components/common/AppImage'
import Badge from '../../components/common/Badge'
import Button from '../../components/common/Button'
import Card from '../../components/common/Card'
import EmptyState from '../../components/common/EmptyState'
import useAuth from '../../hooks/useAuth'
import { formatCurrency, formatDisplayDate } from '../../utils/formatters'
import { isSuperAdmin } from '../../utils/permissions'
import { deleteTripCompletely } from '../../services/tripService'
import TravelHistoryMapPage from '../Map/TravelHistoryMapPage'

const statusLabels = {
  draft: 'Rascunho', planned: 'Planejada', ongoing: 'Em andamento', completed: 'Realizada', archived: 'Arquivada',
}

function TripsPage() {
  const navigate = useNavigate()
  const { trips, trip: activeTrip, setTrip, setTrips, userProfile } = useAuth()
  const [deletingTripId, setDeletingTripId] = useState('')

  function openTrip(nextTrip) {
    setTrip(nextTrip)
    navigate('/dashboard')
  }

  async function handleDeleteTrip(item) {
    const confirmed = window.confirm(`Excluir definitivamente a trip "${item.name}" e todos os dados vinculados a ela? Esta ação não pode ser desfeita.`)
    if (!confirmed) return
    setDeletingTripId(item.id)
    try {
      await deleteTripCompletely(item.id)
      const remainingTrips = trips.filter((trip) => trip.id !== item.id)
      setTrips(remainingTrips)
      if (activeTrip?.id === item.id) setTrip(remainingTrips[0] ?? null)
    } catch (error) {
      window.alert(error.message ?? 'Não foi possível excluir a trip.')
    } finally {
      setDeletingTripId('')
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold text-slate-950">Nossas viagens</h2>
          <p className="mt-1 text-sm text-slate-500">Planejamento e memórias da família em um só lugar.</p>
        </div>
        <div className="flex flex-wrap gap-2"><Link to="/travel-history"><Button variant="secondary" icon={<FiMapPin />}>Mapa da família</Button></Link>{isSuperAdmin(userProfile) ? <Link to="/trips/new"><Button icon={<FiPlus />}>Cadastrar trip</Button></Link> : null}</div>
      </div>

      {trips.length === 0 ? <EmptyState title="Nenhuma viagem cadastrada" description="Cadastre a primeira trip da família para começar." /> : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {trips.map((item) => (
          <Card key={item.id} className={`overflow-hidden p-0 ${item.id === activeTrip?.id ? 'ring-2 ring-teal-500' : ''}`}>
            <AppImage src={item.coverImage} alt={item.name} className="h-44 w-full object-cover" fallbackClassName="h-44 w-full" fallbackLabel="Viagem" />
            <div className="space-y-4 p-5">
              <div className="flex items-start justify-between gap-3">
                <div><h3 className="text-lg font-semibold text-slate-950">{item.name}</h3><p className="text-sm text-slate-500">{item.destination}</p></div>
                <Badge tone={item.status === 'completed' ? 'accent' : 'success'}>{statusLabels[item.status] ?? 'Viagem'}</Badge>
              </div>
              <div className="space-y-2 text-sm text-slate-600">
                <p className="flex items-center gap-2"><FiCalendar /> {formatDisplayDate(item.effectiveStartDate || item.startDate)} — {formatDisplayDate(item.effectiveEndDate || item.endDate)}</p>
                <p className="flex items-center gap-2"><FiMapPin /> {item.cities?.length || 1} cidade(s)</p>
                <p className="rounded-2xl bg-amber-50 px-3 py-2 font-semibold text-amber-800">
                  Cofrinho da Trip: {formatCurrency(item.tripFund ?? 0)}
                </p>
              </div>
              <Button className="w-full" variant={item.id === activeTrip?.id ? 'secondary' : 'primary'} onClick={() => openTrip(item)}>
                {item.id === activeTrip?.id ? 'Viagem selecionada' : 'Abrir viagem'}
              </Button>
              {isSuperAdmin(userProfile) ? <Link to={`/trips/${item.id}/edit`} className="block"><Button className="w-full" variant="ghost" icon={<FiEdit3 />}>Editar trip</Button></Link> : null}
              {isSuperAdmin(userProfile) ? <Button className="w-full text-rose-600 hover:bg-rose-50" variant="ghost" icon={<FiTrash2 />} disabled={deletingTripId === item.id} onClick={() => handleDeleteTrip(item)}>{deletingTripId === item.id ? 'Excluindo...' : 'Excluir trip'}</Button> : null}
            </div>
          </Card>
        ))}
      </div>

      <section className="space-y-3 border-t border-slate-200 pt-6">
        <TravelHistoryMapPage embedded />
      </section>
    </div>
  )
}

export default TripsPage
