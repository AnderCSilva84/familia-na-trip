import { useEffect, useMemo, useRef, useState } from 'react'
import { FiMap, FiNavigation } from 'react-icons/fi'
import { CircleMarker, MapContainer, Popup, TileLayer, useMap } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import Avatar from '../../components/common/Avatar'
import Button from '../../components/common/Button'
import Card from '../../components/common/Card'
import EmptyState from '../../components/common/EmptyState'
import useMapPoints from '../../hooks/useMapPoints'
import { formatCurrency, formatDateInput, formatDisplayDate } from '../../utils/formatters'
import { buildGoogleMapsUrl, buildWazeUrl } from '../../utils/navigationLinks'

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

function MapPage() {
  const items = useMapPoints()
  const [selectedPointId, setSelectedPointId] = useState('')
  const mapViewportRef = useRef(null)
  const mapItems = useMemo(
    () => items.filter((item) => Number.isFinite(item.latitude) && Number.isFinite(item.longitude)),
    [items],
  )
  const visibleListItems = useMemo(
    () => mapItems.filter((item) => !isPastDay(item.date)),
    [mapItems],
  )
  const highlighted =
    visibleListItems.find((item) => item.id === selectedPointId) ??
    visibleListItems.find((item) => item.isCurrentDay) ??
    visibleListItems[0] ??
    mapItems.find((item) => item.id === selectedPointId) ??
    mapItems[0] ??
    items[0]
  const googleMapsUrl = highlighted ? buildGoogleMapsUrl(highlighted) : ''
  const wazeUrl = highlighted ? buildWazeUrl(highlighted) : ''
  const mapCenter =
    highlighted?.latitude && highlighted?.longitude ? [highlighted.latitude, highlighted.longitude] : [-12.9714, -38.5014]

  function focusPoint(pointId) {
    setSelectedPointId(pointId)
    mapViewportRef.current?.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    })
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
                  <FlyToPoint point={highlighted} />
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
                {highlighted.image ? (
                  <img src={highlighted.image} alt={highlighted.title} className="h-20 w-20 shrink-0 rounded-2xl object-cover" />
                ) : (
                  <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-teal-50 text-2xl text-teal-700">
                    P
                  </div>
                )}
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
                </div>
              </Card>
          ) : (
            <EmptyState title="Sem pontos no mapa" description="Adicione local, endereco ou CEP para exibir marcadores reais." />
          )}

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
