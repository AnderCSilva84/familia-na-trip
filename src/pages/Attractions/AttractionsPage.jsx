import { useMemo, useState } from 'react'
import { FiCalendar, FiCheck, FiEdit2, FiExternalLink, FiMapPin, FiPlus, FiTrash2, FiX } from 'react-icons/fi'
import { useNavigate } from 'react-router-dom'
import AppImage from '../../components/common/AppImage'
import Button from '../../components/common/Button'
import Card from '../../components/common/Card'
import EmptyState from '../../components/common/EmptyState'
import Loading from '../../components/common/Loading'
import StatusMessage from '../../components/feedback/StatusMessage'
import useAttractions from '../../hooks/useAttractions'
import useAuth from '../../hooks/useAuth'
import useAgenda from '../../hooks/useAgenda'
import useItinerary from '../../hooks/useItinerary'
import { formatDisplayDate } from '../../utils/formatters'
import { canDeleteAnyContent, canDeleteOwnContent, canEditAnyContent, canEditOwnContent } from '../../utils/permissions'

const filters = [
  { value: 'all', label: 'Todos' },
  { value: 'pending', label: 'Pendentes' },
  { value: 'visited', label: 'Visitados' },
]

const categoryLabels = {
  ponto_turistico: 'Ponto turistico',
  monumento: 'Monumento',
  museu: 'Museu',
  parque: 'Parque',
  praia: 'Praia',
  igreja: 'Igreja',
  mirante: 'Mirante',
  mercado: 'Mercado',
  outro: 'Outro',
}

export default function AttractionsPage() {
  const navigate = useNavigate()
  const { userProfile } = useAuth()
  const { items, loading, error, toggleVisited, deleteItem, createItem } = useAttractions()
  const { agenda } = useAgenda()
  const { items: itineraryItems } = useItinerary()
  const [filter, setFilter] = useState('all')
  const [showItinerary, setShowItinerary] = useState(false)
  const [feedback, setFeedback] = useState('')
  const visitedCount = items.filter((item) => item.visited).length
  const visibleItems = items.filter((item) => filter === 'all' || (filter === 'visited' ? item.visited : !item.visited))
  const groupedItems = useMemo(() => Object.entries(visibleItems.reduce((groups, item) => {
    const city = item.city || 'Cidade nao informada'
    groups[city] = [...(groups[city] ?? []), item]
    return groups
  }, {})), [visibleItems])
  const availableItineraryItems = itineraryItems.filter(
    (routeItem) => !items.some((item) => item.sourceItineraryId === routeItem.id),
  )
  const availableAgendaItems = agenda.filter(
    (agendaItem) =>
      !['alarme', 'hotel', 'veiculo'].includes(agendaItem.type)
      && !items.some((item) => item.sourceAgendaId === agendaItem.id),
  )

  async function handleImport(routeItem) {
    try {
      await createItem({
        name: routeItem.title,
        city: routeItem.city || routeItem.location || 'Cidade nao informada',
        category: 'ponto_turistico',
        description: routeItem.description || '',
        address: routeItem.address || '',
        link: routeItem.link || '',
        image: routeItem.image || '',
        sourceItineraryId: routeItem.id,
      })
      setFeedback(`${routeItem.title} adicionado aos pontos turisticos.`)
    } catch (importError) {
      setFeedback(importError.message ?? 'Nao foi possivel adicionar o item do roteiro.')
    }
  }

  async function handleAgendaImport(agendaItem) {
    try {
      await createItem({
        name: agendaItem.title,
        city: agendaItem.city || agendaItem.location || 'Cidade nao informada',
        category: 'ponto_turistico',
        description: agendaItem.description || '',
        address: agendaItem.address || '',
        link: agendaItem.link || '',
        image: agendaItem.image || '',
        sourceAgendaId: agendaItem.id,
      })
      setFeedback(`${agendaItem.title} adicionado aos pontos turisticos.`)
    } catch (importError) {
      setFeedback(importError.message ?? 'Nao foi possivel adicionar o item da agenda.')
    }
  }

  async function handleToggle(item) {
    try {
      await toggleVisited(item.id, !item.visited)
      setFeedback(item.visited ? 'Atracao marcada como pendente.' : 'Atracao marcada como visitada!')
    } catch (toggleError) {
      setFeedback(toggleError.message ?? 'Nao foi possivel atualizar a atracao.')
    }
  }

  async function handleDelete(item) {
    if (!window.confirm(`Tem certeza que deseja excluir "${item.name}"? Essa acao nao pode ser desfeita.`)) return
    try {
      await deleteItem(item.id)
      setFeedback('Atracao excluida com sucesso.')
    } catch (deleteError) {
      setFeedback(deleteError.message ?? 'Nao foi possivel excluir a atracao.')
    }
  }

  return (
    <div className="space-y-5">
      <Card className="bg-[linear-gradient(135deg,#f0fdfa,#fff)]">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-teal-700">Progresso da viagem</p>
            <h2 className="mt-1 text-2xl font-semibold text-slate-950">{visitedCount} de {items.length} visitados</h2>
          </div>
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-teal-700 text-white"><FiCheck size={28} /></div>
        </div>
        <div className="mt-4 h-2 overflow-hidden rounded-full bg-teal-100">
          <div className="h-full bg-teal-600 transition-all" style={{ width: `${items.length ? (visitedCount / items.length) * 100 : 0}%` }} />
        </div>
      </Card>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-2">
          {filters.map((option) => (
            <button key={option.value} type="button" onClick={() => setFilter(option.value)} className={`rounded-full px-4 py-2 text-xs font-semibold ${filter === option.value ? 'bg-teal-700 text-white' : 'bg-slate-100 text-slate-600'}`}>
              {option.label}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" icon={showItinerary ? <FiX /> : <FiCalendar />} onClick={() => setShowItinerary((value) => !value)}>
            {showItinerary ? 'Fechar roteiros' : 'Selecionar do roteiro'}
          </Button>
          <Button icon={<FiPlus />} onClick={() => navigate('/attractions/new')}>Adicionar manualmente</Button>
        </div>
      </div>

      {showItinerary ? (
        <Card className="space-y-3 border-teal-100 bg-teal-50/50">
          <div>
            <h2 className="text-lg font-bold text-slate-950">Selecionar da agenda ou roteiro</h2>
            <p className="mt-1 text-sm text-slate-500">Escolha os registros existentes que tambem devem aparecer em Pontos turisticos.</p>
          </div>
          {availableAgendaItems.length ? (
            <div className="space-y-2">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Agenda</p>
              {availableAgendaItems.map((agendaItem) => (
                <div key={agendaItem.id} className="flex items-center justify-between gap-3 rounded-2xl bg-white p-3 shadow-sm">
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-slate-900">{agendaItem.title}</p>
                    <p className="truncate text-xs text-slate-500">{formatDisplayDate(agendaItem.date)} · {agendaItem.city || agendaItem.location || 'Local nao informado'}</p>
                  </div>
                  <Button variant="secondary" onClick={() => handleAgendaImport(agendaItem)}>Adicionar</Button>
                </div>
              ))}
            </div>
          ) : null}
          {availableItineraryItems.length ? <p className="pt-2 text-xs font-bold uppercase tracking-wider text-slate-500">Roteiro</p> : null}
          {availableItineraryItems.length ? availableItineraryItems.map((routeItem) => (
            <div key={routeItem.id} className="flex items-center justify-between gap-3 rounded-2xl bg-white p-3 shadow-sm">
              <div className="min-w-0">
                <p className="truncate font-semibold text-slate-900">{routeItem.title}</p>
                <p className="truncate text-xs text-slate-500">{routeItem.city || routeItem.location || 'Local nao informado'}</p>
              </div>
              <Button variant="secondary" onClick={() => handleImport(routeItem)}>Adicionar</Button>
            </div>
          )) : null}
          {!availableAgendaItems.length && !availableItineraryItems.length ? <p className="rounded-2xl bg-white p-4 text-sm text-slate-500">Todos os itens disponiveis ja foram adicionados.</p> : null}
        </Card>
      ) : null}

      <StatusMessage message={feedback} tone={feedback.includes('sucesso') || feedback.includes('visitada') ? 'success' : 'info'} />
      {loading ? <Loading /> : null}
      {error ? <StatusMessage message={error} tone="error" /> : null}
      {!loading && !error && groupedItems.length === 0 ? <EmptyState title="Nenhum ponto turistico encontrado" description="Adicione manualmente ou selecione os lugares cadastrados no roteiro." /> : null}

      {groupedItems.map(([city, cityItems]) => (
        <section key={city} className="space-y-3">
          <h2 className="text-lg font-bold text-slate-950">{city}</h2>
          {cityItems.map((item) => {
            const canEdit = canEditAnyContent(userProfile) || canEditOwnContent(userProfile, item)
            const canDelete = canDeleteAnyContent(userProfile) || canDeleteOwnContent(userProfile, item)
            return (
              <Card key={item.id} className={item.visited ? 'border-teal-200 bg-teal-50/60' : ''}>
                <div className="grid gap-4 sm:grid-cols-[180px_1fr]">
                  <AppImage src={item.image} alt={item.name} className="h-40 w-full rounded-[24px] object-cover" fallbackClassName="h-40 w-full rounded-[24px]" fallbackLabel="Atracao" />
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <span className="text-xs font-semibold uppercase tracking-wider text-teal-700">{categoryLabels[item.category] ?? 'Atracao'}</span>
                        <h3 className={`mt-1 text-lg font-bold text-slate-950 ${item.visited ? 'line-through opacity-70' : ''}`}>{item.name}</h3>
                        {item.description ? <p className="mt-1 text-sm text-slate-500">{item.description}</p> : null}
                      </div>
                      <button type="button" onClick={() => handleToggle(item)} aria-label={item.visited ? 'Marcar como pendente' : 'Marcar como visitado'} className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border transition ${item.visited ? 'border-teal-600 bg-teal-600 text-white' : 'border-slate-300 bg-white text-transparent hover:border-teal-500'}`}><FiCheck size={22} /></button>
                    </div>
                    {item.address ? <p className="flex items-center gap-2 text-sm text-slate-500"><FiMapPin />{item.address}</p> : null}
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`rounded-full px-3 py-1 text-xs font-semibold ${item.visited ? 'bg-teal-100 text-teal-800' : 'bg-amber-50 text-amber-700'}`}>{item.visited ? 'Visitado' : 'Pendente'}</span>
                      {item.link ? <a href={item.link} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-sm font-semibold text-teal-700"><FiExternalLink />Abrir link</a> : null}
                    </div>
                  </div>
                </div>
                {canEdit || canDelete ? <div className="mt-4 flex gap-3 border-t border-slate-100 pt-4">
                  {canEdit ? <Button variant="secondary" className="flex-1" icon={<FiEdit2 />} onClick={() => navigate(`/attractions/${item.id}/edit`)}>Editar</Button> : null}
                  {canDelete ? <Button variant="ghost" className="flex-1 text-rose-600 hover:bg-rose-50" icon={<FiTrash2 />} onClick={() => handleDelete(item)}>Excluir</Button> : null}
                </div> : null}
              </Card>
            )
          })}
        </section>
      ))}
    </div>
  )
}
