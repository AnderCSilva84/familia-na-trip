import { useEffect, useMemo, useState } from 'react'
import {
  FiCamera,
  FiChevronLeft,
  FiChevronRight,
  FiDownload,
  FiImage,
  FiSearch,
  FiTrash2,
  FiX,
} from 'react-icons/fi'
import AppImage from '../../components/common/AppImage'
import Card from '../../components/common/Card'
import EmptyState from '../../components/common/EmptyState'
import Loading from '../../components/common/Loading'
import StatusMessage from '../../components/feedback/StatusMessage'
import useAuth from '../../hooks/useAuth'
import { deleteDiaryPhoto, getDiaryByTrips } from '../../services/diaryService'
import { formatDisplayDate } from '../../utils/formatters'
import { isSuperAdmin } from '../../utils/permissions'

function safeFileName(photo) {
  const originalExtension = photo.name?.match(/\.[a-z0-9]+$/i)?.[0] ?? '.jpg'
  const baseName = `${photo.tripName}-${photo.title}-${photo.date || 'foto'}`
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/gi, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase()

  return `${baseName || 'memoria-da-viagem'}${originalExtension}`
}

function GalleryPage() {
  const { trips, userProfile } = useAuth()
  const [entries, setEntries] = useState([])
  const [tripFilter, setTripFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [selectedPhotoId, setSelectedPhotoId] = useState('')
  const [loading, setLoading] = useState(true)
  const [deletingPhotoId, setDeletingPhotoId] = useState('')
  const [error, setError] = useState('')
  const [feedback, setFeedback] = useState('')

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
  const allPhotos = useMemo(() => entries.flatMap((entry) =>
    (entry.photos ?? []).map((photo, index) => ({
      ...photo,
      id: `${entry.id}-${index}`,
      entryId: entry.id,
      photoIndex: index,
      tripId: entry.tripId,
      title: entry.title,
      date: entry.date,
      tripName: tripById.get(entry.tripId)?.name ?? 'Viagem',
      content: entry.content,
    }))), [entries, tripById])

  const photos = useMemo(() => {
    const normalizedSearch = search.trim().toLocaleLowerCase('pt-BR')

    return allPhotos.filter((photo) => {
      if (tripFilter !== 'all' && photo.tripId !== tripFilter) return false
      if (!normalizedSearch) return true
      return `${photo.title} ${photo.tripName} ${photo.content} ${photo.date}`
        .toLocaleLowerCase('pt-BR')
        .includes(normalizedSearch)
    })
  }, [allPhotos, search, tripFilter])

  const selectedIndex = photos.findIndex((photo) => photo.id === selectedPhotoId)
  const selectedPhoto = selectedIndex >= 0 ? photos[selectedIndex] : null

  function showPhoto(index) {
    if (!photos.length) return
    const wrappedIndex = (index + photos.length) % photos.length
    setSelectedPhotoId(photos[wrappedIndex].id)
  }

  function downloadPhoto(photo) {
    const link = document.createElement('a')
    link.href = photo.url
    link.download = safeFileName(photo)
    link.target = '_blank'
    link.rel = 'noopener'
    document.body.appendChild(link)
    link.click()
    link.remove()
  }

  async function handleDeletePhoto(photo) {
    if (!isSuperAdmin(userProfile) || deletingPhotoId) return
    const confirmed = window.confirm('Excluir esta foto definitivamente da galeria e do armazenamento?')
    if (!confirmed) return

    const entry = entries.find((item) => item.id === photo.entryId)
    if (!entry) return

    setDeletingPhotoId(photo.id)
    setError('')
    setFeedback('')
    try {
      const remainingPhotos = (entry.photos ?? []).filter((_, index) => index !== photo.photoIndex)
      await deleteDiaryPhoto(photo.entryId, remainingPhotos, photo.path)
      setEntries((current) => current.map((item) =>
        item.id === photo.entryId ? { ...item, photos: remainingPhotos } : item))
      setSelectedPhotoId('')
      setFeedback('Foto excluída com sucesso.')
    } catch (deleteError) {
      setError(deleteError.message ?? 'Não foi possível excluir a foto.')
    } finally {
      setDeletingPhotoId('')
    }
  }

  useEffect(() => {
    if (!selectedPhoto) return undefined

    function handleKeyDown(event) {
      if (event.key === 'Escape') setSelectedPhotoId('')
      if (event.key === 'ArrowLeft') showPhoto(selectedIndex - 1)
      if (event.key === 'ArrowRight') showPhoto(selectedIndex + 1)
    }

    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', handleKeyDown)
    return () => {
      document.body.style.overflow = ''
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [selectedIndex, selectedPhoto]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="space-y-5">
      <Card className="overflow-hidden bg-[radial-gradient(circle_at_top_right,#99f6e4_0%,#ecfeff_28%,#ffffff_72%)]">
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div className="flex items-center gap-4">
            <span className="rounded-3xl bg-teal-600 p-4 text-white shadow-lg shadow-teal-200">
              <FiCamera size={25} />
            </span>
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-teal-700">Memórias da família</p>
              <h2 className="mt-1 text-2xl font-semibold text-slate-950">Galeria de viagens</h2>
              <p className="mt-1 text-sm text-slate-600">Um lugar para revisitar e guardar cada registro da viagem.</p>
            </div>
          </div>
          <div className="flex gap-3">
            <div className="rounded-3xl bg-white/80 px-5 py-3 text-center shadow-sm ring-1 ring-slate-100">
              <p className="text-xl font-bold text-slate-950">{allPhotos.length}</p>
              <p className="text-xs text-slate-500">fotos</p>
            </div>
            <div className="rounded-3xl bg-white/80 px-5 py-3 text-center shadow-sm ring-1 ring-slate-100">
              <p className="text-xl font-bold text-slate-950">{new Set(allPhotos.map((photo) => photo.tripId)).size}</p>
              <p className="text-xs text-slate-500">viagens</p>
            </div>
          </div>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
          <label className="flex items-center gap-3 rounded-2xl border border-white bg-white/90 px-4 py-3 shadow-sm">
            <FiSearch className="shrink-0 text-slate-400" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar por viagem, registro ou data"
              className="min-w-0 flex-1 bg-transparent text-sm text-slate-800 outline-none placeholder:text-slate-400"
            />
          </label>
          <select
            value={tripFilter}
            onChange={(event) => setTripFilter(event.target.value)}
            className="rounded-2xl border border-white bg-white/90 px-4 py-3 text-sm text-slate-700 shadow-sm outline-none"
          >
            <option value="all">Todas as viagens</option>
            {trips.map((trip) => <option key={trip.id} value={trip.id}>{trip.name}</option>)}
          </select>
        </div>
      </Card>

      {loading ? <Loading /> : null}
      <StatusMessage message={error} tone="error" />
      <StatusMessage message={feedback} tone="success" />
      {!loading && !error && allPhotos.length === 0 ? (
        <EmptyState title="A galeria ainda está vazia" description="As fotos adicionadas ao diário de cada viagem aparecerão automaticamente aqui." />
      ) : null}
      {!loading && !error && allPhotos.length > 0 && photos.length === 0 ? (
        <EmptyState title="Nenhuma foto encontrada" description="Tente buscar outro termo ou selecionar todas as viagens." />
      ) : null}

      {photos.length > 0 ? (
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2 text-sm font-medium text-slate-600">
            <FiImage className="text-teal-600" />
            {photos.length} {photos.length === 1 ? 'registro encontrado' : 'registros encontrados'}
          </div>
          <span className="text-xs text-slate-400">Toque em uma foto para abrir o carrossel</span>
        </div>
      ) : null}

      <div className="columns-2 gap-3 sm:columns-3 lg:columns-4">
        {photos.map((photo) => (
          <button
            key={photo.id}
            type="button"
            onClick={() => setSelectedPhotoId(photo.id)}
            className="group relative mb-3 block w-full break-inside-avoid overflow-hidden rounded-[26px] bg-slate-100 text-left shadow-sm ring-1 ring-slate-200/60 transition hover:-translate-y-1 hover:shadow-xl"
          >
            <AppImage
              src={photo.url}
              alt={photo.title}
              className="w-full object-cover transition duration-500 group-hover:scale-105"
              fallbackClassName="h-44 w-full"
              fallbackLabel="Foto"
            />
            <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-950/90 via-slate-950/45 to-transparent p-4 pt-14 text-white">
              <span className="block truncate text-sm font-semibold">{photo.title}</span>
              <span className="mt-0.5 block truncate text-xs text-white/75">
                {photo.tripName} · {formatDisplayDate(photo.date)}
              </span>
            </span>
          </button>
        ))}
      </div>

      {selectedPhoto ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/95 p-3 backdrop-blur-sm sm:p-6"
          onClick={() => setSelectedPhotoId('')}
          role="dialog"
          aria-modal="true"
          aria-label={`Foto: ${selectedPhoto.title}`}
        >
          <div className="absolute inset-x-3 top-3 z-10 flex items-center justify-between sm:inset-x-6 sm:top-6">
            <span className="rounded-full bg-black/30 px-4 py-2 text-sm font-medium text-white/80">
              {selectedIndex + 1} de {photos.length}
            </span>
            <div className="flex gap-2">
              {isSuperAdmin(userProfile) ? (
                <button
                  type="button"
                  onClick={(event) => { event.stopPropagation(); handleDeletePhoto(selectedPhoto) }}
                  disabled={deletingPhotoId === selectedPhoto.id}
                  className="flex items-center gap-2 rounded-full bg-rose-500 px-4 py-2.5 text-sm font-semibold text-white shadow-lg transition hover:bg-rose-600 disabled:cursor-wait disabled:opacity-60"
                >
                  <FiTrash2 />
                  <span className="hidden sm:inline">
                    {deletingPhotoId === selectedPhoto.id ? 'Excluindo...' : 'Excluir'}
                  </span>
                </button>
              ) : null}
              <button
                type="button"
                onClick={(event) => { event.stopPropagation(); downloadPhoto(selectedPhoto) }}
                className="flex items-center gap-2 rounded-full bg-white px-4 py-2.5 text-sm font-semibold text-slate-900 shadow-lg"
              >
                <FiDownload />
                <span className="hidden sm:inline">Salvar foto</span>
              </button>
              <button
                type="button"
                onClick={() => setSelectedPhotoId('')}
                className="rounded-full bg-white/10 p-3 text-white transition hover:bg-white/20"
                aria-label="Fechar"
              >
                <FiX size={22} />
              </button>
            </div>
          </div>

          {photos.length > 1 ? (
            <>
              <button
                type="button"
                onClick={(event) => { event.stopPropagation(); showPhoto(selectedIndex - 1) }}
                className="absolute left-2 z-10 rounded-full bg-white/10 p-3 text-white transition hover:bg-white/20 sm:left-6 sm:p-4"
                aria-label="Foto anterior"
              >
                <FiChevronLeft size={26} />
              </button>
              <button
                type="button"
                onClick={(event) => { event.stopPropagation(); showPhoto(selectedIndex + 1) }}
                className="absolute right-2 z-10 rounded-full bg-white/10 p-3 text-white transition hover:bg-white/20 sm:right-6 sm:p-4"
                aria-label="Próxima foto"
              >
                <FiChevronRight size={26} />
              </button>
            </>
          ) : null}

          <div className="flex max-h-full w-full max-w-6xl flex-col items-center pt-14" onClick={(event) => event.stopPropagation()}>
            <AppImage
              key={selectedPhoto.id}
              src={selectedPhoto.url}
              alt={selectedPhoto.title}
              className="max-h-[70vh] max-w-full rounded-2xl object-contain shadow-2xl sm:rounded-[28px]"
              fallbackClassName="h-[50vh] w-full max-w-3xl"
              fallbackLabel="Foto"
            />
            <div className="mt-4 max-w-2xl text-center text-white">
              <p className="text-lg font-semibold">{selectedPhoto.title}</p>
              <p className="mt-1 text-sm text-white/65">{selectedPhoto.tripName} · {formatDisplayDate(selectedPhoto.date)}</p>
              {selectedPhoto.content ? <p className="mt-2 line-clamp-2 text-sm text-white/80">{selectedPhoto.content}</p> : null}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}

export default GalleryPage
