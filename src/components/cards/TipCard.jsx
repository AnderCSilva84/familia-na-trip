import { FiEdit2, FiExternalLink, FiMapPin, FiTag, FiTrash2 } from 'react-icons/fi'
import Button from '../common/Button'
import Card from '../common/Card'

function TipCard({ tip, canManage = false, onEdit, onDelete }) {
  return (
    <Card className="space-y-4">
      <div className="flex items-start gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-teal-50 text-xl text-teal-700">
          {tip.icon ?? '💡'}
        </div>
        <div className="flex-1">
          <h3 className="text-base font-semibold text-slate-950">{tip.title}</h3>
          <p className="mt-1 text-sm text-slate-500">{tip.description || 'Sem descricao adicional.'}</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-3 text-sm text-slate-500">
        <span className="inline-flex items-center gap-2">
          <FiTag size={14} />
          {tip.category}
        </span>
        {tip.location ? (
          <span className="inline-flex items-center gap-2">
            <FiMapPin size={14} />
            {tip.location}
          </span>
        ) : null}
        {tip.link ? (
          <a href={tip.link} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 font-semibold text-teal-700">
            <FiExternalLink size={14} />
            Ver link
          </a>
        ) : null}
      </div>

      {canManage ? (
        <div className="flex gap-3">
          <Button variant="secondary" className="flex-1" icon={<FiEdit2 size={16} />} onClick={onEdit}>
            Editar
          </Button>
          <Button variant="ghost" className="flex-1 text-rose-600 hover:bg-rose-50" icon={<FiTrash2 size={16} />} onClick={onDelete}>
            Excluir
          </Button>
        </div>
      ) : null}
    </Card>
  )
}

export default TipCard
