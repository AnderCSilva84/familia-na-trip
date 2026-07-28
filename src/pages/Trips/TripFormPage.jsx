import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import Button from '../../components/common/Button'
import Card from '../../components/common/Card'
import Input from '../../components/common/Input'
import StatusMessage from '../../components/feedback/StatusMessage'
import AppImage from '../../components/common/AppImage'
import useAuth from '../../hooks/useAuth'
import { createMember, deleteMember, getMembersByTrip } from '../../services/memberService'
import { createTrip, updateTrip, uploadTripCover } from '../../services/tripService'
import { geocodeLocation } from '../../services/geocodeService'
import { getAllUserProfiles } from '../../services/userService'

function parseCities(value) {
  return value.split('\n').map((line) => line.trim()).filter(Boolean).map((line) => {
    const [city, state = '', country = 'Brasil'] = line.split('|').map((part) => part.trim())
    return { city, state, country }
  })
}

function serializeCities(cities = []) {
  return cities.map((item) => [item.city, item.state, item.country].filter(Boolean).join(' | ')).join('\n')
}

function cityKey(place) {
  return `${String(place.city).trim().toLowerCase()}|${String(place.state).trim().toLowerCase()}`
}

async function geocodeCities(cities, existingCities = []) {
  const existingByCity = new Map(existingCities.map((place) => [cityKey(place), place]))
  const geocodedCities = []

  for (const city of cities) {
    const existing = existingByCity.get(cityKey(city))
    if (Number.isFinite(Number(existing?.latitude)) && Number.isFinite(Number(existing?.longitude))) {
      geocodedCities.push({ ...city, latitude: Number(existing.latitude), longitude: Number(existing.longitude) })
      continue
    }

    const location = await geocodeLocation({
      city: [city.city, city.state, city.country].filter(Boolean).join(', '),
      location: [city.city, city.state].filter(Boolean).join(', '),
    })
    geocodedCities.push({
      ...city,
      latitude: location.latitude,
      longitude: location.longitude,
      mapQuery: location.mapQuery,
    })
  }

  return geocodedCities
}

function TripFormPage() {
  const navigate = useNavigate()
  const { tripId } = useParams()
  const { userProfile, trips, trip: activeTrip, setTrips, setTrip } = useAuth()
  const editingTrip = trips.find((item) => item.id === tripId) ?? null
  const isEditing = Boolean(tripId)
  const [saving, setSaving] = useState(false)
  const [feedback, setFeedback] = useState('')
  const [coverPreview, setCoverPreview] = useState(editingTrip?.coverImage ?? '')
  const [availableMembers, setAvailableMembers] = useState([])
  const [tripMembers, setTripMembers] = useState([])
  const [selectedMemberIds, setSelectedMemberIds] = useState(() => userProfile?.uid ? [userProfile.uid] : [])
  const [loadingMembers, setLoadingMembers] = useState(true)

  useEffect(() => {
    let active = true
    Promise.all([
      getAllUserProfiles(),
      tripId ? getMembersByTrip(tripId) : Promise.resolve([]),
    ]).then(([profiles, members]) => {
      if (!active) return
      setAvailableMembers(profiles)
      setTripMembers(members)
      if (members.length > 0) setSelectedMemberIds(members.map((member) => member.userId).filter(Boolean))
      setLoadingMembers(false)
    }).catch((error) => {
      if (active) {
        setFeedback(error.message ?? 'Não foi possível carregar os membros disponíveis.')
        setLoadingMembers(false)
      }
    })
    return () => { active = false }
  }, [tripId])

  async function syncParticipants(savedTrip) {
    const selectedIds = new Set(selectedMemberIds)
    const membersByUserId = new Map(tripMembers.map((member) => [member.userId, member]))

    for (const profile of availableMembers) {
      const existing = membersByUserId.get(profile.uid)
      if (selectedIds.has(profile.uid) && !existing) {
        await createMember({
          tripId: savedTrip.id,
          userId: profile.uid,
          name: profile.name,
          email: profile.email,
          avatar: profile.photoURL ?? '',
          roleInTrip: profile.role === 'superadmin' ? 'admin' : profile.role,
          createdBy: userProfile.uid,
          active: true,
        })
      } else if (!selectedIds.has(profile.uid) && existing) {
        await deleteMember(existing.id)
      }
    }
  }

  async function handleSubmit(event) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const startDate = String(form.get('startDate'))
    const endDate = String(form.get('endDate'))
    const coverFile = form.get('coverFile')
    if (!startDate || !endDate || endDate < startDate) return setFeedback('Confira as datas da viagem.')

    setSaving(true)
    setFeedback('')
    try {
      const cities = await geocodeCities(
        parseCities(String(form.get('cities'))),
        editingTrip?.cities ?? [],
      )
      const payload = {
        name: String(form.get('name')).trim(),
        destination: String(form.get('destination')).trim(),
        startDate,
        endDate,
        coverImage: String(form.get('coverImage')).trim(),
        totalBudget: Number(form.get('totalBudget') || 0),
        tripFund: Number(form.get('tripFund') || 0),
        agendaTypes: editingTrip?.agendaTypes ?? [],
        status: String(form.get('status')),
        cities,
        createdBy: editingTrip?.createdBy || userProfile.uid,
        active: true,
      }
      let savedTrip
      if (isEditing) {
        if (coverFile instanceof File && coverFile.size > 0) {
          payload.coverImage = await uploadTripCover(tripId, coverFile)
        }
        savedTrip = await updateTrip(tripId, payload)
      } else {
        savedTrip = await createTrip(payload)
        if (coverFile instanceof File && coverFile.size > 0) {
          const coverImage = await uploadTripCover(savedTrip.id, coverFile)
          savedTrip = await updateTrip(savedTrip.id, { coverImage })
        }
      }
      await syncParticipants(savedTrip)

      const nextTrips = isEditing
        ? trips.map((item) => item.id === savedTrip.id ? { ...item, ...savedTrip } : item)
        : [savedTrip, ...trips]
      setTrips(nextTrips)
      if (activeTrip?.id === savedTrip.id || !isEditing) setTrip(savedTrip)
      navigate('/trips')
    } catch (error) {
      setFeedback(error.message ?? `Não foi possível ${isEditing ? 'atualizar' : 'cadastrar'} a viagem.`)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card className="mx-auto max-w-3xl space-y-5">
      <div>
        <h2 className="text-2xl font-semibold text-slate-950">{isEditing ? 'Editar trip' : 'Cadastrar trip'}</h2>
        <p className="mt-1 text-sm text-slate-500">{isEditing ? 'Atualize o nome e os demais dados da viagem.' : 'Também aceita viagens passadas para construir o histórico da família.'}</p>
      </div>
      <StatusMessage message={feedback} tone="error" />
      <form className="space-y-4" onSubmit={handleSubmit}>
        <div className="grid gap-4 sm:grid-cols-2">
          <Input required name="name" label="Nome da viagem" placeholder="Salvador 2026" defaultValue={editingTrip?.name ?? ''} />
          <Input required name="destination" label="Destino principal" placeholder="Salvador, BA" defaultValue={editingTrip?.destination ?? ''} />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Input required type="date" name="startDate" label="Data inicial" defaultValue={editingTrip?.startDate ?? ''} />
          <Input required type="date" name="endDate" label="Data final" defaultValue={editingTrip?.endDate ?? ''} />
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <Input type="number" min="0" step="0.01" name="totalBudget" label="Orçamento previsto" defaultValue={editingTrip?.totalBudget ?? 0} />
          <Input type="number" min="0" step="0.01" name="tripFund" label="Cofrinho da Trip" defaultValue={editingTrip?.tripFund ?? 0} />
          <Input name="coverImage" label="Foto de capa (URL)" defaultValue={editingTrip?.coverImage ?? ''} />
        </div>
        <p className="-mt-2 text-xs text-slate-500">O Cofrinho registra quanto a família já possui em caixa para esta viagem.</p>
        <label className="flex flex-col gap-2 text-sm font-medium text-slate-600">
          <span>Escolher foto da galeria</span>
          <input
            type="file"
            name="coverFile"
            accept="image/*"
            onChange={(event) => {
              const [file] = event.target.files ?? []
              if (file) setCoverPreview(URL.createObjectURL(file))
            }}
            className="rounded-2xl border border-dashed border-teal-300 bg-teal-50 px-4 py-4 text-sm text-teal-800 file:mr-3 file:rounded-xl file:border-0 file:bg-teal-700 file:px-4 file:py-2 file:font-semibold file:text-white"
          />
          <small className="font-normal text-slate-400">JPG, PNG, WebP ou outra imagem de até 15 MB.</small>
        </label>
        {coverPreview ? <div className="overflow-hidden rounded-[28px] bg-slate-100"><AppImage src={coverPreview} alt="Prévia da capa" className="h-56 w-full object-cover" fallbackClassName="h-56 w-full" fallbackLabel="Capa" /></div> : null}
        <fieldset className="space-y-3 rounded-[28px] border border-slate-200 p-4">
          <legend className="px-2 text-sm font-semibold text-slate-700">Quem participou desta trip?</legend>
          {loadingMembers ? <p className="text-sm text-slate-400">Carregando familiares...</p> : null}
          {!loadingMembers && availableMembers.length === 0 ? <p className="text-sm text-slate-400">Nenhum familiar cadastrado ainda.</p> : null}
          <div className="grid gap-2 sm:grid-cols-2">
            {availableMembers.map((member) => (
              <label key={member.uid} className="flex items-center gap-3 rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={selectedMemberIds.includes(member.uid)}
                  onChange={(event) => setSelectedMemberIds((current) => event.target.checked ? [...new Set([...current, member.uid])] : current.filter((id) => id !== member.uid))}
                  className="h-4 w-4 accent-teal-700"
                />
                <span><strong className="block text-slate-900">{member.name}</strong><span className="text-xs text-slate-500">{member.email}</span></span>
              </label>
            ))}
          </div>
        </fieldset>
        <label className="flex flex-col gap-2 text-sm font-medium text-slate-600">
          <span>Status</span>
          <select name="status" defaultValue={editingTrip?.status ?? 'planned'} className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
            <option value="draft">Rascunho</option><option value="planned">Planejada</option><option value="ongoing">Em andamento</option><option value="completed">Realizada (retroativa)</option><option value="archived">Arquivada</option>
          </select>
        </label>
        <label className="flex flex-col gap-2 text-sm font-medium text-slate-600">
          <span>Cidades visitadas</span>
          <textarea name="cities" rows="5" defaultValue={serializeCities(editingTrip?.cities)} placeholder={'Salvador | BA | Brasil\nAracaju | SE | Brasil'} className="rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-teal-500 focus:ring-4 focus:ring-teal-100" />
          <small className="font-normal text-slate-400">Uma por linha, no formato Cidade | UF | País. As coordenadas são encontradas automaticamente ao salvar.</small>
        </label>
        <div className="flex gap-3">
          <Button variant="secondary" onClick={() => navigate('/trips')}>Cancelar</Button>
          <Button type="submit" disabled={saving || loadingMembers}>{saving ? 'Salvando...' : isEditing ? 'Salvar alterações' : 'Cadastrar viagem'}</Button>
        </div>
      </form>
    </Card>
  )
}

export default TripFormPage
