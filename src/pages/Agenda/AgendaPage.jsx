import { useMemo, useState } from 'react'
import { FiBell, FiCalendar, FiExternalLink, FiMap, FiNavigation, FiPlus } from 'react-icons/fi'
import { useNavigate } from 'react-router-dom'
import Button from '../../components/common/Button'
import Card from '../../components/common/Card'
import EmptyState from '../../components/common/EmptyState'
import Loading from '../../components/common/Loading'
import ErrorState from '../../components/feedback/ErrorState'
import StatusMessage from '../../components/feedback/StatusMessage'
import useAgenda from '../../hooks/useAgenda'
import { buildMonthGrid, formatCurrency, formatDateInput, formatDisplayDate, normalizeDisplayTime } from '../../utils/formatters'
import { buildGoogleMapsUrl, buildWazeUrl } from '../../utils/navigationLinks'

const days = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S']
const typeLabels = {
  evento: 'Evento',
  roteiro: 'Roteiro',
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
  const { agenda, loading, error, usingMockData, delete: remove } = useAgenda()
  const [selectedDate, setSelectedDate] = useState(getTodayString)
  const [typeFilter, setTypeFilter] = useState('todos')
  const [feedback, setFeedback] = useState('')
  const monthDays = useMemo(() => buildMonthGrid(selectedDate), [selectedDate])
  const selectedDateLabel = useMemo(() => formatDisplayDate(selectedDate), [selectedDate])
  const selectedItems = useMemo(
    () =>
      agenda.filter((item) => {
        const sameDate = formatDateInput(item.date) === selectedDate
        const sameType = typeFilter === 'todos' || item.type === typeFilter
        return sameDate && sameType
      }),
    [agenda, selectedDate, typeFilter],
  )

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
        {item.image ? (
          <img src={item.image} alt={item.title} className="h-44 w-full rounded-[28px] object-cover" />
        ) : null}
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-base font-semibold text-slate-950">{item.title}</h3>
            <p className="mt-1 text-sm text-slate-500">{item.description || 'Sem descricao adicional.'}</p>
            <div className="mt-2 space-y-1 text-sm text-slate-500">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-teal-700">
                Origem: {typeLabels[item.type] ?? item.type ?? 'Evento'}
              </p>
              <p>
                {item.weekday || '--'} - {selectedDateLabel}
              </p>
              <p>
                {normalizeDisplayTime(item.startTime) || '--'} - {item.city || item.location || 'Sem cidade'}
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
            {typeLabels[item.type] ?? item.type ?? 'evento'}
          </span>
        </div>
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
        <div className={`grid gap-3 ${item.link ? 'grid-cols-1 sm:grid-cols-3' : 'grid-cols-2'}`}>
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
        </div>
        <div className="flex gap-3">
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
        {['todos', 'evento', 'roteiro', 'alarme', 'hotel', 'veiculo', 'outro'].map((type) => (
          <button
            key={type}
            type="button"
            onClick={() => setTypeFilter(type)}
            className={`rounded-full px-4 py-2 text-xs font-semibold ${
              typeFilter === type ? 'bg-teal-700 text-white' : 'bg-slate-100 text-slate-600'
            }`}
          >
            {type}
          </button>
        ))}
      </div>

      {loading ? <Loading /> : null}
      {!loading && error ? <ErrorState title="Falha ao carregar agenda" description={error} /> : null}
      {!loading && !error && selectedItems.length === 0 ? (
        <Card className="space-y-4">
          <EmptyState
            title="Nenhum evento neste dia"
            description="Selecione outro dia no calendario ou importe a planilha oficial."
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
    </div>
  )
}

export default AgendaPage
