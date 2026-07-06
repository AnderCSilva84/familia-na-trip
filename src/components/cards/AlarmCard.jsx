import { FiEdit2, FiTrash2 } from 'react-icons/fi'
import { formatDisplayDate } from '../../utils/formatters'
import Button from '../common/Button'
import Card from '../common/Card'

function AlarmCard({ item, onToggle, canManage = false, onEdit, onDelete }) {
  return (
    <Card className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-2xl font-semibold text-slate-950">{item.time}</h3>
          <p className="mt-1 text-sm font-medium text-slate-700">{item.title}</p>
          <p className="text-sm text-slate-500">{item.description}</p>
          <p className="mt-1 text-xs uppercase tracking-[0.2em] text-slate-400">
            {formatDisplayDate(item.date)}
          </p>
        </div>
        <button
          type="button"
          onClick={() => onToggle?.(!item.active)}
          className={`relative h-7 w-12 rounded-full transition ${item.active ? 'bg-teal-600' : 'bg-slate-200'}`}
        >
          <span
            className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition ${item.active ? 'left-6' : 'left-1'}`}
          />
        </button>
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

export default AlarmCard
