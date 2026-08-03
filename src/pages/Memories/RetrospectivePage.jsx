import { Link } from 'react-router-dom'
import { FiBookOpen, FiCamera, FiDollarSign, FiMapPin, FiTrendingDown, FiTrendingUp } from 'react-icons/fi'
import Card from '../../components/common/Card'
import useAgenda from '../../hooks/useAgenda'
import useAgendaReviews from '../../hooks/useAgendaReviews'
import useAttractions from '../../hooks/useAttractions'
import useDiary from '../../hooks/useDiary'
import useDistances from '../../hooks/useDistances'
import useExpenses from '../../hooks/useExpenses'
import useAppStore from '../../store/useAppStore'
import { formatCurrency, formatDisplayDate } from '../../utils/formatters'

export default function RetrospectivePage() {
  const trip = useAppStore((state) => state.trip)
  const { agenda } = useAgenda()
  const { reviews } = useAgendaReviews()
  const { items: attractions } = useAttractions()
  const { entries } = useDiary()
  const { summary: distanceSummary } = useDistances()
  const { summary: expenseSummary } = useExpenses()
  const planned = Number(expenseSummary.totalEstimated ?? 0)
  const actual = Number(expenseSummary.totalActual ?? 0)
  const difference = planned - actual
  const completedEvents = agenda.filter((item) => Number(item.actualCost ?? 0) > 0 || item.status === 'completed')
  const visited = attractions.filter((item) => item.visited)
  const averageRating = reviews.length ? reviews.reduce((total, item) => total + Number(item.rating ?? 0), 0) / reviews.length : 0

  return <div className="space-y-4">
    <Card className="overflow-hidden border-0 bg-[linear-gradient(135deg,#7c2d12,#f59e0b)] text-white"><p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-100">Retrospectiva automática</p><h2 className="mt-2 text-3xl font-semibold">{trip?.name || 'Nossa viagem'}</h2><p className="mt-2 text-sm text-amber-50">{trip?.startDate ? formatDisplayDate(trip.startDate) : 'Início não informado'} até {trip?.endDate ? formatDisplayDate(trip.endDate) : 'fim não informado'} · {trip?.destination || 'Destino da família'}</p></Card>
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4"><Card><FiMapPin className="text-teal-700"/><p className="mt-3 text-2xl font-semibold text-slate-950">{completedEvents.length}</p><p className="text-sm text-slate-500">atividades realizadas</p></Card><Card><FiCamera className="text-amber-700"/><p className="mt-3 text-2xl font-semibold text-slate-950">{entries.length}</p><p className="text-sm text-slate-500">memórias registradas</p></Card><Card><FiBookOpen className="text-sky-700"/><p className="mt-3 text-2xl font-semibold text-slate-950">{visited.length}</p><p className="text-sm text-slate-500">lugares visitados</p></Card><Card><FiMapPin className="text-violet-700"/><p className="mt-3 text-2xl font-semibold text-slate-950">{Number(distanceSummary.total ?? 0).toFixed(1)} km</p><p className="text-sm text-slate-500">percorridos</p></Card></div>
    <Card><div className="flex items-center gap-2"><FiDollarSign className="text-teal-700"/><h3 className="font-semibold text-slate-950">Planejado × realizado</h3></div><div className="mt-4 grid gap-3 sm:grid-cols-3"><div className="rounded-2xl bg-slate-50 p-4"><p className="text-sm text-slate-500">Planejado</p><p className="mt-1 text-xl font-semibold text-slate-950">{formatCurrency(planned)}</p></div><div className="rounded-2xl bg-slate-50 p-4"><p className="text-sm text-slate-500">Realizado</p><p className="mt-1 text-xl font-semibold text-slate-950">{formatCurrency(actual)}</p></div><div className={`rounded-2xl p-4 ${difference >= 0 ? 'bg-teal-50' : 'bg-rose-50'}`}><p className="flex items-center gap-1 text-sm text-slate-500">{difference >= 0 ? <FiTrendingDown/> : <FiTrendingUp/>}{difference >= 0 ? 'Economia' : 'Acima do previsto'}</p><p className={`mt-1 text-xl font-semibold ${difference >= 0 ? 'text-teal-700' : 'text-rose-700'}`}>{formatCurrency(Math.abs(difference))}</p></div></div></Card>
    <Card><h3 className="font-semibold text-slate-950">A experiência da família</h3><p className="mt-2 text-sm text-slate-500">{reviews.length ? `${reviews.length} avaliação(ões), com média de ${averageRating.toFixed(1)} de 5 gatinhos.` : 'As avaliações dos passeios aparecerão aqui conforme a família registrar.'}</p><div className="mt-4 flex flex-wrap gap-2"><Link to="/gallery" className="rounded-2xl bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">Rever fotos</Link><Link to="/diary" className="rounded-2xl bg-teal-50 px-4 py-3 text-sm font-semibold text-teal-800">Abrir diário</Link><Link to="/distances" className="rounded-2xl bg-sky-50 px-4 py-3 text-sm font-semibold text-sky-800">Ver distâncias</Link></div></Card>
  </div>
}
