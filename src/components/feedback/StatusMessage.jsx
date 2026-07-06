function StatusMessage({ message, tone = 'success' }) {
  if (!message) {
    return null
  }

  const tones = {
    success: 'border-emerald-100 bg-emerald-50 text-emerald-700',
    error: 'border-rose-100 bg-rose-50 text-rose-700',
    info: 'border-sky-100 bg-sky-50 text-sky-700',
  }

  return <div className={`rounded-2xl border px-4 py-3 text-sm font-medium ${tones[tone]}`}>{message}</div>
}

export default StatusMessage
