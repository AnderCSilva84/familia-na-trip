import { FiEdit2, FiExternalLink, FiMapPin, FiTrash2 } from 'react-icons/fi'
import { formatCurrency, formatDisplayDate } from '../../utils/formatters'
import Badge from '../common/Badge'
import Button from '../common/Button'
import Card from '../common/Card'

const statusTone = {
  pesquisando: 'warning',
  reservado: 'accent',
  pago: 'success',
  cancelado: 'neutral',
}

function VehicleCard({ vehicle, canManage = false, onEdit, onDelete }) {
  return (
    <Card className="overflow-hidden p-0">
      {vehicle.image ? <img src={vehicle.image} alt={vehicle.vehicleModel} className="h-44 w-full object-cover" /> : null}
      <div className="space-y-4 p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">{vehicle.title}</p>
            <h3 className="text-lg font-semibold text-slate-950">{vehicle.vehicleModel}</h3>
            <p className="text-sm text-slate-500">{vehicle.rentalCompany}</p>
          </div>
          <Badge tone={statusTone[vehicle.status] ?? 'neutral'}>{vehicle.status}</Badge>
        </div>

        <div className="grid grid-cols-2 gap-3 text-sm text-slate-500">
          <p>Retirada: {formatDisplayDate(vehicle.pickupDate)}</p>
          <p>Devolucao: {formatDisplayDate(vehicle.returnDate)}</p>
          <p>Estimado: {formatCurrency(vehicle.estimatedValue)}</p>
          <p>Final: {formatCurrency(vehicle.finalValue)}</p>
        </div>

        <div className="space-y-2 text-sm text-slate-500">
          <p className="inline-flex items-center gap-2">
            <FiMapPin size={14} />
            {vehicle.pickupLocation || 'Local de retirada nao informado'}
          </p>
          <p className="inline-flex items-center gap-2">
            <FiMapPin size={14} />
            {vehicle.returnLocation || 'Local de devolucao nao informado'}
          </p>
          {vehicle.link ? (
            <a
              href={vehicle.link}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 font-semibold text-teal-700"
            >
              <FiExternalLink size={14} />
              Abrir link da locacao
            </a>
          ) : null}
          {vehicle.notes ? <p>{vehicle.notes}</p> : null}
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

export default VehicleCard
