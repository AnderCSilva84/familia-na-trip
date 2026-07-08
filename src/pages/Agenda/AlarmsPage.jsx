import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Button from '../../components/common/Button'
import Card from '../../components/common/Card'
import EmptyState from '../../components/common/EmptyState'
import Loading from '../../components/common/Loading'
import AlarmCard from '../../components/cards/AlarmCard'
import ErrorState from '../../components/feedback/ErrorState'
import StatusMessage from '../../components/feedback/StatusMessage'
import useAuth from '../../hooks/useAuth'
import useAlarms from '../../hooks/useAlarms'
import useMembers from '../../hooks/useMembers'
import { formatDateInput } from '../../utils/formatters'
import { canCreateContent, canDeleteAnyContent, canDeleteOwnContent, canEditAnyContent, canEditOwnContent } from '../../utils/permissions'

function getTodayString() {
  return new Date().toISOString().slice(0, 10)
}

function getTomorrowString() {
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  return tomorrow.toISOString().slice(0, 10)
}

function AlarmsPage() {
  const navigate = useNavigate()
  const { userProfile } = useAuth()
  const { alarms, loading, error, usingMockData, delete: remove, toggle } = useAlarms()
  const { members } = useMembers()
  const [feedback, setFeedback] = useState('')
  const todayString = getTodayString()
  const tomorrowString = getTomorrowString()

  function resolveMemberLabel(target) {
    const normalizedTarget = String(target ?? '').trim().toLowerCase()
    const matchedMember = members.find((member) =>
      [member.userId, member.email, member.name, member.id]
        .map((value) => String(value ?? '').trim().toLowerCase())
        .filter(Boolean)
        .includes(normalizedTarget),
    )

    return matchedMember?.name ?? target
  }

  const groupedAlarms = useMemo(() => {
    const groups = {
      today: [],
      tomorrow: [],
      upcoming: [],
      past: [],
    }

    alarms.forEach((alarm) => {
      const alarmDate = formatDateInput(alarm.date)

      if (!alarmDate) {
        groups.upcoming.push(alarm)
        return
      }

      if (alarmDate === todayString) {
        groups.today.push(alarm)
      } else if (alarmDate === tomorrowString) {
        groups.tomorrow.push(alarm)
      } else if (alarmDate > tomorrowString) {
        groups.upcoming.push(alarm)
      } else {
        groups.past.push(alarm)
      }
    })

    return groups
  }, [alarms, todayString, tomorrowString])

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
      {!loading && !error ? (
        <>
          {[
            { key: 'today', title: 'Hoje', items: groupedAlarms.today },
            { key: 'tomorrow', title: 'Amanha', items: groupedAlarms.tomorrow },
            { key: 'upcoming', title: 'Proximos', items: groupedAlarms.upcoming },
            { key: 'past', title: 'Passados', items: groupedAlarms.past },
          ]
            .filter((group) => group.items.length > 0)
            .map((group) => (
              <section key={group.key} className="space-y-3">
                <Card className="rounded-[28px] bg-[linear-gradient(135deg,#f0fdfa_0%,#ffffff_100%)] py-4">
                  <h3 className="text-base font-semibold text-slate-950">{group.title}</h3>
                  <p className="mt-1 text-sm text-slate-500">{group.items.length} alarme(s)</p>
                </Card>
                {group.items.map((alarm) => {
                  const canManage = canEditAnyContent(userProfile) || canEditOwnContent(userProfile, alarm)
                  const canDelete = canDeleteAnyContent(userProfile) || canDeleteOwnContent(userProfile, alarm)

                  return (
                    <AlarmCard
                      key={alarm.id}
                      item={alarm}
                      resolveMemberLabel={resolveMemberLabel}
                      canManage={canManage || canDelete}
                      onToggle={canManage ? (nextValue) => handleAction(() => toggle(alarm.id, nextValue)) : undefined}
                      onEdit={canManage ? () => navigate(`/alarms/${alarm.id}/edit`) : undefined}
                      onDelete={canDelete ? () => handleAction(() => remove(alarm.id)) : undefined}
                    />
                  )
                })}
              </section>
            ))}
        </>
      ) : null}
    </div>
  )
}

export default AlarmsPage
