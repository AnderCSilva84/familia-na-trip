import { Link } from 'react-router-dom'
import { FiBriefcase, FiFileText, FiHome, FiTruck } from 'react-icons/fi'
import Card from '../../components/common/Card'
import FeatureImageCard from '../../components/cards/FeatureImageCard'
import useHotels from '../../hooks/useHotels'
import useVehicles from '../../hooks/useVehicles'
import useWallet from '../../hooks/useWallet'
import useAppStore from '../../store/useAppStore'
import { resolveMenuImage } from '../../utils/menuImages'

export default function ReservationsPage() {
  const trip = useAppStore((state) => state.trip)
  const { hotels } = useHotels()
  const { vehicles } = useVehicles()
  const { documents } = useWallet()
  const areas = [
    { to: '/hotels', title: 'Hospedagens', description: `${hotels.length} cadastrada(s)`, image: resolveMenuImage(trip, 'hotels', hotels.find((item) => item.image)?.image), icon: FiHome },
    { to: '/vehicles', title: 'Transportes', description: `${vehicles.length} cadastrado(s)`, image: resolveMenuImage(trip, 'vehicles', vehicles.find((item) => item.image)?.image), icon: FiTruck },
    { to: '/wallet', title: 'Documentos', description: `${documents.length} arquivo(s)`, image: resolveMenuImage(trip, 'wallet'), icon: FiFileText },
  ]
  return <div className="space-y-4">
    <Card className="relative overflow-hidden border-0 bg-blue-950 text-white"><img src={resolveMenuImage(trip, 'reservations', hotels.find((item) => item.image)?.image)} alt="Reservas da viagem" className="absolute inset-0 h-full w-full object-cover"/><div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(23,37,84,0.97),rgba(37,99,235,0.48))]"/><div className="relative"><FiBriefcase size={24}/><h2 className="mt-3 text-2xl font-semibold text-white">Reservas e documentos</h2><p className="mt-2 text-sm text-blue-100">Tudo que a família precisa apresentar, consultar ou confirmar.</p></div></Card>
    <div className="grid gap-3 sm:grid-cols-3">{areas.map(({to,...area}) => <Link key={to} to={to}><FeatureImageCard {...area} tone="bg-blue-50 text-blue-700"/></Link>)}</div>
  </div>
}
