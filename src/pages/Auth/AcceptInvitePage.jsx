import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Button from '../../components/common/Button'
import Card from '../../components/common/Card'
import EmptyState from '../../components/common/EmptyState'
import Loading from '../../components/common/Loading'
import StatusMessage from '../../components/feedback/StatusMessage'
import useAuth from '../../hooks/useAuth'
import { acceptInvite, declineInvite } from '../../services/inviteService'
import { getTripById } from '../../services/tripService'
import useAppStore from '../../store/useAppStore'

function AcceptInvitePage() {
  const navigate = useNavigate()
  const { userProfile, pendingInvites, loadingAuth } = useAuth()
  const setPendingInvites = useAppStore((state) => state.setPendingInvites)
  const setTrip = useAppStore((state) => state.setTrip)
  const setUserProfile = useAppStore((state) => state.setUserProfile)
  const [feedback, setFeedback] = useState('')
  const [processingId, setProcessingId] = useState('')

  if (loadingAuth) {
    return <Loading />
  }

  async function handleAccept(invite) {
    setProcessingId(invite.id)
    setFeedback('')

    try {
      const nextProfile = await acceptInvite(invite, userProfile)
      const trip = await getTripById(invite.tripId)

      setUserProfile(nextProfile ?? userProfile)
      setTrip(trip)
      setPendingInvites(pendingInvites.filter((item) => item.id !== invite.id))
      setFeedback('Convite aceito com sucesso. Voce ja pode usar a viagem no aplicativo.')
      navigate('/dashboard')
    } catch (error) {
      setFeedback(error.message ?? 'Nao foi possivel aceitar o convite.')
    } finally {
      setProcessingId('')
    }
  }

  async function handleDecline(invite) {
    setProcessingId(invite.id)
    setFeedback('')

    try {
      await declineInvite(invite.id, userProfile.uid)
      const remainingInvites = pendingInvites.filter((item) => item.id !== invite.id)
      setPendingInvites(remainingInvites)
      setFeedback('Convite recusado com sucesso.')

      if (remainingInvites.length === 0) {
        navigate('/dashboard')
      }
    } catch (error) {
      setFeedback(error.message ?? 'Nao foi possivel recusar o convite.')
    } finally {
      setProcessingId('')
    }
  }

  return (
    <div className="space-y-4">
      <StatusMessage message={feedback} tone={feedback.includes('sucesso') ? 'success' : 'error'} />

      <Card className="space-y-3 bg-[linear-gradient(135deg,#ecfeff_0%,#ffffff_75%)]">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-teal-700">Convites pendentes</p>
        <h2 className="text-2xl font-semibold tracking-tight text-slate-950">Escolha como entrar na viagem</h2>
        <p className="text-sm text-slate-500">
          Os convites enviados para o seu e-mail aparecem aqui. So depois do aceite a viagem passa a ficar ativa para voce.
        </p>
      </Card>

      {pendingInvites.length === 0 ? (
        <EmptyState
          title="Sem convites pendentes"
          description="Quando alguem enviar um convite para este e-mail, ele aparecera aqui."
        />
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          {pendingInvites.map((invite) => (
            <Card key={invite.id} className="space-y-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">{invite.role}</p>
                <h3 className="mt-2 text-lg font-semibold text-slate-950">{invite.name || invite.email}</h3>
                <p className="mt-1 text-sm text-slate-500">{invite.email}</p>
              </div>
              <div className="rounded-3xl bg-slate-50 p-4 text-sm text-slate-600">
                <p>Trip vinculada: {invite.tripId}</p>
                <p className="mt-1">Status: {invite.status}</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Button
                  variant="secondary"
                  disabled={processingId === invite.id}
                  onClick={() => handleDecline(invite)}
                >
                  Recusar
                </Button>
                <Button disabled={processingId === invite.id} onClick={() => handleAccept(invite)}>
                  {processingId === invite.id ? 'Processando...' : 'Aceitar'}
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

export default AcceptInvitePage
