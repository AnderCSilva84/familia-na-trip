import { useEffect, useMemo } from 'react'
import { FiMap, FiMapPin } from 'react-icons/fi'
import { CircleMarker, MapContainer, Popup, TileLayer, useMap } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import { Link } from 'react-router-dom'
import useMapPoints from '../../hooks/useMapPoints'
import { formatDateInput } from '../../utils/formatters'

const cityPresets = [
  { aliases: ['belem'], city: 'Belém', state: 'PA', latitude: -1.4558, longitude: -48.4902 },
  { aliases: ['brasilia'], city: 'Brasília', state: 'DF', latitude: -15.7939, longitude: -47.8828 },
  { aliases: ['salvador'], city: 'Salvador', state: 'BA', latitude: -12.9714, longitude: -38.5014 },
  { aliases: ['aracaju'], city: 'Aracaju', state: 'SE', latitude: -10.9472, longitude: -37.0731 },
  { aliases: ['itacimirim'], city: 'Itacimirim', state: 'BA', latitude: -12.6135, longitude: -38.0477 },
]

const stateNames = {
  AC: 'Acre', AL: 'Alagoas', AP: 'Amapá', AM: 'Amazonas', BA: 'Bahia', CE: 'Ceará',
  DF: 'Distrito Federal', ES: 'Espírito Santo', GO: 'Goiás', MA: 'Maranhão', MT: 'Mato Grosso',
  MS: 'Mato Grosso do Sul', MG: 'Minas Gerais', PA: 'Pará', PB: 'Paraíba', PR: 'Paraná',
  PE: 'Pernambuco', PI: 'Piauí', RJ: 'Rio de Janeiro', RN: 'Rio Grande do Norte', RS: 'Rio Grande do Sul',
  RO: 'Rondônia', RR: 'Roraima', SC: 'Santa Catarina', SP: 'São Paulo', SE: 'Sergipe', TO: 'Tocantins',
}

function normalizeText(value) {
  return String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase()
}

function resolvePlace(point) {
  const locationText = [point.city, point.location, point.mapQuery, point.address, point.title].filter(Boolean).join(' ')
  const normalized = normalizeText(locationText)
  const preset = cityPresets.find((item) => item.aliases.some((alias) => normalized.includes(alias)))
  const rawCity = String(point.city ?? '').trim()
  const stateMatch = locationText.match(/(?:,|\s-\s|\/|\s)\s*([A-Z]{2})(?:\b|$)/)
  // Nas cidades reconhecidas, a UF do cadastro de referencia prevalece sobre um
  // campo incorreto do evento (por exemplo, "Salvador, AP").
  const state = String(preset?.state || point.state || point.uf || stateMatch?.[1] || '').toUpperCase()
  const city = rawCity.replace(/\s*[-,/\s]\s*[A-Z]{2}\s*$/, '').trim() || preset?.city || ''
  // Este mapa representa cidades, nao o ponto exato de cada atividade. Para cidades
  // reconhecidas, o centro conhecido tambem impede que uma coordenada digitada sem o
  // sinal negativo (por exemplo, Salvador em +38) coloque o marcador fora do Brasil.
  const latitude = preset?.latitude ?? (Number.isFinite(point.latitude) ? point.latitude : null)
  const longitude = preset?.longitude ?? (Number.isFinite(point.longitude) ? point.longitude : null)

  if (!city || !Number.isFinite(latitude) || !Number.isFinite(longitude)) return null

  return { city, state, latitude, longitude }
}

function FitVisitedPlaces({ places }) {
  const map = useMap()

  useEffect(() => {
    if (!places.length) return
    if (places.length === 1) {
      map.setView([places[0].latitude, places[0].longitude], 8)
      return
    }
    map.fitBounds(places.map((place) => [place.latitude, place.longitude]), { padding: [32, 32], maxZoom: 8 })
  }, [map, places])

  return null
}

function VisitedPlacesMap({ today }) {
  const points = useMapPoints()
  const places = useMemo(() => {
    const visited = points
      .flatMap((point) => point.relatedPoints ?? [point])
      .filter((point) => {
        if (point.sourceType === 'cidade_visitada') return true
        const date = formatDateInput(point.date)
        return date && date <= today
      })
      .map(resolvePlace)
      .filter(Boolean)

    return [...new Map(visited.map((place) => [`${normalizeText(place.city)}-${place.state}`, place])).values()]
      .sort((left, right) => left.city.localeCompare(right.city, 'pt-BR'))
  }, [points, today])

  const states = useMemo(
    () => [...new Set(places.map((place) => place.state).filter(Boolean))].sort(),
    [places],
  )

  return (
    <section className="overflow-hidden rounded-[28px] bg-white shadow-sm">
      <div className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-teal-700">
            <FiMap size={19} />
            <h3 className="text-lg font-semibold text-slate-950">Nosso mapa de viagens</h3>
          </div>
          <p className="mt-1 text-sm text-slate-500">Estados e cidades que já fazem parte da nossa história.</p>
        </div>
        <Link to="/map" className="text-sm font-semibold text-teal-700">Abrir mapa completo</Link>
      </div>

      {places.length ? (
        <>
          <div className="h-[300px] w-full border-y border-slate-100 sm:h-[360px]">
            <MapContainer center={[-14.2, -51.9]} zoom={4} scrollWheelZoom={false} className="h-full w-full" aria-label="Mapa das cidades visitadas">
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <FitVisitedPlaces places={places} />
              {places.map((place) => (
                <CircleMarker
                  key={`${place.city}-${place.state}`}
                  center={[place.latitude, place.longitude]}
                  radius={9}
                  pathOptions={{ color: '#ffffff', weight: 3, fillColor: '#0f766e', fillOpacity: 1 }}
                >
                  <Popup><strong>{place.city}</strong>{place.state ? ` · ${stateNames[place.state] ?? place.state}` : ''}</Popup>
                </CircleMarker>
              ))}
            </MapContainer>
          </div>
          <div className="grid gap-4 p-5 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start">
            <div className="flex flex-wrap gap-2">
              {places.map((place) => (
                <span key={`chip-${place.city}-${place.state}`} className="inline-flex items-center gap-1.5 rounded-full bg-teal-50 px-3 py-1.5 text-sm font-medium text-teal-800">
                  <FiMapPin size={13} /> {place.city}{place.state ? `, ${place.state}` : ''}
                </span>
              ))}
            </div>
            <div className="text-left sm:text-right">
              <p className="text-2xl font-semibold text-slate-950">{places.length}</p>
              <p className="text-xs font-medium uppercase tracking-[0.12em] text-slate-400">cidade{places.length === 1 ? '' : 's'} · {states.length} estado{states.length === 1 ? '' : 's'}</p>
            </div>
          </div>
        </>
      ) : (
        <div className="mx-5 mb-5 rounded-3xl bg-slate-50 p-6 text-center">
          <FiMapPin className="mx-auto text-teal-600" size={24} />
          <p className="mt-3 font-semibold text-slate-900">O mapa está pronto para a primeira cidade</p>
          <p className="mt-1 text-sm text-slate-500">As cidades aparecem aqui quando a data dos registros da viagem chega.</p>
        </div>
      )}
    </section>
  )
}

export default VisitedPlacesMap
