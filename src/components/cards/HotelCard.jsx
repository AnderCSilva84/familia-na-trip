import { FiEdit2, FiExternalLink, FiMapPin, FiTrash2 } from 'react-icons/fi'
import { formatCurrency, formatDisplayDate } from '../../utils/formatters'
import AppImage from '../common/AppImage'
import Badge from '../common/Badge'
import Button from '../common/Button'
import Card from '../common/Card'

const statusTone = {
  pesquisando: 'warning',
  reservado: 'accent',
  pago: 'success',
  cancelado: 'neutral',
}

function HotelCard({ hotel, canManage = false, onEdit, onDelete }) {
  return (
    <Card className="overflow-hidden p-0">
      <AppImage
        src={hotel.image}
        alt={hotel.hotelName}
        className="h-44 w-full object-cover"
        fallbackClassName="h-44 w-full"
        fallbackLabel="Hospedagem"
      />
      <div className="space-y-4 p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">{hotel.title}</p>
            <h3 className="text-lg font-semibold text-slate-950">{hotel.hotelName}</h3>
            <p className="mt-1 text-sm text-slate-500">{hotel.address}</p>
          </div>
          <Badge tone={statusTone[hotel.status] ?? 'neutral'}>{hotel.status}</Badge>
        </div>

        <div className="grid grid-cols-2 gap-3 text-sm text-slate-500">
          <p>Check-in: {formatDisplayDate(hotel.checkIn)}</p>
          <p>Check-out: {formatDisplayDate(hotel.checkOut)}</p>
          <p>Estimado: {formatCurrency(hotel.estimatedValue)}</p>
          <p>Final: {formatCurrency(hotel.finalValue)}</p>
        </div>

        <div className="space-y-2 text-sm text-slate-500">
          {hotel.notes ? <p>{hotel.notes}</p> : null}
          {hotel.link ? (
            <a
              href={hotel.link}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 font-semibold text-teal-700"
            >
              <FiExternalLink size={14} />
              Abrir link da reserva
            </a>
          ) : null}
          {hotel.address ? (
            <p className="inline-flex items-center gap-2">
              <FiMapPin size={14} />
              {hotel.address}
            </p>
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
      </div>
    </Card>
  )
}

export default HotelCard
