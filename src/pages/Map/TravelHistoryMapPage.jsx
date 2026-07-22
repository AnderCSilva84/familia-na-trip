import { useEffect, useMemo, useState } from 'react'
import { CircleMarker, MapContainer, Popup, TileLayer } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import Card from '../../components/common/Card'
import EmptyState from '../../components/common/EmptyState'
import Loading from '../../components/common/Loading'
import useAuth from '../../hooks/useAuth'
import { getAgendaByTrips } from '../../services/agendaService'

const cityAliases = { aracaju: 'aracaju', atacaju: 'aracaju', belem: 'belem', brasilia: 'brasilia' }
const cityLabels = { aracaju: 'Aracaju', belem: 'Belém', brasilia: 'Brasília', salvador: 'Salvador', itacimirim: 'Itacimirim', 'cachoeira do itanhi': 'Cachoeira do Itanhi' }
const cityStates = { aracaju: 'SE', belem: 'PA', brasilia: 'DF', salvador: 'BA', itacimirim: 'BA', 'cachoeira do itanhi': 'SE' }
const stateAliases = { bahia: 'BA', ba: 'BA', sergipe: 'SE', se: 'SE', para: 'PA', pa: 'PA', 'distrito federal': 'DF', df: 'DF' }

function normalizeText(value) {
  return String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase()
}

function canonicalCity(value) {
  const normalized = normalizeText(value).replace(/\s+/g, ' ')
  return cityAliases[normalized] ?? normalized
}

function displayCity(cityKey, fallback) {
  return cityLabels[cityKey] ?? String(fallback ?? '').trim().replace(/\b\w/g, (letter) => letter.toUpperCase())
}

function normalizeState(value, cityKey) {
  return stateAliases[normalizeText(value)] ?? cityStates[cityKey] ?? String(value ?? '').trim().toUpperCase()
}

function parseAgendaPlace(item) {
  const raw = String(item.city || item.location || '').trim()
  const [city = '', state = ''] = raw.split(/\s+-\s+|,/).map((part) => part.trim())
  return { city, state }
}

function TravelHistoryMapPage({ embedded = false }) {
  const { trips } = useAuth()
  const [agenda, setAgenda] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    queueMicrotask(() => { if (active) setLoading(true) })
    getAgendaByTrips(trips.map((trip) => trip.id))
      .then((items) => { if (active) setAgenda(items) })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [trips])

  const places = useMemo(() => {
    const byCity = new Map()

    function addPlace(place, tripName) {
      const key = canonicalCity(place.city)
      if (!key) return
      const current = byCity.get(key) ?? {
        key,
        city: displayCity(key, place.city),
        state: normalizeState(place.state, key),
        country: place.country || 'Brasil',
        tripNames: [],
        visits: 0,
      }

      current.visits += 1
      current.state ||= normalizeState(place.state, key)
      if (tripName && !current.tripNames.includes(tripName)) current.tripNames.push(tripName)
      if (Number.isFinite(Number(place.latitude)) && Number.isFinite(Number(place.longitude))) {
        current.latitude = Number(place.latitude)
        current.longitude = Number(place.longitude)
      }
      byCity.set(key, current)
    }

    for (const trip of trips) {
      const tripName = String(trip.name ?? '')
      const tripCities = (trip.cities ?? []).map((place) => ({ ...place }))
      for (const place of tripCities) addPlace(place, tripName)
    }

    for (const item of agenda) {
      const trip = trips.find((candidate) => candidate.id === item.tripId)
      addPlace({ ...parseAgendaPlace(item), latitude: item.latitude, longitude: item.longitude }, trip?.name)
    }

    return [...byCity.values()].sort((left, right) => left.city.localeCompare(right.city, 'pt-BR'))
  }, [agenda, trips])

  const markers = places.filter((place) => Number.isFinite(place.latitude) && Number.isFinite(place.longitude))

  if (loading) return <Loading />

  return <div className="space-y-5">
    <Card><h2 className="text-2xl font-semibold text-slate-950">{embedded ? 'Mapa de todas as viagens' : 'Por onde já passamos'}</h2><p className="mt-1 text-sm text-slate-500">{places.length} cidade(s) em {trips.length} viagem(ns) da família.</p></Card>
    {places.length === 0 ? <EmptyState title="Nenhuma cidade registrada" description="Adicione cidades às trips ou endereços aos eventos da agenda." /> : <>
      <Card className="overflow-hidden p-0"><MapContainer center={markers.length ? [markers[0].latitude, markers[0].longitude] : [-14.235, -51.9253]} zoom={markers.length ? 5 : 4} className="h-[460px] w-full"><TileLayer attribution="&copy; OpenStreetMap" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />{markers.map((place) => <CircleMarker key={place.key} center={[place.latitude, place.longitude]} radius={9} pathOptions={{ color: '#0f766e', fillColor: '#14b8a6', fillOpacity: .85 }}><Popup><strong>{place.city}{place.state ? ` — ${place.state}` : ''}</strong><br />Trip: {place.tripNames.join(', ')}</Popup></CircleMarker>)}</MapContainer></Card>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{places.map((place) => <Card key={place.key}><p className="font-semibold text-slate-950">{place.city}{place.state ? ` — ${place.state}` : ''}</p><p className="mt-1 text-sm text-slate-500">Trip: {place.tripNames.join(', ')}</p></Card>)}</div>
    </>}
  </div>
}

export default TravelHistoryMapPage
