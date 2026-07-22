import { useEffect, useMemo, useState } from 'react'
import { FiCamera, FiX } from 'react-icons/fi'
import AppImage from '../../components/common/AppImage'
import Card from '../../components/common/Card'
import EmptyState from '../../components/common/EmptyState'
import Loading from '../../components/common/Loading'
import StatusMessage from '../../components/feedback/StatusMessage'
import useAuth from '../../hooks/useAuth'
import { getDiaryByTrips } from '../../services/diaryService'
import { formatDisplayDate } from '../../utils/formatters'

function GalleryPage() {
  const { trips } = useAuth()
  const [entries, setEntries] = useState([])
  const [tripFilter, setTripFilter] = useState('all')
  const [selectedPhoto, setSelectedPhoto] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    queueMicrotask(() => { if (active) { setLoading(true); setError('') } })
    getDiaryByTrips(trips.map((trip) => trip.id))
      .then((result) => { if (active) setEntries(result) })
      .catch((loadError) => { if (active) setError(loadError.message ?? 'Não foi possível carregar a galeria.') })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [trips])

  const tripById = useMemo(() => new Map(trips.map((trip) => [trip.id, trip])), [trips])
  const photos = useMemo(() => entries
    .filter((entry) => tripFilter === 'all' || entry.tripId === tripFilter)
    .flatMap((entry) => (entry.photos ?? []).map((photo, index) => ({
      ...photo, id: `${entry.id}-${index}`, tripId: entry.tripId, title: entry.title, date: entry.date,
      tripName: tripById.get(entry.tripId)?.name ?? 'Viagem', content: entry.content,
    }))), [entries, tripById, tripFilter])

  return (
    <div className="space-y-5">
      <Card className="flex flex-wrap items-center justify-between gap-4 bg-[linear-gradient(135deg,#ecfeff_0%,#ffffff_80%)]">
        <div className="flex items-center gap-3"><span className="rounded-2xl bg-teal-100 p-3 text-teal-700"><FiCamera size={22} /></span><div><h2 className="text-2xl font-semibold text-slate-950">Galeria da família</h2><p className="text-sm text-slate-500">Todas as memórias fotográficas das nossas trips.</p></div></div>
        <select value={tripFilter} onChange={(event) => setTripFilter(event.target.value)} className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700"><option value="all">Todas as viagens</option>{trips.map((trip) => <option key={trip.id} value={trip.id}>{trip.name}</option>)}</select>
      </Card>
      {loading ? <Loading /> : null}
      <StatusMessage message={error} tone="error" />
      {!loading && !error && photos.length === 0 ? <EmptyState title="A galeria ainda está vazia" description="As fotos adicionadas ao diário de cada viagem aparecerão automaticamente aqui." /> : null}
      <div className="columns-2 gap-3 sm:columns-3 lg:columns-4">
        {photos.map((photo) => <button key={photo.id} type="button" onClick={() => setSelectedPhoto(photo)} className="group relative mb-3 block w-full break-inside-avoid overflow-hidden rounded-[24px] bg-slate-100 text-left"><AppImage src={photo.url} alt={photo.title} className="w-full object-cover transition duration-300 group-hover:scale-105" fallbackClassName="h-44 w-full" fallbackLabel="Foto" /><span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-950/80 to-transparent p-3 pt-10 text-xs font-semibold text-white">{photo.tripName}</span></button>)}
      </div>
      {selectedPhoto ? <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/90 p-4" onClick={() => setSelectedPhoto(null)}><button className="absolute right-5 top-5 rounded-full bg-white/10 p-3 text-white" aria-label="Fechar"><FiX size={24} /></button><div className="max-h-full max-w-5xl" onClick={(event) => event.stopPropagation()}><AppImage src={selectedPhoto.url} alt={selectedPhoto.title} className="max-h-[78vh] max-w-full rounded-[28px] object-contain" /><div className="mt-3 text-white"><p className="font-semibold">{selectedPhoto.title}</p><p className="text-sm text-white/70">{selectedPhoto.tripName} · {formatDisplayDate(selectedPhoto.date)}</p></div></div></div> : null}
    </div>
  )
}

export default GalleryPage
