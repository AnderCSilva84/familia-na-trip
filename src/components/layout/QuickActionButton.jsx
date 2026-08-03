import { useState } from 'react'
import { Link } from 'react-router-dom'
import { FiCalendar, FiCamera, FiDollarSign, FiMapPin, FiPlus, FiX } from 'react-icons/fi'

const actions = [
  { to: '/expenses/new', label: 'Registrar gasto', icon: FiDollarSign },
  { to: '/diary/new', label: 'Guardar memória', icon: FiCamera },
  { to: '/agenda/new', label: 'Criar evento', icon: FiCalendar },
  { to: '/attractions/new', label: 'Salvar lugar', icon: FiMapPin },
]

export default function QuickActionButton() {
  const [open, setOpen] = useState(false)
  return <div className="fixed bottom-28 right-5 z-30 lg:bottom-8 lg:right-8">
    {open ? <><button className="fixed inset-0 z-[-1] bg-slate-950/20" onClick={() => setOpen(false)} aria-label="Fechar ações rápidas"/><div className="mb-3 w-52 space-y-2 rounded-3xl border border-white/80 bg-white/95 p-3 shadow-2xl backdrop-blur-xl">{actions.map(({to,label,icon:Icon}) => <Link key={to} to={to} onClick={() => setOpen(false)} className="flex items-center gap-3 rounded-2xl px-3 py-3 text-sm font-semibold text-slate-700 transition hover:bg-teal-50 hover:text-teal-700"><Icon size={18}/>{label}</Link>)}</div></> : null}
    <button type="button" onClick={() => setOpen((value) => !value)} className="ml-auto flex h-14 w-14 items-center justify-center rounded-full bg-teal-600 text-white shadow-[0_18px_40px_rgba(13,148,136,0.38)] transition hover:bg-teal-700" aria-label={open ? 'Fechar ações rápidas' : 'Abrir ações rápidas'}>{open ? <FiX size={24}/> : <FiPlus size={26}/>}</button>
  </div>
}
