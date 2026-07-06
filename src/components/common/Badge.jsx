function Badge({ children, tone = 'neutral' }) {
  const tones = {
    neutral: 'bg-slate-100 text-slate-600',
    success: 'bg-emerald-100 text-emerald-700',
    accent: 'bg-teal-100 text-teal-700',
    warning: 'bg-amber-100 text-amber-700',
  }

  return (
    <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${tones[tone]}`}>
      {children}
    </span>
  )
}

export default Badge
