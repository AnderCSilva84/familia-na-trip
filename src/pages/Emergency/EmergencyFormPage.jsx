import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import Button from '../../components/common/Button'
import Card from '../../components/common/Card'
import EmptyState from '../../components/common/EmptyState'
import Input from '../../components/common/Input'
import Loading from '../../components/common/Loading'
import ErrorState from '../../components/feedback/ErrorState'
import StatusMessage from '../../components/feedback/StatusMessage'
import useAuth from '../../hooks/useAuth'
import useEmergencyContacts from '../../hooks/useEmergencyContacts'
import { getLinkPreviewData } from '../../utils/linkPreview'
import { canEditAnyContent } from '../../utils/permissions'

function EmergencyFormPage() {
  const navigate = useNavigate()
  const { contactId } = useParams()
  const { userProfile } = useAuth()
  const { contacts, loading, error, usingMockData, create, update } = useEmergencyContacts()
  const [submitting, setSubmitting] = useState(false)
  const [feedback, setFeedback] = useState('')
  const editingContact = contacts.find((contact) => contact.id === contactId)
  const canManage = canEditAnyContent(userProfile)
  const [selectedImage, setSelectedImage] = useState(null)
  const [hospitalLink, setHospitalLink] = useState(editingContact?.link ?? '')
  const [manualImageUrl, setManualImageUrl] = useState(editingContact?.image ?? '')
  const [imagePreview, setImagePreview] = useState(editingContact?.image ?? '')
  const [address, setAddress] = useState(editingContact?.address ?? '')
  const [city, setCity] = useState(editingContact?.city ?? 'Salvador - BA')
  const [postalCode, setPostalCode] = useState(editingContact?.postalCode ?? '')
  const [title, setTitle] = useState(editingContact?.title ?? '')
  const previewUrlRef = useRef('')

  useEffect(() => {
    if (!editingContact) {
      return
    }

    let cancelled = false

    queueMicrotask(() => {
      if (cancelled) {
        return
      }

      setHospitalLink(editingContact.link ?? '')
      setManualImageUrl(editingContact.image ?? '')
      setImagePreview(editingContact.image ?? '')
      setAddress(editingContact.address ?? '')
      setCity(editingContact.city ?? 'Salvador - BA')
      setPostalCode(editingContact.postalCode ?? '')
      setTitle(editingContact.title ?? '')
    })

    return () => {
      cancelled = true
    }
  }, [editingContact])

  useEffect(() => {
    return () => {
      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current)
      }
    }
  }, [])

  function handleImageChange(event) {
    const nextFile = event.target.files?.[0] ?? null

    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current)
      previewUrlRef.current = ''
    }

    setSelectedImage(nextFile)

    if (!nextFile) {
      setImagePreview(manualImageUrl || editingContact?.image || '')
      return
    }

    const objectUrl = URL.createObjectURL(nextFile)
    previewUrlRef.current = objectUrl
    setImagePreview(objectUrl)
  }

  async function handleLinkBlur() {
    if (!hospitalLink) {
      return
    }

    const previewData = await getLinkPreviewData(hospitalLink)

    if (!manualImageUrl && !selectedImage && previewData?.image) {
      setManualImageUrl(previewData.image)
      setImagePreview(previewData.image)
    }

    if (!address && previewData?.mapQuery) {
      setAddress(previewData.mapQuery)
    }

    if (!title && previewData?.title) {
      setTitle(previewData.title)
    }
  }

  async function handleSubmit(event) {
    event.preventDefault()

    if (!canManage) {
      setFeedback('Somente admin e superadmin podem salvar emergencia.')
      return
    }

    setSubmitting(true)
    setFeedback('')

    try {
      if (!title.trim()) {
        throw new Error('Informe o nome do hospital.')
      }

      const formData = new FormData(event.currentTarget)
      const payload = {
        title: title.trim(),
        audience: String(formData.get('audience') ?? 'adulto'),
        address: address.trim(),
        city: city.trim(),
        postalCode: postalCode.trim(),
        description: String(formData.get('description') ?? ''),
        specialties: String(formData.get('specialties') ?? ''),
        phone: String(formData.get('phone') ?? ''),
        link: hospitalLink.trim(),
        image: selectedImage ? editingContact?.image ?? '' : manualImageUrl.trim(),
        imagePath: editingContact?.imagePath ?? '',
        imageFile: selectedImage,
        currentImagePath: editingContact?.imagePath ?? '',
      }

      if (contactId) {
        await update(contactId, payload)
      } else {
        await create(payload)
      }

      navigate('/emergency')
    } catch (submitError) {
      setFeedback(submitError.message ?? 'Nao foi possivel salvar o hospital.')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return <Loading />
  if (error) return <ErrorState title="Falha ao abrir emergencia" description={error} />
  if (contactId && !editingContact && !usingMockData) {
    return <EmptyState title="Hospital nao encontrado" description="Esse cadastro pode ter sido removido." />
  }

  return (
    <div className="space-y-4">
      <StatusMessage message={feedback} tone={feedback.includes('sucesso') ? 'success' : 'error'} />
      <Card>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <Input name="title" label="Hospital" value={title} onChange={(event) => setTitle(event.target.value)} required />
          <label className="flex flex-col gap-2 text-sm font-medium text-slate-600">
            <span>Publico</span>
            <select
              name="audience"
              defaultValue={editingContact?.audience ?? 'adulto'}
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none focus:border-teal-500 focus:ring-4 focus:ring-teal-100"
            >
              <option value="infantil">Infantil</option>
              <option value="adulto">Adulto</option>
            </select>
          </label>
          <Input
            name="link"
            label="Site / link do hospital (opcional)"
            value={hospitalLink}
            onChange={(event) => setHospitalLink(event.target.value)}
            onBlur={handleLinkBlur}
            placeholder="https://..."
          />
          <div className="grid gap-3 sm:grid-cols-2">
            <Input
              name="address"
              label="Endereco"
              value={address}
              onChange={(event) => setAddress(event.target.value)}
              required
            />
            <Input name="postalCode" label="CEP" value={postalCode} onChange={(event) => setPostalCode(event.target.value)} />
          </div>
          <Input name="city" label="Cidade / UF" value={city} onChange={(event) => setCity(event.target.value)} required />
          <label className="flex flex-col gap-2 text-sm font-medium text-slate-600">
            <span>Destaque</span>
            <textarea
              name="description"
              defaultValue={editingContact?.description ?? ''}
              className="min-h-24 rounded-2xl border border-slate-200 px-4 py-3 text-slate-900 outline-none focus:border-teal-500 focus:ring-4 focus:ring-teal-100"
            />
          </label>
          <label className="flex flex-col gap-2 text-sm font-medium text-slate-600">
            <span>Especialidades / estrutura</span>
            <textarea
              name="specialties"
              defaultValue={editingContact?.specialties ?? ''}
              className="min-h-24 rounded-2xl border border-slate-200 px-4 py-3 text-slate-900 outline-none focus:border-teal-500 focus:ring-4 focus:ring-teal-100"
            />
          </label>
          <Input name="phone" label="Telefone (opcional)" defaultValue={editingContact?.phone ?? ''} />

          <div className="space-y-3 rounded-3xl bg-slate-50 p-4">
            <div>
              <h3 className="text-base font-semibold text-slate-950">Imagem de capa</h3>
              <p className="mt-1 text-sm text-slate-500">
                O app tenta aproveitar o link quando possivel, mas voce pode subir uma imagem ou colar a URL manualmente.
              </p>
            </div>

            {imagePreview ? (
              <img
                src={imagePreview}
                alt={title || editingContact?.title || 'Preview do hospital'}
                className="h-48 w-full rounded-[28px] object-cover"
              />
            ) : (
              <div className="flex h-40 items-center justify-center rounded-[28px] border border-dashed border-slate-200 bg-white text-sm text-slate-400">
                Nenhuma imagem selecionada ainda
              </div>
            )}

            <label className="flex flex-col gap-2 text-sm font-medium text-slate-600">
              <span>Upload da imagem</span>
              <input
                name="coverImage"
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition file:mr-3 file:rounded-full file:border-0 file:bg-teal-50 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-teal-700 focus:border-teal-500 focus:ring-4 focus:ring-teal-100"
              />
            </label>

            <Input
              name="image"
              label="Ou use uma imagem por URL"
              value={manualImageUrl}
              onChange={(event) => {
                setManualImageUrl(event.target.value)
                if (!selectedImage) {
                  setImagePreview(event.target.value)
                }
              }}
              placeholder="https://..."
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Button type="button" variant="secondary" onClick={() => navigate('/emergency')}>
              Cancelar
            </Button>
            <Button type="submit" disabled={submitting || usingMockData || !canManage}>
              {submitting ? 'Salvando...' : contactId ? 'Atualizar' : 'Salvar'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  )
}

export default EmergencyFormPage
