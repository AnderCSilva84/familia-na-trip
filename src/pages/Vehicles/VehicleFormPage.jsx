import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import Button from '../../components/common/Button'
import Card from '../../components/common/Card'
import EmptyState from '../../components/common/EmptyState'
import Input from '../../components/common/Input'
import Loading from '../../components/common/Loading'
import ErrorState from '../../components/feedback/ErrorState'
import StatusMessage from '../../components/feedback/StatusMessage'
import useVehicles from '../../hooks/useVehicles'
import { formatDateInput } from '../../utils/formatters'

function VehicleFormPage() {
  const navigate = useNavigate()
  const { vehicleId } = useParams()
  const { vehicles, loading, error, usingMockData, create, update } = useVehicles()
  const [submitting, setSubmitting] = useState(false)
  const [feedback, setFeedback] = useState('')
  const editingVehicle = vehicles.find((vehicle) => vehicle.id === vehicleId)

  async function handleSubmit(event) {
    event.preventDefault()
    setSubmitting(true)
    setFeedback('')

    try {
      const formData = new FormData(event.currentTarget)
      const payload = {
        title: String(formData.get('title') ?? ''),
        rentalCompany: String(formData.get('rentalCompany') ?? ''),
        vehicleModel: String(formData.get('vehicleModel') ?? ''),
        pickupLocation: String(formData.get('pickupLocation') ?? ''),
        returnLocation: String(formData.get('returnLocation') ?? ''),
        pickupDate: String(formData.get('pickupDate') ?? ''),
        returnDate: String(formData.get('returnDate') ?? ''),
        estimatedValue: Number(formData.get('estimatedValue') ?? 0),
        finalValue: Number(formData.get('finalValue') ?? 0),
        link: String(formData.get('link') ?? ''),
        image: String(formData.get('image') ?? ''),
        status: String(formData.get('status') ?? 'pesquisando'),
        notes: String(formData.get('notes') ?? ''),
        addAgendaEvents: formData.get('addAgendaEvents') === 'on',
      }

      if (vehicleId) {
        await update(vehicleId, payload)
      } else {
        await create(payload)
      }

      navigate('/vehicles')
    } catch (submitError) {
      setFeedback(submitError.message ?? 'Nao foi possivel salvar o veiculo.')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return <Loading />
  if (error) return <ErrorState title="Falha ao abrir veiculo" description={error} />
  if (vehicleId && !editingVehicle && !usingMockData) {
    return <EmptyState title="Veiculo nao encontrado" description="Esse registro pode ter sido removido." />
  }

  return (
    <div className="space-y-4">
      <StatusMessage message={usingMockData ? 'Modo mock ativo. O formulario serve como fallback visual.' : feedback} tone={usingMockData ? 'info' : 'error'} />
      <Card>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <Input name="title" label="Titulo" defaultValue={editingVehicle?.title ?? ''} required />
          <Input name="rentalCompany" label="Locadora" defaultValue={editingVehicle?.rentalCompany ?? ''} required />
          <Input name="vehicleModel" label="Modelo do veiculo" defaultValue={editingVehicle?.vehicleModel ?? ''} required />
          <Input name="pickupLocation" label="Local de retirada" defaultValue={editingVehicle?.pickupLocation ?? ''} />
          <Input name="returnLocation" label="Local de devolucao" defaultValue={editingVehicle?.returnLocation ?? ''} />
          <div className="grid grid-cols-2 gap-3">
            <Input name="pickupDate" label="Data de retirada" type="date" defaultValue={formatDateInput(editingVehicle?.pickupDate)} required />
            <Input name="returnDate" label="Data de devolucao" type="date" defaultValue={formatDateInput(editingVehicle?.returnDate)} required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input name="estimatedValue" label="Valor estimado" type="number" step="0.01" defaultValue={editingVehicle?.estimatedValue ?? ''} />
            <Input name="finalValue" label="Valor final" type="number" step="0.01" defaultValue={editingVehicle?.finalValue ?? ''} />
          </div>
          <Input name="link" label="Link da locacao" defaultValue={editingVehicle?.link ?? ''} />
          <Input name="image" label="Imagem (URL)" defaultValue={editingVehicle?.image ?? ''} />
          <div className="grid grid-cols-2 gap-3">
            <Input name="mapX" label="Posicao X (%)" defaultValue={editingVehicle?.mapX ?? ''} />
            <Input name="mapY" label="Posicao Y (%)" defaultValue={editingVehicle?.mapY ?? ''} />
          </div>
          <label className="flex flex-col gap-2 text-sm font-medium text-slate-600">
            <span>Status</span>
            <select name="status" defaultValue={editingVehicle?.status ?? 'pesquisando'} className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none focus:border-teal-500 focus:ring-4 focus:ring-teal-100">
              <option value="pesquisando">pesquisando</option>
              <option value="reservado">reservado</option>
              <option value="pago">pago</option>
              <option value="cancelado">cancelado</option>
            </select>
          </label>
          <label className="flex flex-col gap-2 text-sm font-medium text-slate-600">
            <span>Observacoes</span>
            <textarea name="notes" defaultValue={editingVehicle?.notes ?? ''} className="min-h-28 rounded-2xl border border-slate-200 px-4 py-3 text-slate-900 outline-none focus:border-teal-500 focus:ring-4 focus:ring-teal-100" />
          </label>
          <label className="flex items-center gap-3 rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
            <input type="checkbox" name="addAgendaEvents" defaultChecked />
            Criar eventos de retirada e devolucao na agenda
          </label>
          <div className="grid grid-cols-2 gap-3">
            <Button type="button" variant="secondary" onClick={() => navigate('/vehicles')}>Cancelar</Button>
            <Button type="submit" disabled={submitting || usingMockData}>{submitting ? 'Salvando...' : vehicleId ? 'Atualizar' : 'Salvar'}</Button>
          </div>
        </form>
      </Card>
    </div>
  )
}

export default VehicleFormPage
