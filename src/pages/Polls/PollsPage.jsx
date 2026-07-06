import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Button from '../../components/common/Button'
import EmptyState from '../../components/common/EmptyState'
import Loading from '../../components/common/Loading'
import PollCard from '../../components/cards/PollCard'
import ErrorState from '../../components/feedback/ErrorState'
import StatusMessage from '../../components/feedback/StatusMessage'
import useAuth from '../../hooks/useAuth'
import usePolls from '../../hooks/usePolls'
import { canCreateContent, canDeleteAnyContent, canDeleteOwnContent, canEditAnyContent, canEditOwnContent } from '../../utils/permissions'

function PollsPage() {
  const navigate = useNavigate()
  const { userProfile } = useAuth()
  const { polls, loading, error, usingMockData, vote, close, reopen, delete: remove } = usePolls()
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
        {canCreateContent(userProfile) ? <Button onClick={() => navigate('/polls/new')}>Nova enquete</Button> : null}
      </div>
      {usingMockData ? <StatusMessage message="Firebase nao configurado. Exibindo enquetes mockadas." tone="info" /> : null}
      <StatusMessage message={feedback} tone={feedback.includes('sucesso') ? 'success' : 'error'} />
      {loading ? <Loading /> : null}
      {!loading && error ? <ErrorState title="Falha ao carregar enquetes" description={error} /> : null}
      {!loading && !error && polls.length === 0 ? <EmptyState title="Nenhuma enquete criada" description="Crie uma enquete para decidir passeios, restaurantes e horarios em familia." /> : null}
      {!loading && !error
        ? polls.map((poll) => {
            const currentUserVotes = Object.entries(poll.votes ?? {})
              .filter(([, users]) => users.includes(userProfile?.uid))
              .map(([optionId]) => optionId)
            const totalVotes = Object.values(poll.votes ?? {}).reduce((sum, users) => sum + users.length, 0)
            const canManage = canEditAnyContent(userProfile) || canEditOwnContent(userProfile, poll)
            const canDelete = canDeleteAnyContent(userProfile) || canDeleteOwnContent(userProfile, poll)

            return (
              <PollCard
                key={poll.id}
                poll={poll}
                totalVotes={totalVotes}
                currentUserVotes={currentUserVotes}
                canManage={canManage || canDelete}
                onVote={(optionId) => handleAction(() => vote(poll.id, optionId))}
                onClose={canManage ? () => handleAction(() => close(poll.id)) : undefined}
                onReopen={canManage ? () => handleAction(() => reopen(poll.id)) : undefined}
                onDelete={canDelete ? () => handleAction(() => remove(poll.id)) : undefined}
              />
            )
          })
        : null}
    </div>
  )
}

export default PollsPage
