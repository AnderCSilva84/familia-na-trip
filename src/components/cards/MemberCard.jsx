import { FiChevronRight, FiEdit2, FiTrash2 } from 'react-icons/fi'
import Avatar from '../common/Avatar'
import Badge from '../common/Badge'
import Card from '../common/Card'
import Button from '../common/Button'

function MemberCard({ member, canManage = false, onEdit, onDelete }) {
  const badgeTone = member.roleInTrip === 'superadmin' ? 'accent' : member.roleInTrip === 'admin' ? 'success' : 'neutral'

  return (
    <Card className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Avatar src={member.avatar} alt={member.name} fallback={member.name?.slice(0, 1) ?? 'M'} />
          <div>
            <h3 className="text-base font-semibold text-slate-950">{member.name}</h3>
            <p className="text-sm text-slate-500">{member.email || 'Sem email cadastrado'}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Badge tone={badgeTone}>
            {member.roleInTrip}
          </Badge>
          <FiChevronRight className="text-slate-400" />
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

export default MemberCard
