import { FiEdit2, FiImage, FiTrash2 } from 'react-icons/fi'
import { Link } from 'react-router-dom'
import { formatDisplayDate } from '../../utils/formatters'
import AppImage from '../common/AppImage'
import Button from '../common/Button'
import Card from '../common/Card'

function DiaryCard({ entry, canEdit = false, canDelete = false, onEdit, onDelete }) {
  const coverImage = entry.photos?.[0]?.url ?? entry.image ?? ''
  const excerpt = entry.content ?? entry.excerpt ?? ''

  return (
    <Card className="overflow-hidden p-0">
      <Link
        to={`/diary/${entry.id}`}
        className="group block focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-inset focus-visible:ring-teal-200"
        aria-label={`Abrir postagem ${entry.title}`}
      >
        <AppImage
          src={coverImage}
          alt={entry.title}
          className="h-[13.5rem] w-full object-cover transition duration-300 group-hover:scale-[1.02]"
          fallbackClassName="h-[13.5rem] w-full"
          fallbackLabel="Diario"
        />
      </Link>
      <div className="space-y-3 p-4">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
          {formatDisplayDate(entry.date)}
        </p>
        <Link to={`/diary/${entry.id}`} className="block rounded-lg focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-teal-100">
          <h3 className="text-lg font-semibold text-slate-950 hover:text-teal-700">{entry.title}</h3>
        </Link>
        <p className="text-sm text-slate-500">{excerpt || 'Sem conteudo adicional.'}</p>
        <div className="flex items-center justify-between text-sm text-slate-500">
          <span className="inline-flex items-center gap-2">
            <FiImage size={14} />
            {entry.photos?.length ?? 0} foto(s)
          </span>
          <Link to={`/diary/${entry.id}`} className="font-semibold text-teal-700 hover:text-teal-800">
            Ver postagem
          </Link>
        </div>

        {canEdit || canDelete ? (
          <div className="flex gap-3">
            {canEdit ? (
            <Button variant="secondary" className="flex-1" icon={<FiEdit2 size={16} />} onClick={onEdit}>
              Editar
            </Button>
            ) : null}
            {canDelete ? (
            <Button variant="ghost" className="flex-1 text-rose-600 hover:bg-rose-50" icon={<FiTrash2 size={16} />} onClick={onDelete}>
              Excluir
            </Button>
            ) : null}
          </div>
        ) : null}
      </div>
    </Card>
  )
}

export default DiaryCard
