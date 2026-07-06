import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import Avatar from '../../components/common/Avatar'
import Button from '../../components/common/Button'
import Card from '../../components/common/Card'
import EmptyState from '../../components/common/EmptyState'
import Input from '../../components/common/Input'
import Loading from '../../components/common/Loading'
import ErrorState from '../../components/feedback/ErrorState'
import StatusMessage from '../../components/feedback/StatusMessage'
import useMembers from '../../hooks/useMembers'

function MemberFormPage() {
  const navigate = useNavigate()
  const { memberId } = useParams()
  const { members, loading, error, createMember, updateMember, usingMockData } = useMembers()
  const [feedback, setFeedback] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const editingMember = members.find((member) => member.id === memberId)

  async function handleSubmit(event) {
    event.preventDefault()
    setSubmitting(true)
    setFeedback('')

    try {
      const formData = new FormData(event.currentTarget)
      const payload = {
        name: String(formData.get('name') ?? ''),
        email: String(formData.get('email') ?? '').trim().toLowerCase(),
        avatar: String(formData.get('avatar') ?? ''),
        roleInTrip: String(formData.get('roleInTrip') ?? 'member'),
      }

      if (memberId) {
        await updateMember(memberId, payload)
        setFeedback('Membro atualizado com sucesso.')
      } else {
        await createMember(payload)
        setFeedback('Membro criado com sucesso.')
      }

      navigate('/members')
    } catch (submitError) {
      setFeedback(submitError.message ?? 'Nao foi possivel salvar o membro.')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return <Loading />
  }

  if (error) {
    return <ErrorState title="Falha ao abrir o formulario" description={error} />
  }

  if (memberId && !editingMember && !usingMockData) {
    return (
      <EmptyState
        title="Membro nao encontrado"
        description="Esse registro pode ter sido removido ou ainda nao foi sincronizado."
      />
    )
  }

  return (
    <div className="space-y-4">
      <StatusMessage
        message={usingMockData ? 'Modo mock ativo. O formulario serve apenas como referencia visual.' : feedback}
        tone={usingMockData ? 'info' : feedback.includes('sucesso') ? 'success' : 'error'}
      />

      <Card className="space-y-5">
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="flex justify-center">
            <Avatar
              src={editingMember?.avatar ?? ''}
              alt={editingMember?.name ?? 'Novo membro'}
              size="lg"
              fallback={(editingMember?.name ?? 'M').slice(0, 1)}
            />
          </div>
          <Input name="name" label="Nome completo" defaultValue={editingMember?.name ?? ''} required />
          <Input name="email" label="E-mail" type="email" defaultValue={editingMember?.email ?? ''} required />
          <Input name="avatar" label="Foto de perfil (URL)" defaultValue={editingMember?.avatar ?? ''} />

          <label className="flex flex-col gap-2 text-sm font-medium text-slate-600">
            <span>Papel na viagem</span>
            <select
              name="roleInTrip"
              defaultValue={editingMember?.roleInTrip ?? 'member'}
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none focus:border-teal-500 focus:ring-4 focus:ring-teal-100"
            >
              <option value="member">member</option>
              <option value="admin">admin</option>
              <option value="superadmin">superadmin</option>
            </select>
          </label>

          <div className="grid grid-cols-2 gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={() => navigate('/members')}>
              Cancelar
            </Button>
            <Button type="submit" disabled={submitting || usingMockData}>
              {submitting ? 'Salvando...' : memberId ? 'Atualizar' : 'Salvar'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  )
}

export default MemberFormPage
