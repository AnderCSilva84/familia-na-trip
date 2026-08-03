import { Link } from 'react-router-dom'
import { FiCalendar, FiCheckSquare, FiCompass, FiMapPin } from 'react-icons/fi'
import Card from '../../components/common/Card'
import FeatureImageCard from '../../components/cards/FeatureImageCard'
import useAppStore from '../../store/useAppStore'
import { resolveMenuImage } from '../../utils/menuImages'

const planningAreas = [
  { to: '/agenda', imageKey: 'agenda', title: 'Programação', description: 'Agenda, horários e lembretes da viagem.', icon: FiCalendar, tone: 'bg-teal-50 text-teal-700' },
  { to: '/itinerary', imageKey: 'itinerary', title: 'Roteiro', description: 'Organize as paradas e acompanhe o que já foi feito.', icon: FiMapPin, tone: 'bg-sky-50 text-sky-700' },
  { to: '/attractions', imageKey: 'attractions', title: 'Lugares para conhecer', description: 'Escolha atrações e leve as favoritas para o roteiro.', icon: FiCompass, tone: 'bg-amber-50 text-amber-700' },
  { to: '/checklist', imageKey: 'checklist', title: 'Checklist e malas', description: 'Preparativos compartilhados e itens de cada pessoa.', icon: FiCheckSquare, tone: 'bg-violet-50 text-violet-700' },
]

export default function PlanningPage() {
  const trip = useAppStore((state) => state.trip)
  return (
    <div className="space-y-4">
      <Card className="relative overflow-hidden border-0 bg-teal-800 text-white">
        <img src={resolveMenuImage(trip, 'planning')} alt="Destino da viagem" className="absolute inset-0 h-full w-full object-cover"/><div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(15,118,110,0.96),rgba(15,118,110,0.55))]"/>
        <div className="relative"><p className="text-sm font-semibold text-teal-100">Antes e durante a viagem</p>
        <h2 className="mt-2 text-2xl font-semibold text-white">Planeje sem se perder</h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-teal-50">Programação, lugares e preparativos reunidos em uma única área.</p></div>
      </Card>
      <div className="grid gap-3 sm:grid-cols-2">
        {planningAreas.map(({ to, imageKey, ...area }) => (
          <Link key={to} to={to}>
            <FeatureImageCard {...area} image={resolveMenuImage(trip, imageKey)}/>
          </Link>
        ))}
      </div>
    </div>
  )
}
