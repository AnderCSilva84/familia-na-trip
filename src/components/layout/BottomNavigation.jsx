import { FiCalendar, FiHome, FiMap, FiMenu } from 'react-icons/fi'
import { NavLink } from 'react-router-dom'
import useAlarms from '../../hooks/useAlarms'
import useNotifications from '../../hooks/useNotifications'

const items = [
  { to: '/dashboard', label: 'Inicio', icon: FiHome },
  { to: '/map', label: 'Mapa', icon: FiMap },
  { to: '/agenda', label: 'Agenda', icon: FiCalendar },
  { to: '/settings', label: 'Menu', icon: FiMenu },
]

function BottomNavigation({ variant = 'mobile' }) {
  const { unreadCount } = useNotifications()
  const { alarms } = useAlarms()
  const isDesktop = variant === 'desktop'
  const todayString = new Date().toISOString().slice(0, 10)
  const pendingAlarmCount = alarms.filter((alarm) => {
    if (!alarm?.active) {
      return false
    }

    const date = String(alarm.date ?? '').slice(0, 10)
    return !date || date >= todayString
  }).length
  const menuBadgeCount = unreadCount + pendingAlarmCount

  return (
    <nav
      className={
        isDesktop
          ? 'rounded-[28px] border border-white/70 bg-white/85 p-3 shadow-[0_20px_60px_rgba(15,118,110,0.08)] backdrop-blur-xl'
          : 'safe-bottom fixed bottom-4 left-1/2 z-30 w-[calc(100%-1.5rem)] max-w-md -translate-x-1/2 rounded-[28px] border border-white/80 bg-white/95 px-3 py-3 shadow-[0_20px_60px_rgba(15,118,110,0.18)] backdrop-blur-xl lg:hidden'
      }
    >
      <ul className={isDesktop ? 'grid grid-cols-1 gap-2' : 'grid grid-cols-4 gap-2'}>
        {items.map(({ to, label, icon: Icon }) => (
          <li key={to}>
            <NavLink
              to={to}
              className={({ isActive }) =>
                `${isDesktop ? 'flex items-center justify-between gap-3 px-4 py-3 text-sm' : 'flex flex-col items-center gap-1 px-2 py-2 text-[11px]'} rounded-2xl font-medium transition ${
                  isActive ? 'bg-teal-50 text-teal-700' : 'text-slate-500'
                }`
              }
            >
              <span className={`relative ${isDesktop ? 'flex items-center gap-3' : ''}`}>
                <Icon size={18} />
                {isDesktop ? <span>{label}</span> : null}
                {label === 'Menu' && menuBadgeCount > 0 ? (
                  <span className="absolute -right-2 -top-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[9px] font-bold text-white">
                    {menuBadgeCount > 9 ? '9+' : menuBadgeCount}
                  </span>
                ) : null}
              </span>
              {!isDesktop ? <span>{label}</span> : <span className="text-xs text-slate-400">abrir</span>}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}

export default BottomNavigation
