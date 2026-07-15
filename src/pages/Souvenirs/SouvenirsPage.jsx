import { useMemo, useState } from 'react'
import { FiCheck, FiGift, FiPlus, FiTrash2 } from 'react-icons/fi'
import Button from '../../components/common/Button'
import Card from '../../components/common/Card'
import EmptyState from '../../components/common/EmptyState'
import Input from '../../components/common/Input'
import Loading from '../../components/common/Loading'
import StatusMessage from '../../components/feedback/StatusMessage'
import useAuth from '../../hooks/useAuth'
import useChecklist from '../../hooks/useChecklist'
import { canEditAnyContent, canEditOwnContent } from '../../utils/permissions'

export default function SouvenirsPage() {
  const { userProfile } = useAuth()
  const { items, loading, error, addItem, toggleItem, deleteItem } = useChecklist()
  const [showForm, setShowForm] = useState(false)
  const [feedback, setFeedback] = useState('')
  const souvenirs = useMemo(() => items.filter((item) => item.kind === 'souvenir'), [items])
  const delivered = souvenirs.filter((item) => item.done).length

  async function submit(event) {
    event.preventDefault()
    const formElement = event.currentTarget
    const form = new FormData(formElement)
    try {
      await addItem({
        title: String(form.get('title') ?? '').trim(),
        recipient: String(form.get('recipient') ?? '').trim(),
        kind: 'souvenir',
        category: 'lembranca',
      })
      formElement.reset()
      setShowForm(false)
      setFeedback('Lembranca adicionada com sucesso.')
    } catch (submitError) {
      setFeedback(submitError.message ?? 'Nao foi possivel adicionar a lembranca.')
    }
  }

  return (
    <div className="space-y-4">
      <Card className="bg-[linear-gradient(135deg,#fff7ed,#fff)]">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-amber-700">Lista compartilhada</p>
            <h2 className="mt-1 text-2xl font-semibold text-slate-950">{delivered} de {souvenirs.length} entregues</h2>
          </div>
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-amber-500 text-white"><FiGift size={27} /></div>
        </div>
        <div className="mt-4 h-2 overflow-hidden rounded-full bg-amber-100">
          <div className="h-full bg-amber-500 transition-all" style={{ width: `${souvenirs.length ? (delivered / souvenirs.length) * 100 : 0}%` }} />
        </div>
      </Card>

      <div className="flex justify-end"><Button icon={<FiPlus />} onClick={() => setShowForm((value) => !value)}>Adicionar lembranca</Button></div>
      <StatusMessage message={feedback} tone={feedback.includes('sucesso') ? 'success' : 'error'} />

      {showForm ? (
        <Card><form className="space-y-3" onSubmit={submit}>
          <Input name="title" label="Nome da lembranca" placeholder="Ex: Chaveiro do Pelourinho" required />
          <Input name="recipient" label="Para quem foi" placeholder="Nome da pessoa" required />
          <Button type="submit" className="w-full">Salvar lembranca</Button>
        </form></Card>
      ) : null}

      {loading ? <Loading /> : null}
      {error ? <StatusMessage message={error} tone="error" /> : null}
      {!loading && !error && souvenirs.length === 0 ? <EmptyState title="Nenhuma lembranca na lista" description="Adicione o que voces compraram e para quem sera entregue." /> : null}
      <div className="space-y-2">
        {souvenirs.map((item) => {
          const canDelete = canEditAnyContent(userProfile) || canEditOwnContent(userProfile, item)
          return (
            <Card key={item.id} className={`flex items-center gap-3 ${item.done ? 'opacity-65' : ''}`}>
              <button type="button" onClick={() => toggleItem(item.id, !item.done)} aria-label={item.done ? 'Marcar como nao entregue' : 'Marcar como entregue'} className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border ${item.done ? 'border-teal-600 bg-teal-600 text-white' : 'border-slate-300 bg-white text-transparent'}`}><FiCheck /></button>
              <div className="min-w-0 flex-1">
                <p className={`font-semibold text-slate-900 ${item.done ? 'line-through' : ''}`}>{item.title}</p>
                <p className="text-sm text-slate-500">Para: {item.recipient}</p>
                <p className={`mt-1 text-xs font-semibold ${item.done ? 'text-teal-700' : 'text-amber-700'}`}>{item.done ? 'Entregue' : 'Pendente de entrega'}</p>
              </div>
              {canDelete ? <button type="button" onClick={() => deleteItem(item.id)} className="p-2 text-rose-500" aria-label="Excluir lembranca"><FiTrash2 /></button> : null}
            </Card>
          )
        })}
      </div>
    </div>
  )
}
