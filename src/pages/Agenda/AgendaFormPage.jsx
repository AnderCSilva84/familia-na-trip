import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import Button from '../../components/common/Button'
import Card from '../../components/common/Card'
import EmptyState from '../../components/common/EmptyState'
import Input from '../../components/common/Input'
import Loading from '../../components/common/Loading'
import ErrorState from '../../components/feedback/ErrorState'
import StatusMessage from '../../components/feedback/StatusMessage'
import useAgenda from '../../hooks/useAgenda'
import useAuth from '../../hooks/useAuth'
import useWallet from '../../hooks/useWallet'
import { updateTrip } from '../../services/tripService'
import useAppStore from '../../store/useAppStore'
import { formatDateInput } from '../../utils/formatters'
import { canEditAnyContent, isSuperAdmin } from '../../utils/permissions'

const types = [
  { value: 'evento', label: 'Evento' },
  { value: 'roteiro', label: 'Roteiro' },
  { value: 'ponto_turistico', label: 'Ponto turístico' },
  { value: 'alarme', label: 'Alarme' },
  { value: 'hotel', label: 'Hospedagem' },
  { value: 'veiculo', label: 'Veículo' },
  { value: 'outro', label: 'Outro' },
]

const travelModes = [
  { value: '', label: 'Não contabilizar deslocamento' },
  { value: 'walking', label: 'A pé' },
  { value: 'transit', label: 'Metrô / transporte público' },
  { value: 'car', label: 'Carro' },
  { value: 'plane', label: 'Avião' },
]

function getWeekday(date) {
  if (!date) return ''
  const parsedDate = new Date(`${date}T12:00:00`)
  if (Number.isNaN(parsedDate.getTime())) return ''
  return new Intl.DateTimeFormat('pt-BR', { weekday: 'long' }).format(parsedDate)
}

function normalizeTime24(value) {
  const match = String(value ?? '').match(/^([01]\d|2[0-3]):([0-5]\d)$/)
  return match ? match[0] : ''
}

function AgendaFormContent({
  editingEvent,
  eventId,
  usingMockData,
  create,
  update,
  navigate,
  canManageValues,
  userProfile,
  trip,
  onTripUpdate,
}) {
  const { documents, loading: walletLoading, error: walletError } = useWallet()
  const initialEvent = editingEvent ?? null
  const initialDate = formatDateInput(initialEvent?.date)
  const [date, setDate] = useState(initialDate)
  const [selectedType, setSelectedType] = useState(initialEvent?.type ?? 'evento')
  const [customTypeName, setCustomTypeName] = useState('')
  const [savingType, setSavingType] = useState(false)
  const [selectedWalletId, setSelectedWalletId] = useState(initialEvent?.walletDocumentId ?? '')
  const [selectedImage, setSelectedImage] = useState(null)
  const [manualImageUrl, setManualImageUrl] = useState(initialEvent?.image ?? '')
  const [imagePreview, setImagePreview] = useState(initialEvent?.image ?? '')
  const [submitting, setSubmitting] = useState(false)
  const [feedback, setFeedback] = useState('')
  const previewUrlRef = useRef('')
  const weekday = getWeekday(date)
  const availableTypes = [
    ...types,
    ...(trip?.agendaTypes ?? []).map((type) => ({ value: type.value, label: type.label })),
  ].filter((type, index, list) => list.findIndex((item) => item.value === type.value) === index)

  useEffect(() => () => {
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current)
  }, [])

  function handleImageChange(event) {
    const nextFile = event.target.files?.[0] ?? null
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current)
    previewUrlRef.current = ''
    setSelectedImage(nextFile)

    if (!nextFile) {
      setImagePreview(manualImageUrl || initialEvent?.image || '')
      return
    }

    previewUrlRef.current = URL.createObjectURL(nextFile)
    setImagePreview(previewUrlRef.current)
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setSubmitting(true)
    setFeedback('')

    try {
      if (!date) throw new Error('Selecione uma data válida no calendário.')
      const formData = new FormData(event.currentTarget)
      const startTime = normalizeTime24(formData.get('startTime'))
      const endTime = normalizeTime24(formData.get('endTime'))
      if (formData.get('startTime') && !startTime) throw new Error('Informe a hora de início no formato 24h (HH:MM).')
      if (formData.get('endTime') && !endTime) throw new Error('Informe a hora de término no formato 24h (HH:MM).')
      const walletDocument = documents.find((document) => document.id === selectedWalletId)
      const payload = {
        title: String(formData.get('title') ?? '').trim(),
        weekday,
        date,
        city: String(formData.get('city') ?? '').trim(),
        local: String(formData.get('local') ?? '').trim(),
        address: String(formData.get('address') ?? '').trim(),
        postalCode: String(formData.get('postalCode') ?? '').trim(),
        description: String(formData.get('description') ?? '').trim(),
        instructions: String(formData.get('instructions') ?? '').trim(),
        startTime,
        endTime,
        estimatedCost: canManageValues
          ? Number(formData.get('estimatedCost') ?? 0) || 0
          : Number(initialEvent?.estimatedCost ?? 0),
        actualCost: canManageValues
          ? Number(formData.get('actualCost') ?? 0) || 0
          : Number(initialEvent?.actualCost ?? 0),
        latitude: String(formData.get('latitude') ?? '').trim(),
        longitude: String(formData.get('longitude') ?? '').trim(),
        travelMode: String(formData.get('travelMode') ?? ''),
        routeOrigin: String(formData.get('routeOrigin') ?? '').trim(),
        routeDestination: String(formData.get('routeDestination') ?? '').trim(),
        location: [formData.get('city'), formData.get('local')].filter(Boolean).join(' - '),
        expenseCategory: initialEvent?.expenseCategory ?? 'Outros',
        type: selectedType,
        walletDocumentId: walletDocument?.id ?? '',
        walletDocumentName: walletDocument?.name || walletDocument?.fileName || '',
        walletDocumentUrl: walletDocument?.url ?? '',
        createdBy: initialEvent?.createdBy || userProfile.uid,
        creatorName: initialEvent ? (initialEvent.creatorName ?? '') : userProfile.name,
        creatorPhotoURL: initialEvent ? (initialEvent.creatorPhotoURL ?? '') : userProfile.photoURL,
        link: initialEvent?.link ?? '',
        image: selectedImage ? initialEvent?.image ?? '' : manualImageUrl.trim(),
        imagePath: initialEvent?.imagePath ?? '',
        imageFile: selectedImage,
        currentImagePath: initialEvent?.imagePath ?? '',
        notifyMembers: false,
        membersToNotify: [],
        alarmTime: selectedType === 'alarme' ? startTime : '',
        relatedId: initialEvent?.relatedId ?? '',
      }

      if (eventId) await update(eventId, payload)
      else await create(payload)
      navigate('/agenda')
    } catch (submitError) {
      setFeedback(submitError.message ?? 'Não foi possível salvar o evento.')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleAddType() {
    const label = customTypeName.trim()
    if (!label || !trip?.id) return
    const value = label.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
      .replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '')
    if (!value) return

    setSavingType(true)
    setFeedback('')
    try {
      const agendaTypes = [...(trip.agendaTypes ?? []).filter((type) => type.value !== value), { value, label }]
      const updatedTrip = await updateTrip(trip.id, { agendaTypes })
      onTripUpdate(updatedTrip)
      setSelectedType(value)
      setCustomTypeName('')
    } catch (typeError) {
      setFeedback(typeError.message ?? 'Não foi possível criar o tipo.')
    } finally {
      setSavingType(false)
    }
  }

  return (
    <div className="space-y-4">
      <StatusMessage
        message={usingMockData ? 'Modo mock ativo. O formulário serve como fallback visual.' : feedback}
        tone={usingMockData ? 'info' : 'error'}
      />
      <Card>
        <div className="mb-6">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-teal-700">Agenda da viagem</p>
          <h2 className="mt-1 text-xl font-semibold text-slate-950">
            {eventId ? 'Editar evento' : 'Cadastrar evento'}
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Reúna aqui horários, localização, custos, documento e orientações importantes.
          </p>
        </div>

        <form className="space-y-5" onSubmit={handleSubmit}>
          <Input name="title" label="Título" defaultValue={initialEvent?.title ?? ''} required />

          <div className="grid gap-3 sm:grid-cols-2">
            <Input name="date" label="Data" type="date" lang="pt-BR" value={date} onChange={(event) => setDate(event.target.value)} required />
            <Input name="weekday" label="Dia da semana" value={weekday} readOnly placeholder="Preenchido pela data" />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <Input name="city" label="Cidade" defaultValue={initialEvent?.city ?? ''} required />
            <Input name="local" label="Local" defaultValue={initialEvent?.local ?? ''} />
          </div>

          <div className="grid gap-3 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
            <Input name="address" label="Endereço" defaultValue={initialEvent?.address ?? ''} placeholder="Rua, avenida, número..." />
            <Input name="postalCode" label="CEP" defaultValue={initialEvent?.postalCode ?? ''} placeholder="00000-000" />
          </div>

          <label className="flex flex-col gap-2 text-sm font-medium text-slate-600">
            <span>Descrição</span>
            <textarea
              name="description"
              defaultValue={initialEvent?.description ?? ''}
              className="min-h-28 rounded-2xl border border-slate-200 px-4 py-3 text-slate-900 outline-none focus:border-teal-500 focus:ring-4 focus:ring-teal-100"
            />
          </label>

          <label className="flex flex-col gap-2 text-sm font-medium text-slate-600">
            <span>Instruções ou observações</span>
            <textarea
              name="instructions"
              defaultValue={initialEvent?.instructions ?? ''}
              placeholder="Ex.: chegar 30 minutos antes, levar documento, ponto de encontro..."
              className="min-h-24 rounded-2xl border border-amber-200 bg-amber-50/60 px-4 py-3 text-slate-900 outline-none focus:border-amber-400 focus:ring-4 focus:ring-amber-100"
            />
          </label>

          <div>
            <p className="mb-2 text-sm font-medium text-slate-600">Horário do evento</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <Input name="startTime" label="Hora de início (24h)" type="time" lang="pt-BR" step="60" defaultValue={String(initialEvent?.startTime ?? '').slice(0, 5)} />
              <Input name="endTime" label="Hora de término (24h)" type="time" lang="pt-BR" step="60" defaultValue={String(initialEvent?.endTime ?? '').slice(0, 5)} />
            </div>
          </div>

          <div className="rounded-3xl border border-teal-100 bg-teal-50/60 p-4">
            <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
              <span>Deslocamento até este evento</span>
              <select
                name="travelMode"
                defaultValue={initialEvent?.travelMode ?? ''}
                className="w-full rounded-2xl border border-teal-200 bg-white px-4 py-3 text-slate-900 outline-none focus:border-teal-500 focus:ring-4 focus:ring-teal-100"
              >
                {travelModes.map((mode) => (
                  <option key={mode.value || 'none'} value={mode.value}>{mode.label}</option>
                ))}
              </select>
            </label>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <Input
                name="routeOrigin"
                label="Saindo de (opcional)"
                defaultValue={initialEvent?.routeOrigin ?? ''}
                placeholder="Automático: evento anterior"
              />
              <Input
                name="routeDestination"
                label="Indo para (opcional)"
                defaultValue={initialEvent?.routeDestination ?? ''}
                placeholder="Automático: local deste evento"
              />
            </div>
            <p className="mt-2 text-xs text-slate-500">
              Indique como a família irá do evento anterior até este local. A quilometragem será recalculada automaticamente.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <Input name="estimatedCost" label="Gasto estimado" type="number" min="0" step="0.01" defaultValue={initialEvent?.estimatedCost ?? ''} disabled={!canManageValues} />
            <Input name="actualCost" label="Gasto real" type="number" min="0" step="0.01" defaultValue={initialEvent?.actualCost ?? ''} disabled={!canManageValues} />
          </div>

          <div className="rounded-3xl bg-sky-50 p-4">
            <label className="flex flex-col gap-2 text-sm font-medium text-slate-600">
              <span>Documento da carteira</span>
              <select
                value={selectedWalletId}
                onChange={(event) => setSelectedWalletId(event.target.value)}
                disabled={walletLoading}
                className="w-full rounded-2xl border border-sky-200 bg-white px-4 py-3 text-slate-900 outline-none focus:border-sky-500 focus:ring-4 focus:ring-sky-100"
              >
                <option value="">{walletLoading ? 'Carregando carteira...' : 'Nenhum documento vinculado'}</option>
                {documents.map((document) => (
                  <option key={document.id} value={document.id}>
                    {document.name || document.fileName || 'Documento PDF'}
                  </option>
                ))}
              </select>
            </label>
            <p className="mt-2 text-xs text-slate-500">
              Selecione um PDF de reserva ou outro documento já salvo na carteira da viagem.
            </p>
            {walletError ? <p className="mt-2 text-xs text-rose-600">{walletError}</p> : null}
          </div>

          <div className="space-y-3 rounded-3xl bg-slate-50 p-4">
            <div>
              <h3 className="font-semibold text-slate-950">Foto do evento</h3>
              <p className="mt-1 text-sm text-slate-500">Use um link ou escolha uma imagem do celular.</p>
            </div>
            {imagePreview ? (
              <img src={imagePreview} alt="Prévia do evento" className="h-48 w-full rounded-[28px] object-cover" />
            ) : (
              <div className="flex h-40 items-center justify-center rounded-[28px] border border-dashed border-slate-200 bg-white text-sm text-slate-400">
                Nenhuma foto selecionada
              </div>
            )}
            <input
              type="file"
              accept="image/*"
              onChange={handleImageChange}
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm file:mr-3 file:rounded-full file:border-0 file:bg-teal-50 file:px-3 file:py-2 file:font-semibold file:text-teal-700"
            />
            <Input
              name="imageUrl"
              label="Ou informe o link da foto"
              value={manualImageUrl}
              onChange={(event) => {
                setManualImageUrl(event.target.value)
                if (!selectedImage) setImagePreview(event.target.value)
              }}
              placeholder="https://..."
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <Input name="latitude" label="Latitude" type="number" step="any" defaultValue={initialEvent?.latitude ?? ''} placeholder="-12.9714" />
            <Input name="longitude" label="Longitude" type="number" step="any" defaultValue={initialEvent?.longitude ?? ''} placeholder="-38.5014" />
          </div>

          <label className="flex flex-col gap-2 text-sm font-medium text-slate-600">
            <span>Tipo</span>
            <select
              name="type"
              value={selectedType}
              onChange={(event) => setSelectedType(event.target.value)}
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none focus:border-teal-500 focus:ring-4 focus:ring-teal-100"
            >
              {availableTypes.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}
            </select>
          </label>
          {isSuperAdmin(userProfile) ? (
            <div className="flex gap-2 rounded-3xl bg-teal-50 p-3">
              <input
                value={customTypeName}
                onChange={(event) => setCustomTypeName(event.target.value)}
                placeholder="Novo tipo: Combustível, transporte..."
                className="min-w-0 flex-1 rounded-2xl border border-teal-200 bg-white px-4 py-3 text-sm outline-none focus:border-teal-500"
              />
              <Button type="button" onClick={handleAddType} disabled={!customTypeName.trim() || savingType}>
                {savingType ? 'Criando...' : 'Criar tipo'}
              </Button>
            </div>
          ) : null}

          <div className="rounded-3xl border border-slate-100 bg-white p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Responsável pelo registro</p>
            <div className="mt-3 flex items-center gap-3">
              {(initialEvent?.creatorPhotoURL || (!initialEvent && userProfile.photoURL)) ? (
                <img src={initialEvent?.creatorPhotoURL || userProfile.photoURL} alt="" className="h-11 w-11 rounded-full object-cover" />
              ) : (
                <span className="flex h-11 w-11 items-center justify-center rounded-full bg-teal-100 font-semibold text-teal-700">
                  {userProfile.name?.charAt(0)?.toUpperCase() || 'U'}
                </span>
              )}
              <p className="text-sm text-slate-600">
                Evento criado por <strong className="text-slate-900">
                  {initialEvent ? (initialEvent.creatorName || 'membro não identificado no registro antigo') : userProfile.name}
                </strong>
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Button type="button" variant="secondary" onClick={() => navigate('/agenda')}>Cancelar</Button>
            <Button type="submit" disabled={submitting || usingMockData}>
              {submitting ? 'Salvando...' : eventId ? 'Atualizar' : 'Salvar'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  )
}

function AgendaFormPage() {
  const navigate = useNavigate()
  const { eventId } = useParams()
  const { agenda, loading, error, usingMockData, create, update } = useAgenda()
  const { trip, trips, setTrip, setTrips } = useAuth()
  const userProfile = useAppStore((state) => state.userProfile)
  const editingEvent = agenda.find((item) => item.id === eventId)

  function handleTripUpdate(updatedTrip) {
    setTrip(updatedTrip)
    setTrips(trips.map((item) => item.id === updatedTrip.id ? { ...item, ...updatedTrip } : item))
  }

  if (loading) return <Loading />
  if (error) return <ErrorState title="Falha ao abrir agenda" description={error} />
  if (eventId && !editingEvent && !usingMockData) {
    return <EmptyState title="Evento não encontrado" description="Esse evento pode ter sido removido." />
  }

  return (
    <AgendaFormContent
      key={editingEvent?.id ?? 'new-event'}
      editingEvent={editingEvent}
      eventId={eventId}
      usingMockData={usingMockData}
      create={create}
      update={update}
      navigate={navigate}
      canManageValues={canEditAnyContent(userProfile)}
      userProfile={userProfile}
      trip={trip}
      onTripUpdate={handleTripUpdate}
    />
  )
}

export default AgendaFormPage
