import { useMemo, useState } from 'react'
import { FiExternalLink, FiFileText, FiPlus, FiSearch, FiTrash2, FiUploadCloud } from 'react-icons/fi'
import Button from '../../components/common/Button'
import Card from '../../components/common/Card'
import EmptyState from '../../components/common/EmptyState'
import Input from '../../components/common/Input'
import Loading from '../../components/common/Loading'
import ErrorState from '../../components/feedback/ErrorState'
import StatusMessage from '../../components/feedback/StatusMessage'
import useAuth from '../../hooks/useAuth'
import useWallet from '../../hooks/useWallet'
import useAgenda from '../../hooks/useAgenda'
import { Link } from 'react-router-dom'
import { canEditAnyContent, canEditOwnContent } from '../../utils/permissions'
import { formatDisplayDate } from '../../utils/formatters'

const categories = { reserva: 'Reservas', checkin: 'Check-ins', passagem: 'Passagens', aluguel_carro: 'Aluguel de carro', seguro: 'Seguros', outros: 'Outros' }

function WalletPage() {
  const { userProfile } = useAuth()
  const { agenda } = useAgenda()
  const { documents, loading, error, addDocument, deleteDocument } = useWallet()
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [feedback, setFeedback] = useState('')
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('todos')
  const filtered = useMemo(() => documents.filter((item) => (category === 'todos' || item.category === category) && `${item.name} ${item.fileName}`.toLowerCase().includes(search.toLowerCase())), [documents, search, category])

  async function handleSubmit(event) {
    event.preventDefault(); setSaving(true); setFeedback('')
    const formElement = event.currentTarget
    try {
      const form = new FormData(formElement)
      await addDocument({ name: String(form.get('name')), category: String(form.get('category')), notes: String(form.get('notes') ?? ''), agendaId: String(form.get('agendaId') ?? '') }, form.get('file'))
      formElement.reset(); setShowForm(false); setFeedback('PDF guardado na carteira com sucesso.')
    } catch (uploadError) { setFeedback(uploadError.message ?? 'Nao foi possivel guardar o PDF.') } finally { setSaving(false) }
  }

  async function handleDelete(id) {
    if (!window.confirm('Remover este PDF da carteira?')) return
    try { await deleteDocument(id); setFeedback('PDF removido com sucesso.') } catch (deleteError) { setFeedback(deleteError.message ?? 'Nao foi possivel remover o PDF.') }
  }

  return <div className="space-y-4">
    <Card className="overflow-hidden border-0 bg-[linear-gradient(135deg,#0f766e_0%,#14b8a6_100%)] text-white">
      <div className="flex items-center justify-between gap-4"><div><p className="text-sm text-teal-100">Documentos da viagem</p><h2 className="mt-1 text-2xl font-semibold">Tudo importante, sempre a mao</h2><p className="mt-2 max-w-xl text-sm text-teal-50">Reservas, check-ins, passagens e comprovantes em um lugar seguro.</p></div><FiFileText className="shrink-0 opacity-80" size={48} /></div>
    </Card>
    <div className="flex justify-end"><Button icon={<FiPlus />} onClick={() => setShowForm((value) => !value)}>{showForm ? 'Fechar' : 'Adicionar PDF'}</Button></div>
    <StatusMessage message={feedback} tone={feedback.includes('sucesso') ? 'success' : 'error'} />
    {showForm ? <Card><form className="space-y-3" onSubmit={handleSubmit}>
      <Input name="name" label="Nome do documento" placeholder="Ex.: Reserva do hotel em Salvador" required />
      <label className="flex flex-col gap-2 text-sm font-medium text-slate-600"><span>Categoria</span><select name="category" className="rounded-2xl border border-slate-200 bg-white px-4 py-3" defaultValue="reserva">{Object.entries(categories).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
      <Input name="notes" label="Observacao (opcional)" placeholder="Codigo, viajante ou informacao rapida" />
      <label className="flex flex-col gap-2 text-sm font-medium text-slate-600"><span>Compromisso relacionado (opcional)</span><select name="agendaId" className="rounded-2xl border border-slate-200 bg-white px-4 py-3"><option value="">Nenhum compromisso</option>{agenda.map((event) => <option key={event.id} value={event.id}>{event.date} · {event.title}</option>)}</select></label>
      <label className="flex flex-col gap-2 text-sm font-medium text-slate-600"><span>Arquivo PDF (max. 15 MB)</span><input name="file" type="file" accept="application/pdf,.pdf" required className="rounded-2xl border border-dashed border-teal-300 bg-teal-50 px-4 py-5 file:mr-3 file:rounded-full file:border-0 file:bg-teal-700 file:px-4 file:py-2 file:text-white" /></label>
      <Button type="submit" className="w-full" icon={<FiUploadCloud />} disabled={saving}>{saving ? 'Enviando PDF...' : 'Guardar na carteira'}</Button>
    </form></Card> : null}
    <Card className="min-w-0 space-y-3 overflow-hidden"><div className="relative"><FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar documento" className="w-full min-w-0 rounded-2xl border border-slate-200 py-3 pl-11 pr-4 outline-none focus:border-teal-500" /></div><div className="flex max-w-full gap-2 overflow-x-auto pb-1">{[['todos','Todos'], ...Object.entries(categories)].map(([value, label]) => <button key={value} onClick={() => setCategory(value)} className={`shrink-0 whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold ${category === value ? 'bg-teal-700 text-white' : 'bg-slate-100 text-slate-600'}`}>{label}</button>)}</div></Card>
    {loading ? <Loading /> : null}{error ? <ErrorState title="Falha ao carregar carteira" description={error} /> : null}
    {!loading && !error && filtered.length === 0 ? <EmptyState title="Nenhum PDF encontrado" description="Adicione reservas, check-ins e outros documentos importantes da viagem." /> : null}
    <div className="grid min-w-0 gap-4 sm:grid-cols-2">
      {filtered.map((item) => {
        const canManage = canEditAnyContent(userProfile) || canEditOwnContent(userProfile, item)
        const relatedEvent = agenda.find((event) => event.id === item.agendaId)

        return (
          <Card key={item.id} className="min-w-0 overflow-hidden p-0">
            <div className="flex min-w-0 items-start gap-3 p-4 pb-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-rose-50 text-rose-600">
                <FiFileText size={24} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <span className="min-w-0 text-xs font-bold uppercase tracking-[0.1em] text-teal-700">
                    {categories[item.category] ?? 'Outros'}
                  </span>
                  {canManage ? (
                    <button
                      type="button"
                      aria-label={`Excluir ${item.name}`}
                      onClick={() => handleDelete(item.id)}
                      className="-mr-1 -mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-slate-400 transition hover:bg-rose-50 hover:text-rose-600"
                    >
                      <FiTrash2 size={17} />
                    </button>
                  ) : null}
                </div>
                <h3 className="mt-1 line-clamp-2 break-words text-base font-semibold leading-6 text-slate-950">
                  {item.name}
                </h3>
                <p className="mt-1 line-clamp-2 break-words text-sm leading-5 text-slate-500">
                  {item.notes || item.fileName}
                </p>
                {relatedEvent ? (
                  <Link
                    to={`/agenda/${relatedEvent.id}/edit`}
                    className="mt-3 flex min-w-0 flex-wrap items-center gap-x-1 text-xs font-semibold text-teal-800"
                  >
                    <span>{formatDisplayDate(relatedEvent.date)}</span>
                    <span aria-hidden="true">·</span>
                    <span className="min-w-0 break-words">{relatedEvent.title}</span>
                  </Link>
                ) : null}
              </div>
            </div>
            <div className="border-t border-slate-100 bg-slate-50/60 p-3">
              <Button as="a" href={item.url} target="_blank" rel="noreferrer" variant="secondary" className="w-full min-w-0" icon={<FiExternalLink />}>
                Abrir PDF
              </Button>
            </div>
          </Card>
        )
      })}
    </div>
  </div>
}
export default WalletPage
