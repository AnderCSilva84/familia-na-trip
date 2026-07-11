import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import Button from '../../components/common/Button'
import Card from '../../components/common/Card'
import EmptyState from '../../components/common/EmptyState'
import Input from '../../components/common/Input'
import Loading from '../../components/common/Loading'
import ErrorState from '../../components/feedback/ErrorState'
import StatusMessage from '../../components/feedback/StatusMessage'
import useItinerary from '../../hooks/useItinerary'
import { formatDateInput } from '../../utils/formatters'
import { getLinkPreviewData } from '../../utils/linkPreview'

function ItineraryFormPage() {
  const navigate = useNavigate()
  const { itemId } = useParams()
  const { items, loading, error, createItem, updateItem, usingMockData } = useItinerary()
  const [feedback, setFeedback] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const editingItem = items.find((item) => item.id === itemId)
  const [reservationLink, setReservationLink] = useState(editingItem?.link ?? '')
  const [imageUrl, setImageUrl] = useState(editingItem?.image ?? '')

  useEffect(() => {
    if (!editingItem) {
      return () => {}
    }

    let cancelled = false
    queueMicrotask(() => {
      if (!cancelled) {
        setReservationLink(editingItem.link ?? '')
        setImageUrl(editingItem.image ?? '')
      }
    })

    return () => {
      cancelled = true
    }
  }, [editingItem])

  async function handleLinkBlur() {
    if (!reservationLink || imageUrl) {
      return
    }

    const previewData = await getLinkPreviewData(reservationLink)

    if (previewData?.image) {
      setImageUrl(previewData.image)
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
        description: String(formData.get('description') ?? ''),
        location: String(formData.get('location') ?? ''),
        city: String(formData.get('city') ?? ''),
        local: String(formData.get('local') ?? ''),
        address: String(formData.get('address') ?? ''),
        postalCode: String(formData.get('postalCode') ?? ''),
        date: String(formData.get('date') ?? ''),
        startTime: String(formData.get('startTime') ?? ''),
        endTime: '',
        link: reservationLink,
        image: imageUrl,
        mapX: String(formData.get('mapX') ?? ''),
        mapY: String(formData.get('mapY') ?? ''),
        status: String(formData.get('status') ?? 'planejado'),
      }

      if (itemId) {
        await updateItem(itemId, payload)
        setFeedback('Roteiro atualizado com sucesso.')
      } else {
        await createItem(payload)
        setFeedback('Item de roteiro criado com sucesso.')
      }

      navigate('/itinerary')
    } catch (submitError) {
      setFeedback(submitError.message ?? 'Nao foi possivel salvar o roteiro.')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return <Loading />
  }

  if (error) {
    return <ErrorState title="Falha ao abrir roteiro" description={error} />
  }

  if (itemId && !editingItem && !usingMockData) {
    return (
      <EmptyState
        title="Item nao encontrado"
        description="Esse ponto do roteiro pode ter sido removido ou ainda nao foi sincronizado."
      />
    )
  }

  return (
    <div className="space-y-4">
      <StatusMessage
        message={usingMockData ? 'Modo mock ativo. O formulario serve apenas como referencia visual.' : feedback}
        tone={usingMockData ? 'info' : feedback.includes('sucesso') ? 'success' : 'error'}
      />

      <Card className="space-y-5">
        <form className="space-y-4" onSubmit={handleSubmit}>
          <Input name="title" label="Titulo" defaultValue={editingItem?.title ?? ''} required />
          <Input name="description" label="Descricao" defaultValue={editingItem?.description ?? ''} />
          <Input name="location" label="Local" defaultValue={editingItem?.location ?? ''} />
          <div className="grid gap-3 sm:grid-cols-2">
            <Input name="city" label="Cidade" defaultValue={editingItem?.city ?? ''} />
            <Input name="local" label="Parada / local" defaultValue={editingItem?.local ?? ''} />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Input
              name="address"
              label="Endereco"
              defaultValue={editingItem?.address ?? ''}
              placeholder="Rua, avenida, numero..."
            />
            <Input
              name="postalCode"
              label="CEP"
              defaultValue={editingItem?.postalCode ?? ''}
              placeholder="00000-000"
            />
          </div>
          <Input
            name="link"
            label="Link da reserva ou plataforma"
            value={reservationLink}
            onChange={(event) => setReservationLink(event.target.value)}
            onBlur={handleLinkBlur}
            placeholder="Ex: Booking, ingresso, passeio..."
          />
          <Input
            name="image"
            label="Imagem / capa (URL)"
            value={imageUrl}
            onChange={(event) => setImageUrl(event.target.value)}
            placeholder="https://..."
          />
          {imageUrl ? (
            <img
              src={imageUrl}
              alt={editingItem?.title ?? 'Preview do roteiro'}
              loading="lazy"
              decoding="async"
              className="h-48 w-full rounded-[28px] object-cover"
            />
          ) : null}
          <Input
            name="date"
            label="Data"
            type="date"
            defaultValue={formatDateInput(editingItem?.date)}
            required
          />

          <Input name="startTime" label="Horario" type="time" step="1" defaultValue={editingItem?.startTime ?? ''} />
          <div className="grid grid-cols-2 gap-3">
            <Input name="mapX" label="Posicao X (%)" defaultValue={editingItem?.mapX ?? ''} />
            <Input name="mapY" label="Posicao Y (%)" defaultValue={editingItem?.mapY ?? ''} />
          </div>

          <label className="flex flex-col gap-2 text-sm font-medium text-slate-600">
            <span>Status</span>
            <select
              name="status"
              defaultValue={editingItem?.status ?? 'planejado'}
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none focus:border-teal-500 focus:ring-4 focus:ring-teal-100"
            >
              <option value="planejado">planejado</option>
              <option value="em_andamento">em_andamento</option>
              <option value="concluido">concluido</option>
            </select>
          </label>

          <div className="grid grid-cols-2 gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={() => navigate('/itinerary')}>
              Cancelar
            </Button>
            <Button type="submit" disabled={submitting || usingMockData}>
              {submitting ? 'Salvando...' : itemId ? 'Atualizar' : 'Salvar'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  )
}

export default ItineraryFormPage
