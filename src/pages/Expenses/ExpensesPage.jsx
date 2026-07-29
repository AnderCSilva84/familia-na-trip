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
import { updateTrip } from '../../services/tripService'
import useAppStore from '../../store/useAppStore'
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
  const {
    expenses,
    summary,
    loading,
    error,
    deleteExpense,
    migratePaymentsToTravelCard,
    usingMockData,
  } = useExpenses()
  const setTrip = useAppStore((state) => state.setTrip)
  const [feedback, setFeedback] = useState('')
  const [activeFilter, setActiveFilter] = useState('todos')
  const [activeCategory, setActiveCategory] = useState('todas')
  const [editingBudget, setEditingBudget] = useState(false)
  const [budgetInput, setBudgetInput] = useState('')
  const [savingBudget, setSavingBudget] = useState(false)
  const [migratingPayments, setMigratingPayments] = useState(false)
  const totalBase = summary.totalEstimated || summary.totalActual || 1
  const actualPercentage = clampPercentage(Math.round((summary.totalActual / totalBase) * 100))
  const totalBudget = Number(trip?.totalBudget ?? 0)
  const remainingEstimatedBudget = totalBudget - summary.totalEstimated
  const remainingActualBudget = totalBudget - summary.totalTravelCardActual
  const availableCategories = [...new Set(expenses.map((expense) => expense.category).filter(Boolean))]
    .sort((left, right) => left.localeCompare(right, 'pt-BR'))
  const filteredExpenses = expenses.filter(
    (expense) =>
      matchesExpenseFilter(expense, activeFilter) &&
      (activeCategory === 'todas' || expense.category === activeCategory),
  )
  const selectedCategorySpent = activeCategory === 'todas'
    ? 0
    : expenses
      .filter(
        (expense) =>
          expense.category === activeCategory &&
          expense.type !== 'estimado' &&
          (expense.relatedAgendaId || expense.settled) &&
          String(expense.paidBy ?? '').trim().toLocaleLowerCase('pt-BR')
            === 'cartão viagem'.toLocaleLowerCase('pt-BR'),
      )
      .reduce((total, expense) => total + Number(expense.value ?? 0), 0)
  const selectedCategoryBudgetPercentage = totalBudget > 0
    ? (selectedCategorySpent / totalBudget) * 100
    : 0
  const selectedCategoryProgress = clampPercentage(selectedCategoryBudgetPercentage)
  const canEditBudget = canEditAnyContent(userProfile) || canEditOwnContent(userProfile, trip)

  async function handleBudgetSubmit(event) {
    event.preventDefault()
    const normalizedBudget = Number(budgetInput)

    if (!Number.isFinite(normalizedBudget) || normalizedBudget < 0) {
      setFeedback('Informe um orçamento válido.')
      return
    }

    setSavingBudget(true)
    setFeedback('')

    try {
      const nextTrip = await updateTrip(trip.id, { totalBudget: normalizedBudget })
      setTrip(nextTrip)
      setEditingBudget(false)
      setFeedback('Orçamento atualizado com sucesso.')
    } catch (updateError) {
      setFeedback(updateError.message ?? 'Não foi possível atualizar o orçamento.')
    } finally {
      setSavingBudget(false)
    }
  }

  async function handleDelete(expenseId) {
    if (!window.confirm('Tem certeza que deseja excluir este gasto?')) return
    try {
      await deleteExpense(expenseId)
      setFeedback('Gasto removido com sucesso.')
    } catch (deleteError) {
      setFeedback(deleteError.message ?? 'Nao foi possivel remover o gasto.')
    }
  }

  async function handleMigratePayments() {
    if (!window.confirm('Definir “Cartão viagem” como pagador de todos os gastos efetivados desta viagem?')) {
      return
    }

    setMigratingPayments(true)
    setFeedback('')
    try {
      const updatedCount = await migratePaymentsToTravelCard()
      setFeedback(`${updatedCount} gasto(s) efetivado(s) migrado(s) com sucesso para Cartão viagem.`)
    } catch (migrationError) {
      setFeedback(migrationError.message ?? 'Nao foi possivel migrar os pagamentos.')
    } finally {
      setMigratingPayments(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
        {canEditAnyContent(userProfile) ? (
          <Button variant="secondary" onClick={handleMigratePayments} disabled={migratingPayments || usingMockData}>
            {migratingPayments ? 'Migrando...' : 'Migrar efetivados para Cartão viagem'}
          </Button>
        ) : null}
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
              {editingBudget ? (
                <form className="mt-2 space-y-2" onSubmit={handleBudgetSubmit}>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={budgetInput}
                    onChange={(event) => setBudgetInput(event.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-slate-950 outline-none focus:border-teal-500 focus:ring-4 focus:ring-teal-100"
                    aria-label="Novo orçamento total"
                    required
                    autoFocus
                  />
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setEditingBudget(false)}
                      className="flex-1 rounded-xl bg-slate-200 px-3 py-2 text-xs font-semibold text-slate-700"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={savingBudget}
                      className="flex-1 rounded-xl bg-teal-700 px-3 py-2 text-xs font-semibold text-white disabled:opacity-60"
                    >
                      {savingBudget ? 'Salvando...' : 'Salvar'}
                    </button>
                  </div>
                </form>
              ) : (
                <div className="mt-2 flex items-center justify-between gap-2">
                  <p className="text-xl font-semibold leading-tight text-slate-950">{formatCurrency(totalBudget)}</p>
                  {canEditBudget && trip?.id ? (
                    <button
                      type="button"
                      onClick={() => {
                        setBudgetInput(String(totalBudget))
                        setEditingBudget(true)
                      }}
                      className="rounded-full bg-teal-50 px-3 py-1.5 text-xs font-semibold text-teal-700 hover:bg-teal-100"
                    >
                      Editar
                    </button>
                  ) : null}
                </div>
              )}
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
            <p className="text-sm text-slate-500">Saldo do Cartão viagem</p>
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
          <div className="flex flex-col gap-4">
            <div>
              <h3 className="text-lg font-semibold text-slate-950">Lancamentos</h3>
              <p className="mt-1 text-sm text-slate-500">{filteredExpenses.length} item(ns) neste filtro.</p>
            </div>
            <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
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
              <label className="flex min-w-56 flex-col gap-2 text-sm font-medium text-slate-600">
                <span>Filtrar por categoria</span>
                <select
                  value={activeCategory}
                  onChange={(event) => setActiveCategory(event.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-slate-900 outline-none focus:border-teal-500 focus:ring-4 focus:ring-teal-100"
                >
                  <option value="todas">Todas as categorias</option>
                  {availableCategories.map((category) => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
              </label>
            </div>
          </div>
        </Card>
      ) : null}

      {!loading && !error && activeCategory !== 'todas' ? (
        <Card className="overflow-hidden bg-[linear-gradient(135deg,#ecfdf9_0%,#ffffff_100%)]">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-sm font-medium text-teal-700">Já gasto em {activeCategory}</p>
              <p className="mt-2 text-3xl font-semibold text-slate-950">
                {formatCurrency(selectedCategorySpent)}
              </p>
            </div>
            <div className="rounded-2xl bg-white px-4 py-3 text-left shadow-sm sm:text-right">
              <p className="text-sm text-slate-500">Do orçamento da viagem</p>
              <p className="mt-1 text-xl font-semibold text-teal-700">
                {totalBudget > 0 ? `${selectedCategoryBudgetPercentage.toFixed(1)}%` : 'Orçamento não informado'}
              </p>
            </div>
          </div>
          <div className="mt-5 overflow-hidden rounded-full bg-teal-100">
            <div
              className="h-3 rounded-full bg-gradient-to-r from-teal-500 to-cyan-500 transition-[width]"
              style={{ width: `${selectedCategoryProgress}%` }}
            />
          </div>
          <p className="mt-2 text-xs text-slate-500">
            Considera somente gastos efetivados no Cartão viagem com baixa confirmada.
          </p>
        </Card>
      ) : null}

      {!loading && !error && expenses.length > 0 && filteredExpenses.length === 0 ? (
        <EmptyState
          title="Nenhum gasto neste filtro"
          description="Troque a situação ou a categoria para visualizar outros lançamentos."
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
