const CAT_RATING_STYLES = {
  1: {
    emoji: '😿',
    label: '1 gatinho',
    description: 'Preto e chorando',
    className: 'bg-slate-900 text-white',
  },
  2: {
    emoji: '😿',
    label: '2 gatinhos',
    description: 'Cinza e triste',
    className: 'bg-slate-300 text-slate-800',
  },
  3: {
    emoji: '🐱',
    label: '3 gatinhos',
    description: 'Amarelo e neutro',
    className: 'bg-amber-300 text-amber-950',
  },
  4: {
    emoji: '😸',
    label: '4 gatinhos',
    description: 'Cinza e branco sorrindo',
    className: 'bg-[linear-gradient(135deg,#e2e8f0_0%,#ffffff_100%)] text-slate-800 ring-1 ring-slate-200',
  },
  5: {
    emoji: '😻',
    label: '5 gatinhos',
    description: 'Siames muito feliz',
    className: 'bg-[linear-gradient(135deg,#f5f5f4_0%,#fde68a_55%,#d6d3d1_100%)] text-stone-900 ring-1 ring-amber-200',
  },
}

export function getCatRatingMeta(rating) {
  return CAT_RATING_STYLES[Number(rating)] ?? null
}
