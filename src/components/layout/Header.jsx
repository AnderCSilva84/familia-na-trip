import { FiBell, FiSearch } from 'react-icons/fi'
import { Link } from 'react-router-dom'
import useAuth from '../../hooks/useAuth'
import Avatar from '../common/Avatar'

function Header({ title, subtitle }) {
  const { userProfile, currentUser, trip, trips, setTrip } = useAuth()
  const avatarSource = userProfile?.photoURL ?? currentUser?.photoURL ?? ''
  const avatarLabel = userProfile?.name ?? currentUser?.displayName ?? 'FT'

  return (
    <header className="sticky top-0 z-20 border-b border-white/70 bg-white/85 px-5 pb-4 pt-6 backdrop-blur-xl lg:px-8 lg:pt-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <img
            src="/familiaNaTrip.png"
            alt="Familia na Trip"
            loading="eager"
            decoding="async"
            className="h-16 w-auto object-contain"
          />
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950 lg:text-3xl">{title}</h1>
          <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
          {trips.length > 0 ? (
            <select
              value={trip?.id ?? ''}
              onChange={(event) => setTrip(trips.find((item) => item.id === event.target.value))}
              className="mt-3 max-w-[260px] rounded-xl border border-teal-100 bg-teal-50 px-3 py-2 text-sm font-semibold text-teal-800 outline-none focus:ring-4 focus:ring-teal-100"
              aria-label="Selecionar viagem"
            >
              {trips.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select>
          ) : null}
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="flex h-11 w-11 items-center justify-center rounded-full bg-slate-100 text-slate-600"
          >
            <FiSearch size={18} />
          </button>
          <Link
            to="/notifications"
            className="flex h-11 w-11 items-center justify-center rounded-full bg-slate-100 text-slate-600"
          >
            <FiBell size={18} />
          </Link>
          <Link
            to="/settings"
            className="rounded-full transition hover:scale-[1.02] focus:outline-none focus:ring-4 focus:ring-teal-100"
            aria-label="Abrir perfil e configuracoes"
          >
            <Avatar src={avatarSource} alt={avatarLabel} size="sm" fallback={avatarLabel.slice(0, 1)} />
          </Link>
        </div>
      </div>
    </header>
  )
}

export default Header
