import { useState } from 'react'
import { FiDownload, FiPlus, FiUsers } from 'react-icons/fi'
import { Link, useNavigate } from 'react-router-dom'
import Button from '../../components/common/Button'
import Card from '../../components/common/Card'
import EmptyState from '../../components/common/EmptyState'
import Loading from '../../components/common/Loading'
import StatusMessage from '../../components/feedback/StatusMessage'
import useAgenda from '../../hooks/useAgenda'
import useAuth from '../../hooks/useAuth'
import useExpenses from '../../hooks/useExpenses'
import useMembers from '../../hooks/useMembers'
import { exportTravelWorkbook } from '../../services/exportTravelWorkbook'
import { formatCurrency } from '../../utils/formatters'

function AdminPanelPage() {
  const navigate = useNavigate()
  const { trip } = useAuth()
  const { members, loading: loadingMembers, error: membersError } = useMembers()
  const { agenda, loading: loadingAgenda, error: agendaError } = useAgenda()
  const { expenses, summary, loading: loadingExpenses, error: expensesError } = useExpenses()
  const [feedback, setFeedback] = useState('')
  const [exporting, setExporting] = useState(false)

  const isLoading = loadingMembers || loadingAgenda || loadingExpenses
  const connectedMembers = members.filter((member) => member.active !== false)

  async function handleExport() {
    setExporting(true)
    setFeedback('')

    try {
      const result = await exportTravelWorkbook({
        trip,
        agenda,
        expenses,
        members: connectedMembers,
        summary,
      })

      setFeedback(`Backup exportado com sucesso em ${result.fileName}.`)
    } catch (error) {
      setFeedback(error.message ?? 'Nao foi possivel exportar a planilha.')
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="space-y-4">
      <StatusMessage message={feedback} tone={feedback.includes('sucesso') ? 'success' : 'error'} />

      <Card className="space-y-4 bg-[linear-gradient(135deg,#ecfeff_0%,#ffffff_80%)]">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-teal-700">Operacao central</p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">Painel Admin</h2>
          <p className="mt-2 text-sm text-slate-500">
            Gerencie acessos, acompanhe membros conectados e mantenha um backup da viagem.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          <Button variant="secondary" icon={<FiDownload />} disabled={exporting} onClick={handleExport}>
            {exporting ? 'Exportando...' : 'Exportar backup'}
          </Button>
          <Button variant="secondary" icon={<FiUsers />} onClick={() => navigate('/members')}>
            Gerenciar acessos
          </Button>
          <Button variant="secondary" onClick={() => navigate('/agenda/new')}>
            Novo evento
          </Button>
          <Button variant="secondary" icon={<FiPlus />} onClick={() => navigate('/trips/new')}>
            Cadastrar trip
          </Button>
          <Button variant="secondary" onClick={() => navigate('/trips')}>
            Todas as viagens
          </Button>
        </div>
      </Card>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)]">
        <Card className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-semibold text-slate-950">Membros conectados</h3>
              <p className="mt-1 text-sm text-slate-500">
                Lista dos participantes ativos vinculados a esta viagem.
              </p>
            </div>
            <span className="rounded-full bg-teal-50 px-4 py-2 text-sm font-semibold text-teal-700">
              {connectedMembers.length} conectados
            </span>
          </div>

          {isLoading ? <Loading /> : null}
          {!isLoading && membersError ? <StatusMessage message={membersError} tone="error" /> : null}

          {!isLoading && !membersError && connectedMembers.length === 0 ? (
            <EmptyState
              title="Sem membros conectados"
              description="Quando os participantes forem vinculados a viagem, eles vao aparecer aqui."
            />
          ) : null}

          {!isLoading && !membersError ? (
            <div className="space-y-3">
              {connectedMembers.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center justify-between gap-3 rounded-3xl bg-slate-50 p-4"
                >
                  <div>
                    <p className="font-semibold text-slate-950">{member.name}</p>
                    <p className="mt-1 text-sm text-slate-500">{member.email || 'Sem e-mail cadastrado'}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold uppercase tracking-[0.18em] text-teal-700">
                      {member.roleInTrip}
                    </p>
                    <p className="mt-1 text-xs text-slate-400">ativo</p>
                  </div>
                </div>
              ))}
            </div>
          ) : null}
        </Card>

        <div className="space-y-4">
          <Card className="space-y-3">
            <h3 className="text-lg font-semibold text-slate-950">Resumo do painel</h3>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
              <div className="rounded-3xl bg-slate-50 p-4">
                <p className="text-sm text-slate-500">Acessos ativos</p>
                <p className="mt-1 text-xl font-semibold text-slate-950">{connectedMembers.length}</p>
              </div>
              <div className="rounded-3xl bg-slate-50 p-4">
                <p className="text-sm text-slate-500">Eventos na agenda</p>
                <p className="mt-1 text-xl font-semibold text-slate-950">{agenda.length}</p>
              </div>
              <div className="rounded-3xl bg-slate-50 p-4">
                <p className="text-sm text-slate-500">Gasto efetivado</p>
                <p className="mt-1 text-xl font-semibold text-slate-950">{formatCurrency(summary.totalActual)}</p>
              </div>
              <div className="rounded-3xl bg-slate-50 p-4">
                <p className="text-sm text-slate-500">Saldo do Cartão viagem</p>
                <p className="mt-1 text-xl font-semibold text-slate-950">
                  {formatCurrency(Number(trip?.totalBudget ?? 0) - Number(summary.totalTravelCardActual ?? 0))}
                </p>
              </div>
            </div>
          </Card>

          {agendaError || expensesError ? <StatusMessage message={agendaError || expensesError} tone="error" /> : null}

          <Card className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-950">Gerenciar acessos</h3>
              <Link to="/members" className="text-sm font-semibold text-teal-700">
                Ver membros
              </Link>
            </div>
            <div className="space-y-3">
              {connectedMembers.slice(0, 4).map((member) => (
                <div key={member.id} className="rounded-3xl bg-slate-50 p-4">
                  <p className="font-semibold text-slate-950">{member.name || member.email}</p>
                  <p className="mt-1 text-sm text-slate-500">
                    {member.email || 'Sem e-mail cadastrado'} - {member.roleInTrip || 'member'}
                  </p>
                </div>
              ))}
              {connectedMembers.length === 0 ? (
                <EmptyState
                  title="Sem acessos vinculados"
                  description="Quando os participantes forem cadastrados na viagem, eles aparecem aqui."
                />
              ) : null}
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}

export default AdminPanelPage
