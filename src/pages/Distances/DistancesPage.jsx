import { useState } from 'react'
import { FiNavigation, FiPlus, FiTrash2 } from 'react-icons/fi'
import Button from '../../components/common/Button'
import Card from '../../components/common/Card'
import EmptyState from '../../components/common/EmptyState'
import Loading from '../../components/common/Loading'
import StatusMessage from '../../components/feedback/StatusMessage'
import useAuth from '../../hooks/useAuth'
import useDistances from '../../hooks/useDistances'
import { canEditAnyContent, canEditOwnContent } from '../../utils/permissions'

const modes = {
  plane: { label: 'Avião', emoji: '✈️' },
  car: { label: 'Carro', emoji: '🚗' },
  transit: { label: 'Metrô / transporte público', emoji: '🚇' },
  walking: { label: 'Andando', emoji: '🚶' },
}

function formatKilometers(value) {
  return `${new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 }).format(Number(value ?? 0))} km`
}

function DistancesPage() {
  const { userProfile } = useAuth()
  const { distances, summary, loading, error, create, remove } = useDistances()
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [feedback, setFeedback] = useState('')

  async function handleSubmit(event) {
    event.preventDefault()
    setSaving(true)
    setFeedback('')
    try {
      const form = new FormData(event.currentTarget)
      await create({
        mode: String(form.get('mode') ?? 'car'),
        origin: String(form.get('origin') ?? '').trim(),
        destination: String(form.get('destination') ?? '').trim(),
        kilometers: Number(form.get('kilometers')),
        date: String(form.get('date') ?? ''),
        notes: String(form.get('notes') ?? '').trim(),
      })
      event.currentTarget.reset()
      setShowForm(false)
      setFeedback('Distância registrada com sucesso.')
    } catch (saveError) {
      setFeedback(saveError.message ?? 'Não foi possível registrar a distância.')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id) {
    if (!window.confirm('Tem certeza que deseja excluir este trecho da viagem?')) return
    try {
      await remove(id)
      setFeedback('Trecho removido com sucesso.')
    } catch (deleteError) {
      setFeedback(deleteError.message ?? 'Não foi possível remover o trecho.')
    }
  }

  return (
    <div className="space-y-4">
      <StatusMessage message={feedback || error} tone={(feedback.includes('sucesso') || feedback.includes('adicionados') || feedback.includes('registrados')) ? 'success' : 'error'} />

      <div className="flex flex-wrap justify-end gap-3">
        <Button icon={<FiPlus />} onClick={() => setShowForm((current) => !current)}>
          Novo trecho
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        {[['plane', summary.plane], ['car', summary.car], ['transit', summary.transit], ['walking', summary.walking], ['total', summary.total]].map(([mode, value]) => (
          <Card key={mode} className="p-4">
            <p className="text-sm text-slate-500">{mode === 'total' ? 'Total da viagem' : modes[mode].label}</p>
            <p className="mt-2 text-2xl font-semibold text-slate-950">
              {mode === 'total' ? '🧭 ' : `${modes[mode].emoji} `}{formatKilometers(value)}
            </p>
          </Card>
        ))}
      </div>

      {showForm ? (
        <Card>
          <form className="grid gap-4 sm:grid-cols-2" onSubmit={handleSubmit}>
            <label className="flex flex-col gap-2 text-sm font-medium text-slate-600">
              <span>Meio de transporte</span>
              <select name="mode" defaultValue="car" className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                {Object.entries(modes).map(([value, item]) => <option key={value} value={value}>{item.label}</option>)}
              </select>
            </label>
            <label className="flex flex-col gap-2 text-sm font-medium text-slate-600">
              <span>Data</span>
              <input name="date" type="date" className="rounded-2xl border border-slate-200 px-4 py-3" />
            </label>
            <label className="flex flex-col gap-2 text-sm font-medium text-slate-600">
              <span>Origem</span>
              <input name="origin" required placeholder="Ex.: Salvador" className="rounded-2xl border border-slate-200 px-4 py-3" />
            </label>
            <label className="flex flex-col gap-2 text-sm font-medium text-slate-600">
              <span>Destino</span>
              <input name="destination" required placeholder="Ex.: Aracaju" className="rounded-2xl border border-slate-200 px-4 py-3" />
            </label>
            <label className="flex flex-col gap-2 text-sm font-medium text-slate-600">
              <span>Distância (km)</span>
              <input name="kilometers" type="number" min="0.1" step="0.1" required className="rounded-2xl border border-slate-200 px-4 py-3" />
            </label>
            <label className="flex flex-col gap-2 text-sm font-medium text-slate-600">
              <span>Observação</span>
              <input name="notes" placeholder="Opcional" className="rounded-2xl border border-slate-200 px-4 py-3" />
            </label>
            <div className="flex gap-3 sm:col-span-2">
              <Button type="button" variant="secondary" className="flex-1" onClick={() => setShowForm(false)}>Cancelar</Button>
              <Button type="submit" className="flex-1" disabled={saving}>{saving ? 'Salvando...' : 'Salvar trecho'}</Button>
            </div>
          </form>
        </Card>
      ) : null}

      {loading ? <Loading /> : null}
      {!loading && !distances.length ? (
        <EmptyState title="Nenhuma distância registrada" description="Insira o percurso desta viagem ou registre um trecho manualmente." />
      ) : null}
      <div className="space-y-3">
        {distances.map((item) => {
          const canDelete = canEditAnyContent(userProfile) || canEditOwnContent(userProfile, item)
          return (
            <Card key={item.id} className="flex items-center justify-between gap-4">
              <div className="flex min-w-0 items-center gap-4">
                <span className="text-3xl">{modes[item.mode]?.emoji ?? '🧭'}</span>
                <div className="min-w-0">
                  <p className="font-semibold text-slate-950">{item.origin} → {item.destination}</p>
                  <p className="text-sm text-slate-500">
                    {modes[item.mode]?.label} · {
                      item.source === 'manual'
                        ? 'informado manualmente'
                        : item.source === 'suggested'
                          ? item.calculationMethod === 'route'
                            ? 'rota real calculada automaticamente'
                            : 'estimativa automática'
                          : 'estimativa revisável'
                    }
                  </p>
                  {item.notes ? <p className="mt-1 text-xs text-slate-400">{item.notes}</p> : null}
                </div>
              </div>
              <div className="shrink-0 text-right">
                <p className="font-semibold text-teal-700">{formatKilometers(item.kilometers)}</p>
                {canDelete ? (
                  <button className="mt-2 text-rose-500" onClick={() => handleDelete(item.id)} aria-label={`Remover ${item.origin} para ${item.destination}`}>
                    <FiTrash2 />
                  </button>
                ) : null}
              </div>
            </Card>
          )
        })}
      </div>

      <Card className="border border-teal-100 bg-teal-50/60">
        <div className="flex gap-3">
          <FiNavigation className="mt-1 shrink-0 text-teal-700" />
          <div>
            <h3 className="font-semibold text-slate-950">Como funcionará nas próximas viagens</h3>
            <p className="mt-1 text-sm text-slate-600">
              Aviões serão sugeridos pelos aeroportos, deslocamentos entre cidades pela agenda e caminhadas pelas coordenadas dos pontos turísticos. Você revisa antes de confirmar.
            </p>
          </div>
        </div>
      </Card>
    </div>
  )
}

export default DistancesPage
