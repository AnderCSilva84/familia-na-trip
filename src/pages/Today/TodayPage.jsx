import { Link } from 'react-router-dom'
import { FiBriefcase, FiCalendar, FiCheckSquare, FiClock, FiCompass, FiCreditCard, FiFileText, FiMap, FiMapPin, FiNavigation, FiUsers } from 'react-icons/fi'
import Card from '../../components/common/Card'
import Button from '../../components/common/Button'
import useAgenda from '../../hooks/useAgenda'
import useChecklist from '../../hooks/useChecklist'
import useExpenses from '../../hooks/useExpenses'
import useWallet from '../../hooks/useWallet'
import { buildGoogleMapsUrl } from '../../utils/navigationLinks'
import { formatCurrency, formatDisplayDate } from '../../utils/formatters'

function sortByTime(left, right) {
  return String(left.startTime ?? '99:99').localeCompare(String(right.startTime ?? '99:99'))
}

const quickAccess = [
  { to: '/agenda', label: 'Calendário', icon: FiCalendar },
  { to: '/planning', label: 'Planejamento', icon: FiCompass },
  { to: '/reservations', label: 'Reservas', icon: FiBriefcase },
  { to: '/expenses', label: 'Gastos', icon: FiCreditCard },
  { to: '/map', label: 'Mapa', icon: FiMap },
  { to: '/members', label: 'Família', icon: FiUsers },
]

export default function TodayPage() {
  const { agenda } = useAgenda()
  const { items } = useChecklist()
  const { summary } = useExpenses()
  const { documents } = useWallet()
  const today = new Date().toISOString().slice(0, 10)
  const events = agenda.filter((item) => String(item.date).slice(0, 10) === today).sort(sortByTime)
  const pending = items.filter((item) => !item.done && (!item.dueDate || item.dueDate <= today))
  const nextEvent = events[0]
  const nextMapUrl = nextEvent ? buildGoogleMapsUrl(nextEvent) : ''

  return (
    <div className="space-y-4">
      <Card className="relative overflow-hidden border-0 bg-teal-800 text-white">
        <img src="/familia.png" alt="Família na viagem" className="absolute inset-0 h-full w-full object-cover"/>
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(15,118,110,0.96)_0%,rgba(15,118,110,0.78)_48%,rgba(15,23,42,0.28)_100%)]"/>
        <div className="relative">
        <p className="text-sm text-teal-100">Resumo da família</p>
        <h2 className="mt-1 text-2xl font-semibold text-white">Hoje, {formatDisplayDate(today)}</h2>
        <p className="mt-2 text-sm text-teal-50">{events.length} compromisso(s) e {pending.length} pendência(s) importantes.</p>
        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Link to="/agenda/new" className="rounded-2xl bg-white/15 px-3 py-3 text-center text-xs font-semibold backdrop-blur">Novo evento</Link>
          <Link to="/expenses/new" className="rounded-2xl bg-white/15 px-3 py-3 text-center text-xs font-semibold backdrop-blur">Adicionar gasto</Link>
          <Link to="/diary/new" className="rounded-2xl bg-white/15 px-3 py-3 text-center text-xs font-semibold backdrop-blur">Guardar memória</Link>
          <Link to="/reservations" className="rounded-2xl bg-white/15 px-3 py-3 text-center text-xs font-semibold backdrop-blur">Ver reservas</Link>
        </div>
        </div>
      </Card>

      <div className="grid gap-3 sm:grid-cols-3">
        <Card className="py-4"><p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Próximo</p><p className="mt-2 font-semibold text-slate-950">{nextEvent?.title ?? 'Dia livre'}</p><p className="mt-1 text-sm text-slate-500">{nextEvent?.startTime || 'Sem horário marcado'}</p></Card>
        <Card className="py-4"><p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Gasto da viagem</p><p className="mt-2 font-semibold text-slate-950">{formatCurrency(summary.totalActual ?? 0)}</p><Link to="/expenses" className="mt-1 block text-sm font-semibold text-teal-700">Ver orçamento</Link></Card>
        <Card className="py-4"><p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Pendências</p><p className="mt-2 font-semibold text-slate-950">{pending.length ? `${pending.length} para resolver` : 'Tudo em ordem'}</p><Link to="/checklist" className="mt-1 block text-sm font-semibold text-teal-700">Abrir checklist</Link></Card>
      </div>

      <Card>
        <div className="flex items-center justify-between gap-3">
          <div><h3 className="font-semibold text-slate-950">Acesso rápido</h3><p className="mt-1 text-sm text-slate-500">Os atalhos principais continuam sempre à mão.</p></div>
          <Link to="/agenda" className="text-sm font-semibold text-teal-700">Abrir calendário</Link>
        </div>
        <div className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-6">
          {quickAccess.map(({ to, label, icon: Icon }) => <Link key={to} to={to} className="min-w-0 rounded-3xl bg-slate-50 px-2 py-4 text-center transition hover:bg-teal-50"><div className="mx-auto flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-teal-700 shadow-sm"><Icon size={18}/></div><p className="mt-2 break-words text-xs font-semibold text-slate-700 sm:text-sm">{label}</p></Link>)}
        </div>
      </Card>

      {nextEvent ? <Card className="border border-teal-100 bg-teal-50/60"><div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center"><div><div className="flex items-center gap-2 text-teal-700"><FiNavigation/><p className="text-xs font-semibold uppercase tracking-wider">Próximo compromisso</p></div><h3 className="mt-2 text-lg font-semibold text-slate-950">{nextEvent.title}</h3><p className="mt-1 text-sm text-slate-600">{nextEvent.startTime || 'Horário livre'} · {nextEvent.location || nextEvent.local || 'Local não informado'}</p></div>{nextMapUrl ? <Button as="a" href={nextMapUrl} target="_blank" icon={<FiMapPin/>}>Abrir rota</Button> : null}</div></Card> : null}

      <section className="space-y-3">
        <div className="flex items-center justify-between"><div className="flex items-center gap-2"><FiCalendar className="text-teal-700"/><h3 className="font-semibold text-slate-950">Atividades do dia</h3></div><Link to="/agenda" className="text-sm font-semibold text-teal-700">Ver calendário</Link></div>
        {events.length ? events.map((event) => {
          const docs = documents.filter((item) => item.agendaId === event.id)
          const mapUrl = buildGoogleMapsUrl(event)
          return <Card key={event.id}><div className="flex justify-between gap-3"><div><p className="flex items-center gap-1 text-sm font-semibold text-teal-700"><FiClock/>{event.startTime || 'Horário livre'}</p><h4 className="mt-1 font-semibold text-slate-950">{event.title}</h4><p className="text-sm text-slate-500">{event.location || event.local}</p></div><div className="flex flex-col gap-2">{mapUrl ? <Button as="a" href={mapUrl} target="_blank" variant="secondary" icon={<FiMapPin/>}>Mapa</Button> : null}{docs.map((doc) => <Button key={doc.id} as="a" href={doc.url} target="_blank" variant="secondary" icon={<FiFileText/>}>PDF</Button>)}</div></div></Card>
        }) : <Card className="text-sm text-slate-500">Nenhum compromisso marcado para hoje.</Card>}
      </section>

      <section className="space-y-3"><div className="flex items-center justify-between"><div className="flex items-center gap-2"><FiCheckSquare className="text-teal-700"/><h3 className="font-semibold text-slate-950">Pendências</h3></div><Link to="/checklist" className="text-sm font-semibold text-teal-700">Ver tudo</Link></div>{pending.slice(0, 5).map((item) => <Card key={item.id} className="py-3"><p className="font-semibold text-slate-900">{item.title}</p><p className="text-xs text-slate-500">{item.kind === 'packing' ? 'Mala' : 'Preparativo'}{item.dueDate ? ` · prazo ${item.dueDate}` : ''}</p></Card>)}{!pending.length ? <Card className="text-sm text-slate-500">Tudo em ordem por aqui.</Card> : null}</section>
    </div>
  )
}
