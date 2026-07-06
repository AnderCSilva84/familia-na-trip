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
import { formatDateInput } from '../../utils/formatters'
import { getLinkPreviewData } from '../../utils/linkPreview'
import { resolveMapMetadata } from '../../utils/locationPresets'

const types = ['evento', 'roteiro', 'alarme', 'hotel', 'veiculo', 'outro']

function clampPercentage(value) {
  return Math.min(95, Math.max(5, value))
}

function AgendaFormPage() {
  const navigate = useNavigate()
  const { eventId } = useParams()
  const { agenda, loading, error, usingMockData, create, update } = useAgenda()
  const [submitting, setSubmitting] = useState(false)
  const [feedback, setFeedback] = useState('')
  const editingEvent = agenda.find((item) => item.id === eventId)
  const [selectedImage, setSelectedImage] = useState(null)
  const [reservationLink, setReservationLink] = useState(editingEvent?.link ?? '')
  const [manualImageUrl, setManualImageUrl] = useState(editingEvent?.image ?? '')
  const [imagePreview, setImagePreview] = useState(editingEvent?.image ?? '')
  const previewUrlRef = useRef('')
  const [mapPosition, setMapPosition] = useState(() => ({
    x: Number(resolveMapMetadata(editingEvent ?? {}).mapX ?? 52) || 52,
    y: Number(resolveMapMetadata(editingEvent ?? {}).mapY ?? 58) || 58,
    enabled: Boolean(resolveMapMetadata(editingEvent ?? {}).mapX && resolveMapMetadata(editingEvent ?? {}).mapY),
  }))

  useEffect(() => {
    return () => {
      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current)
      }
    }
  }, [])

  function handleImageChange(event) {
    const nextFile = event.target.files?.[0] ?? null

    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current)
      previewUrlRef.current = ''
    }

    setSelectedImage(nextFile)

    if (!nextFile) {
      setImagePreview(manualImageUrl || editingEvent?.image || '')
      return
    }

    const objectUrl = URL.createObjectURL(nextFile)
    previewUrlRef.current = objectUrl
    setImagePreview(objectUrl)
  }

  async function handleLinkBlur() {
    if (!reservationLink || selectedImage || manualImageUrl) {
      return
    }

    const previewData = await getLinkPreviewData(reservationLink)

    if (previewData?.image) {
      setManualImageUrl(previewData.image)
      setImagePreview(previewData.image)
    }
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setSubmitting(true)
    setFeedback('')

    try {
      const formData = new FormData(event.currentTarget)
      const payload = {
        title: String(formData.get('title') ?? ''),
        weekday: String(formData.get('weekday') ?? ''),
        city: String(formData.get('city') ?? ''),
        local: String(formData.get('local') ?? ''),
        address: String(formData.get('address') ?? ''),
        postalCode: String(formData.get('postalCode') ?? ''),
        description: String(formData.get('description') ?? ''),
        date: String(formData.get('date') ?? ''),
        startTime: String(formData.get('startTime') ?? ''),
        endTime: '',
        location: String(formData.get('location') ?? ''),
        estimatedCost: Number(formData.get('estimatedCost') ?? 0) || 0,
        actualCost: Number(formData.get('actualCost') ?? 0) || 0,
        expenseCategory: editingEvent?.expenseCategory ?? 'Outros',
        createdBy: editingEvent?.createdBy ?? '',
        link: reservationLink,
        image: selectedImage ? editingEvent?.image ?? '' : manualImageUrl.trim() || editingEvent?.image || '',
        imagePath: editingEvent?.imagePath ?? '',
        imageFile: selectedImage,
        currentImagePath: editingEvent?.imagePath ?? '',
        mapX: mapPosition.enabled ? String(Math.round(mapPosition.x)) : '',
        mapY: mapPosition.enabled ? String(Math.round(mapPosition.y)) : '',
        type: String(formData.get('type') ?? 'evento'),
        relatedId: String(formData.get('relatedId') ?? ''),
      }

      if (eventId) {
        await update(eventId, payload)
      } else {
        await create(payload)
      }

      navigate('/agenda')
    } catch (submitError) {
      setFeedback(submitError.message ?? 'Nao foi possivel salvar o evento.')
    } finally {
      setSubmitting(false)
    }
  }

  function handleMapPick(event) {
    const rect = event.currentTarget.getBoundingClientRect()
    const x = clampPercentage(((event.clientX - rect.left) / rect.width) * 100)
    const y = clampPercentage(((event.clientY - rect.top) / rect.height) * 100)

    setMapPosition({
      x,
      y,
      enabled: true,
    })
  }

  function clearMapPosition() {
    setMapPosition((current) => ({
      ...current,
      enabled: false,
    }))
  }

  if (loading) return <Loading />
  if (error) return <ErrorState title="Falha ao abrir agenda" description={error} />
  if (eventId && !editingEvent && !usingMockData) {
    return <EmptyState title="Evento nao encontrado" description="Esse evento pode ter sido removido." />
  }

  return (
    <div className="space-y-4">
      <StatusMessage
        message={usingMockData ? 'Modo mock ativo. O formulario serve como fallback visual.' : feedback}
        tone={usingMockData ? 'info' : 'error'}
      />
      <Card>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <Input name="title" label="Titulo" defaultValue={editingEvent?.title ?? ''} required />
          <div className="grid gap-3 sm:grid-cols-2">
            <Input name="weekday" label="Dia da semana" defaultValue={editingEvent?.weekday ?? ''} />
            <Input name="city" label="Cidade" defaultValue={editingEvent?.city ?? ''} />
          </div>
          <Input name="local" label="Local / parada" defaultValue={editingEvent?.local ?? editingEvent?.title ?? ''} />
          <div className="grid gap-3 sm:grid-cols-2">
            <Input name="address" label="Endereco" defaultValue={editingEvent?.address ?? ''} placeholder="Rua, avenida, numero..." />
            <Input name="postalCode" label="CEP" defaultValue={editingEvent?.postalCode ?? ''} placeholder="00000-000" />
          </div>
          <label className="flex flex-col gap-2 text-sm font-medium text-slate-600">
            <span>Descricao</span>
            <textarea
              name="description"
              defaultValue={editingEvent?.description ?? ''}
              className="min-h-28 rounded-2xl border border-slate-200 px-4 py-3 text-slate-900 outline-none focus:border-teal-500 focus:ring-4 focus:ring-teal-100"
            />
          </label>
          <Input name="date" label="Data" type="date" defaultValue={formatDateInput(editingEvent?.date)} required />
          <Input name="startTime" label="Horario" type="time" step="1" defaultValue={editingEvent?.startTime ?? ''} />
          <Input
            name="location"
            label="Local / cidade"
            defaultValue={editingEvent?.location ?? ''}
            placeholder="Ex: Salvador - Praia do Forte"
          />
          <div className="grid gap-3 sm:grid-cols-2">
            <Input
              name="estimatedCost"
              label="Gasto estimado"
              type="number"
              min="0"
              step="0.01"
              defaultValue={editingEvent?.estimatedCost ?? ''}
            />
            <Input
              name="actualCost"
              label="Gasto real"
              type="number"
              min="0"
              step="0.01"
              defaultValue={editingEvent?.actualCost ?? ''}
            />
          </div>
          <Input
            name="link"
            label="Link da reserva ou plataforma"
            value={reservationLink}
            onChange={(event) => setReservationLink(event.target.value)}
            onBlur={handleLinkBlur}
            placeholder="Ex: Booking, Airbnb, site do passeio..."
          />

          <div className="space-y-3 rounded-3xl bg-slate-50 p-4">
            <div>
              <h3 className="text-base font-semibold text-slate-950">Foto do evento</h3>
              <p className="mt-1 text-sm text-slate-500">
                Cada parada pode ter sua propria imagem. Voce pode subir do celular ou colar a URL da capa.
              </p>
            </div>

            {imagePreview ? (
              <img
                src={imagePreview}
                alt={editingEvent?.title ?? 'Preview do evento'}
                className="h-48 w-full rounded-[28px] object-cover"
              />
            ) : (
              <div className="flex h-40 items-center justify-center rounded-[28px] border border-dashed border-slate-200 bg-white text-sm text-slate-400">
                Nenhuma imagem selecionada para este evento
              </div>
            )}

            <label className="flex flex-col gap-2 text-sm font-medium text-slate-600">
              <span>Upload da foto</span>
              <input
                name="eventImage"
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition file:mr-3 file:rounded-full file:border-0 file:bg-teal-50 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-teal-700 focus:border-teal-500 focus:ring-4 focus:ring-teal-100"
              />
            </label>

            <Input
              name="imageUrl"
              label="Ou use uma imagem por URL"
              value={manualImageUrl}
              onChange={(event) => {
                setManualImageUrl(event.target.value)
                if (!selectedImage) {
                  setImagePreview(event.target.value)
                }
              }}
              placeholder="https://..."
            />
          </div>

          <div className="space-y-3 rounded-3xl bg-slate-50 p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-base font-semibold text-slate-950">Posicao no mapa</h3>
                <p className="mt-1 text-sm text-slate-500">
                  Se voce preencher endereco e CEP, o app ja usa isso como destino no Google Maps e no Waze. O `X/Y` continua sendo a posicao visual dentro do mapa do app.
                </p>
              </div>
              {mapPosition.enabled ? (
                <Button type="button" variant="ghost" className="text-slate-500 hover:bg-white" onClick={clearMapPosition}>
                  Limpar
                </Button>
              ) : null}
            </div>

            <button
              type="button"
              onClick={handleMapPick}
              className="relative h-52 w-full overflow-hidden rounded-[28px] border border-slate-200 bg-[linear-gradient(180deg,#d8f3dc_0%,#effbf6_100%)] text-left"
            >
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(15,118,110,0.18),transparent_28%),radial-gradient(circle_at_80%_24%,rgba(255,255,255,0.9),transparent_22%),linear-gradient(120deg,rgba(56,189,248,0.2),transparent_45%)]" />
              <div className="absolute left-[32%] top-[14%] h-[68%] w-[32%] rounded-[120px] border-[16px] border-white/65" />
              <div className="absolute inset-y-0 left-[48%] w-1 rounded-full bg-white/60" />

              {mapPosition.enabled ? (
                <div
                  className="absolute flex h-10 w-10 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-4 border-white bg-teal-600 text-sm font-semibold text-white shadow-lg"
                  style={{ left: `${mapPosition.x}%`, top: `${mapPosition.y}%` }}
                >
                  +
                </div>
              ) : (
                <div className="absolute inset-x-4 bottom-4 rounded-2xl bg-white/90 px-4 py-3 text-sm text-slate-500 shadow-sm">
                  Toque para marcar onde esse evento aparece no mapa da viagem.
                </div>
              )}
            </button>

            <div className="grid grid-cols-2 gap-3">
              <Input name="mapX" label="Posicao X (%)" value={mapPosition.enabled ? String(Math.round(mapPosition.x)) : ''} readOnly />
              <Input name="mapY" label="Posicao Y (%)" value={mapPosition.enabled ? String(Math.round(mapPosition.y)) : ''} readOnly />
            </div>
          </div>

          <label className="flex flex-col gap-2 text-sm font-medium text-slate-600">
            <span>Tipo</span>
            <select
              name="type"
              defaultValue={editingEvent?.type ?? 'evento'}
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none focus:border-teal-500 focus:ring-4 focus:ring-teal-100"
            >
              {types.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </label>
          <Input name="relatedId" label="ID relacionado (opcional)" defaultValue={editingEvent?.relatedId ?? ''} />
          <div className="grid grid-cols-2 gap-3">
            <Button type="button" variant="secondary" onClick={() => navigate('/agenda')}>
              Cancelar
            </Button>
            <Button type="submit" disabled={submitting || usingMockData}>
              {submitting ? 'Salvando...' : eventId ? 'Atualizar' : 'Salvar'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  )
}

export default AgendaFormPage
