import { FiArrowLeft, FiImage } from 'react-icons/fi'
import { Link, useParams } from 'react-router-dom'
import AppImage from '../../components/common/AppImage'
import EmptyState from '../../components/common/EmptyState'
import Loading from '../../components/common/Loading'
import ErrorState from '../../components/feedback/ErrorState'
import useDiary from '../../hooks/useDiary'
import { formatDisplayDate } from '../../utils/formatters'

function DiaryEntryPage() {
  const { entryId } = useParams()
  const { entries, loading, error } = useDiary()
  const entry = entries.find((item) => item.id === entryId)
  const photos = entry?.photos?.length
    ? entry.photos
    : entry?.image
      ? [{ url: entry.image }]
      : []

  if (loading) return <Loading />
  if (error) return <ErrorState title="Falha ao abrir postagem" description={error} />
  if (!entry) {
    return (
      <EmptyState
        title="Postagem nao encontrada"
        description="Ela pode ter sido removida ou ainda nao foi sincronizada."
      />
    )
  }

  return (
    <article className="space-y-5">
      <Link
        to="/diary"
        className="inline-flex items-center gap-2 text-sm font-semibold text-teal-700 hover:text-teal-800"
      >
        <FiArrowLeft size={18} />
        Voltar ao diario
      </Link>

      <header className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
          {formatDisplayDate(entry.date)}
        </p>
        <h1 className="text-3xl font-bold text-slate-950">{entry.title}</h1>
        <span className="inline-flex items-center gap-2 text-sm text-slate-500">
          <FiImage size={16} />
          {photos.length} foto(s)
        </span>
      </header>

      {photos.length ? (
        <div className="space-y-4">
          {photos.map((photo, index) => (
            <AppImage
              key={`${photo.url}-${index}`}
              src={photo.url}
              alt={`${entry.title} - foto ${index + 1}`}
              className="max-h-[75vh] w-full rounded-[28px] bg-slate-100 object-contain shadow-[0_18px_50px_rgba(15,23,42,0.14)]"
              fallbackClassName="min-h-72 w-full rounded-[28px]"
              fallbackLabel="Foto do diario"
            />
          ))}
        </div>
      ) : null}

      <div className="rounded-[28px] bg-white/95 p-5 text-base leading-7 whitespace-pre-wrap text-slate-700 shadow-[0_16px_40px_rgba(15,23,42,0.08)]">
        {entry.content ?? entry.excerpt ?? 'Sem conteudo adicional.'}
      </div>
    </article>
  )
}

export default DiaryEntryPage
