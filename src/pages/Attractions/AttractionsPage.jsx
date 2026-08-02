import { useMemo, useState } from 'react'
import { FiCalendar, FiCheck, FiCompass, FiEdit2, FiExternalLink, FiMapPin, FiPlus, FiSearch, FiTrash2, FiX } from 'react-icons/fi'
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
import useAppStore from '../../store/useAppStore'
import { fetchTouristSuggestions } from '../../services/touristSuggestionService'

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
  const trip = useAppStore((state) => state.trip)
  const { agenda } = useAgenda()
  const { items: itineraryItems } = useItinerary()
  const [filter, setFilter] = useState('all')
  const [showItinerary, setShowItinerary] = useState(false)
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [suggestionCityIndex, setSuggestionCityIndex] = useState(0)
  const [suggestionRadius, setSuggestionRadius] = useState(20)
  const [suggestions, setSuggestions] = useState([])
  const [selectedSuggestions, setSelectedSuggestions] = useState([])
  const [loadingSuggestions, setLoadingSuggestions] = useState(false)
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

  async function handleSearchSuggestions() {
    const city = trip?.cities?.[suggestionCityIndex]
    if (!city) return setFeedback('Cadastre ao menos uma cidade na viagem para receber sugestoes.')
    setLoadingSuggestions(true)
    setFeedback('')
    try {
      const found = await fetchTouristSuggestions(city, suggestionRadius)
      const available = found.filter((suggestion) => !items.some((item) =>
        item.sourceExternalId === suggestion.id
        || (item.name.trim().toLocaleLowerCase('pt-BR') === suggestion.name.trim().toLocaleLowerCase('pt-BR')
          && item.city.trim().toLocaleLowerCase('pt-BR') === suggestion.city.trim().toLocaleLowerCase('pt-BR'))))
      setSuggestions(available)
      setSelectedSuggestions([])
      setFeedback(available.length ? `${available.length} sugestoes encontradas. Selecione as que deseja visitar.` : 'Nenhuma sugestao nova encontrada nessa area.')
    } catch (searchError) {
      setFeedback(searchError.message ?? 'Nao foi possivel buscar sugestoes agora.')
    } finally {
      setLoadingSuggestions(false)
    }
  }

  function toggleSuggestion(id) {
    setSelectedSuggestions((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id])
  }

  async function handleAddSuggestions() {
    const selected = suggestions.filter((suggestion) => selectedSuggestions.includes(suggestion.id))
    if (!selected.length) return
    setLoadingSuggestions(true)
    try {
      await Promise.all(selected.map((suggestion) => createItem({
        name: suggestion.name,
        city: [suggestion.city, suggestion.state].filter(Boolean).join(' - '),
        category: suggestion.category,
        description: suggestion.description,
        address: suggestion.address,
        link: suggestion.link,
        image: suggestion.image,
        latitude: suggestion.latitude,
        longitude: suggestion.longitude,
        sourceExternalId: suggestion.id,
      })))
      setSuggestions((current) => current.filter((suggestion) => !selectedSuggestions.includes(suggestion.id)))
      setSelectedSuggestions([])
      setFeedback(`${selected.length} atracao(oes) salva(s) no catalogo da trip.`)
    } catch (saveError) {
      setFeedback(saveError.message ?? 'Nao foi possivel salvar todas as atracoes no catalogo.')
    } finally {
      setLoadingSuggestions(false)
    }
  }

  function handleScheduleAttraction(item) {
    navigate('/agenda/new', { state: { attractionSuggestion: {
      title: item.name,
      date: trip?.startDate ?? '',
      city: item.city,
      local: item.name,
      address: item.address,
      postalCode: item.address?.match(/\b\d{5}-?\d{3}\b/)?.[0] ?? '',
      description: item.description,
      instructions: '',
      startTime: '',
      endTime: '',
      estimatedCost: '',
      actualCost: '',
      latitude: item.latitude,
      longitude: item.longitude,
      travelMode: '',
      routeOrigin: '',
      routeDestination: item.address || item.name,
      location: [item.city, item.name].filter(Boolean).join(' - '),
      expenseCategory: 'Outros',
      type: 'ponto_turistico',
      walletDocumentId: '',
      walletDocumentName: '',
      walletDocumentUrl: '',
      link: item.link,
      image: item.image,
      imagePath: '',
      sourceExternalId: item.sourceExternalId ?? '',
      sourceAttractionId: item.id,
      creatorName: userProfile?.name ?? '',
      creatorPhotoURL: userProfile?.photoURL ?? '',
    } } })
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
          <Button variant="secondary" icon={showSuggestions ? <FiX /> : <FiCompass />} onClick={() => setShowSuggestions((value) => !value)}>
            {showSuggestions ? 'Fechar sugestoes' : 'Sugerir pela cidade'}
          </Button>
          <Button variant="secondary" icon={showItinerary ? <FiX /> : <FiCalendar />} onClick={() => setShowItinerary((value) => !value)}>
            {showItinerary ? 'Fechar roteiros' : 'Selecionar do roteiro'}
          </Button>
          <Button icon={<FiPlus />} onClick={() => navigate('/attractions/new')}>Adicionar manualmente</Button>
        </div>
      </div>

      {showSuggestions ? (
        <Card className="space-y-4 border-teal-100 bg-teal-50/50">
          <div>
            <h2 className="text-lg font-bold text-slate-950">Sugestoes para o destino</h2>
            <p className="mt-1 text-sm text-slate-500">Escolha a cidade e o alcance da busca. Nada entra na viagem sem a sua selecao.</p>
          </div>
          {trip?.cities?.length ? (
            <div className="grid gap-3 sm:grid-cols-[1fr_180px_auto]">
              <label className="flex flex-col gap-2 text-sm font-medium text-slate-600">
                <span>Cidade</span>
                <select value={suggestionCityIndex} onChange={(event) => setSuggestionCityIndex(Number(event.target.value))} className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                  {trip.cities.map((city, index) => <option key={`${city.city}-${city.state}`} value={index}>{[city.city, city.state].filter(Boolean).join(' - ')}</option>)}
                </select>
              </label>
              <label className="flex flex-col gap-2 text-sm font-medium text-slate-600">
                <span>Raio da busca</span>
                <select value={suggestionRadius} onChange={(event) => setSuggestionRadius(Number(event.target.value))} className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                  <option value="5">5 km</option><option value="10">10 km</option><option value="20">20 km</option><option value="35">35 km</option><option value="50">50 km</option>
                </select>
              </label>
              <Button className="self-end" icon={<FiSearch />} disabled={loadingSuggestions} onClick={handleSearchSuggestions}>{loadingSuggestions ? 'Buscando...' : 'Buscar'}</Button>
            </div>
          ) : <p className="rounded-2xl bg-white p-4 text-sm text-slate-500">Edite a viagem e informe as cidades para ativar as sugestoes.</p>}
          {suggestions.length ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-semibold text-slate-700">{selectedSuggestions.length} de {suggestions.length} selecionado(s)</p>
                <Button disabled={!selectedSuggestions.length || loadingSuggestions} onClick={handleAddSuggestions}>Salvar no catálogo</Button>
              </div>
              <div className="grid max-h-[32rem] gap-2 overflow-y-auto pr-1 sm:grid-cols-2">
                {suggestions.map((suggestion) => (
                  <label key={suggestion.id} className={`flex cursor-pointer items-start gap-3 rounded-2xl border bg-white p-3 ${selectedSuggestions.includes(suggestion.id) ? 'border-teal-500 ring-2 ring-teal-100' : 'border-slate-100'}`}>
                    <input type="checkbox" checked={selectedSuggestions.includes(suggestion.id)} onChange={() => toggleSuggestion(suggestion.id)} className="mt-1 h-4 w-4 accent-teal-700" />
                    {suggestion.image ? <AppImage src={suggestion.image} alt={suggestion.name} className="h-20 w-24 shrink-0 rounded-xl object-cover" fallbackClassName="h-20 w-24 shrink-0 rounded-xl" fallbackLabel="Atracao" /> : null}
                    <span className="min-w-0"><strong className="block text-slate-900">{suggestion.name}</strong><span className="block text-xs text-teal-700">{categoryLabels[suggestion.category] ?? 'Atracao'}</span>{suggestion.address ? <span className="mt-1 block text-xs text-slate-500">{suggestion.address}</span> : null}{suggestion.imageSource === 'wikimedia-commons' ? <span className="mt-1 block text-[10px] text-slate-400">Foto: Wikimedia Commons</span> : null}</span>
                  </label>
                ))}
              </div>
            </div>
          ) : null}
          <p className="text-xs text-slate-400">Dados de locais: OpenStreetMap contributors.</p>
        </Card>
      ) : null}

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
                    <Button icon={<FiCalendar />} onClick={() => handleScheduleAttraction(item)}>Adicionar à agenda</Button>
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
