import { useMemo, useState } from 'react'
import { FiBell, FiCalendar, FiExternalLink, FiFileText, FiMap, FiNavigation, FiPlus, FiSearch, FiX } from 'react-icons/fi'
import { useNavigate } from 'react-router-dom'
import Button from '../../components/common/Button'
import Card from '../../components/common/Card'
import EmptyState from '../../components/common/EmptyState'
import AppImage from '../../components/common/AppImage'
import Loading from '../../components/common/Loading'
import ErrorState from '../../components/feedback/ErrorState'
import StatusMessage from '../../components/feedback/StatusMessage'
import useAgenda from '../../hooks/useAgenda'
import useAgendaReviews from '../../hooks/useAgendaReviews'
import useAuth from '../../hooks/useAuth'
import { getCatRatingMeta } from '../../utils/catRating'
import { buildMonthGrid, formatCurrency, formatDateInput, formatDisplayDate, normalizeDisplayTime } from '../../utils/formatters'
import { buildGoogleMapsUrl, buildWazeUrl } from '../../utils/navigationLinks'

const days = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S']
const typeLabels = {
  evento: 'Evento',
  roteiro: 'Roteiro',
  ponto_turistico: 'Ponto turistico',
  hotel: 'Hotel',
  veiculo: 'Veiculo',
  alarme: 'Alarme',
  outro: 'Outro',
}

function getTodayString() {
  return new Date().toISOString().slice(0, 10)
}

function parseDateValue(value) {
  if (!value) {
    return null
  }

  const parsed = value.includes('T') ? new Date(value) : new Date(`${value}T12:00:00`)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

function formatMonthTitle(selectedDate) {
  const selected = parseDateValue(selectedDate) ?? new Date()

  return new Intl.DateTimeFormat('pt-BR', {
    month: 'long',
    year: 'numeric',
  }).format(selected)
}

function AgendaPage() {
  const navigate = useNavigate()
  const { trip } = useAuth()
  const { agenda, loading, error, usingMockData, delete: remove } = useAgenda()
  const { saveReview } = useAgendaReviews()
  const [selectedDate, setSelectedDate] = useState(getTodayString)
  const [typeFilter, setTypeFilter] = useState('todos')
  const [feedback, setFeedback] = useState('')
  const [search, setSearch] = useState('')
  const [reviewEvent, setReviewEvent] = useState(null)
  const [rating, setRating] = useState(0)
  const [reviewNote, setReviewNote] = useState('')
  const [reviewSaving, setReviewSaving] = useState(false)
  const monthDays = useMemo(() => buildMonthGrid(selectedDate), [selectedDate])
  const selectedDateLabel = useMemo(() => formatDisplayDate(selectedDate), [selectedDate])
  const availableTypeLabels = useMemo(() => ({
    ...typeLabels,
    ...Object.fromEntries((trip?.agendaTypes ?? []).map((type) => [type.value, type.label])),
  }), [trip?.agendaTypes])
  const selectedItems = useMemo(
    () =>
      agenda.filter((item) => {
        const sameDate = formatDateInput(item.date) === selectedDate
        const sameType = typeFilter === 'todos' || item.type === typeFilter
        const haystack = `${item.title} ${item.description} ${item.city} ${item.local}`.toLowerCase()
        const matchesSearch = !search.trim() || haystack.includes(search.trim().toLowerCase())
        return (search.trim() ? matchesSearch : sameDate) && sameType
      }),
    [agenda, search, selectedDate, typeFilter],
  )

  async function handleSaveReview() {
    if (!reviewEvent || rating < 1) return
    setReviewSaving(true)
    try {
      await saveReview(reviewEvent, { actualCost: 0, rating, note: reviewNote.trim() })
      setFeedback('Avaliacao salva com sucesso.')
      setReviewEvent(null)
    } catch (saveError) {
      setFeedback(saveError.message ?? 'Nao foi possivel salvar a avaliacao.')
    } finally {
      setReviewSaving(false)
    }
  }

  async function handleDelete(id) {
    try {
      await remove(id)
      setFeedback('Evento removido com sucesso.')
    } catch (deleteError) {
      setFeedback(deleteError.message ?? 'Nao foi possivel remover o evento.')
    }
  }

  function renderAgendaItem(item) {
    const googleMapsUrl = buildGoogleMapsUrl(item)
    const wazeUrl = buildWazeUrl(item)

    return (
      <Card key={item.id} className="space-y-3">
        <AppImage
          src={item.image}
          alt={item.title}
          className="h-44 w-full rounded-[28px] object-cover"
          fallbackClassName="h-44 w-full rounded-[28px]"
          fallbackLabel={availableTypeLabels[item.type] ?? 'Evento'}
        />
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-base font-semibold text-slate-950">{item.title}</h3>
            <p className="mt-1 text-sm text-slate-500">{item.description || 'Sem descricao adicional.'}</p>
            <div className="mt-2 space-y-1 text-sm text-slate-500">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-teal-700">
                Origem: {availableTypeLabels[item.type] ?? item.type ?? 'Evento'}
              </p>
              <p>
                {item.weekday || '--'} - {formatDisplayDate(item.date)}
              </p>
              <p>
                {normalizeDisplayTime(item.startTime) || '--'}
                {item.endTime ? ` até ${normalizeDisplayTime(item.endTime)}` : ''}
                {' - '}
                {item.city || item.location || 'Sem cidade'}
              </p>
              <p>{item.local || item.title || 'Sem local definido'}</p>
              {item.address || item.postalCode ? (
                <p>
                  {[item.address, item.postalCode].filter(Boolean).join(' - ')}
                </p>
              ) : null}
            </div>
          </div>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
            {availableTypeLabels[item.type] ?? item.type ?? 'evento'}
          </span>
        </div>
        {item.instructions ? (
          <div className="rounded-3xl border border-amber-200 bg-amber-50 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-amber-700">Instruções e observações</p>
            <p className="mt-1 whitespace-pre-line text-sm text-amber-950">{item.instructions}</p>
          </div>
        ) : null}
        {item.creatorName || item.creatorPhotoURL ? (
          <div className="flex items-center gap-3 rounded-3xl bg-slate-50 px-4 py-3">
            {item.creatorPhotoURL ? (
              <AppImage
                src={item.creatorPhotoURL}
                alt={item.creatorName || 'Membro'}
                className="h-10 w-10 rounded-full object-cover"
                fallbackClassName="h-10 w-10 rounded-full"
                fallbackLabel={item.creatorName?.charAt(0) || 'U'}
              />
            ) : (
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-teal-100 font-semibold text-teal-700">
                {item.creatorName?.charAt(0)?.toUpperCase() || 'U'}
              </span>
            )}
            <p className="text-sm text-slate-600">
              Evento criado por <strong className="text-slate-900">{item.creatorName || 'Membro da família'}</strong>
            </p>
          </div>
        ) : null}
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-3xl bg-slate-50 p-4">
            <p className="text-sm text-slate-500">Gasto estimado</p>
            <p className="mt-1 text-lg font-semibold text-slate-950">{formatCurrency(item.estimatedCost ?? 0)}</p>
          </div>
          <div className="rounded-3xl bg-slate-50 p-4">
            <p className="text-sm text-slate-500">Gasto real</p>
            <p className="mt-1 text-lg font-semibold text-teal-700">{formatCurrency(item.actualCost ?? 0)}</p>
          </div>
        </div>
        <div className={`grid gap-3 ${item.link || item.walletDocumentUrl ? 'grid-cols-1 sm:grid-cols-3' : 'grid-cols-2'}`}>
          <Button
            as={googleMapsUrl ? 'a' : 'button'}
            href={googleMapsUrl || undefined}
            target={googleMapsUrl ? '_blank' : undefined}
            rel={googleMapsUrl ? 'noreferrer' : undefined}
            variant="secondary"
            className="w-full"
            icon={<FiMap size={16} />}
            disabled={!googleMapsUrl}
          >
            Google Maps
          </Button>
          <Button
            as={wazeUrl ? 'a' : 'button'}
            href={wazeUrl || undefined}
            target={wazeUrl ? '_blank' : undefined}
            rel={wazeUrl ? 'noreferrer' : undefined}
            className="w-full"
            icon={<FiNavigation size={16} />}
            disabled={!wazeUrl}
          >
            Waze
          </Button>
          {item.link ? (
            <Button
              as="a"
              href={item.link}
              target="_blank"
              rel="noreferrer"
              variant="secondary"
              className="w-full"
              icon={<FiExternalLink size={16} />}
            >
              Reserva
            </Button>
          ) : null}
          {!item.link && item.walletDocumentUrl ? (
            <Button
              as="a"
              href={item.walletDocumentUrl}
              target="_blank"
              rel="noreferrer"
              variant="secondary"
              className="w-full"
              icon={<FiFileText size={16} />}
            >
              {item.walletDocumentName || 'Documento'}
            </Button>
          ) : null}
        </div>
        <div className="flex gap-3">
          <Button className="flex-1" onClick={() => { setReviewEvent(item); setRating(0); setReviewNote('') }}>
            Avaliar
          </Button>
          <Button variant="secondary" className="flex-1" onClick={() => navigate(`/agenda/${item.id}/edit`)}>
            Editar
          </Button>
          <Button variant="ghost" className="flex-1 text-rose-600 hover:bg-rose-50" onClick={() => handleDelete(item.id)}>
            Excluir
          </Button>
        </div>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-end gap-3">
        <Button variant="secondary" icon={<FiBell size={16} />} onClick={() => navigate('/alarms')}>
          Alarmes
        </Button>
        <Button icon={<FiPlus size={16} />} onClick={() => navigate('/agenda/new')}>
          Evento
        </Button>
      </div>

      {usingMockData ? <StatusMessage message="Firebase nao configurado. Exibindo agenda mockada." tone="info" /> : null}
      <StatusMessage message={feedback} tone={feedback.includes('sucesso') ? 'success' : 'error'} />

      <Card>
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-lg font-semibold capitalize text-slate-950">{formatMonthTitle(selectedDate)}</h3>
          <input
            type="date"
            value={selectedDate}
            onChange={(event) => setSelectedDate(event.target.value)}
            className="rounded-2xl border border-slate-200 px-3 py-2 text-sm text-slate-700 outline-none focus:border-teal-500"
          />
        </div>
        <div className="mt-5">
          <div className="grid grid-cols-7 gap-2 text-center text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
            {days.map((day, index) => (
              <span key={`${day}-${index}`}>{day}</span>
            ))}
          </div>
          <div className="mt-3 grid grid-cols-7 gap-2 text-center text-sm text-slate-600">
            {monthDays.map((cell, index) => {
              if (!cell) {
                return <span key={`month-empty-${index}`} className="h-10 rounded-2xl bg-transparent" />
              }

              const { day, formatted } = cell
              const isActive = formatted === selectedDate
              const hasEvents = agenda.some((item) => formatDateInput(item.date) === formatted)

              return (
                <button
                  key={formatted}
                  type="button"
                  onClick={() => setSelectedDate(formatted)}
                  className={`relative flex h-10 items-center justify-center rounded-2xl ${
                    isActive ? 'bg-teal-700 font-semibold text-white' : 'bg-slate-50'
                  }`}
                >
                  {day}
                  {hasEvents ? (
                    <span
                      className={`absolute bottom-1 h-1.5 w-1.5 rounded-full ${
                        isActive ? 'bg-white' : 'bg-teal-600'
                      }`}
                    />
                  ) : null}
                </button>
              )
            })}
          </div>
        </div>
      </Card>

      <div className="flex flex-wrap gap-2">
        {['todos', ...Object.keys(availableTypeLabels)].map((type) => (
          <button
            key={type}
            type="button"
            onClick={() => setTypeFilter(type)}
            className={`rounded-full px-4 py-2 text-xs font-semibold ${
              typeFilter === type ? 'bg-teal-700 text-white' : 'bg-slate-100 text-slate-600'
            }`}
          >
            {type === 'todos' ? 'Todos' : availableTypeLabels[type]}
          </button>
        ))}
      </div>

      <label className="relative block">
        <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Buscar experiencia passada por nome, local ou cidade"
          className="w-full rounded-2xl border border-slate-200 py-3 pl-11 pr-4 outline-none focus:border-teal-500"
        />
      </label>

      {loading ? <Loading /> : null}
      {!loading && error ? <ErrorState title="Falha ao carregar agenda" description={error} /> : null}
      {!loading && !error && selectedItems.length === 0 ? (
        <Card className="space-y-4">
          <EmptyState
            title="Nenhum evento neste dia"
            description="Selecione outro dia no calendario para ver a programacao da viagem."
          />
        </Card>
      ) : null}
      {!loading && !error && selectedItems.length > 0 ? (
        <Card className="space-y-3">
          <div className="flex items-center gap-2">
            <FiCalendar className="text-teal-700" size={18} />
            <h3 className="text-base font-semibold text-slate-950">Eventos de {selectedDateLabel}</h3>
          </div>
          <p className="text-sm text-slate-500">
            {selectedItems.length} evento(s) encontrado(s) para o dia selecionado.
          </p>
        </Card>
      ) : null}
      {!loading && !error ? selectedItems.map(renderAgendaItem) : null}

      {reviewEvent ? (
        <div className="fixed inset-0 z-40 flex items-end justify-center bg-slate-950/35 p-4 backdrop-blur-sm lg:items-center">
          <button className="absolute inset-0" onClick={() => setReviewEvent(null)} aria-label="Fechar avaliacao" />
          <Card className="relative z-10 w-full max-w-xl space-y-5 rounded-[32px]">
            <div className="flex items-start justify-between gap-3">
              <div><p className="text-xs font-semibold uppercase tracking-[0.2em] text-teal-700">Avaliar experiencia</p><h3 className="mt-2 text-xl font-semibold">{reviewEvent.title}</h3><p className="text-sm text-slate-500">{formatDisplayDate(reviewEvent.date)}</p></div>
              <button onClick={() => setReviewEvent(null)} className="rounded-full bg-slate-100 p-3"><FiX /></button>
            </div>
            <div className="grid grid-cols-5 gap-2">
              {[1, 2, 3, 4, 5].map((value) => <button key={value} type="button" onClick={() => setRating(value)} className={`rounded-2xl border px-2 py-3 ${rating === value ? 'border-teal-500 ring-4 ring-teal-100' : 'border-slate-200'} ${getCatRatingMeta(value)?.className ?? ''}`}><span className="block text-2xl">{getCatRatingMeta(value)?.emoji ?? '🐱'}</span><span className="text-xs font-semibold">{value}</span></button>)}
            </div>
            <textarea value={reviewNote} onChange={(event) => setReviewNote(event.target.value)} placeholder="Como foi essa experiencia?" className="min-h-28 w-full rounded-2xl border border-slate-200 p-4 outline-none focus:border-teal-500" />
            <Button className="w-full" onClick={handleSaveReview} disabled={rating < 1 || reviewSaving}>{reviewSaving ? 'Salvando...' : 'Salvar avaliacao'}</Button>
          </Card>
        </div>
      ) : null}
    </div>
  )
}

export default AgendaPage
