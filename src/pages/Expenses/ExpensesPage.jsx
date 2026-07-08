import { useState } from 'react'
import { FiEdit2, FiTrash2 } from 'react-icons/fi'
import { useNavigate } from 'react-router-dom'
import Button from '../../components/common/Button'
import Card from '../../components/common/Card'
import EmptyState from '../../components/common/EmptyState'
import Loading from '../../components/common/Loading'
import ExpenseCard from '../../components/cards/ExpenseCard'
import ErrorState from '../../components/feedback/ErrorState'
import StatusMessage from '../../components/feedback/StatusMessage'
import useAuth from '../../hooks/useAuth'
import useExpenses from '../../hooks/useExpenses'
import { canCreateContent, canEditAnyContent, canEditOwnContent } from '../../utils/permissions'
import { formatCurrency, formatDisplayDate } from '../../utils/formatters'

const expenseFilters = [
  { id: 'todos', label: 'Todos' },
  { id: 'confirmados', label: 'Confirmados' },
  { id: 'pendentes', label: 'Pendentes' },
  { id: 'planejados', label: 'Planejados' },
]

function clampPercentage(value) {
  if (!Number.isFinite(value) || value <= 0) {
    return 0
  }

  return Math.max(0, Math.min(100, value))
}

function getExpenseStatus(expense) {
  if (expense.type === 'estimado') {
    return {
      label: 'Planejado',
      tone: 'bg-slate-100 text-slate-600',
    }
  }

  if (expense.relatedAgendaId || expense.settled) {
    return {
      label: 'Baixa confirmada',
      tone: 'bg-teal-50 text-teal-700',
    }
  }

  return {
    label: 'Pendente de baixa',
    tone: 'bg-amber-50 text-amber-700',
  }
}

function matchesExpenseFilter(expense, filterId) {
  const isPlanned = expense.type === 'estimado'
  const isConfirmed = !isPlanned && (expense.relatedAgendaId || expense.settled)
  const isPending = !isPlanned && !isConfirmed

  if (filterId === 'confirmados') {
    return isConfirmed
  }

  if (filterId === 'pendentes') {
    return isPending
  }

  if (filterId === 'planejados') {
    return isPlanned
  }

  return true
}

function ExpensesPage() {
  const navigate = useNavigate()
  const { userProfile, trip } = useAuth()
  const { expenses, summary, loading, error, deleteExpense, usingMockData } = useExpenses()
  const [feedback, setFeedback] = useState('')
  const [activeFilter, setActiveFilter] = useState('todos')
  const totalBase = summary.totalEstimated || summary.totalActual || 1
  const actualPercentage = clampPercentage(Math.round((summary.totalActual / totalBase) * 100))
  const totalBudget = Number(trip?.totalBudget ?? 0)
  const remainingEstimatedBudget = totalBudget - summary.totalEstimated
  const remainingActualBudget = totalBudget - summary.totalActual
  const filteredExpenses = expenses.filter((expense) => matchesExpenseFilter(expense, activeFilter))

  async function handleDelete(expenseId) {
    try {
      await deleteExpense(expenseId)
      setFeedback('Gasto removido com sucesso.')
    } catch (deleteError) {
      setFeedback(deleteError.message ?? 'Nao foi possivel remover o gasto.')
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
        {canCreateContent(userProfile) ? <Button onClick={() => navigate('/expenses/new')}>Novo gasto</Button> : null}
      </div>

      {usingMockData ? (
        <StatusMessage message="Firebase nao configurado. Os totais abaixo usam o fallback mockado." tone="info" />
      ) : null}

      <StatusMessage message={feedback} tone={feedback.includes('sucesso') ? 'success' : 'error'} />

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.6fr)]">
        <ExpenseCard title="Total efetivado" value={summary.totalActual} percentage={actualPercentage} />
        <ExpenseCard title="Total estimado" value={summary.totalEstimated} percentage={100} />
        <Card className="h-full overflow-hidden">
          <h3 className="text-lg font-semibold text-slate-950">Resumo rapido</h3>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="rounded-3xl bg-slate-50 p-4">
              <p className="text-sm text-slate-500">Diferenca</p>
              <p className="mt-2 text-xl font-semibold leading-tight text-slate-950">{formatCurrency(summary.difference)}</p>
            </div>
            <div className="rounded-3xl bg-slate-50 p-4">
              <p className="text-sm text-slate-500">Lancamentos</p>
              <p className="mt-2 text-xl font-semibold leading-tight text-slate-950">{expenses.length}</p>
            </div>
            <div className="rounded-3xl bg-slate-50 p-4">
              <p className="text-sm text-slate-500">Orcamento total</p>
              <p className="mt-2 text-xl font-semibold leading-tight text-slate-950">{formatCurrency(totalBudget)}</p>
            </div>
            <div className="rounded-3xl bg-slate-50 p-4">
              <p className="text-sm text-slate-500">Saldo projetado</p>
              <p
                className={`mt-2 text-xl font-semibold leading-tight ${
                  remainingEstimatedBudget < 0 ? 'text-rose-600' : 'text-slate-950'
                }`}
              >
                {formatCurrency(remainingEstimatedBudget)}
              </p>
            </div>
          </div>
        </Card>
      </div>

      <Card className="overflow-hidden bg-[linear-gradient(135deg,#f8fffd_0%,#ffffff_100%)]">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="text-sm text-slate-500">Saldo da viagem</p>
            <h3 className="mt-1 break-words text-3xl font-semibold leading-tight text-slate-950 sm:text-xl">
              {formatCurrency(remainingActualBudget)}
            </h3>
          </div>
          <div className="w-fit max-w-full rounded-full bg-teal-50 px-4 py-2 text-sm font-semibold text-teal-700">
            Orcamento inicial: {formatCurrency(totalBudget)}
          </div>
        </div>
      </Card>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <Card className="overflow-hidden">
          <h3 className="text-lg font-semibold text-slate-950">Categorias</h3>
          <div className="mt-4 space-y-4">
            {summary.byCategory.map((item) => {
              const percentage = clampPercentage(
                summary.totalActual ? Math.round((item.value / summary.totalActual) * 100) : 0,
              )

              return (
                <div key={item.name} className="space-y-2">
                  <div className="flex items-start justify-between gap-3 text-sm text-slate-600">
                    <span className="min-w-0 flex-1 break-words">{item.name}</span>
                    <span className="shrink-0 text-right font-medium">{formatCurrency(item.value)}</span>
                  </div>
                  <div className="overflow-hidden rounded-full bg-slate-100">
                    <div className="h-2 rounded-full bg-teal-600 transition-[width]" style={{ width: `${percentage}%` }} />
                  </div>
                </div>
              )
            })}
          </div>
        </Card>

        <Card className="overflow-hidden">
          <h3 className="text-lg font-semibold text-slate-950">Por membro</h3>
          <div className="mt-4 space-y-4">
            {summary.byMember.map((item) => {
              const percentage = clampPercentage(
                summary.totalActual ? Math.round((item.value / summary.totalActual) * 100) : 0,
              )

              return (
                <div key={item.name} className="space-y-2">
                  <div className="flex items-start justify-between gap-3">
                    <span className="min-w-0 flex-1 text-sm font-medium text-slate-700">{item.name}</span>
                    <span className="shrink-0 text-sm font-medium text-slate-600">{formatCurrency(item.value)}</span>
                  </div>
                  <div className="overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-2 rounded-full bg-gradient-to-r from-teal-500 to-cyan-500 transition-[width]"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </Card>
      </div>

      {loading ? <Loading /> : null}

      {!loading && error ? <ErrorState title="Falha ao carregar gastos" description={error} /> : null}

      {!loading && !error && expenses.length === 0 ? (
        <EmptyState
          title="Nenhum gasto registrado"
          description="Crie o primeiro gasto para acompanhar o que foi estimado e o que ja saiu do bolso."
        />
      ) : null}

      {!loading && !error && expenses.length > 0 ? (
        <Card className="space-y-4 overflow-hidden">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-lg font-semibold text-slate-950">Lancamentos</h3>
              <p className="mt-1 text-sm text-slate-500">{filteredExpenses.length} item(ns) neste filtro.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {expenseFilters.map((filter) => (
                <button
                  key={filter.id}
                  type="button"
                  onClick={() => setActiveFilter(filter.id)}
                  className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                    activeFilter === filter.id
                      ? 'bg-teal-700 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {filter.label}
                </button>
              ))}
            </div>
          </div>
        </Card>
      ) : null}

      {!loading && !error && expenses.length > 0 && filteredExpenses.length === 0 ? (
        <EmptyState
          title="Nenhum gasto neste filtro"
          description="Troque o filtro para ver confirmados, pendentes, planejados ou todos os lancamentos."
        />
      ) : null}

      {!loading && !error && filteredExpenses.length > 0 ? (
        <div className="grid gap-3 xl:grid-cols-2">
          {filteredExpenses.map((expense) => {
            const canManageExpense = canEditAnyContent(userProfile) || canEditOwnContent(userProfile, expense)
            const expenseStatus = getExpenseStatus(expense)

            return (
              <Card key={expense.id} className="space-y-3 overflow-hidden">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <h3 className="break-words text-base font-semibold text-slate-950">{expense.description}</h3>
                    <p className="mt-1 text-sm text-slate-500">
                      {expense.category} • {expense.type} • {formatDisplayDate(expense.date)}
                    </p>
                    <p className="mt-1 text-sm text-slate-500">Pago por {expense.paidBy || 'Nao informado'}</p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-base font-semibold text-teal-700">{formatCurrency(expense.value)}</p>
                    <span className={`mt-2 inline-flex rounded-full px-3 py-1 text-[11px] font-semibold ${expenseStatus.tone}`}>
                      {expenseStatus.label}
                    </span>
                  </div>
                </div>

                {canManageExpense ? (
                  <div className="flex gap-3">
                    <Button
                      variant="secondary"
                      className="flex-1"
                      icon={<FiEdit2 size={16} />}
                      onClick={() => navigate(`/expenses/${expense.id}/edit`)}
                    >
                      Editar
                    </Button>
                    <Button
                      variant="ghost"
                      className="flex-1 text-rose-600 hover:bg-rose-50"
                      icon={<FiTrash2 size={16} />}
                      onClick={() => handleDelete(expense.id)}
                    >
                      Excluir
                    </Button>
                  </div>
                ) : null}
              </Card>
            )
          })}
        </div>
      ) : null}
    </div>
  )
}

export default ExpensesPage
