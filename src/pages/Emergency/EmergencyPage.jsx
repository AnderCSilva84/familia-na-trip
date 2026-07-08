import { useState } from 'react'
import { FiExternalLink, FiMap, FiNavigation, FiPhone, FiPlus, FiX } from 'react-icons/fi'
import { useNavigate } from 'react-router-dom'
import Avatar from '../../components/common/Avatar'
import AppImage from '../../components/common/AppImage'
import Button from '../../components/common/Button'
import Card from '../../components/common/Card'
import EmptyState from '../../components/common/EmptyState'
import Loading from '../../components/common/Loading'
import ErrorState from '../../components/feedback/ErrorState'
import StatusMessage from '../../components/feedback/StatusMessage'
import useAuth from '../../hooks/useAuth'
import useEmergencyContacts from '../../hooks/useEmergencyContacts'
import { buildGoogleMapsUrl, buildWazeUrl } from '../../utils/navigationLinks'
import { canEditAnyContent } from '../../utils/permissions'

function EmergencyPage() {
  const navigate = useNavigate()
  const { userProfile } = useAuth()
  const { contacts, loading, error, delete: remove } = useEmergencyContacts()
  const [feedback, setFeedback] = useState('')
  const [selectedContact, setSelectedContact] = useState(null)
  const canManage = canEditAnyContent(userProfile)

  async function handleDelete(contactId) {
    try {
      await remove(contactId)
      setFeedback('Contato de emergencia removido com sucesso.')
    } catch (deleteError) {
      setFeedback(deleteError.message ?? 'Nao foi possivel remover este contato.')
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-50 text-rose-600">
            <FiPlus size={20} />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-slate-950">Emergencia</h2>
            <p className="text-sm text-slate-500">Hospitais e pronto-atendimento para a viagem.</p>
          </div>
        </div>
        {canManage ? <Button onClick={() => navigate('/emergency/new')}>Novo hospital</Button> : null}
      </div>

      <StatusMessage message={feedback} tone={feedback.includes('sucesso') ? 'success' : 'error'} />
      {loading ? <Loading /> : null}
      {!loading && error ? <ErrorState title="Falha ao carregar emergencia" description={error} /> : null}
      {!loading && !error && contacts.length === 0 ? (
        <EmptyState title="Nenhum hospital cadastrado" description="Cadastre hospitais infantis e para adultos para exibir no mapa." />
      ) : null}

      {!loading && !error
        ? contacts.map((contact) => (
            <Card key={contact.id} className="overflow-hidden p-0">
              <button type="button" onClick={() => setSelectedContact(contact)} className="block w-full text-left">
                <AppImage
                  src={contact.image}
                  alt={contact.title}
                  className="h-40 w-full object-cover"
                  fallbackClassName="h-40 w-full bg-[linear-gradient(135deg,#ffe4e6_0%,#fff1f2_45%,#ffffff_100%)] text-rose-300"
                  fallbackLabel="Hospital"
                />
                <div className="space-y-4 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-rose-600">{contact.audience}</p>
                      <h3 className="mt-1 text-base font-semibold text-slate-950">{contact.title}</h3>
                      <p className="mt-2 text-sm text-slate-500">{contact.address}</p>
                      {contact.city ? <p className="mt-1 text-sm text-slate-500">{contact.city}</p> : null}
                    </div>
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                      abrir
                    </span>
                  </div>
                  {contact.specialties ? (
                    <div className="rounded-3xl bg-slate-50 p-4 text-sm text-slate-600">
                      <p className="font-semibold text-slate-900">Especialidades / estrutura</p>
                      <p className="mt-2 line-clamp-3">{contact.specialties}</p>
                    </div>
                  ) : null}
                  <div className="flex flex-wrap items-center gap-3 text-sm text-slate-500">
                    {contact.phone ? <span>{contact.phone}</span> : null}
                    {contact.mapQuery ? <span>{contact.mapQuery}</span> : null}
                  </div>
                </div>
              </button>
              {canManage ? (
                <div className="flex gap-3 px-4 pb-4">
                  <Button variant="secondary" className="flex-1" onClick={() => navigate(`/emergency/${contact.id}/edit`)}>
                    Editar
                  </Button>
                  <Button variant="ghost" className="flex-1 text-rose-600 hover:bg-rose-50" onClick={() => handleDelete(contact.id)}>
                    Excluir
                  </Button>
                </div>
              ) : null}
            </Card>
          ))
        : null}

      {selectedContact ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/40 p-4 backdrop-blur-sm sm:items-center">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-[32px] bg-white shadow-[0_24px_80px_rgba(15,23,42,0.24)]">
            <div className="relative">
              <AppImage
                src={selectedContact.image}
                alt={selectedContact.title}
                className="h-56 w-full object-cover"
                fallbackClassName="h-56 w-full bg-[linear-gradient(135deg,#ffe4e6_0%,#fff1f2_45%,#ffffff_100%)] text-rose-300"
                fallbackLabel="Hospital"
              />
              <button
                type="button"
                onClick={() => setSelectedContact(null)}
                className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-slate-700 shadow-sm"
                aria-label="Fechar detalhes do hospital"
              >
                <FiX size={18} />
              </button>
            </div>

            <div className="space-y-4 p-5">
              <div className="flex items-start gap-3">
                <Avatar src={selectedContact.image} alt={selectedContact.title} size="md" fallback="H" />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-rose-600">{selectedContact.audience}</p>
                  <h3 className="mt-1 text-xl font-semibold text-slate-950">{selectedContact.title}</h3>
                  <p className="mt-2 text-sm text-slate-500">{selectedContact.address}</p>
                  {selectedContact.city ? <p className="mt-1 text-sm text-slate-500">{selectedContact.city}</p> : null}
                  {selectedContact.postalCode ? <p className="mt-1 text-sm text-slate-500">CEP: {selectedContact.postalCode}</p> : null}
                </div>
              </div>

              {selectedContact.specialties ? (
                <div className="rounded-3xl bg-slate-50 p-4 text-sm text-slate-600">
                  <p className="font-semibold text-slate-900">Especialidades / estrutura</p>
                  <p className="mt-2 whitespace-pre-line">{selectedContact.specialties}</p>
                </div>
              ) : null}

              {selectedContact.description ? (
                <div className="rounded-3xl bg-[linear-gradient(135deg,#fff1f2_0%,#ffffff_100%)] p-4 text-sm text-slate-600">
                  <p className="font-semibold text-slate-900">Destaque</p>
                  <p className="mt-2 whitespace-pre-line">{selectedContact.description}</p>
                </div>
              ) : null}

              <div className="grid gap-3 sm:grid-cols-2">
                {selectedContact.phone ? (
                  <a
                    href={`tel:${selectedContact.phone}`}
                    className="flex items-center gap-3 rounded-3xl border border-slate-200 bg-white px-4 py-4 text-sm font-medium text-slate-700"
                  >
                    <FiPhone size={16} />
                    {selectedContact.phone}
                  </a>
                ) : null}

                {selectedContact.link ? (
                  <a
                    href={selectedContact.link}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-3 rounded-3xl border border-slate-200 bg-white px-4 py-4 text-sm font-medium text-slate-700"
                  >
                    <FiExternalLink size={16} />
                    Abrir site
                  </a>
                ) : null}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Button
                  as={buildGoogleMapsUrl(selectedContact) ? 'a' : 'button'}
                  href={buildGoogleMapsUrl(selectedContact) || undefined}
                  target={buildGoogleMapsUrl(selectedContact) ? '_blank' : undefined}
                  rel={buildGoogleMapsUrl(selectedContact) ? 'noreferrer' : undefined}
                  variant="secondary"
                  icon={<FiMap size={16} />}
                  disabled={!buildGoogleMapsUrl(selectedContact)}
                >
                  Google Maps
                </Button>
                <Button
                  as={buildWazeUrl(selectedContact) ? 'a' : 'button'}
                  href={buildWazeUrl(selectedContact) || undefined}
                  target={buildWazeUrl(selectedContact) ? '_blank' : undefined}
                  rel={buildWazeUrl(selectedContact) ? 'noreferrer' : undefined}
                  icon={<FiNavigation size={16} />}
                  disabled={!buildWazeUrl(selectedContact)}
                >
                  Waze
                </Button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}

export default EmergencyPage
