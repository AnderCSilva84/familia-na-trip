import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Button from '../../components/common/Button'
import AppImage from '../../components/common/AppImage'
import EmptyState from '../../components/common/EmptyState'
import Loading from '../../components/common/Loading'
import DiaryCard from '../../components/cards/DiaryCard'
import ErrorState from '../../components/feedback/ErrorState'
import StatusMessage from '../../components/feedback/StatusMessage'
import useAgenda from '../../hooks/useAgenda'
import useAuth from '../../hooks/useAuth'
import useDiary from '../../hooks/useDiary'
import {
  canCreateContent,
  canDeleteAnyContent,
  canDeleteOwnContent,
  canEditAnyContent,
  canEditOwnContent,
} from '../../utils/permissions'

function DiaryPage() {
  const navigate = useNavigate()
  const { userProfile } = useAuth()
  const { agenda } = useAgenda()
  const { entries, loading, error, deleteEntry, usingMockData } = useDiary()
  const [feedback, setFeedback] = useState('')
  const travelGallery = useMemo(() => {
    const agendaPhotos = agenda
      .filter((item) => item.image)
      .map((item) => ({
        id: `agenda-${item.id}`,
        image: item.image,
        title: item.title,
        date: item.date,
        location: item.location || 'Destino da viagem',
      }))

    const diaryPhotos = entries.flatMap((entry) =>
      (entry.photos ?? []).map((photo, index) => ({
        id: `diary-${entry.id}-${index}`,
        image: photo.url,
        title: entry.title,
        date: entry.date,
        location: 'Diario da viagem',
      })),
    )

    const grouped = [...agendaPhotos, ...diaryPhotos].reduce((accumulator, photo) => {
      const key = `${photo.date || 'sem-data'}-${photo.location || 'sem-local'}`

      if (!accumulator[key]) {
        accumulator[key] = {
          key,
          date: photo.date,
          location: photo.location,
          items: [],
        }
      }

      accumulator[key].items.push(photo)
      return accumulator
    }, {})

    return Object.values(grouped).sort((left, right) => String(right.date).localeCompare(String(left.date)))
  }, [agenda, entries])

  async function handleDelete(entryId) {
    const confirmed = window.confirm(
      'Tem certeza que deseja excluir esta postagem? Essa acao nao pode ser desfeita.',
    )

    if (!confirmed) return

    try {
      await deleteEntry(entryId)
      setFeedback('Registro removido com sucesso.')
    } catch (deleteError) {
      setFeedback(deleteError.message ?? 'Nao foi possivel remover o registro.')
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        {canCreateContent(userProfile) ? (
          <Link to="/diary/new">
            <Button>Novo registro</Button>
          </Link>
        ) : null}
      </div>

      {usingMockData ? (
        <StatusMessage
          message="Firebase nao configurado. Exibindo diario em modo mock."
          tone="info"
        />
      ) : null}

      <StatusMessage
        message={feedback}
        tone={feedback.includes('sucesso') ? 'success' : 'error'}
      />

      {loading ? <Loading /> : null}

      {!loading && error ? (
        <ErrorState title="Falha ao carregar diario" description={error} />
      ) : null}

      {!loading && !error && entries.length === 0 ? (
        <EmptyState
          title="Nenhum registro ainda"
          description="Comece registrando fotos, textos e momentos especiais da viagem."
        />
      ) : null}

      {!loading && !error && entries.length > 0 ? (
        <section className="space-y-4">
          <div>
            <h2 className="text-xl font-bold text-slate-950">Postagens do diario</h2>
            <p className="mt-1 text-sm text-slate-500">Abra uma postagem para ver as fotos ampliadas e ler o registro completo.</p>
          </div>
          {entries.map((entry) => {
            const canManageEntry =
              canEditAnyContent(userProfile) || canEditOwnContent(userProfile, entry)
            const canDeleteEntry =
              canDeleteAnyContent(userProfile) || canDeleteOwnContent(userProfile, entry)

            return (
              <DiaryCard
                key={entry.id}
                entry={entry}
                canEdit={canManageEntry}
                canDelete={canDeleteEntry}
                onEdit={() => navigate(`/diary/${entry.id}/edit`)}
                onDelete={() => handleDelete(entry.id)}
              />
            )
          })}
        </section>
      ) : null}

      {travelGallery.length > 0 ? (
        <section className="space-y-4 border-t border-slate-200 pt-6">
          <div>
            <h2 className="text-lg font-semibold text-slate-950">Fotos da viagem</h2>
            <p className="mt-1 text-sm text-slate-500">Agrupadas por dia e por destino para ficar facil revisitar cada parada.</p>
          </div>
          {travelGallery.map((group) => (
            <div key={group.key} className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-950">{group.location}</p>
                  <p className="text-sm text-slate-500">{group.date}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {group.items.map((photo) => (
                  <div key={photo.id} className="overflow-hidden rounded-[28px] bg-slate-50">
                    <AppImage
                      src={photo.image}
                      alt={photo.title}
                      className="h-36 w-full object-cover"
                      fallbackClassName="h-36 w-full"
                      fallbackLabel="Foto"
                    />
                    <div className="p-3">
                      <p className="truncate text-sm font-semibold text-slate-900">{photo.title}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </section>
      ) : null}
    </div>
  )
}

export default DiaryPage
