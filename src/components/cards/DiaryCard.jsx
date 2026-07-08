import { FiEdit2, FiImage, FiTrash2 } from 'react-icons/fi'
import { formatDisplayDate } from '../../utils/formatters'
import AppImage from '../common/AppImage'
import Button from '../common/Button'
import Card from '../common/Card'

function DiaryCard({ entry, canManage = false, onEdit, onDelete }) {
  const coverImage = entry.photos?.[0]?.url ?? entry.image ?? ''
  const excerpt = entry.content ?? entry.excerpt ?? ''

  return (
    <Card className="overflow-hidden p-0">
      <AppImage
        src={coverImage}
        alt={entry.title}
        className="h-36 w-full object-cover"
        fallbackClassName="h-36 w-full"
        fallbackLabel="Diario"
      />
      <div className="space-y-3 p-4">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
          {formatDisplayDate(entry.date)}
        </p>
        <h3 className="text-lg font-semibold text-slate-950">{entry.title}</h3>
        <p className="text-sm text-slate-500">{excerpt || 'Sem conteudo adicional.'}</p>
        <div className="flex items-center justify-between text-sm text-slate-500">
          <span className="inline-flex items-center gap-2">
            <FiImage size={14} />
            {entry.photos?.length ?? 0} foto(s)
          </span>
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
      </div>
    </Card>
  )
}

export default DiaryCard
