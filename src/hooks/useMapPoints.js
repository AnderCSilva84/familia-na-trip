import { useEffect, useMemo, useState } from 'react'
import { mockData } from '../data/mockData'
import { subscribeMapPointsByTrip } from '../services/mapPointService'
import useEmergencyContacts from './useEmergencyContacts'
import useAgenda from './useAgenda'
import useHotels from './useHotels'
import useItinerary from './useItinerary'
import useTips from './useTips'
import useVehicles from './useVehicles'
import useAppStore from '../store/useAppStore'
import { canUseMockFallback } from '../utils/runtimeMode'
import { resolveMapMetadata } from '../utils/locationPresets'

const fallbackPositions = [
  { x: '50%', y: '58%' },
  { x: '42%', y: '34%' },
  { x: '64%', y: '72%' },
  { x: '30%', y: '62%' },
  { x: '58%', y: '24%' },
  { x: '74%', y: '48%' },
]

function isSameDay(dateValue) {
  if (!dateValue) {
    return false
  }

  const target = new Date(dateValue)

  if (Number.isNaN(target.getTime())) {
    return false
  }

  return new Date().toISOString().slice(0, 10) === target.toISOString().slice(0, 10)
}

function normalizeCoordinate(value, fallback) {
  const raw = value ?? fallback ?? ''

  if (raw === '') {
    return ''
  }

  if (typeof raw === 'number') {
    return `${raw}%`
  }

  const text = String(raw).trim()

  if (text.endsWith('%') || text.endsWith('px')) {
    return text
  }

  const numeric = Number(text)
  return Number.isFinite(numeric) ? `${numeric}%` : text
}

function normalizePoint(item, sourceType, defaults = {}) {
  const mapMetadata = resolveMapMetadata(item)
  const latitude = Number(item.latitude ?? item.lat ?? '')
  const longitude = Number(item.longitude ?? item.lng ?? item.lon ?? '')

  return {
    id: `${sourceType}-${item.id}`,
    title: item.title || item.hotelName || item.vehicleModel || defaults.title || 'Ponto da viagem',
    description:
      item.description ||
      item.address ||
      item.location ||
      defaults.description ||
      'Sem descricao adicional.',
    x: normalizeCoordinate(item.x || mapMetadata.mapX, defaults.x),
    y: normalizeCoordinate(item.y || mapMetadata.mapY, defaults.y),
    mapQuery: item.mapQuery || mapMetadata.mapQuery || '',
    latitude: Number.isFinite(latitude) ? latitude : null,
    longitude: Number.isFinite(longitude) ? longitude : null,
    date: item.date ?? '',
    estimatedCost: Number(item.estimatedCost ?? item.estimatedValue ?? 0),
    actualCost: Number(item.actualCost ?? item.finalValue ?? 0),
    image: item.image || defaults.image || '',
    avatar: item.avatar || defaults.avatar || '',
    sourceType,
    sourceId: item.id,
    isCurrentDay: defaults.isCurrentDay ?? false,
  }
}

function useMapPoints() {
  const trip = useAppStore((state) => state.trip)
  const { hotels } = useHotels()
  const { vehicles } = useVehicles()
  const { tips } = useTips()
  const { contacts: emergencyContacts } = useEmergencyContacts()
  const { agenda } = useAgenda()
  const { items: itinerary } = useItinerary()
  const [customPoints, setCustomPoints] = useState([])
  const usingMockData = canUseMockFallback()

  useEffect(() => {
    if (!trip?.id || usingMockData) {
      return () => {}
    }

    return subscribeMapPointsByTrip(
      trip.id,
      (points) => setCustomPoints(points),
      () => setCustomPoints([]),
    )
  }, [trip?.id, usingMockData])

  return useMemo(() => {
    if (usingMockData) {
      return mockData.mapMarkers
    }

    const agendaPoints = agenda
      .map((event, index) =>
        normalizePoint(event, 'agenda', {
          x: fallbackPositions[index % fallbackPositions.length].x,
          y: fallbackPositions[index % fallbackPositions.length].y,
          isCurrentDay: isSameDay(event.date),
        }),
      )
      .sort((left, right) => Number(right.isCurrentDay) - Number(left.isCurrentDay))

    return [
      ...agendaPoints,
      ...hotels
        .map((hotel, index) =>
          normalizePoint(hotel, 'hotel', fallbackPositions[(index + 1) % fallbackPositions.length]),
        ),
      ...vehicles
        .map((vehicle, index) =>
          normalizePoint(vehicle, 'veiculo', fallbackPositions[(index + 2) % fallbackPositions.length]),
        ),
      ...tips.map((tip, index) =>
        normalizePoint(tip, 'dica', fallbackPositions[(index + 3) % fallbackPositions.length]),
      ),
      ...emergencyContacts.map((contact, index) =>
        normalizePoint(
          {
            ...contact,
            title: contact.title,
            description: contact.description || contact.specialties,
            location: `${contact.address}${contact.city ? ` - ${contact.city}` : ''}`,
          },
          'emergencia',
          fallbackPositions[(index + 4) % fallbackPositions.length],
        ),
      ),
      ...itinerary
        .map((item, index) =>
          normalizePoint(item, 'roteiro', fallbackPositions[(index + 5) % fallbackPositions.length]),
        ),
      ...customPoints.map((point) => normalizePoint(point, point.sourceType || 'ponto')),
    ]
  }, [agenda, customPoints, emergencyContacts, hotels, itinerary, tips, usingMockData, vehicles])
}

export default useMapPoints
