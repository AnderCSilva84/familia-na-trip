import { Link } from 'react-router-dom'
import { FiCamera, FiMap, FiMessageCircle, FiPieChart, FiStar } from 'react-icons/fi'
import Card from '../../components/common/Card'
import FeatureImageCard from '../../components/cards/FeatureImageCard'
import useDiary from '../../hooks/useDiary'
import useAppStore from '../../store/useAppStore'
import { resolveMenuImage } from '../../utils/menuImages'

export default function MemoriesPage() {
  const trip = useAppStore((state) => state.trip)
  const { entries } = useDiary()
  const diaryImage = entries.find((entry) => entry.image || entry.photos?.[0]?.url)
  const memoryImage = diaryImage?.image || diaryImage?.photos?.[0]?.url || '/familia.png'
  const areas = [
    { to: '/retrospective', title: 'Retrospectiva', description: 'Planejado × realizado e os números da viagem', image: resolveMenuImage(trip, 'retrospective'), icon: FiPieChart },
    { to: '/diary', title: 'Diário da viagem', description: `${entries.length} memória(s) registrada(s)`, image: resolveMenuImage(trip, 'diary', memoryImage), icon: FiMessageCircle },
    { to: '/gallery', title: 'Galeria da família', description: 'Todas as fotos em um só lugar', image: resolveMenuImage(trip, 'gallery', memoryImage), icon: FiCamera },
    { to: '/reviews', title: 'Avaliações', description: 'Notas e comentários sobre os passeios', image: resolveMenuImage(trip, 'reviews'), icon: FiStar },
    { to: '/travel-history', title: 'Mapa da família', description: 'Cidades e estados já visitados', image: resolveMenuImage(trip, 'travelHistory'), icon: FiMap },
  ]
  return <div className="space-y-4"><Card className="relative overflow-hidden border-0 p-0 text-white"><img src={resolveMenuImage(trip, 'memories')} alt="Família" className="h-56 w-full object-cover"/><div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/25 to-transparent"/><div className="absolute inset-x-0 bottom-0 p-5"><h2 className="text-2xl font-semibold">Memórias da família</h2><p className="mt-2 text-sm text-white/90">Momentos, histórias e lugares que merecem ficar guardados.</p></div></Card><div className="grid gap-3 sm:grid-cols-2">{areas.map(({to,...area}) => <Link key={to} to={to}><FeatureImageCard {...area} tone="bg-amber-50 text-amber-700"/></Link>)}</div></div>
}
