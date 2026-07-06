import { getCatRatingMeta } from '../../utils/catRating'

function CatRatingBadge({ rating, compact = false }) {
  const meta = getCatRatingMeta(rating)

  if (!meta) {
    return <span className="text-sm text-slate-500">Sem gatinhos ainda</span>
  }

  if (compact) {
    return (
      <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${meta.className}`}>
        <span className="text-base leading-none">{meta.emoji}</span>
        <span>{meta.label}</span>
      </span>
    )
  }

  return (
    <div className={`inline-flex items-center gap-3 rounded-2xl px-4 py-3 ${meta.className}`}>
      <span className="text-2xl leading-none">{meta.emoji}</span>
      <div>
        <p className="text-sm font-semibold">{meta.label}</p>
        <p className="text-xs opacity-80">{meta.description}</p>
      </div>
    </div>
  )
}

export default CatRatingBadge
