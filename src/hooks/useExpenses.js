import { useEffect, useState } from 'react'
import { mockData } from '../data/mockData'
import useAppStore from '../store/useAppStore'
import { canUseMockFallback } from '../utils/runtimeMode'
import {
  calculateExpenseSummary,
  createExpense as createExpenseService,
  deleteExpense as deleteExpenseService,
  getExpensesByTrip,
  importExpensesBatch,
  subscribeExpensesByTrip,
  updateExpense as updateExpenseService,
} from '../services/expenseService'

function fallbackSummary() {
  return {
    totalEstimated: mockData.expenses.estimated,
    totalActual: mockData.expenses.actual,
    difference: mockData.expenses.estimated - mockData.expenses.actual,
    byCategory: mockData.expenses.categories,
    byMember: mockData.expenses.byMember,
  }
}

function useExpenses() {
  const trip = useAppStore((state) => state.trip)
  const userProfile = useAppStore((state) => state.userProfile)
  const [expenses, setExpenses] = useState([])
  const [summary, setSummary] = useState(fallbackSummary())
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const usingMockData = canUseMockFallback()

  useEffect(() => {
    if (!trip?.id || usingMockData) {
      return () => {}
    }

    queueMicrotask(() => {
      setLoading(true)
      setError('')
    })

    const unsubscribe = subscribeExpensesByTrip(
      trip.id,
      (nextExpenses) => {
        setExpenses(nextExpenses)
        setSummary(calculateExpenseSummary(nextExpenses))
        setLoading(false)
      },
      (loadError) => {
        setError(loadError.message ?? 'Nao foi possivel carregar os gastos.')
        setExpenses([])
        setSummary(fallbackSummary())
        setLoading(false)
      },
    )

    return unsubscribe
  }, [trip?.id, usingMockData])

  async function refreshExpenses() {
    if (!trip?.id) {
      setExpenses([])
      setSummary(fallbackSummary())
      return
    }
    const nextExpenses = await getExpensesByTrip(trip.id)
    setExpenses(nextExpenses)
    setSummary(calculateExpenseSummary(nextExpenses))
  }

  async function createExpense(data) {
    await createExpenseService({
      ...data,
      tripId: trip.id,
      createdBy: userProfile.uid,
    })
  }

  async function updateExpense(expenseId, data) {
    await updateExpenseService(expenseId, data)
  }

  async function deleteExpense(expenseId) {
    await deleteExpenseService(expenseId)
  }

  async function importExpenses(expensesToImport, options = {}) {
    return importExpensesBatch({
      tripId: trip.id,
      createdBy: userProfile.uid,
      expenses: expensesToImport,
      replaceExisting: options.replaceExisting ?? false,
    })
  }

  return {
    expenses: usingMockData ? [] : expenses,
    summary: usingMockData ? fallbackSummary() : summary,
    loading: trip?.id && !usingMockData ? loading : false,
    error,
    usingMockData,
    createExpense,
    updateExpense,
    deleteExpense,
    importExpenses,
    refreshExpenses,
  }
}

export default useExpenses
