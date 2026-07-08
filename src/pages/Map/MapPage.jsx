import { useEffect, useMemo, useRef, useState } from 'react'
import { FiEdit3, FiMap, FiNavigation, FiSave, FiX } from 'react-icons/fi'
import { CircleMarker, MapContainer, Popup, TileLayer, useMap, useMapEvents } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import Avatar from '../../components/common/Avatar'
import AppImage from '../../components/common/AppImage'
import Button from '../../components/common/Button'
import Card from '../../components/common/Card'
import EmptyState from '../../components/common/EmptyState'
import Input from '../../components/common/Input'
import StatusMessage from '../../components/feedback/StatusMessage'
import useAgenda from '../../hooks/useAgenda'
import useAuth from '../../hooks/useAuth'
import useHotels from '../../hooks/useHotels'
import useItinerary from '../../hooks/useItinerary'
import useMemberLocations from '../../hooks/useMemberLocations'
import useMapPoints from '../../hooks/useMapPoints'
import useVehicles from '../../hooks/useVehicles'
import { formatCurrency, formatDateInput, formatDisplayDate } from '../../utils/formatters'
import { buildGoogleMapsUrl, buildWazeUrl } from '../../utils/navigationLinks'
import { canPromoteAdmins } from '../../utils/permissions'

function FlyToPoint({ point }) {
  const map = useMap()

  useEffect(() => {
    if (!point?.latitude || !point?.longitude) {
      return
    }

    map.flyTo([point.latitude, point.longitude], 13, {
      duration: 1.2,
    })
  }, [map, point])

  return null
}

function MapCoordinatePicker({ active, onPick }) {
  useMapEvents({
    click(event) {
      if (!active) {
        return
      }

      onPick({
        latitude: Number(event.latlng.lat.toFixed(6)),
        longitude: Number(event.latlng.lng.toFixed(6)),
      })
    },
  })

  return null
}

function isPastDay(dateValue) {
  if (!dateValue) {
    return false
  }

  return formatDateInput(dateValue) < new Date().toISOString().slice(0, 10)
}

const sourceTypeLabels = {
  agenda: 'Evento',
  roteiro: 'Roteiro',
  hotel: 'Hotel',
  veiculo: 'Veiculo',
  dica: 'Dica',
  emergencia: 'Emergencia',
  ponto: 'Ponto',
}

function normalizeDateValue(value) {
  if (!value) {
    return null
  }

  if (typeof value?.toDate === 'function') {
    const converted = value.toDate()
    return Number.isNaN(converted.getTime()) ? null : converted
  }

  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

function formatLocationSeenAt(value) {
  const parsed = normalizeDateValue(value)

  if (!parsed) {
    return 'Atualizado agora'
  }

  const diffMs = Date.now() - parsed.getTime()
  const diffMinutes = Math.max(0, Math.round(diffMs / 60000))

  if (diffMinutes < 1) {
    return 'Atualizado agora'
  }

  if (diffMinutes < 60) {
    return `Atualizado ha ${diffMinutes} min`
  }

  const diffHours = Math.round(diffMinutes / 60)

  if (diffHours < 24) {
    return `Atualizado ha ${diffHours} h`
  }

  const diffDays = Math.round(diffHours / 24)
  return `Atualizado ha ${diffDays} dia${diffDays > 1 ? 's' : ''}`
}

function formatMinutesCountdown(ms) {
  if (!ms || ms <= 0) {
    return 'agora'
  }

  const minutes = Math.ceil(ms / 60000)
  return `${minutes} min`
}

function isLocationActiveNow(location, activeLocations) {
  return activeLocations.some((currentLocation) => currentLocation.userId === location.userId)
}

function MapPage() {
  const { userProfile, trip } = useAuth()
  const { update: updateAgenda, refresh: refreshAgenda } = useAgenda()
  const { update: updateHotel, refresh: refreshHotels } = useHotels()
  const { updateItem: updateItineraryItem, refreshItems: refreshItinerary } = useItinerary()
  const { update: updateVehicle, refresh: refreshVehicles } = useVehicles()
  const {
    locations: memberLocations,
    loading: loadingMemberLocations,
    error: memberLocationError,
    sharingLocation,
    isSharing,
    myLocation,
    activeLocations,
    activeCount,
    canRefreshNow,
    nextRefreshInMs,
    shareCurrentLocation,
    stopSharingCurrentLocation,
  } = useMemberLocations({ enabled: true })
  const items = useMapPoints()
  const [selectedPointId, setSelectedPointId] = useState('')
  const [selectedMemberLocationId, setSelectedMemberLocationId] = useState('')
  const [editingLocation, setEditingLocation] = useState(false)
  const [savingLocation, setSavingLocation] = useState(false)
  const [locationFeedback, setLocationFeedback] = useState('')
  const [memberLocationFeedback, setMemberLocationFeedback] = useState('')
  const [locationDraft, setLocationDraft] = useState({
    city: '',
    local: '',
    location: '',
    address: '',
    postalCode: '',
    mapQuery: '',
    latitude: '',
    longitude: '',
  })
  const mapViewportRef = useRef(null)
  const canEditMapLocation = canPromoteAdmins(userProfile)
  const mapItems = useMemo(
    () => items.filter((item) => Number.isFinite(item.latitude) && Number.isFinite(item.longitude)),
    [items],
  )
  const visibleListItems = useMemo(
    () => mapItems.filter((item) => !isPastDay(item.date)),
    [mapItems],
  )
  const highlightedMemberLocation =
    memberLocations.find((location) => location.userId === selectedMemberLocationId) ?? null
  const highlighted =
    visibleListItems.find((item) => item.id === selectedPointId) ??
    visibleListItems.find((item) => item.isCurrentDay) ??
    visibleListItems[0] ??
    mapItems.find((item) => item.id === selectedPointId) ??
    mapItems[0] ??
    items[0]
  const mapFocusTarget = highlightedMemberLocation ?? highlighted
  const googleMapsUrl = highlighted ? buildGoogleMapsUrl(highlighted) : ''
  const wazeUrl = highlighted ? buildWazeUrl(highlighted) : ''
  const mapCenter =
    mapFocusTarget?.latitude && mapFocusTarget?.longitude
      ? [mapFocusTarget.latitude, mapFocusTarget.longitude]
      : [-12.9714, -38.5014]

  function focusPoint(pointId) {
    setSelectedPointId(pointId)
    setSelectedMemberLocationId('')
    setEditingLocation(false)
    setLocationFeedback('')
    mapViewportRef.current?.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    })
  }

  function focusMemberLocation(userId) {
    setSelectedMemberLocationId(userId)
    setEditingLocation(false)
    setLocationFeedback('')
    mapViewportRef.current?.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    })
  }

  function openLocationEditor() {
    if (!highlighted) {
      return
    }

    setLocationDraft({
      city: highlighted.city ?? '',
      local: highlighted.local ?? '',
      location: highlighted.location ?? '',
      address: highlighted.address ?? '',
      postalCode: highlighted.postalCode ?? '',
      mapQuery: highlighted.mapQuery ?? '',
      latitude: highlighted.latitude ?? '',
      longitude: highlighted.longitude ?? '',
    })
    setLocationFeedback('')
    setEditingLocation(true)
  }

  function closeLocationEditor() {
    setEditingLocation(false)
    setLocationFeedback('')
  }

  function updateLocationField(field, value) {
    setLocationDraft((current) => ({
      ...current,
      [field]: value,
    }))
  }

  async function handleShareMyLocation() {
    setMemberLocationFeedback('')

    try {
      await shareCurrentLocation()
      setMemberLocationFeedback('Sua localizacao foi compartilhada com a familia no mapa.')
    } catch {
      // O hook ja preenche a mensagem principal de erro.
    }
  }

  async function handleStopSharingMyLocation() {
    setMemberLocationFeedback('')

    try {
      await stopSharingCurrentLocation()
      setMemberLocationFeedback('Voce parou de compartilhar sua localizacao.')
    } catch (error) {
      setMemberLocationFeedback(error.message ?? 'Nao foi possivel parar o compartilhamento agora.')
    }
  }

  function handleFocusMyLocation() {
    if (!myLocation?.userId) {
      setMemberLocationFeedback('Compartilhe sua localizacao primeiro para centralizar voce no mapa.')
      return
    }

    setMemberLocationFeedback('')
    focusMemberLocation(myLocation.userId)
  }

  async function handleLocationSave() {
    if (!highlighted || !trip?.id || !canEditMapLocation) {
      return
    }

    const payload = {
      city: locationDraft.city.trim(),
      local: locationDraft.local.trim(),
      location: locationDraft.location.trim(),
      address: locationDraft.address.trim(),
      postalCode: locationDraft.postalCode.trim(),
      mapQuery: locationDraft.mapQuery.trim(),
      latitude: locationDraft.latitude === '' ? '' : Number(locationDraft.latitude),
      longitude: locationDraft.longitude === '' ? '' : Number(locationDraft.longitude),
    }

    if (
      (payload.latitude !== '' && !Number.isFinite(payload.latitude)) ||
      (payload.longitude !== '' && !Number.isFinite(payload.longitude))
    ) {
      setLocationFeedback('Latitude e longitude precisam ser numeros validos.')
      return
    }

    setSavingLocation(true)
    setLocationFeedback('')

    try {
      if (highlighted.sourceType === 'agenda') {
        await updateAgenda(highlighted.sourceId, {
          tripId: trip.id,
          title: highlighted.title,
          description: highlighted.description,
          date: highlighted.date,
          startTime: highlighted.startTime ?? '',
          endTime: highlighted.endTime ?? '',
          type: highlighted.type ?? 'evento',
          relatedId: highlighted.relatedId ?? '',
          estimatedCost: highlighted.estimatedCost ?? 0,
          actualCost: highlighted.actualCost ?? 0,
          expenseCategory: highlighted.expenseCategory ?? 'Outros',
          image: highlighted.image ?? '',
          link: highlighted.link ?? '',
          createdBy: highlighted.createdBy ?? userProfile.uid,
          ...payload,
        })
        await refreshAgenda()
      } else if (highlighted.sourceType === 'roteiro') {
        await updateItineraryItem(highlighted.sourceId, {
          tripId: trip.id,
          title: highlighted.title,
          description: highlighted.description,
          date: highlighted.date,
          startTime: highlighted.startTime ?? '',
          endTime: highlighted.endTime ?? '',
          location: payload.location,
          city: payload.city,
          local: payload.local,
          address: payload.address,
          postalCode: payload.postalCode,
          mapQuery: payload.mapQuery,
          latitude: payload.latitude,
          longitude: payload.longitude,
          image: highlighted.image ?? '',
          link: highlighted.link ?? '',
          status: highlighted.status ?? 'planejado',
          createdBy: highlighted.createdBy ?? userProfile.uid,
        })
        await refreshItinerary()
      } else if (highlighted.sourceType === 'hotel') {
        await updateHotel(highlighted.sourceId, {
          tripId: trip.id,
          title: highlighted.title,
          hotelName: highlighted.title,
          address: payload.address || payload.location || highlighted.address || '',
          city: payload.city,
          postalCode: payload.postalCode,
          location: payload.location,
          local: payload.local,
          mapQuery: payload.mapQuery,
          latitude: payload.latitude,
          longitude: payload.longitude,
          checkIn: highlighted.checkIn ?? highlighted.date ?? '',
          checkOut: highlighted.checkOut ?? '',
          estimatedValue: highlighted.estimatedCost ?? 0,
          finalValue: highlighted.actualCost ?? 0,
          link: highlighted.link ?? '',
          image: highlighted.image ?? '',
          status: highlighted.status ?? 'pesquisando',
          notes: highlighted.description ?? '',
          createdBy: highlighted.createdBy ?? userProfile.uid,
        })
        await refreshHotels()
      } else if (highlighted.sourceType === 'veiculo') {
        await updateVehicle(highlighted.sourceId, {
          tripId: trip.id,
          title: highlighted.title,
          rentalCompany: highlighted.rentalCompany ?? '',
          vehicleModel: highlighted.title,
          pickupLocation: payload.location || payload.address || highlighted.location || '',
          returnLocation: payload.location || payload.address || highlighted.location || '',
          city: payload.city,
          postalCode: payload.postalCode,
          local: payload.local,
          mapQuery: payload.mapQuery,
          latitude: payload.latitude,
          longitude: payload.longitude,
          pickupDate: highlighted.pickupDate ?? highlighted.date ?? '',
          returnDate: highlighted.returnDate ?? '',
          estimatedValue: highlighted.estimatedCost ?? 0,
          finalValue: highlighted.actualCost ?? 0,
          link: highlighted.link ?? '',
          image: highlighted.image ?? '',
          status: highlighted.status ?? 'pesquisando',
          notes: highlighted.description ?? '',
          createdBy: highlighted.createdBy ?? userProfile.uid,
        })
        await refreshVehicles()
      } else {
        throw new Error('Este ponto ainda deve ser ajustado pelo modulo de origem.')
      }

      setLocationFeedback('Localizacao atualizada com sucesso no mapa.')
    } catch (error) {
      setLocationFeedback(error.message ?? 'Nao foi possivel atualizar a localizacao.')
    } finally {
      setSavingLocation(false)
    }
  }

  return (
    <div className="space-y-4">
      <Card className="overflow-hidden p-0">
        <div className="space-y-4 bg-[linear-gradient(180deg,#d8f3dc_0%,#effbf6_100%)] p-4">
          <div ref={mapViewportRef} className="overflow-hidden rounded-[32px] border border-white/70">
            <div className="h-[420px] w-full">
              {mapItems.length > 0 ? (
                <MapContainer center={mapCenter} zoom={13} className="h-full w-full">
                  <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />
                  <FlyToPoint point={mapFocusTarget} />
                  <MapCoordinatePicker
                    active={editingLocation && canEditMapLocation}
                    onPick={({ latitude, longitude }) => {
                      setLocationDraft((current) => ({
                        ...current,
                        latitude,
                        longitude,
                      }))
                    }}
                  />
                  {mapItems.map((item) => {
                    const isActive = item.id === highlighted?.id

                    return (
                      <CircleMarker
                        key={item.id}
                        center={[item.latitude, item.longitude]}
                        radius={isActive ? 12 : 9}
                        pathOptions={{
                          color: '#ffffff',
                          weight: 3,
                          fillColor: isActive ? '#0f766e' : '#ef476f',
                          fillOpacity: 0.95,
                        }}
                        eventHandlers={{
                          click: () => focusPoint(item.id),
                        }}
                      >
                        <Popup>
                          <div className="space-y-1">
                            <p className="font-semibold">{item.title}</p>
                            <p>{item.mapQuery || item.description}</p>
                          </div>
                        </Popup>
                      </CircleMarker>
                    )
                  })}
                  {memberLocations.map((location) => {
                    const isSelected = location.userId === selectedMemberLocationId
                    const isActiveNow = isLocationActiveNow(location, activeLocations)

                    return (
                      <CircleMarker
                        key={`member-location-${location.userId}`}
                        center={[location.latitude, location.longitude]}
                        radius={isSelected ? 10 : isActiveNow ? 9 : 7}
                        pathOptions={{
                          color: isSelected ? '#f59e0b' : '#ffffff',
                          weight: isActiveNow ? 4 : 3,
                          fillColor: isSelected ? '#f59e0b' : isActiveNow ? '#14b8a6' : '#0f766e',
                          fillOpacity: 0.98,
                          opacity: 1,
                        }}
                        eventHandlers={{
                          click: () => focusMemberLocation(location.userId),
                        }}
                      >
                        <Popup>
                          <div className="flex min-w-[220px] items-start gap-3">
                            <Avatar
                              src={location.photoURL}
                              alt={location.name}
                              size="md"
                              fallback={location.name?.slice(0, 1) || 'F'}
                            />
                            <div className="min-w-0 space-y-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <p className="font-semibold text-slate-950">{location.name}</p>
                                {isActiveNow ? (
                                  <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-emerald-700">
                                    ativo agora
                                  </span>
                                ) : null}
                              </div>
                              <p className="text-sm text-slate-500">{formatLocationSeenAt(location.updatedAt)}</p>
                              {location.accuracy > 0 ? (
                                <p className="text-xs font-medium uppercase tracking-[0.14em] text-teal-700">
                                  Precisao aproximada: {Math.round(location.accuracy)} m
                                </p>
                              ) : null}
                            </div>
                          </div>
                        </Popup>
                      </CircleMarker>
                    )
                  })}
                </MapContainer>
              ) : (
                <div className="flex h-full items-center justify-center bg-white/70 p-6 text-center text-sm text-slate-500">
                  Nenhum ponto com localidade real ainda. Preencha endereco, CEP ou local para o app geocodificar o destino.
                </div>
              )}
            </div>
          </div>

          {highlighted ? (
            <Card className="flex items-start gap-3">
                <AppImage
                  src={highlighted.image}
                  alt={highlighted.title}
                  className="h-20 w-20 shrink-0 rounded-2xl object-cover"
                  fallbackClassName="h-20 w-20 shrink-0 rounded-2xl bg-teal-50 text-2xl text-teal-700"
                  fallbackLabel="P"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="min-w-0 flex-1 text-base font-semibold leading-tight text-slate-950">
                      {highlighted.title}
                    </h3>
                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-600">
                      {sourceTypeLabels[highlighted.sourceType] ?? highlighted.sourceType ?? 'Mapa'}
                    </span>
                  </div>
                  <p className="mt-1 break-words text-sm leading-6 text-slate-500">{highlighted.description}</p>
                  <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-medium leading-5 text-slate-500">
                    {highlighted.date ? <span>{formatDisplayDate(highlighted.date)}</span> : null}
                    {highlighted.estimatedCost > 0 ? <span>Estimado: {formatCurrency(highlighted.estimatedCost)}</span> : null}
                  </div>
                  {highlighted.mapQuery ? (
                    <p className="mt-2 break-words text-sm font-medium leading-6 text-slate-700">{highlighted.mapQuery}</p>
                  ) : null}
                  {highlighted.isCurrentDay ? (
                    <p className="mt-2 text-xs font-semibold uppercase tracking-[0.2em] text-teal-600">
                      Localidade atual da agenda de hoje
                    </p>
                  ) : null}
                  <p className="mt-3 text-sm font-semibold text-teal-700">
                    Origem: {sourceTypeLabels[highlighted.sourceType] ?? highlighted.sourceType ?? 'Mapa'}
                  </p>
                  <div className="mt-4 grid grid-cols-2 gap-2">
                    <Button
                      as={googleMapsUrl ? 'a' : 'button'}
                      href={googleMapsUrl || undefined}
                      target={googleMapsUrl ? '_blank' : undefined}
                      rel={googleMapsUrl ? 'noreferrer' : undefined}
                      variant="secondary"
                      className="w-full"
                      icon={<FiMap size={16} />}
                      disabled={!googleMapsUrl}
                    >
                      Google Maps
                    </Button>
                    <Button
                      as={wazeUrl ? 'a' : 'button'}
                      href={wazeUrl || undefined}
                      target={wazeUrl ? '_blank' : undefined}
                      rel={wazeUrl ? 'noreferrer' : undefined}
                      className="w-full"
                      icon={<FiNavigation size={16} />}
                      disabled={!wazeUrl}
                    >
                      Waze
                    </Button>
                  </div>
                  {canEditMapLocation ? (
                    <div className="mt-3">
                      <Button
                        variant={editingLocation ? 'secondary' : 'primary'}
                        className="w-full"
                        onClick={editingLocation ? closeLocationEditor : openLocationEditor}
                        icon={editingLocation ? <FiX size={16} /> : <FiEdit3 size={16} />}
                      >
                        {editingLocation ? 'Fechar edicao do mapa' : 'Editar localizacao no mapa'}
                      </Button>
                    </div>
                  ) : null}
                  <div className="mt-3">
                    <StatusMessage
                      message={locationFeedback}
                      tone={locationFeedback.includes('sucesso') ? 'success' : 'error'}
                    />
                  </div>
                </div>
              </Card>
          ) : (
            <EmptyState title="Sem pontos no mapa" description="Adicione local, endereco ou CEP para exibir marcadores reais." />
          )}

          <Card className="space-y-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold text-slate-950">Localizacao da familia</h3>
                <p className="text-sm leading-6 text-slate-500">
                  Cada pessoa compartilha a propria posicao atual so quando quiser. Nesta fase nao guardamos historico e o mapa
                  so escuta essas localizacoes quando a tela esta aberta.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <span className="rounded-full bg-teal-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-teal-700">
                  {memberLocations.length} membro{memberLocations.length === 1 ? '' : 's'} no mapa
                </span>
                <span className="rounded-full bg-amber-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-amber-700">
                  {activeCount} ativo{activeCount === 1 ? '' : 's'} agora
                </span>
              </div>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
              <Button
                className="flex-1"
                onClick={handleShareMyLocation}
                disabled={sharingLocation || (isSharing && !canRefreshNow)}
                icon={<FiNavigation size={16} />}
              >
                {sharingLocation
                  ? 'Buscando sua localizacao...'
                  : isSharing && !canRefreshNow
                    ? `Atualizacao liberada em ${formatMinutesCountdown(nextRefreshInMs)}`
                    : isSharing
                      ? 'Atualizar minha localizacao'
                      : 'Compartilhar minha localizacao'}
              </Button>
              <Button variant="secondary" className="flex-1" onClick={handleFocusMyLocation}>
                Centralizar em mim
              </Button>
              {isSharing ? (
                <Button variant="secondary" className="flex-1" onClick={handleStopSharingMyLocation}>
                  Parar de compartilhar
                </Button>
              ) : null}
            </div>

            {isSharing ? (
              <div className="rounded-3xl border border-teal-100 bg-teal-50/70 px-4 py-3 text-sm font-medium text-teal-800">
                Sua localizacao esta visivel para a familia. Para economizar bateria e gravacoes, uma nova atualizacao manual fica
                liberada a cada {formatMinutesCountdown(nextRefreshInMs || 2 * 60000)}.
              </div>
            ) : null}

            <StatusMessage
              message={memberLocationFeedback}
              tone={memberLocationFeedback.includes('parou') || memberLocationFeedback.includes('primeiro') ? 'info' : 'success'}
            />
            <StatusMessage message={memberLocationError} tone="error" />

            {loadingMemberLocations ? (
              <div className="rounded-3xl border border-slate-100 bg-white/80 px-4 py-5 text-sm text-slate-500">
                Atualizando quem esta compartilhando localizacao...
              </div>
            ) : memberLocations.length > 0 ? (
              <div className="grid gap-3 md:grid-cols-2">
                {memberLocations.map((location) => {
                  const isMine = location.userId === userProfile?.uid
                  const isSelected = location.userId === selectedMemberLocationId
                  const isActiveNow = isLocationActiveNow(location, activeLocations)

                  return (
                    <button
                      key={`member-location-card-${location.userId}`}
                      type="button"
                      onClick={() => focusMemberLocation(location.userId)}
                      className={`flex w-full items-center gap-3 rounded-[28px] border p-4 text-left shadow-[0_18px_40px_rgba(148,163,184,0.12)] transition hover:-translate-y-0.5 hover:shadow-[0_24px_48px_rgba(148,163,184,0.16)] ${
                        isSelected
                          ? 'border-teal-300 bg-teal-50/80'
                          : isMine
                            ? 'border-amber-200 bg-amber-50/70'
                            : 'border-slate-100 bg-white/90'
                      }`}
                    >
                      <Avatar
                        src={location.photoURL}
                        alt={location.name}
                        size="lg"
                        fallback={location.name?.slice(0, 1) || 'F'}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="truncate text-base font-semibold text-slate-950">{location.name}</p>
                          {isMine ? (
                            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-amber-800">
                              minha localizacao
                            </span>
                          ) : null}
                          {isActiveNow ? (
                            <span className="member-active-badge rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-emerald-700">
                              ativo agora
                            </span>
                          ) : null}
                        </div>
                        <p className="text-sm text-slate-500">{formatLocationSeenAt(location.updatedAt)}</p>
                        {location.accuracy > 0 ? (
                          <p className="text-xs font-medium text-teal-700">Precisao aproximada de {Math.round(location.accuracy)} m</p>
                        ) : null}
                      </div>
                    </button>
                  )
                })}
              </div>
            ) : (
              <EmptyState
                title="Ninguem esta no mapa ainda"
                description="Quando alguem compartilhar a localizacao do celular, a familia aparece aqui e no mapa em tempo real."
              />
            )}
          </Card>

          {editingLocation && highlighted ? (
            <Card className="space-y-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-lg font-semibold text-slate-950">Editar localizacao</h3>
                  <p className="text-sm text-slate-500">
                    Ajuste CEP, endereco ou toque no mapa para preencher latitude e longitude.
                  </p>
                </div>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-600">
                  {sourceTypeLabels[highlighted.sourceType] ?? highlighted.sourceType ?? 'Mapa'}
                </span>
              </div>

              <StatusMessage
                message={
                  !['agenda', 'roteiro', 'hotel', 'veiculo'].includes(highlighted.sourceType)
                    ? 'Por enquanto a edicao direta no mapa esta habilitada para agenda, roteiro, hospedagem e veiculo.'
                    : locationFeedback
                }
                tone={
                  !['agenda', 'roteiro', 'hotel', 'veiculo'].includes(highlighted.sourceType)
                    ? 'info'
                    : locationFeedback.includes('sucesso')
                      ? 'success'
                      : 'error'
                }
              />

              <div className="grid gap-3 md:grid-cols-2">
                <Input
                  label="Cidade"
                  value={locationDraft.city}
                  onChange={(event) => updateLocationField('city', event.target.value)}
                  placeholder="Ex: Salvador"
                />
                <Input
                  label="Local"
                  value={locationDraft.local}
                  onChange={(event) => updateLocationField('local', event.target.value)}
                  placeholder="Ex: Aeroporto"
                />
                <Input
                  label="Endereco"
                  value={locationDraft.address}
                  onChange={(event) => updateLocationField('address', event.target.value)}
                  placeholder="Rua, numero, bairro"
                />
                <Input
                  label="CEP"
                  value={locationDraft.postalCode}
                  onChange={(event) => updateLocationField('postalCode', event.target.value)}
                  placeholder="00000-000"
                />
                <Input
                  label="Local / cidade para busca"
                  value={locationDraft.location}
                  onChange={(event) => updateLocationField('location', event.target.value)}
                  placeholder="Ex: Salvador - Aeroporto"
                />
                <Input
                  label="Consulta do mapa"
                  value={locationDraft.mapQuery}
                  onChange={(event) => updateLocationField('mapQuery', event.target.value)}
                  placeholder="Ex: Salvador aeroporto BA"
                />
                <Input
                  label="Latitude"
                  value={locationDraft.latitude}
                  onChange={(event) => updateLocationField('latitude', event.target.value)}
                  placeholder="-12.9714"
                />
                <Input
                  label="Longitude"
                  value={locationDraft.longitude}
                  onChange={(event) => updateLocationField('longitude', event.target.value)}
                  placeholder="-38.5014"
                />
              </div>

              <div className="flex flex-col gap-2 sm:flex-row">
                <Button variant="secondary" className="flex-1" onClick={closeLocationEditor}>
                  Cancelar
                </Button>
                <Button
                  className="flex-1"
                  onClick={handleLocationSave}
                  disabled={
                    savingLocation ||
                    !['agenda', 'roteiro', 'hotel', 'veiculo'].includes(highlighted.sourceType)
                  }
                  icon={<FiSave size={16} />}
                >
                  {savingLocation ? 'Salvando localizacao...' : 'Salvar localizacao'}
                </Button>
              </div>
            </Card>
          ) : null}

          {visibleListItems.length > 0 ? (
            <div className="grid gap-3">
              {visibleListItems.map((item) => (
                <button
                  key={`real-point-${item.id}`}
                  type="button"
                  onClick={() => focusPoint(item.id)}
                  className={`flex items-start gap-3 rounded-3xl bg-white/90 p-4 text-left shadow-sm transition ${
                    item.id === highlighted?.id ? 'ring-2 ring-teal-500' : 'hover:bg-white'
                  }`}
                >
                  <div className="shrink-0 pt-1">
                    <Avatar src={item.avatar || item.image} alt={item.title} size="sm" fallback={item.title?.[0] ?? 'P'} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="min-w-0 flex-1 text-lg font-semibold leading-tight text-slate-950">{item.title}</p>
                      <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-600">
                        {sourceTypeLabels[item.sourceType] ?? item.sourceType ?? 'Mapa'}
                      </span>
                    </div>
                    <p className="mt-1 break-words text-sm leading-6 text-slate-500">{item.mapQuery || item.description}</p>
                    <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-medium leading-5 text-slate-500">
                      {item.date ? <span>{formatDisplayDate(item.date)}</span> : null}
                      {item.estimatedCost > 0 ? <span>{formatCurrency(item.estimatedCost)}</span> : null}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          ) : null}
        </div>
      </Card>
    </div>
  )
}

export default MapPage
