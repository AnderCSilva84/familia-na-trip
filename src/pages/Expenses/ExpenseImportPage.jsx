import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Button from '../../components/common/Button'
import Card from '../../components/common/Card'
import EmptyState from '../../components/common/EmptyState'
import Input from '../../components/common/Input'
import Loading from '../../components/common/Loading'
import StatusMessage from '../../components/feedback/StatusMessage'
import useAgenda from '../../hooks/useAgenda'
import useAuth from '../../hooks/useAuth'
import useItinerary from '../../hooks/useItinerary'
import useTips from '../../hooks/useTips'
import useImportLogs from '../../hooks/useImportLogs'
import useAppStore from '../../store/useAppStore'
import useExpenses from '../../hooks/useExpenses'
import {
  clearImportedAgendaByTrip,
  importAgendaBatch,
  normalizeAgendaLocationsForTrip,
  normalizeImportedAgendaValuesForTrip,
  normalizeAgendaTimesForTrip,
} from '../../services/agendaService'
import { parseExpenseSpreadsheet } from '../../services/expenseImportService'
import { clearImportedExpensesByTrip, normalizeImportedExpenseValuesByTrip } from '../../services/expenseService'
import { createImportLog, uploadImportSpreadsheet } from '../../services/importLogService'
import { normalizeItineraryLocationsForTrip } from '../../services/itineraryService'
import { clearImportedTipsByTrip, importTipsBatch } from '../../services/tipService'
import { updateTrip } from '../../services/tripService'
import { formatCurrency, normalizeDisplayTime } from '../../utils/formatters'
import { canImportExpenses } from '../../utils/permissions'

function formatLogDate(value) {
  if (!value) {
    return 'Sem horario'
  }

  if (typeof value?.toDate === 'function') {
    return value.toDate().toLocaleString('pt-BR')
  }

  const parsed = new Date(value)

  if (Number.isNaN(parsed.getTime())) {
    return 'Sem horario'
  }

  return parsed.toLocaleString('pt-BR')
}

function toIsoDateTime(value) {
  if (!value) {
    return ''
  }

  if (typeof value?.toDate === 'function') {
    return value.toDate().toISOString()
  }

  if (value instanceof Date) {
    return value.toISOString()
  }

  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? '' : parsed.toISOString()
}

function ExpenseImportPage() {
  const navigate = useNavigate()
  const { trip, userProfile } = useAuth()
  const setTrip = useAppStore((state) => state.setTrip)
  const { importExpenses, loading, usingMockData, refreshExpenses } = useExpenses()
  const { refresh: refreshAgenda } = useAgenda()
  const { refreshItems: refreshItinerary } = useItinerary()
  const { refresh: refreshTips } = useTips()
  const { logs, latestLog, error: logsError, deleteLog } = useImportLogs()
  const [feedback, setFeedback] = useState('')
  const [replaceExisting, setReplaceExisting] = useState(true)
  const [preview, setPreview] = useState(null)
  const [file, setFile] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [importStep, setImportStep] = useState('')
  const [budgetValue, setBudgetValue] = useState(String(trip?.totalBudget ?? ''))
  const [maintenanceLoading, setMaintenanceLoading] = useState(false)
  const canManageImports = canImportExpenses(userProfile)

  async function readSpreadsheetFile(nextFile) {
    setFile(nextFile)
    setFeedback('')
    setPreview(null)

    if (!nextFile) {
      return
    }

    try {
      const parsedPreview = await parseExpenseSpreadsheet(nextFile)
      setPreview(parsedPreview)
    } catch (error) {
      setFeedback(error.message ?? 'Nao foi possivel ler a planilha.')
    }
  }

  async function handlePreview(event) {
    const nextFile = event.target.files?.[0] ?? null
    await readSpreadsheetFile(nextFile)
  }

  async function handleUseOfficialTemplate() {
    try {
      setFeedback('')
      const response = await fetch('/Viagem%20Salvador.xlsx')

      if (!response.ok) {
        throw new Error('Nao foi possivel carregar a planilha oficial da pasta public.')
      }

      const blob = await response.blob()
      const officialFile = new File([blob], 'Viagem Salvador.xlsx', {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      })

      await readSpreadsheetFile(officialFile)
    } catch (error) {
      setFeedback(error.message ?? 'Nao foi possivel carregar a planilha oficial.')
    }
  }

  async function handleImport() {
    if (!file || !preview) {
      setFeedback('Selecione uma planilha valida antes de importar.')
      return
    }

    setSubmitting(true)
    setFeedback('')
    setImportStep('Preparando importacao...')

    try {
      const normalizedBudget = Number(String(budgetValue ?? '').replace(',', '.')) || 0
      let uploadedFile = {
        fileName: file.name,
        fileUrl: '',
        filePath: '',
      }

      setImportStep('Importando agenda, gastos e dicas...')
      const [importedExpenseCount, importedAgendaCount, importedTipCount] = await Promise.all([
        importExpenses(preview.expenses, { replaceExisting }),
        importAgendaBatch({
          tripId: trip.id,
          createdBy: userProfile.uid,
          agendaItems: preview.agendaItems,
          replaceExisting,
        }),
        importTipsBatch({
          tripId: trip.id,
          createdBy: userProfile.uid,
          tips: preview.tips ?? [],
          replaceExisting,
        }),
      ])

      try {
        setImportStep('Salvando copia da planilha...')
        uploadedFile = await uploadImportSpreadsheet(trip.id, file)
      } catch {
        setFeedback(
          'Os dados foram importados, mas o arquivo da planilha nao foi salvo no Firebase Storage. Publique as storage.rules para liberar esse backup.',
        )
      }

      const importSummary = {
        totalRows: preview.totalRows,
        agendaCount: importedAgendaCount,
        expenseCount: importedExpenseCount,
        tipCount: importedTipCount,
        sheetNames: preview.sheetNames ?? [],
        replaceExisting,
        budgetValue: normalizedBudget,
      }

      let nextTrip = trip

      try {
        setImportStep('Atualizando dados da viagem...')
        nextTrip = await updateTrip(trip.id, {
          totalBudget: normalizedBudget,
          lastImportFileName: uploadedFile.fileName,
          lastImportFileUrl: uploadedFile.fileUrl,
          lastImportAt: new Date().toISOString(),
          lastImportSource: file.name === 'Viagem Salvador.xlsx' ? 'public-template' : 'manual-upload',
          lastImportSummary: importSummary,
        })
      } catch {
        setFeedback(
          'Os dados foram importados, mas o resumo da viagem nao foi atualizado. Verifique as regras da colecao trips no Firestore.',
        )
      }

      try {
        setImportStep('Registrando log da importacao...')
        await createImportLog({
          tripId: trip.id,
          fileName: uploadedFile.fileName,
          fileUrl: uploadedFile.fileUrl,
          filePath: uploadedFile.filePath,
          totalRows: preview.totalRows,
          agendaCount: importedAgendaCount,
          expenseCount: importedExpenseCount,
          tipCount: importedTipCount,
          sheetNames: preview.sheetNames ?? [],
          replaceExisting,
          budgetValue: normalizedBudget,
          source: file.name === 'Viagem Salvador.xlsx' ? 'public-template' : 'manual-upload',
          createdBy: userProfile.uid,
        })
      } catch {
        setFeedback(
          'Os dados foram importados, mas o log da planilha nao foi salvo. Isso normalmente indica regra ainda nao publicada para importLogs.',
        )
      }

      setTrip(nextTrip)
      await refreshAgenda()
      setFeedback(
        `${importedAgendaCount} evento(s), ${importedExpenseCount} gasto(s) e ${importedTipCount} dica(s) importado(s) com sucesso.`,
      )
      navigate('/expenses')
    } catch (error) {
      setFeedback(error.message ?? 'Nao foi possivel importar a planilha.')
    } finally {
      setImportStep('')
      setSubmitting(false)
    }
  }

  async function handleNormalizeSavedTimes() {
    if (!trip?.id || !canManageImports) {
      return
    }

    setMaintenanceLoading(true)
    setFeedback('')
    setImportStep('Corrigindo horarios salvos...')

    try {
      const updatedCount = await normalizeAgendaTimesForTrip(trip.id)
      setFeedback(
        updatedCount > 0
          ? `${updatedCount} evento(s) tiveram o horario normalizado no Firestore.`
          : 'Os horarios ja estavam normalizados no Firestore.',
      )
      await refreshAgenda()
    } catch (error) {
      setFeedback(error.message ?? 'Nao foi possivel corrigir os horarios salvos.')
    } finally {
      setImportStep('')
      setMaintenanceLoading(false)
    }
  }

  async function handleNormalizeSavedValues() {
    if (!trip?.id || !canManageImports) {
      return
    }

    setMaintenanceLoading(true)
    setFeedback('')
    setImportStep('Corrigindo valores monetarios salvos...')

    try {
      const [agendaResult, expenseResult] = await Promise.all([
        normalizeImportedAgendaValuesForTrip(trip.id),
        normalizeImportedExpenseValuesByTrip(trip.id),
      ])

      await Promise.all([refreshAgenda(), refreshExpenses()])

      const totalUpdated = agendaResult.updatedCount + expenseResult.updatedCount

      if (!totalUpdated) {
        setFeedback('Nenhum valor monetario precisou ser corrigido.')
      } else {
        setFeedback(
          `${agendaResult.updatedCount} evento(s) e ${expenseResult.updatedCount} gasto(s) tiveram valores corrigidos no Firestore.`,
        )
      }
    } catch (error) {
      setFeedback(error.message ?? 'Nao foi possivel corrigir os valores salvos.')
    } finally {
      setImportStep('')
      setMaintenanceLoading(false)
    }
  }

  async function handleDeleteImportedLog(log) {
    if (!log?.id || !canManageImports) {
      return
    }

    const confirmed = window.confirm(`Excluir a importacao "${log.fileName || 'sem nome'}" e o arquivo salvo?`)

    if (!confirmed) {
      return
    }

    setMaintenanceLoading(true)
    setFeedback('')
    setImportStep('Excluindo importacao salva...')

    try {
      await deleteLog(log.id, log.filePath)

      const remainingLogs = logs.filter((item) => item.id !== log.id)
      const nextLatestLog = remainingLogs[0] ?? null

      await updateTrip(trip.id, {
        lastImportFileName: nextLatestLog?.fileName ?? '',
        lastImportFileUrl: nextLatestLog?.fileUrl ?? '',
        lastImportAt: toIsoDateTime(nextLatestLog?.createdAt),
        lastImportSource: nextLatestLog?.source ?? '',
        lastImportSummary: nextLatestLog
          ? {
              totalRows: Number(nextLatestLog.totalRows ?? 0),
              agendaCount: Number(nextLatestLog.agendaCount ?? 0),
              expenseCount: Number(nextLatestLog.expenseCount ?? 0),
              tipCount: Number(nextLatestLog.tipCount ?? 0),
              sheetNames: nextLatestLog.sheetNames ?? [],
              replaceExisting: Boolean(nextLatestLog.replaceExisting),
              budgetValue: Number(nextLatestLog.budgetValue ?? 0),
            }
          : null,
      }).then((nextTrip) => {
        if (nextTrip) {
          setTrip(nextTrip)
        }
      })

      setFeedback('Importacao excluida com sucesso.')
    } catch (error) {
      setFeedback(error.message ?? 'Nao foi possivel excluir a importacao salva.')
    } finally {
      setImportStep('')
      setMaintenanceLoading(false)
    }
  }

  async function handleRecalculateLocations() {
    if (!trip?.id || !canManageImports) {
      return
    }

    setMaintenanceLoading(true)
    setFeedback('')
    setImportStep('Recalculando localizacoes da agenda e do roteiro...')

    try {
      const [agendaCount, itineraryCount] = await Promise.all([
        normalizeAgendaLocationsForTrip(trip.id),
        normalizeItineraryLocationsForTrip(trip.id),
      ])

      await Promise.all([refreshAgenda(), refreshItinerary()])

      const totalUpdated = agendaCount + itineraryCount

      setFeedback(
        totalUpdated > 0
          ? `${agendaCount} evento(s) da agenda e ${itineraryCount} item(ns) do roteiro tiveram a localizacao recalculada no Firestore.`
          : 'Nenhum registro precisou de recalculo de localizacao.',
      )
    } catch (error) {
      setFeedback(error.message ?? 'Nao foi possivel recalcular as localizacoes salvas.')
    } finally {
      setImportStep('')
      setMaintenanceLoading(false)
    }
  }

  async function handleClearImportedAgenda() {
    if (!trip?.id || !canManageImports) {
      return
    }

    const confirmed = window.confirm(
      'Limpar a agenda importada desta viagem? Eventos importados da planilha serao removidos. Se a importacao antiga nao tiver marcador, a agenda atual da viagem sera limpa como fallback.',
    )

    if (!confirmed) {
      return
    }

    setMaintenanceLoading(true)
    setFeedback('')
    setImportStep('Limpando agenda importada...')

    try {
      const result = await clearImportedAgendaByTrip(trip.id)
      await refreshAgenda()

      if (!result.deletedCount) {
        setFeedback('Nenhum evento importado foi encontrado para remover.')
      } else if (result.usedFallback) {
        setFeedback(
          `${result.deletedCount} evento(s) removido(s). Como a importacao antiga nao tinha marcador, a limpeza usou a agenda atual da viagem como fallback.`,
        )
      } else {
        setFeedback(`${result.deletedCount} evento(s) importado(s) removido(s) com sucesso.`)
      }
    } catch (error) {
      setFeedback(error.message ?? 'Nao foi possivel limpar a agenda importada.')
    } finally {
      setImportStep('')
      setMaintenanceLoading(false)
    }
  }

  async function handleClearImportedExpenses() {
    if (!trip?.id || !canManageImports) {
      return
    }

    const confirmed = window.confirm(
      'Limpar os gastos importados desta viagem? Gastos importados da planilha serao removidos. Lancamentos antigos sem marcador usam fallback controlado.',
    )

    if (!confirmed) {
      return
    }

    setMaintenanceLoading(true)
    setFeedback('')
    setImportStep('Limpando gastos importados...')

    try {
      const result = await clearImportedExpensesByTrip(trip.id)
      await refreshExpenses()

      if (!result.deletedCount) {
        setFeedback('Nenhum gasto importado foi encontrado para remover.')
      } else if (result.usedFallback) {
        setFeedback(
          `${result.deletedCount} gasto(s) removido(s). Como a importacao antiga nao tinha marcador, a limpeza usou o fallback dos lancamentos sem vinculo manual.`,
        )
      } else {
        setFeedback(`${result.deletedCount} gasto(s) importado(s) removido(s) com sucesso.`)
      }
    } catch (error) {
      setFeedback(error.message ?? 'Nao foi possivel limpar os gastos importados.')
    } finally {
      setImportStep('')
      setMaintenanceLoading(false)
    }
  }

  async function handleClearImportedTips() {
    if (!trip?.id || !canManageImports) {
      return
    }

    const confirmed = window.confirm(
      'Limpar as dicas importadas desta viagem? Dicas importadas da planilha serao removidas.',
    )

    if (!confirmed) {
      return
    }

    setMaintenanceLoading(true)
    setFeedback('')
    setImportStep('Limpando dicas importadas...')

    try {
      const result = await clearImportedTipsByTrip(trip.id)
      await refreshTips()

      if (!result.deletedCount) {
        setFeedback('Nenhuma dica importada foi encontrada para remover.')
      } else if (result.usedFallback) {
        setFeedback(
          `${result.deletedCount} dica(s) removida(s). Como a importacao antiga nao tinha marcador, a limpeza usou a lista atual da viagem como fallback.`,
        )
      } else {
        setFeedback(`${result.deletedCount} dica(s) importada(s) removida(s) com sucesso.`)
      }
    } catch (error) {
      setFeedback(error.message ?? 'Nao foi possivel limpar as dicas importadas.')
    } finally {
      setImportStep('')
      setMaintenanceLoading(false)
    }
  }

  if (loading) {
    return <Loading />
  }

  const totalEstimated = preview?.expenses
    .filter((expense) => expense.type === 'estimado')
    .reduce((accumulator, expense) => accumulator + Number(expense.value ?? 0), 0) ?? 0
  const remainingBudget = Math.max((Number(budgetValue) || 0) - totalEstimated, 0)

  return (
    <div className="space-y-4">
      <StatusMessage message={feedback} tone={feedback.includes('sucesso') ? 'success' : 'error'} />
      <StatusMessage message={importStep} tone="info" />

      {usingMockData ? (
        <StatusMessage
          message="Firebase nao configurado. A importacao real de planilha precisa de Firestore ativo."
          tone="info"
        />
      ) : null}

      {logsError ? (
        <StatusMessage
          message={
            logsError.includes('Missing or insufficient permissions')
              ? 'O historico de importacao ainda nao pode ser lido com as regras atuais do Firebase. A importacao principal continua disponivel.'
              : logsError
          }
          tone={logsError.includes('Missing or insufficient permissions') ? 'info' : 'error'}
        />
      ) : null}

      <Card className="space-y-4 bg-[linear-gradient(135deg,#ecfeff_0%,#ffffff_75%)]">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-teal-700">Importacao oficial</p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">Migrar dados da viagem</h2>
          <p className="mt-2 text-sm text-slate-500">
            O superadmin importa a planilha principal e o aplicativo passa a ser a fonte oficial para agenda, gastos e dicas.
          </p>
        </div>

        <div className="rounded-3xl bg-white/80 p-4 text-sm text-slate-600">
          <p className="font-semibold text-slate-900">Estrutura reconhecida</p>
          <p className="mt-2">A importacao oficial usa somente a aba `Praia do Forte`.</p>
          <p className="mt-2">Agenda e gastos: Data, dia da semana, cidade, local, hora, descricao, custo e pago.</p>
          <p className="mt-2">Arquivos aceitos: .xlsx, .xls e .csv</p>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <Button type="button" variant="secondary" onClick={handleUseOfficialTemplate}>
            Usar planilha oficial da pasta public
          </Button>
          {canManageImports ? (
            <Button
              type="button"
              variant="secondary"
              onClick={handleNormalizeSavedTimes}
              disabled={maintenanceLoading || usingMockData}
            >
              {maintenanceLoading ? 'Corrigindo...' : 'Corrigir horarios salvos'}
            </Button>
          ) : null}
        </div>
        {canManageImports ? (
          <div className="grid gap-3 md:grid-cols-2">
            <Button
              type="button"
              variant="secondary"
              onClick={handleNormalizeSavedValues}
              disabled={maintenanceLoading || usingMockData}
            >
              {maintenanceLoading ? 'Corrigindo...' : 'Corrigir valores salvos'}
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={handleRecalculateLocations}
              disabled={maintenanceLoading || usingMockData}
            >
              {maintenanceLoading ? 'Recalculando...' : 'Recalcular localizacoes'}
            </Button>
          </div>
        ) : null}
        {canManageImports ? (
          <div className="grid gap-3 md:grid-cols-3">
            <Button
              type="button"
              variant="ghost"
              className="text-rose-600 hover:bg-rose-50"
              onClick={handleClearImportedAgenda}
              disabled={maintenanceLoading || usingMockData}
            >
              Limpar agenda importada
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="text-rose-600 hover:bg-rose-50"
              onClick={handleClearImportedExpenses}
              disabled={maintenanceLoading || usingMockData}
            >
              Limpar gastos importados
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="text-rose-600 hover:bg-rose-50"
              onClick={handleClearImportedTips}
              disabled={maintenanceLoading || usingMockData}
            >
              Limpar dicas importadas
            </Button>
          </div>
        ) : null}

        <Input
          label="Orcamento inicial da viagem"
          type="number"
          min="0"
          step="0.01"
          value={budgetValue}
          onChange={(event) => setBudgetValue(event.target.value)}
          placeholder="Ex: 15000"
        />

        <label className="flex flex-col gap-2 text-sm font-medium text-slate-600">
          <span>Selecione a planilha</span>
          <input
            type="file"
            accept=".xlsx,.xls,.csv"
            onChange={handlePreview}
            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition file:mr-3 file:rounded-full file:border-0 file:bg-teal-50 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-teal-700 focus:border-teal-500 focus:ring-4 focus:ring-teal-100"
          />
        </label>

        <label className="flex items-center gap-3 rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={replaceExisting}
            onChange={(event) => setReplaceExisting(event.target.checked)}
            className="h-4 w-4 rounded border-slate-300 text-teal-700 focus:ring-teal-500"
          />
          Substituir agenda, gastos e dicas atuais da viagem pelos dados da planilha
        </label>
      </Card>

      {latestLog ? (
        <Card className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-semibold text-slate-950">Ultima importacao</h3>
              <p className="mt-1 text-sm text-slate-500">
                {latestLog.fileName} - {latestLog.source === 'public-template' ? 'planilha oficial' : 'upload manual'}
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              {latestLog.fileUrl ? (
                <Button as="a" href={latestLog.fileUrl} target="_blank" rel="noreferrer" variant="secondary">
                  Abrir arquivo salvo
                </Button>
              ) : null}
              {canManageImports ? (
                <Button
                  type="button"
                  variant="ghost"
                  className="text-rose-600 hover:bg-rose-50"
                  onClick={() => handleDeleteImportedLog(latestLog)}
                  disabled={maintenanceLoading}
                >
                  Excluir importacao
                </Button>
              ) : null}
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-5">
            <div className="rounded-3xl bg-slate-50 p-4">
              <p className="text-sm text-slate-500">Horario</p>
              <p className="mt-1 font-semibold text-slate-950">
                {formatLogDate(latestLog.createdAt)}
              </p>
            </div>
            <div className="rounded-3xl bg-slate-50 p-4">
              <p className="text-sm text-slate-500">Agenda</p>
              <p className="mt-1 font-semibold text-slate-950">{latestLog.agendaCount}</p>
            </div>
            <div className="rounded-3xl bg-slate-50 p-4">
              <p className="text-sm text-slate-500">Gastos</p>
              <p className="mt-1 font-semibold text-slate-950">{latestLog.expenseCount}</p>
            </div>
            <div className="rounded-3xl bg-slate-50 p-4">
              <p className="text-sm text-slate-500">Dicas</p>
              <p className="mt-1 font-semibold text-slate-950">{latestLog.tipCount}</p>
            </div>
            <div className="rounded-3xl bg-slate-50 p-4">
              <p className="text-sm text-slate-500">Orcamento</p>
              <p className="mt-1 font-semibold text-slate-950">{formatCurrency(latestLog.budgetValue)}</p>
            </div>
          </div>
        </Card>
      ) : null}

      {preview ? (
        <Card className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-semibold text-slate-950">Pre-visualizacao</h3>
              <p className="mt-1 text-sm text-slate-500">
                Abas: {preview.sheetNames?.join(', ')} - agenda: {preview.agendaItems.length} - gastos: {preview.expenses.length} - dicas: {preview.tips?.length ?? 0}
              </p>
            </div>
            <Button disabled={submitting || usingMockData} onClick={handleImport}>
              {submitting ? 'Importando...' : 'Confirmar importacao'}
            </Button>
          </div>

          <div className="grid gap-3 md:grid-cols-5">
            <div className="rounded-3xl bg-slate-50 p-4">
              <p className="text-sm text-slate-500">Linhas lidas</p>
              <p className="mt-1 text-xl font-semibold text-slate-950">{preview.totalRows}</p>
            </div>
            <div className="rounded-3xl bg-slate-50 p-4">
              <p className="text-sm text-slate-500">Eventos importaveis</p>
              <p className="mt-1 text-xl font-semibold text-slate-950">{preview.agendaItems.length}</p>
            </div>
            <div className="rounded-3xl bg-slate-50 p-4">
              <p className="text-sm text-slate-500">Gastos detectados</p>
              <p className="mt-1 text-xl font-semibold text-slate-950">{preview.expenses.length}</p>
            </div>
            <div className="rounded-3xl bg-slate-50 p-4">
              <p className="text-sm text-slate-500">Dicas detectadas</p>
              <p className="mt-1 text-xl font-semibold text-slate-950">{preview.tips?.length ?? 0}</p>
            </div>
            <div className="rounded-3xl bg-slate-50 p-4">
              <p className="text-sm text-slate-500">Saldo projetado</p>
              <p className="mt-1 text-xl font-semibold text-slate-950">{formatCurrency(remainingBudget)}</p>
            </div>
          </div>

          <div className="grid gap-4 xl:grid-cols-3">
            <div className="space-y-3">
              <h4 className="text-base font-semibold text-slate-950">Agenda detectada</h4>
              {preview.agendaItems.slice(0, 8).map((item, index) => (
                <div key={item.importKey || `${item.sheetName}-${item.rowNumber}-${index}`} className="rounded-3xl border border-slate-100 p-4">
                  <p className="font-semibold text-slate-950">{item.title}</p>
                  <p className="mt-1 text-sm text-slate-500">
                    {item.date} - {normalizeDisplayTime(item.startTime) || '--:--'}
                  </p>
                  <p className="mt-1 text-sm text-slate-500">{item.location || 'Sem local definido'}</p>
                </div>
              ))}
            </div>

            <div className="space-y-3">
              <h4 className="text-base font-semibold text-slate-950">Gastos detectados</h4>
              {preview.expenses.slice(0, 8).map((expense, index) => (
                <div key={expense.importKey || `${expense.sheetName}-${expense.rowNumber}-${index}`} className="rounded-3xl border border-slate-100 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-slate-950">{expense.description}</p>
                      <p className="mt-1 text-sm text-slate-500">
                        {expense.category} - {expense.type} - {expense.date}
                      </p>
                    </div>
                    <p className="font-semibold text-teal-700">{formatCurrency(expense.value)}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="space-y-3">
              <h4 className="text-base font-semibold text-slate-950">Dicas detectadas</h4>
              {(preview.tips ?? []).slice(0, 8).map((tip, index) => (
                <div key={tip.importKey || `${tip.sheetName}-${tip.rowNumber}-${index}`} className="rounded-3xl border border-slate-100 p-4">
                  <p className="font-semibold text-slate-950">{tip.title}</p>
                  <p className="mt-1 text-sm text-slate-500">
                    {tip.category} {tip.location ? `- ${tip.location}` : ''}
                  </p>
                  <p className="mt-1 text-sm text-slate-500">{tip.description}</p>
                </div>
              ))}
            </div>
          </div>
        </Card>
      ) : (
        <EmptyState
          title="Nenhuma planilha carregada"
          description="Selecione o arquivo ou use a planilha oficial para ver a pre-visualizacao antes da importacao definitiva."
        />
      )}

      {logs.length > 0 ? (
        <Card className="space-y-3">
          <h3 className="text-lg font-semibold text-slate-950">Historico de importacoes</h3>
          {logs.slice(0, 6).map((log) => (
            <div key={log.id} className="rounded-3xl border border-slate-100 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-slate-950">{log.fileName || 'Planilha importada'}</p>
                  <p className="mt-1 text-sm text-slate-500">
                    {formatLogDate(log.createdAt)} - {log.sheetNames?.join(', ')}
                  </p>
                </div>
                <div className="flex flex-wrap gap-3">
                  {log.fileUrl ? (
                    <Button as="a" href={log.fileUrl} target="_blank" rel="noreferrer" variant="secondary">
                      Ver arquivo
                    </Button>
                  ) : null}
                  {canManageImports ? (
                    <Button
                      type="button"
                      variant="ghost"
                      className="text-rose-600 hover:bg-rose-50"
                      onClick={() => handleDeleteImportedLog(log)}
                      disabled={maintenanceLoading}
                    >
                      Excluir
                    </Button>
                  ) : null}
                </div>
              </div>
              <p className="mt-3 text-sm text-slate-600">
                Agenda: {log.agendaCount} - Gastos: {log.expenseCount} - Dicas: {log.tipCount} - Orcamento: {formatCurrency(log.budgetValue)}
              </p>
            </div>
          ))}
        </Card>
      ) : null}
    </div>
  )
}

export default ExpenseImportPage
