import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import Button from '../../components/common/Button'
import Card from '../../components/common/Card'
import EmptyState from '../../components/common/EmptyState'
import Input from '../../components/common/Input'
import Loading from '../../components/common/Loading'
import ErrorState from '../../components/feedback/ErrorState'
import StatusMessage from '../../components/feedback/StatusMessage'
import useTips from '../../hooks/useTips'

const categories = ['Restaurante', 'Passeio', 'Seguranca', 'Economia', 'Transporte', 'Criancas', 'Compras', 'Outros']

function TipFormPage() {
  const navigate = useNavigate()
  const { tipId } = useParams()
  const { tips, loading, error, usingMockData, create, update } = useTips()
  const [submitting, setSubmitting] = useState(false)
  const [feedback, setFeedback] = useState('')
  const editingTip = tips.find((tip) => tip.id === tipId)

  async function handleSubmit(event) {
    event.preventDefault()
    setSubmitting(true)
    setFeedback('')

    try {
      const formData = new FormData(event.currentTarget)
      const payload = {
        title: String(formData.get('title') ?? ''),
        description: String(formData.get('description') ?? ''),
        category: String(formData.get('category') ?? 'Outros'),
        location: String(formData.get('location') ?? ''),
        link: String(formData.get('link') ?? ''),
      }

      if (tipId) {
        await update(tipId, payload)
      } else {
        await create(payload)
      }

      navigate('/tips')
    } catch (submitError) {
      setFeedback(submitError.message ?? 'Nao foi possivel salvar a dica.')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return <Loading />
  if (error) return <ErrorState title="Falha ao abrir dica" description={error} />
  if (tipId && !editingTip && !usingMockData) {
    return <EmptyState title="Dica nao encontrada" description="Esse registro pode ter sido removido." />
  }

  return (
    <div className="space-y-4">
      <StatusMessage message={usingMockData ? 'Modo mock ativo. O formulario serve como fallback visual.' : feedback} tone={usingMockData ? 'info' : 'error'} />
      <Card>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <Input name="title" label="Titulo" defaultValue={editingTip?.title ?? ''} required />
          <label className="flex flex-col gap-2 text-sm font-medium text-slate-600">
            <span>Descricao</span>
            <textarea name="description" defaultValue={editingTip?.description ?? ''} className="min-h-28 rounded-2xl border border-slate-200 px-4 py-3 text-slate-900 outline-none focus:border-teal-500 focus:ring-4 focus:ring-teal-100" />
          </label>
          <label className="flex flex-col gap-2 text-sm font-medium text-slate-600">
            <span>Categoria</span>
            <select name="category" defaultValue={editingTip?.category ?? 'Outros'} className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none focus:border-teal-500 focus:ring-4 focus:ring-teal-100">
              {categories.map((category) => <option key={category} value={category}>{category}</option>)}
            </select>
          </label>
          <Input name="location" label="Local (opcional)" defaultValue={editingTip?.location ?? ''} />
          <Input name="link" label="Link (opcional)" defaultValue={editingTip?.link ?? ''} />
          <div className="grid grid-cols-2 gap-3">
            <Input name="mapX" label="Posicao X (%)" defaultValue={editingTip?.mapX ?? ''} />
            <Input name="mapY" label="Posicao Y (%)" defaultValue={editingTip?.mapY ?? ''} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Button type="button" variant="secondary" onClick={() => navigate('/tips')}>Cancelar</Button>
            <Button type="submit" disabled={submitting || usingMockData}>{submitting ? 'Salvando...' : tipId ? 'Atualizar' : 'Salvar'}</Button>
          </div>
        </form>
      </Card>
    </div>
  )
}

export default TipFormPage
