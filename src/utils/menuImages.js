export const menuImageOptions = [
  { key: 'planning', label: 'Planejamento', fallback: '/salvador.jpg' },
  { key: 'agenda', label: 'Programação e calendário', fallback: '/aeroporto.jpg' },
  { key: 'itinerary', label: 'Roteiro', fallback: '/salvador.jpg' },
  { key: 'attractions', label: 'Lugares para conhecer', fallback: '/itacimirim.jpg' },
  { key: 'checklist', label: 'Checklist e malas', fallback: '/familia.png' },
  { key: 'reservations', label: 'Reservas', fallback: '/salvador.jpg' },
  { key: 'hotels', label: 'Hospedagens', fallback: '/salvador.jpg' },
  { key: 'vehicles', label: 'Transportes', fallback: '/uber.jpg' },
  { key: 'wallet', label: 'Documentos', fallback: '/aeroporto.jpg' },
  { key: 'memories', label: 'Memórias da família', fallback: '/familia.png' },
  { key: 'retrospective', label: 'Retrospectiva', fallback: '/familia.png' },
  { key: 'diary', label: 'Diário', fallback: '/familia.png' },
  { key: 'gallery', label: 'Galeria', fallback: '/familia.png' },
  { key: 'reviews', label: 'Avaliações', fallback: '/itacimirim.jpg' },
  { key: 'travelHistory', label: 'Mapa da família', fallback: '/salvador.jpg' },
]

export function resolveMenuImage(trip, key, dynamicImage = '') {
  const configured = String(trip?.menuImages?.[key] ?? '').trim()
  if (configured) return configured
  if (dynamicImage) return dynamicImage
  return menuImageOptions.find((item) => item.key === key)?.fallback ?? '/familia.png'
}
