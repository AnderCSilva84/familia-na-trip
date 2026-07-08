import { FiEdit2, FiExternalLink, FiMapPin, FiTrash2 } from 'react-icons/fi'
import { formatDayNumber, formatDisplayDate, formatWeekdayShort, normalizeDisplayTime } from '../../utils/formatters'
import AppImage from '../common/AppImage'
import Badge from '../common/Badge'
import Button from '../common/Button'
import Card from '../common/Card'

function ItineraryCard({ item, canManage = false, onEdit, onDelete }) {
  const tone = item.status === 'concluido' ? 'success' : item.status === 'em_andamento' ? 'warning' : 'accent'
  const timeRange = normalizeDisplayTime(item.startTime) || ''

  return (
    <Card className="space-y-4">
      <AppImage
        src={item.image}
        alt={item.title}
        className="h-44 w-full rounded-[28px] object-cover"
        fallbackClassName="h-44 w-full rounded-[28px]"
        fallbackLabel="Roteiro"
      />
      <div className="flex gap-4">
        <div className="min-w-14 text-center">
          <p className="text-2xl font-semibold text-slate-950">{formatDayNumber(item.date)}</p>
          <p className="text-xs uppercase tracking-[0.2em] text-slate-400">{formatWeekdayShort(item.date)}</p>
        </div>
        <div className="flex-1 space-y-2">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="text-base font-semibold text-slate-950">{item.title}</h3>
              <p className="text-sm text-slate-500">{item.description || 'Sem descricao adicional.'}</p>
            </div>
            <Badge tone={tone}>{item.status}</Badge>
          </div>
          <p className="text-sm font-medium text-teal-700">{formatDisplayDate(item.date)}</p>
          <div className="flex flex-wrap items-center gap-3 text-sm text-slate-500">
            {item.location ? (
              <span className="inline-flex items-center gap-1">
                <FiMapPin size={14} />
                {item.location}
              </span>
            ) : null}
            {timeRange ? <span>{timeRange}</span> : null}
            {item.link ? (
              <a
                href={item.link}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 font-semibold text-teal-700"
              >
                <FiExternalLink size={14} />
                Abrir reserva
              </a>
            ) : null}
          </div>
        </div>
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

export default ItineraryCard
