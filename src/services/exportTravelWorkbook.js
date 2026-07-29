import { formatCurrency } from '../utils/formatters'

function buildSummaryRows(trip, expenseSummary, membersCount, agendaCount) {
  const totalBudget = Number(trip?.totalBudget ?? 0)
  const remainingBudget = totalBudget - Number(expenseSummary?.totalTravelCardActual ?? 0)

  return [
    { campo: 'Viagem', valor: trip?.name ?? 'Familia na Trip' },
    { campo: 'Destino', valor: trip?.destination ?? '' },
    { campo: 'Periodo', valor: trip?.startDate && trip?.endDate ? `${trip.startDate} ate ${trip.endDate}` : '' },
    { campo: 'Orcamento total', valor: totalBudget },
    { campo: 'Gasto estimado', valor: Number(expenseSummary?.totalEstimated ?? 0) },
    { campo: 'Gasto efetivado', valor: Number(expenseSummary?.totalActual ?? 0) },
    { campo: 'Gasto no Cartao viagem', valor: Number(expenseSummary?.totalTravelCardActual ?? 0) },
    { campo: 'Saldo do Cartao viagem', valor: remainingBudget },
    { campo: 'Membros conectados', valor: membersCount },
    { campo: 'Eventos na agenda', valor: agendaCount },
  ]
}

export async function exportTravelWorkbook({ trip, agenda, expenses, members, summary }) {
  const XLSX = await import('xlsx')
  const workbook = XLSX.utils.book_new()

  const summarySheet = XLSX.utils.json_to_sheet(
    buildSummaryRows(trip, summary, members.length, agenda.length),
  )

  const agendaSheet = XLSX.utils.json_to_sheet(
    agenda.map((item) => ({
      data: item.date,
      hora_inicio: item.startTime,
      hora_fim: item.endTime,
      titulo: item.title,
      descricao: item.description,
      local: item.location,
      tipo: item.type,
      posicao_x: item.mapX,
      posicao_y: item.mapY,
    })),
  )

  const expensesSheet = XLSX.utils.json_to_sheet(
    expenses.map((expense) => ({
      data: expense.date,
      descricao: expense.description,
      categoria: expense.category,
      tipo: expense.type,
      valor: Number(expense.value ?? 0),
      pago_por: expense.paidBy,
      dividido_entre: Array.isArray(expense.dividedBetween)
        ? expense.dividedBetween.join(', ')
        : '',
    })),
  )

  const membersSheet = XLSX.utils.json_to_sheet(
    members.map((member) => ({
      nome: member.name,
      email: member.email,
      papel_viagem: member.roleInTrip,
      status: member.active === false ? 'inativo' : 'conectado',
    })),
  )

  XLSX.utils.book_append_sheet(workbook, summarySheet, 'Resumo')
  XLSX.utils.book_append_sheet(workbook, agendaSheet, 'Agenda')
  XLSX.utils.book_append_sheet(workbook, expensesSheet, 'Gastos')
  XLSX.utils.book_append_sheet(workbook, membersSheet, 'Membros')

  const safeTripName = String(trip?.name ?? 'familia-na-trip')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')

  XLSX.writeFile(workbook, `${safeTripName || 'familia-na-trip'}-backup.xlsx`)

  return {
    fileName: `${safeTripName || 'familia-na-trip'}-backup.xlsx`,
    summaryText: `Resumo exportado com saldo de ${formatCurrency(
      Number(trip?.totalBudget ?? 0) - Number(summary?.totalTravelCardActual ?? 0),
    )}.`,
  }
}
