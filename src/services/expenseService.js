import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore'
import { db, ensureFirebaseConfigured } from '../firebase/config'
import { queueNotification } from './notificationService'
import { subscribeToQuery } from './firestoreRealtime'

function expensesCollection() {
  ensureFirebaseConfigured()
  return collection(db, 'expenses')
}

function isSettledInApp(expense) {
  return (
    expense.type === 'efetivado' &&
    (Boolean(String(expense.relatedAgendaId ?? '').trim()) || expense.settled === true)
  )
}

function isTravelCardPayment(expense) {
  return String(expense.paidBy ?? '').trim().toLocaleLowerCase('pt-BR')
    === 'cartão viagem'.toLocaleLowerCase('pt-BR')
}

function mapExpense(id, data) {
  return {
    id,
    tripId: data.tripId ?? '',
    relatedAgendaId: data.relatedAgendaId ?? '',
    description: data.description ?? '',
    category: data.category ?? 'Outros',
    type: data.type ?? 'efetivado',
    value: Number(data.value ?? 0),
    settled: data.settled === true,
    settledAt: data.settledAt ?? null,
    paidBy: data.paidBy ?? '',
    dividedBetween: data.dividedBetween ?? [],
    date: data.date ?? '',
    importSource: data.importSource ?? '',
    importSheetName: data.importSheetName ?? '',
    importKey: data.importKey ?? '',
    createdBy: data.createdBy ?? '',
    createdAt: data.createdAt ?? null,
    updatedAt: data.updatedAt ?? null,
  }
}

export async function createExpense(data) {
  const isSettled = data.type === 'efetivado' && data.settled === true
  const expenseRef = doc(expensesCollection())
  const payload = {
    id: expenseRef.id,
    tripId: data.tripId,
    relatedAgendaId: data.relatedAgendaId ?? '',
    description: data.description,
    category: data.category,
    type: data.type,
    value: Number(data.value),
    settled: isSettled,
    settledAt: isSettled ? serverTimestamp() : null,
    paidBy: data.paidBy,
    dividedBetween: data.dividedBetween ?? [],
    date: data.date,
    createdBy: data.createdBy,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  }

  await setDoc(expenseRef, payload)
  queueNotification({
    tripId: payload.tripId,
    title: 'Novo gasto registrado',
    message: payload.description,
    type: 'gasto',
    relatedId: expenseRef.id,
    createdBy: payload.createdBy,
    targetUsers: [],
  })
  return { ...payload, createdAt: new Date(), updatedAt: new Date() }
}

export async function getExpensesByTrip(tripId) {
  return new Promise((resolve, reject) => {
    const unsubscribe = subscribeExpensesByTrip(
      tripId,
      (expenses) => {
        resolve(expenses)
        unsubscribe()
      },
      reject,
    )
  })
}

export function subscribeExpensesByTrip(tripId, callback, onError) {
  const expensesQuery = query(expensesCollection(), where('tripId', '==', tripId))
  return subscribeToQuery(
    expensesQuery,
    (snapshot) =>
      snapshot.docs
        .map((expenseDoc) => mapExpense(expenseDoc.id, expenseDoc.data()))
        .sort((left, right) => `${right.date}`.localeCompare(`${left.date}`)),
    callback,
    onError,
  )
}

export async function updateExpense(id, data) {
  const expenseRef = doc(expensesCollection(), id)
  const isSettled = data.type === 'efetivado' && data.settled === true
  await updateDoc(expenseRef, {
    ...data,
    value: Number(data.value),
    settled: isSettled,
    settledAt: isSettled ? serverTimestamp() : null,
    updatedAt: serverTimestamp(),
  })
}

export async function deleteExpense(id) {
  const expenseRef = doc(expensesCollection(), id)
  await deleteDoc(expenseRef)
}

export async function importExpensesBatch({ tripId, createdBy, expenses, replaceExisting = false }) {
  const batch = writeBatch(db)

  if (replaceExisting) {
    const existingExpensesSnapshot = await getDocs(
      query(expensesCollection(), where('tripId', '==', tripId)),
    )

    existingExpensesSnapshot.docs.forEach((expenseDoc) => {
      batch.delete(expenseDoc.ref)
    })
  }

  expenses.forEach((expense) => {
    const expenseRef = doc(expensesCollection())
    batch.set(expenseRef, {
      id: expenseRef.id,
      tripId,
      relatedAgendaId: expense.relatedAgendaId ?? '',
      description: expense.description,
      category: expense.category,
      type: expense.type,
      value: Number(expense.value ?? 0),
      settled: expense.type === 'efetivado' && expense.settled === true,
      settledAt: expense.type === 'efetivado' && expense.settled === true ? serverTimestamp() : null,
      paidBy: expense.paidBy ?? '',
      dividedBetween: expense.dividedBetween ?? [],
      date: expense.date ?? '',
      importSource: 'spreadsheet',
      importSheetName: expense.sheetName ?? '',
      importKey: expense.importKey ?? '',
      createdBy,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })
  })

  await batch.commit()

  queueNotification({
    tripId,
    title: 'Planilha de gastos importada',
    message: `${expenses.length} lancamento(s) sincronizado(s) com o aplicativo.`,
    type: 'gasto',
    relatedId: '',
    createdBy,
    targetUsers: [],
  })

  return expenses.length
}

export function calculateExpenseSummary(expenses) {
  const totals = expenses.reduce(
    (accumulator, expense) => {
      const value = Number(expense.value ?? 0)

      if (expense.type === 'estimado') {
        accumulator.totalEstimated += value
      } else if (isSettledInApp(expense)) {
        accumulator.totalActual += value
        if (isTravelCardPayment(expense)) {
          accumulator.totalTravelCardActual += value
        }
        accumulator.byCategory[expense.category] =
          (accumulator.byCategory[expense.category] ?? 0) + value
        accumulator.byMember[expense.paidBy || 'Sem responsavel'] =
          (accumulator.byMember[expense.paidBy || 'Sem responsavel'] ?? 0) + value
      }

      return accumulator
    },
    {
      totalEstimated: 0,
      totalActual: 0,
      totalTravelCardActual: 0,
      byCategory: {},
      byMember: {},
    },
  )

  return {
    totalEstimated: totals.totalEstimated,
    totalActual: totals.totalActual,
    totalTravelCardActual: totals.totalTravelCardActual,
    difference: totals.totalEstimated - totals.totalActual,
    byCategory: Object.entries(totals.byCategory).map(([name, value]) => ({ name, value })),
    byMember: Object.entries(totals.byMember).map(([name, value]) => ({ name, value })),
  }
}

export async function syncAgendaActualExpense({
  tripId,
  agendaId,
  title,
  city,
  local,
  category = 'Outros',
  actualCost,
  date,
  createdBy,
  paidBy,
  existingExpenseId = '',
}) {
  if (!tripId || !agendaId) {
    return ''
  }

  const normalizedValue = Number(actualCost ?? 0)
  const existingSnapshot = existingExpenseId
    ? null
    : await getDocs(
      query(expensesCollection(), where('relatedAgendaId', '==', agendaId), where('type', '==', 'efetivado')),
    )
  const existingDoc = existingSnapshot?.docs[0]
  const existingRef = existingExpenseId
    ? doc(expensesCollection(), existingExpenseId)
    : existingDoc?.ref

  if (!normalizedValue) {
    if (existingRef) {
      await deleteDoc(existingRef)
    }

    return ''
  }

  const expensePayload = {
    tripId,
    relatedAgendaId: agendaId,
    description: [title || local || 'Evento', city].filter(Boolean).join(' - '),
    category,
    type: 'efetivado',
    value: normalizedValue,
    settled: true,
    settledAt: serverTimestamp(),
    dividedBetween: [],
    date: date ?? '',
    createdBy,
    updatedAt: serverTimestamp(),
  }

  if (paidBy !== undefined) {
    expensePayload.paidBy = paidBy
  } else if (existingDoc) {
    expensePayload.paidBy = existingDoc.data().paidBy ?? 'Cartão viagem'
  } else if (!existingRef) {
    expensePayload.paidBy = 'Cartão viagem'
  }

  if (existingRef) {
    await updateDoc(existingRef, expensePayload)
    return existingExpenseId || existingDoc.id
  }

  const expenseRef = doc(expensesCollection())
  await setDoc(expenseRef, {
    id: expenseRef.id,
    ...expensePayload,
    createdAt: serverTimestamp(),
  })

  return expenseRef.id
}

export async function migrateSettledExpensesToTravelCard(tripId) {
  if (!tripId) {
    return 0
  }

  const snapshot = await getDocs(query(expensesCollection(), where('tripId', '==', tripId)))
  const settledDocs = snapshot.docs.filter((expenseDoc) => expenseDoc.data().type === 'efetivado')

  for (let index = 0; index < settledDocs.length; index += 400) {
    const batch = writeBatch(db)
    settledDocs.slice(index, index + 400).forEach((expenseDoc) => {
      batch.update(expenseDoc.ref, {
        paidBy: 'Cartão viagem',
        updatedAt: serverTimestamp(),
      })
    })
    await batch.commit()
  }

  return settledDocs.length
}

export async function deleteAgendaActualExpense(agendaId, existingExpenseId = '') {
  if (!agendaId) {
    return
  }

  if (existingExpenseId) {
    await deleteDoc(doc(expensesCollection(), existingExpenseId))
    return
  }

  const existingSnapshot = await getDocs(
    query(expensesCollection(), where('relatedAgendaId', '==', agendaId), where('type', '==', 'efetivado')),
  )

  await Promise.all(existingSnapshot.docs.map((expenseDoc) => deleteDoc(expenseDoc.ref)))
}

export async function clearImportedExpensesByTrip(tripId) {
  ensureFirebaseConfigured()

  if (!tripId) {
    return { deletedCount: 0, usedFallback: false }
  }

  const snapshot = await getDocs(query(expensesCollection(), where('tripId', '==', tripId)))
  const docs = snapshot.docs
  const importedDocs = docs.filter((expenseDoc) => {
    const data = expenseDoc.data()
    return data.importSource === 'spreadsheet' || Boolean(data.importSheetName) || Boolean(data.importKey)
  })

  const docsToDelete = importedDocs.length > 0 ? importedDocs : docs.filter((expenseDoc) => {
    const data = expenseDoc.data()
    return !data.relatedAgendaId
  })
  const usedFallback = importedDocs.length === 0 && docsToDelete.length > 0

  for (let index = 0; index < docsToDelete.length; index += 400) {
    const batch = writeBatch(db)
    docsToDelete.slice(index, index + 400).forEach((expenseDoc) => {
      batch.delete(expenseDoc.ref)
    })
    await batch.commit()
  }

  return {
    deletedCount: docsToDelete.length,
    usedFallback,
  }
}

export async function normalizeImportedExpenseValuesByTrip(tripId) {
  ensureFirebaseConfigured()

  if (!tripId) {
    return { updatedCount: 0, usedFallback: false }
  }

  const snapshot = await getDocs(query(expensesCollection(), where('tripId', '==', tripId)))
  const docs = snapshot.docs
  const importedDocs = docs.filter((expenseDoc) => {
    const data = expenseDoc.data()
    return data.importSource === 'spreadsheet' || Boolean(data.importSheetName) || Boolean(data.importKey)
  })

  const docsToCheck = importedDocs.length > 0 ? importedDocs : docs.filter((expenseDoc) => {
    const data = expenseDoc.data()
    return !data.relatedAgendaId
  })
  const updates = docsToCheck
    .map((expenseDoc) => {
      const data = expenseDoc.data()
      const currentValue = Number(data.value ?? 0)

      if (!Number.isInteger(currentValue) || Math.abs(currentValue) < 1000) {
        return null
      }

      return {
        ref: expenseDoc.ref,
        payload: {
          value: currentValue / 100,
          updatedAt: serverTimestamp(),
        },
      }
    })
    .filter(Boolean)

  for (let index = 0; index < updates.length; index += 400) {
    const batch = writeBatch(db)
    updates.slice(index, index + 400).forEach((item) => {
      batch.update(item.ref, item.payload)
    })
    await batch.commit()
  }

  return {
    updatedCount: updates.length,
    usedFallback: importedDocs.length === 0 && updates.length > 0,
  }
}
