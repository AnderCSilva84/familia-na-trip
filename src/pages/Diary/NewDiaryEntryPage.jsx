import { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import Button from '../../components/common/Button'
import Card from '../../components/common/Card'
import EmptyState from '../../components/common/EmptyState'
import Input from '../../components/common/Input'
import Loading from '../../components/common/Loading'
import ErrorState from '../../components/feedback/ErrorState'
import StatusMessage from '../../components/feedback/StatusMessage'
import useDiary from '../../hooks/useDiary'
import { formatDateInput } from '../../utils/formatters'

function NewDiaryEntryPage() {
  const navigate = useNavigate()
  const { entryId } = useParams()
  const { entries, loading, error, createEntry, updateEntry, usingMockData } = useDiary()
  const [files, setFiles] = useState([])
  const [feedback, setFeedback] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const editingEntry = entries.find((entry) => entry.id === entryId)
  const selectedFileNames = useMemo(() => files.map((file) => file.name), [files])

  function handleFiles(event) {
    setFiles(Array.from(event.target.files ?? []))
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setSubmitting(true)
    setFeedback('')

    try {
      const formData = new FormData(event.currentTarget)
      const payload = {
        date: String(formData.get('date') ?? ''),
        title: String(formData.get('title') ?? ''),
        content: String(formData.get('content') ?? ''),
      }

      if (entryId) {
        await updateEntry(entryId, payload, files)
        setFeedback('Registro atualizado com sucesso.')
      } else {
        await createEntry(payload, files)
        setFeedback('Registro criado com sucesso.')
      }

      navigate('/diary')
    } catch (submitError) {
      setFeedback(submitError.message ?? 'Nao foi possivel salvar o registro.')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return <Loading />
  }

  if (error) {
    return <ErrorState title="Falha ao abrir diario" description={error} />
  }

  if (entryId && !editingEntry && !usingMockData) {
    return (
      <EmptyState
        title="Registro nao encontrado"
        description="Esse diario pode ter sido removido ou ainda nao foi sincronizado."
      />
    )
  }

  return (
    <div className="space-y-4">
      <StatusMessage
        message={usingMockData ? 'Modo mock ativo. O upload e o CRUD servem apenas como referencia visual.' : feedback}
        tone={usingMockData ? 'info' : feedback.includes('sucesso') ? 'success' : 'error'}
      />

      <Card className="space-y-5">
        <form className="space-y-5" onSubmit={handleSubmit}>
          <Input
            name="date"
            label="Data"
            type="date"
            defaultValue={formatDateInput(editingEntry?.date) || new Date().toISOString().slice(0, 10)}
            required
          />
          <Input
            name="title"
            label="Titulo"
            defaultValue={editingEntry?.title ?? ''}
            placeholder="Ex: Dia especial"
            required
          />

          <label className="flex flex-col gap-2 text-sm font-medium text-slate-600">
            <span>Conte sua experiencia</span>
            <textarea
              name="content"
              defaultValue={editingEntry?.content ?? ''}
              className="min-h-36 rounded-2xl border border-slate-200 px-4 py-3 text-slate-900 outline-none focus:border-teal-500 focus:ring-4 focus:ring-teal-100"
              placeholder="Escreva o que aconteceu..."
            />
          </label>

          <label className="flex flex-col gap-2 text-sm font-medium text-slate-600">
            <span>Fotos do diario</span>
            <input
              type="file"
              multiple
              accept="image/*"
              onChange={handleFiles}
              className="w-full rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-4 text-sm text-slate-500"
            />
          </label>

          {selectedFileNames.length > 0 ? (
            <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-500">
              {selectedFileNames.map((fileName) => (
                <p key={fileName}>{fileName}</p>
              ))}
            </div>
          ) : null}

          {editingEntry?.photos?.length ? (
            <div className="grid grid-cols-3 gap-3">
              {editingEntry.photos.map((photo) => (
                <img
                  key={photo.url}
                  src={photo.url}
                  alt={editingEntry.title}
                  loading="lazy"
                  decoding="async"
                  className="aspect-square rounded-2xl object-cover"
                />
              ))}
            </div>
          ) : null}

          <div className="grid grid-cols-2 gap-3">
            <Button type="button" variant="secondary" onClick={() => navigate('/diary')}>
              Cancelar
            </Button>
            <Button type="submit" disabled={submitting || usingMockData}>
              {submitting ? 'Salvando...' : entryId ? 'Atualizar' : 'Salvar'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  )
}

export default NewDiaryEntryPage
