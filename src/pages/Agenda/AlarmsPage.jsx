import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Button from '../../components/common/Button'
import EmptyState from '../../components/common/EmptyState'
import Loading from '../../components/common/Loading'
import AlarmCard from '../../components/cards/AlarmCard'
import ErrorState from '../../components/feedback/ErrorState'
import StatusMessage from '../../components/feedback/StatusMessage'
import useAuth from '../../hooks/useAuth'
import useAlarms from '../../hooks/useAlarms'
import { canCreateContent, canDeleteAnyContent, canDeleteOwnContent, canEditAnyContent, canEditOwnContent } from '../../utils/permissions'

function AlarmsPage() {
  const navigate = useNavigate()
  const { userProfile } = useAuth()
  const { alarms, loading, error, usingMockData, delete: remove, toggle } = useAlarms()
  const [feedback, setFeedback] = useState('')

  async function handleAction(action) {
    try {
      await action()
      setFeedback('Acao realizada com sucesso.')
    } catch (actionError) {
      setFeedback(actionError.message ?? 'Nao foi possivel concluir a acao.')
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        {canCreateContent(userProfile) ? <Button onClick={() => navigate('/alarms/new')}>Novo alarme</Button> : null}
      </div>
      {usingMockData ? <StatusMessage message="Firebase nao configurado. Exibindo alarmes mockados." tone="info" /> : null}
      <StatusMessage message={feedback} tone={feedback.includes('sucesso') ? 'success' : 'error'} />
      {loading ? <Loading /> : null}
      {!loading && error ? <ErrorState title="Falha ao carregar alarmes" description={error} /> : null}
      {!loading && !error && alarms.length === 0 ? <EmptyState title="Nenhum alarme criado" description="Adicione lembretes para horarios importantes da viagem." /> : null}
      {!loading && !error
        ? alarms.map((alarm) => {
            const canManage = canEditAnyContent(userProfile) || canEditOwnContent(userProfile, alarm)
            const canDelete = canDeleteAnyContent(userProfile) || canDeleteOwnContent(userProfile, alarm)
            return (
              <AlarmCard
                key={alarm.id}
                item={alarm}
                canManage={canManage || canDelete}
                onToggle={canManage ? (nextValue) => handleAction(() => toggle(alarm.id, nextValue)) : undefined}
                onEdit={canManage ? () => navigate(`/alarms/${alarm.id}/edit`) : undefined}
                onDelete={canDelete ? () => handleAction(() => remove(alarm.id)) : undefined}
              />
            )
          })
        : null}
    </div>
  )
}

export default AlarmsPage
