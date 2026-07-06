import { FiCheckCircle, FiLock, FiRefreshCcw, FiTrash2 } from 'react-icons/fi'
import Button from '../common/Button'
import Card from '../common/Card'

function PollCard({
  poll,
  totalVotes,
  currentUserVotes,
  onVote,
  onClose,
  onReopen,
  onDelete,
  canManage = false,
}) {
  return (
    <Card className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-slate-950">{poll.question}</h3>
          <p className="mt-1 text-sm text-slate-500">
            {poll.active ? 'Enquete aberta para votos' : 'Enquete encerrada'}
          </p>
        </div>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
          {totalVotes} votos
        </span>
      </div>

      <div className="space-y-3">
        {poll.options.map((option) => {
          const votes = poll.votes?.[option.id] ?? []
          const percentage = totalVotes ? Math.round((votes.length / totalVotes) * 100) : 0
          const voted = currentUserVotes.includes(option.id)

          return (
            <div key={option.id} className="space-y-2">
              <div className="flex items-center justify-between text-sm text-slate-600">
                <span className="inline-flex items-center gap-2">
                  {option.text}
                  {voted ? <FiCheckCircle className="text-emerald-600" size={14} /> : null}
                </span>
                <span>{votes.length} voto(s)</span>
              </div>
              <div className="h-2 rounded-full bg-slate-100">
                <div className="h-2 rounded-full bg-teal-600" style={{ width: `${percentage}%` }} />
              </div>
              <Button
                variant="secondary"
                className="w-full"
                disabled={!poll.active}
                onClick={() => onVote(option.id)}
              >
                {voted ? 'Alterar voto' : 'Votar nesta opcao'}
              </Button>
            </div>
          )
        })}
      </div>

      {canManage ? (
        <div className="grid grid-cols-3 gap-3">
          {poll.active ? (
            <Button variant="secondary" icon={<FiLock size={15} />} onClick={onClose}>
              Fechar
            </Button>
          ) : (
            <Button variant="secondary" icon={<FiRefreshCcw size={15} />} onClick={onReopen}>
              Reabrir
            </Button>
          )}
          <div className="col-span-2">
            <Button variant="ghost" className="w-full text-rose-600 hover:bg-rose-50" icon={<FiTrash2 size={15} />} onClick={onDelete}>
              Excluir enquete
            </Button>
          </div>
        </div>
      ) : null}
    </Card>
  )
}

export default PollCard
