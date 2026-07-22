import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import AppImage from '../../components/common/AppImage'
import Button from '../../components/common/Button'
import Card from '../../components/common/Card'
import EmptyState from '../../components/common/EmptyState'
import Input from '../../components/common/Input'
import Loading from '../../components/common/Loading'
import StatusMessage from '../../components/feedback/StatusMessage'
import useAttractions from '../../hooks/useAttractions'

export default function AttractionFormPage() {
  const navigate = useNavigate()
  const { attractionId } = useParams()
  const { items, loading, error, createItem, updateItem } = useAttractions()
  const editingItem = items.find((item) => item.id === attractionId)
  const [image, setImage] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [feedback, setFeedback] = useState('')

  useEffect(() => { if (editingItem) queueMicrotask(() => setImage(editingItem.image ?? '')) }, [editingItem])

  async function handleSubmit(event) {
    event.preventDefault()
    setSubmitting(true)
    setFeedback('')
    try {
      const form = new FormData(event.currentTarget)
      const data = {
        name: String(form.get('name') ?? ''), city: String(form.get('city') ?? ''),
        category: String(form.get('category') ?? 'ponto_turistico'), description: String(form.get('description') ?? ''),
        address: String(form.get('address') ?? ''), link: String(form.get('link') ?? ''), image,
      }
      if (attractionId) await updateItem(attractionId, data)
      else await createItem(data)
      navigate('/attractions')
    } catch (submitError) {
      setFeedback(submitError.message ?? 'Nao foi possivel salvar a atracao.')
    } finally { setSubmitting(false) }
  }

  if (loading) return <Loading />
  if (error) return <StatusMessage message={error} tone="error" />
  if (attractionId && !editingItem) return <EmptyState title="Ponto turistico nao encontrado" description="Ele pode ter sido removido ou ainda nao foi sincronizado." />

  return <Card><form className="space-y-4" onSubmit={handleSubmit}>
    <StatusMessage message={feedback} tone="error" />
    <Input name="name" label="Nome do ponto turistico" defaultValue={editingItem?.name ?? ''} required />
    <Input name="city" label="Cidade" defaultValue={editingItem?.city ?? ''} required />
    <label className="flex flex-col gap-2 text-sm font-medium text-slate-600"><span>Categoria</span><select name="category" defaultValue={editingItem?.category ?? 'ponto_turistico'} className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900"><option value="ponto_turistico">Ponto turistico</option><option value="monumento">Monumento</option><option value="museu">Museu</option><option value="parque">Parque</option><option value="praia">Praia</option><option value="igreja">Igreja</option><option value="mirante">Mirante</option><option value="mercado">Mercado</option><option value="outro">Outro</option></select></label>
    <Input name="address" label="Endereco" defaultValue={editingItem?.address ?? ''} />
    <Input name="link" label="Link do local" type="url" defaultValue={editingItem?.link ?? ''} placeholder="https://..." />
    <Input name="image" label="Imagem (URL)" type="url" value={image} onChange={(event) => setImage(event.target.value)} placeholder="https://..." />
    {image ? <AppImage src={image} alt="Previa da atracao" className="h-52 w-full rounded-[28px] object-cover" fallbackClassName="h-52 w-full rounded-[28px]" fallbackLabel="Imagem invalida" /> : null}
    <label className="flex flex-col gap-2 text-sm font-medium text-slate-600"><span>Descricao</span><textarea name="description" defaultValue={editingItem?.description ?? ''} className="min-h-28 rounded-2xl border border-slate-200 px-4 py-3 text-slate-900 outline-none focus:border-teal-500 focus:ring-4 focus:ring-teal-100" /></label>
    <div className="grid grid-cols-2 gap-3"><Button type="button" variant="secondary" onClick={() => navigate('/attractions')}>Cancelar</Button><Button type="submit" disabled={submitting}>{submitting ? 'Salvando...' : 'Salvar'}</Button></div>
  </form></Card>
}
