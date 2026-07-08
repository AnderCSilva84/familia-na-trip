import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import Button from '../../components/common/Button'
import Card from '../../components/common/Card'
import EmptyState from '../../components/common/EmptyState'
import Input from '../../components/common/Input'
import Loading from '../../components/common/Loading'
import ErrorState from '../../components/feedback/ErrorState'
import StatusMessage from '../../components/feedback/StatusMessage'
import useHotels from '../../hooks/useHotels'
import { formatDateInput } from '../../utils/formatters'
import { getLinkPreviewData } from '../../utils/linkPreview'

function HotelFormPage() {
  const navigate = useNavigate()
  const { hotelId } = useParams()
  const { hotels, loading, error, usingMockData, create, update } = useHotels()
  const [submitting, setSubmitting] = useState(false)
  const [feedback, setFeedback] = useState('')
  const editingHotel = hotels.find((hotel) => hotel.id === hotelId)
  const [reservationLink, setReservationLink] = useState(editingHotel?.link ?? '')
  const [imageUrl, setImageUrl] = useState(editingHotel?.image ?? '')

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
        hotelName: String(formData.get('hotelName') ?? ''),
        address: String(formData.get('address') ?? ''),
        checkIn: String(formData.get('checkIn') ?? ''),
        checkOut: String(formData.get('checkOut') ?? ''),
        estimatedValue: Number(formData.get('estimatedValue') ?? 0),
        finalValue: Number(formData.get('finalValue') ?? 0),
        link: reservationLink,
        image: imageUrl,
        mapX: String(formData.get('mapX') ?? ''),
        mapY: String(formData.get('mapY') ?? ''),
        status: String(formData.get('status') ?? 'pesquisando'),
        notes: String(formData.get('notes') ?? ''),
        addAgendaEvents: formData.get('addAgendaEvents') === 'on',
      }

      if (hotelId) {
        await update(hotelId, payload)
      } else {
        await create(payload)
      }

      navigate('/hotels')
    } catch (submitError) {
      setFeedback(submitError.message ?? 'Nao foi possivel salvar a hospedagem.')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return <Loading />
  if (error) return <ErrorState title="Falha ao abrir hospedagem" description={error} />
  if (hotelId && !editingHotel && !usingMockData) {
    return <EmptyState title="Hospedagem nao encontrada" description="Esse registro pode ter sido removido." />
  }

  return (
    <div className="space-y-4">
      <StatusMessage
        message={usingMockData ? 'Modo mock ativo. O formulario serve como fallback visual.' : feedback}
        tone={usingMockData ? 'info' : 'error'}
      />
      <Card>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <Input name="title" label="Titulo" defaultValue={editingHotel?.title ?? ''} required />
          <Input name="hotelName" label="Nome do hotel" defaultValue={editingHotel?.hotelName ?? ''} required />
          <Input name="address" label="Endereco" defaultValue={editingHotel?.address ?? ''} />
          <div className="grid grid-cols-2 gap-3">
            <Input name="checkIn" label="Check-in" type="date" defaultValue={formatDateInput(editingHotel?.checkIn)} required />
            <Input name="checkOut" label="Check-out" type="date" defaultValue={formatDateInput(editingHotel?.checkOut)} required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input name="estimatedValue" label="Valor estimado" type="number" step="0.01" defaultValue={editingHotel?.estimatedValue ?? ''} />
            <Input name="finalValue" label="Valor final" type="number" step="0.01" defaultValue={editingHotel?.finalValue ?? ''} />
          </div>
          <Input
            name="link"
            label="Link da reserva"
            value={reservationLink}
            onChange={(event) => setReservationLink(event.target.value)}
            onBlur={handleLinkBlur}
            placeholder="Booking, Airbnb, hotel..."
          />
          <Input
            name="image"
            label="Imagem (URL)"
            value={imageUrl}
            onChange={(event) => setImageUrl(event.target.value)}
            placeholder="https://..."
          />
          {imageUrl ? (
            <img
              src={imageUrl}
              alt={editingHotel?.hotelName ?? 'Preview da hospedagem'}
              loading="lazy"
              decoding="async"
              className="h-48 w-full rounded-[28px] object-cover"
            />
          ) : null}
          <div className="grid grid-cols-2 gap-3">
            <Input name="mapX" label="Posicao X (%)" defaultValue={editingHotel?.mapX ?? ''} />
            <Input name="mapY" label="Posicao Y (%)" defaultValue={editingHotel?.mapY ?? ''} />
          </div>
          <label className="flex flex-col gap-2 text-sm font-medium text-slate-600">
            <span>Status</span>
            <select name="status" defaultValue={editingHotel?.status ?? 'pesquisando'} className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none focus:border-teal-500 focus:ring-4 focus:ring-teal-100">
              <option value="pesquisando">pesquisando</option>
              <option value="reservado">reservado</option>
              <option value="pago">pago</option>
              <option value="cancelado">cancelado</option>
            </select>
          </label>
          <label className="flex flex-col gap-2 text-sm font-medium text-slate-600">
            <span>Observacoes</span>
            <textarea name="notes" defaultValue={editingHotel?.notes ?? ''} className="min-h-28 rounded-2xl border border-slate-200 px-4 py-3 text-slate-900 outline-none focus:border-teal-500 focus:ring-4 focus:ring-teal-100" />
          </label>
          <label className="flex items-center gap-3 rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
            <input type="checkbox" name="addAgendaEvents" defaultChecked />
            Criar eventos de check-in e check-out na agenda
          </label>
          <div className="grid grid-cols-2 gap-3">
            <Button type="button" variant="secondary" onClick={() => navigate('/hotels')}>Cancelar</Button>
            <Button type="submit" disabled={submitting || usingMockData}>{submitting ? 'Salvando...' : hotelId ? 'Atualizar' : 'Salvar'}</Button>
          </div>
        </form>
      </Card>
    </div>
  )
}

export default HotelFormPage
