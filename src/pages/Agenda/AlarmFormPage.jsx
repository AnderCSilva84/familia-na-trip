import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import Button from '../../components/common/Button'
import Card from '../../components/common/Card'
import EmptyState from '../../components/common/EmptyState'
import Input from '../../components/common/Input'
import Loading from '../../components/common/Loading'
import ErrorState from '../../components/feedback/ErrorState'
import StatusMessage from '../../components/feedback/StatusMessage'
import useAlarms from '../../hooks/useAlarms'
import useMembers from '../../hooks/useMembers'
import { formatDateInput } from '../../utils/formatters'

function getMemberTargetValue(member) {
  return member.userId || member.email || member.id
}

function memberMatchesTarget(member, target) {
  const normalizedTarget = String(target ?? '').trim().toLowerCase()

  return [member.userId, member.email, member.name, member.id]
    .map((value) => String(value ?? '').trim().toLowerCase())
    .filter(Boolean)
    .includes(normalizedTarget)
}

function AlarmFormPage() {
  const navigate = useNavigate()
  const { alarmId } = useParams()
  const { alarms, loading, error, usingMockData, create, update } = useAlarms()
  const { members } = useMembers()
  const [selectedMembers, setSelectedMembers] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [feedback, setFeedback] = useState('')
  const editingAlarm = alarms.find((alarm) => alarm.id === alarmId)
  const membersToNotify = selectedMembers ?? editingAlarm?.membersToNotify ?? []

  function toggleMember(memberValue) {
    setSelectedMembers((current) => {
      const base = current ?? editingAlarm?.membersToNotify ?? []
      return base.includes(memberValue)
        ? base.filter((item) => item !== memberValue)
        : [...base, memberValue]
    })
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setSubmitting(true)
    setFeedback('')
    try {
      const formData = new FormData(event.currentTarget)
      const payload = {
        title: String(formData.get('title') ?? ''),
        description: String(formData.get('description') ?? ''),
        date: String(formData.get('date') ?? ''),
        time: String(formData.get('time') ?? ''),
        notifyMembers: formData.get('notifyMembers') === 'on',
        membersToNotify,
        active: true,
      }
      if (alarmId) {
        await update(alarmId, payload)
      } else {
        await create(payload)
      }
      navigate('/alarms')
    } catch (submitError) {
      setFeedback(submitError.message ?? 'Nao foi possivel salvar o alarme.')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return <Loading />
  if (error) return <ErrorState title="Falha ao abrir alarme" description={error} />
  if (alarmId && !editingAlarm && !usingMockData) {
    return <EmptyState title="Alarme nao encontrado" description="Esse registro pode ter sido removido." />
  }

  return (
    <div className="space-y-4">
      <StatusMessage message={usingMockData ? 'Modo mock ativo. O formulario serve como fallback visual.' : feedback} tone={usingMockData ? 'info' : 'error'} />
      <Card>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <Input name="title" label="Titulo" defaultValue={editingAlarm?.title ?? ''} required />
          <label className="flex flex-col gap-2 text-sm font-medium text-slate-600">
            <span>Descricao</span>
            <textarea name="description" defaultValue={editingAlarm?.description ?? ''} className="min-h-28 rounded-2xl border border-slate-200 px-4 py-3 text-slate-900 outline-none focus:border-teal-500 focus:ring-4 focus:ring-teal-100" />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <Input name="date" label="Data" type="date" defaultValue={formatDateInput(editingAlarm?.date)} required />
            <Input name="time" label="Hora" type="time" defaultValue={editingAlarm?.time ?? ''} required />
          </div>
          <label className="flex items-center gap-3 rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
            <input type="checkbox" name="notifyMembers" defaultChecked={editingAlarm?.notifyMembers ?? false} />
            Notificar membros selecionados
          </label>
          <div className="space-y-3">
            <p className="text-sm font-medium text-slate-600">Membros para notificar</p>
            <div className="flex flex-wrap gap-2">
              {members.map((member) => {
                const memberValue = getMemberTargetValue(member)
                const selected = membersToNotify.some((item) => memberMatchesTarget(member, item))
                return (
                  <button key={member.id} type="button" onClick={() => toggleMember(memberValue)} className={`rounded-full px-4 py-2 text-sm font-medium ${selected ? 'bg-teal-700 text-white' : 'bg-slate-100 text-slate-600'}`}>
                    {member.name}
                  </button>
                )
              })}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Button type="button" variant="secondary" onClick={() => navigate('/alarms')}>Cancelar</Button>
            <Button type="submit" disabled={submitting || usingMockData}>{submitting ? 'Salvando...' : alarmId ? 'Atualizar' : 'Salvar'}</Button>
          </div>
        </form>
      </Card>
    </div>
  )
}

export default AlarmFormPage
