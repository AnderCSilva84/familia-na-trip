import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import Button from '../../components/common/Button'
import Card from '../../components/common/Card'
import EmptyState from '../../components/common/EmptyState'
import Input from '../../components/common/Input'
import Loading from '../../components/common/Loading'
import ErrorState from '../../components/feedback/ErrorState'
import StatusMessage from '../../components/feedback/StatusMessage'
import useExpenses from '../../hooks/useExpenses'
import useMembers from '../../hooks/useMembers'
import { formatDateInput } from '../../utils/formatters'

const categories = [
  'Hospedagem',
  'Transporte',
  'Alimentacao',
  'Passeios',
  'Compras',
  'Emergencia',
  'Outros',
]

function ExpenseFormPage() {
  const navigate = useNavigate()
  const { expenseId } = useParams()
  const { expenses, loading, error, createExpense, updateExpense, usingMockData } = useExpenses()
  const { members } = useMembers()
  const editingExpense = expenses.find((expense) => expense.id === expenseId)
  const [selectedMembers, setSelectedMembers] = useState(null)
  const [selectedTypeOverride, setSelectedTypeOverride] = useState(null)
  const [feedback, setFeedback] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const selectedType = selectedTypeOverride ?? editingExpense?.type ?? 'efetivado'
  const dividedBetween = selectedMembers ?? editingExpense?.dividedBetween ?? []

  function toggleMember(memberName) {
    setSelectedMembers((current) => {
      const base = current ?? editingExpense?.dividedBetween ?? []

      return base.includes(memberName)
        ? base.filter((item) => item !== memberName)
        : [...base, memberName]
    })
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setSubmitting(true)
    setFeedback('')

    try {
      const formData = new FormData(event.currentTarget)
      const payload = {
        description: String(formData.get('description') ?? ''),
        category: String(formData.get('category') ?? 'Outros'),
        type: String(formData.get('type') ?? 'efetivado'),
        value: Number(formData.get('value') ?? 0),
        settled: formData.get('settled') === 'on',
        paidBy: String(formData.get('paidBy') ?? ''),
        dividedBetween,
        date: String(formData.get('date') ?? ''),
      }

      if (expenseId) {
        await updateExpense(expenseId, payload)
        setFeedback('Gasto atualizado com sucesso.')
      } else {
        await createExpense(payload)
        setFeedback('Gasto criado com sucesso.')
      }

      navigate('/expenses')
    } catch (submitError) {
      setFeedback(submitError.message ?? 'Nao foi possivel salvar o gasto.')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return <Loading />
  }

  if (error) {
    return <ErrorState title="Falha ao abrir gasto" description={error} />
  }

  if (expenseId && !editingExpense && !usingMockData) {
    return (
      <EmptyState
        title="Gasto nao encontrado"
        description="Esse lancamento pode ter sido removido ou ainda nao foi sincronizado."
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
          <Input
            name="description"
            label="Descricao"
            defaultValue={editingExpense?.description ?? ''}
            required
          />

          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-2 text-sm font-medium text-slate-600">
              <span>Categoria</span>
              <select
                name="category"
                defaultValue={editingExpense?.category ?? 'Outros'}
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none focus:border-teal-500 focus:ring-4 focus:ring-teal-100"
              >
                {categories.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-2 text-sm font-medium text-slate-600">
              <span>Tipo</span>
              <select
                name="type"
                value={selectedType}
                onChange={(event) => setSelectedTypeOverride(event.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none focus:border-teal-500 focus:ring-4 focus:ring-teal-100"
              >
                <option value="estimado">estimado</option>
                <option value="efetivado">efetivado</option>
              </select>
            </label>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              name="value"
              label="Valor"
              type="number"
              min="0"
              step="0.01"
              defaultValue={editingExpense?.value ?? ''}
              required
            />
            <Input
              name="date"
              label="Data"
              type="date"
              defaultValue={formatDateInput(editingExpense?.date) || new Date().toISOString().slice(0, 10)}
              required
            />
          </div>

          <label className="flex items-center gap-3 rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
            <input
              type="checkbox"
              name="settled"
              defaultChecked={editingExpense?.relatedAgendaId ? true : editingExpense?.settled === true}
              disabled={selectedType === 'estimado'}
            />
            Marcar como baixa confirmada no aplicativo
          </label>
          <p className="text-sm text-slate-500">
            Apenas gastos com baixa confirmada entram no consolidado de gastos efetivados do dashboard.
          </p>

          <label className="flex flex-col gap-2 text-sm font-medium text-slate-600">
            <span>Pago por</span>
            <select
              name="paidBy"
              defaultValue={editingExpense?.paidBy ?? ''}
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none focus:border-teal-500 focus:ring-4 focus:ring-teal-100"
            >
              <option value="">Selecione um membro</option>
              {members.map((member) => (
                <option key={member.id} value={member.name}>
                  {member.name}
                </option>
              ))}
            </select>
          </label>

          <div className="space-y-3">
            <p className="text-sm font-medium text-slate-600">Dividir entre</p>
            <div className="flex flex-wrap gap-2">
              {members.map((member) => {
                const selected = dividedBetween.includes(member.name)

                return (
                  <button
                    key={member.id}
                    type="button"
                    onClick={() => toggleMember(member.name)}
                    className={`rounded-full px-4 py-2 text-sm font-medium ${
                      selected
                        ? 'bg-teal-700 text-white'
                        : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {member.name}
                  </button>
                )
              })}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={() => navigate('/expenses')}>
              Cancelar
            </Button>
            <Button type="submit" disabled={submitting || usingMockData}>
              {submitting ? 'Salvando...' : expenseId ? 'Atualizar' : 'Salvar'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  )
}

export default ExpenseFormPage
