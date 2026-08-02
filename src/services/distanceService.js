import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore'
import { db, ensureFirebaseConfigured } from '../firebase/config'
import { subscribeToQuery } from './firestoreRealtime'
import { geocodeLocation } from './geocodeService'

function distancesCollection() {
  ensureFirebaseConfigured()
  return collection(db, 'travelDistances')
}

function mapDistance(id, data) {
  return {
    id,
    tripId: data.tripId ?? '',
    mode: data.mode ?? 'car',
    origin: data.origin ?? '',
    destination: data.destination ?? '',
    kilometers: Number(data.kilometers ?? 0),
    date: data.date ?? '',
    source: data.source ?? 'manual',
    sourceKey: data.sourceKey ?? '',
    eventDate: data.eventDate ?? '',
    eventEndTime: data.eventEndTime ?? '',
    calculationMethod: data.calculationMethod ?? (data.source === 'manual' ? 'manual' : 'estimate'),
    calculatedKilometers: data.calculatedKilometers === undefined ? null : Number(data.calculatedKilometers),
    notes: data.notes ?? '',
    createdBy: data.createdBy ?? '',
    createdAt: data.createdAt ?? null,
  }
}

export function subscribeDistancesByTrip(tripId, callback, onError) {
  const distanceQuery = query(distancesCollection(), where('tripId', '==', tripId))
  return subscribeToQuery(
    distanceQuery,
    (snapshot) => snapshot.docs
      .map((distanceDoc) => mapDistance(distanceDoc.id, distanceDoc.data()))
      .sort((left, right) => `${left.date}-${left.createdAt?.seconds ?? 0}`.localeCompare(`${right.date}-${right.createdAt?.seconds ?? 0}`)),
    callback,
    onError,
  )
}

export async function createDistance(data) {
  const distanceRef = doc(distancesCollection())
  await setDoc(distanceRef, {
    id: distanceRef.id,
    tripId: data.tripId,
    mode: data.mode,
    origin: data.origin,
    destination: data.destination,
    kilometers: Number(data.kilometers),
    date: data.date ?? '',
    source: data.source ?? 'manual',
    sourceKey: data.sourceKey ?? '',
    notes: data.notes ?? '',
    createdBy: data.createdBy,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
}

export async function deleteDistance(id) {
  await deleteDoc(doc(distancesCollection(), id))
}

export async function updateDistanceKilometers(id, kilometers, currentItem) {
  const value = Number(kilometers)
  if (!Number.isFinite(value) || value < 0.1) throw new Error('Informe uma distancia valida.')
  await updateDoc(doc(distancesCollection(), id), {
    kilometers: Number(value.toFixed(1)),
    calculatedKilometers: currentItem.calculatedKilometers ?? Number(currentItem.kilometers),
    calculationMethod: currentItem.source === 'manual' ? 'manual' : 'manual_override',
    updatedAt: serverTimestamp(),
  })
}

export function getDistanceCompletionTimestamp(item) {
  if (item.source !== 'suggested' || !item.eventDate || !item.eventEndTime) {
    return null
  }

  const normalizedTime = String(item.eventEndTime).slice(0, 5)
  const timestamp = new Date(`${item.eventDate}T${normalizedTime}:00`).getTime()
  return Number.isNaN(timestamp) ? null : timestamp
}

export function calculateDistanceSummary(distances, now = Date.now()) {
  return distances.reduce((summary, item) => {
    const completionTimestamp = getDistanceCompletionTimestamp(item)
    if (completionTimestamp !== null && completionTimestamp > now) {
      return summary
    }

    summary.total += Number(item.kilometers ?? 0)
    summary[item.mode] = (summary[item.mode] ?? 0) + Number(item.kilometers ?? 0)
    return summary
  }, { total: 0, plane: 0, car: 0, transit: 0, walking: 0 })
}

function toRadians(value) {
  return (Number(value) * Math.PI) / 180
}

function haversineKilometers(origin, destination) {
  const earthRadius = 6371
  const latitudeDelta = toRadians(destination.latitude - origin.latitude)
  const longitudeDelta = toRadians(destination.longitude - origin.longitude)
  const originLatitude = toRadians(origin.latitude)
  const destinationLatitude = toRadians(destination.latitude)
  const haversine = Math.sin(latitudeDelta / 2) ** 2
    + Math.cos(originLatitude) * Math.cos(destinationLatitude) * Math.sin(longitudeDelta / 2) ** 2
  return earthRadius * 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine))
}

function normalizedText(...values) {
  return values.join(' ').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
}

async function fetchRouteKilometers(origin, destination, mode) {
  if (!['car', 'walking', 'transit'].includes(mode)) {
    return null
  }

  try {
    const response = await fetch('/api/route-distance', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ origin, destination, mode }),
    })
    if (!response.ok) return null
    const result = await response.json()
    const kilometers = Number(result.distanceMeters) / 1000
    return Number.isFinite(kilometers) && kilometers >= 0.1 ? kilometers : null
  } catch {
    return null
  }
}

async function buildAgendaSuggestion(previous, current) {
  const previousEvent = previous ?? {}
  const selectedTravelMode = String(current.travelMode ?? '')
  if (current.travelMode !== undefined && !selectedTravelMode) {
    return null
  }

  const explicitOrigin = String(current.routeOrigin ?? '').trim()
  const explicitDestination = String(current.routeDestination ?? '').trim()
  const originLocation = explicitOrigin
    ? await geocodeLocation({ local: explicitOrigin, address: explicitOrigin, location: explicitOrigin })
    : previousEvent
  const destinationLocation = explicitDestination
    ? await geocodeLocation({ local: explicitDestination, address: explicitDestination, location: explicitDestination })
    : current
  const hasOriginCoordinates = String(originLocation.latitude ?? '').trim() !== ''
    && String(originLocation.longitude ?? '').trim() !== ''
  const hasDestinationCoordinates = String(destinationLocation.latitude ?? '').trim() !== ''
    && String(destinationLocation.longitude ?? '').trim() !== ''

  if (!hasOriginCoordinates || !hasDestinationCoordinates) {
    return null
  }

  const originCoordinates = {
    latitude: Number(originLocation.latitude),
    longitude: Number(originLocation.longitude),
  }
  const destinationCoordinates = {
    latitude: Number(destinationLocation.latitude),
    longitude: Number(destinationLocation.longitude),
  }

  if (!Object.values(originCoordinates).every(Number.isFinite)
    || !Object.values(destinationCoordinates).every(Number.isFinite)) {
    return null
  }

  const previousCity = String(previousEvent.city || '').trim()
  const currentCity = String(current.city || '').trim()
  const invalidCityPattern = /^(almoco|jantar|hotel|hospedagem|aeroporto|saida|chegada)$/i
  const hasUsableCities = previousCity
    && currentCity
    && !invalidCityPattern.test(normalizedText(previousCity))
    && !invalidCityPattern.test(normalizedText(currentCity))
  const sameCity = normalizedText(previousCity) === normalizedText(currentCity)
  const airportRoute = normalizedText(previousEvent.local, previousEvent.title).includes('aeroporto')
    && normalizedText(current.local, current.title).includes('aeroporto')
  const touristWalk = sameCity
    && previousEvent.type === 'ponto_turistico'
    && current.type === 'ponto_turistico'

  let mode = ['walking', 'transit', 'car', 'plane'].includes(selectedTravelMode)
    ? selectedTravelMode
    : ''
  let multiplier = 1

  if (mode === 'car') {
    multiplier = 1.22
  } else if (mode === 'transit') {
    multiplier = 1.15
  } else if (!mode && airportRoute && !sameCity) {
    mode = 'plane'
  } else if (!mode && !sameCity && hasUsableCities) {
    mode = 'car'
    multiplier = 1.22
  } else if (!mode && touristWalk) {
    mode = 'walking'
  }

  if (!mode) {
    return null
  }

  const routeKilometers = await fetchRouteKilometers(originCoordinates, destinationCoordinates, mode)
  const kilometers = routeKilometers ?? haversineKilometers(originCoordinates, destinationCoordinates) * multiplier
  if (!Number.isFinite(kilometers) || kilometers < 0.1) {
    return null
  }

  return {
    sourceKey: `agenda-${previousEvent.id || 'origem'}-${current.id}`,
    mode,
    origin: explicitOrigin || previousEvent.local || previousEvent.title || previousCity,
    destination: explicitDestination || current.local || current.title || currentCity,
    kilometers: Number(kilometers.toFixed(1)),
    date: current.date ?? '',
    eventDate: current.date ?? '',
    eventEndTime: current.endTime || current.startTime || '',
    calculationMethod: routeKilometers ? 'route' : 'estimate',
  }
}

export async function syncAgendaDistanceSuggestions({ tripId, createdBy, agenda }) {
  if (!tripId) {
    return 0
  }

  const agendaItems = agenda ?? []
  const suggestions = (await Promise.all(agendaItems
    .map((current, index) => {
      if (index === 0 && !(current.routeOrigin && current.routeDestination)) {
        return null
      }
      return buildAgendaSuggestion(agendaItems[index - 1], current)
    })))
    .filter(Boolean)

  const snapshot = await getDocs(query(distancesCollection(), where('tripId', '==', tripId)))
  const existingAgendaSuggestions = new Map(
    snapshot.docs
      .filter((item) => item.data().source === 'suggested'
        && String(item.data().sourceKey ?? '').startsWith('agenda-'))
      .map((item) => [item.data().sourceKey, item]),
  )
  const currentSuggestionKeys = new Set(suggestions.map((item) => item.sourceKey))
  const operations = []

  suggestions.forEach((suggestion) => {
    const existing = existingAgendaSuggestions.get(suggestion.sourceKey)

    if (!existing) {
      operations.push({ type: 'create', suggestion })
      return
    }

    const current = existing.data()
    const manuallyAdjusted = current.calculationMethod === 'manual_override'
    const synchronizedSuggestion = manuallyAdjusted
      ? { ...suggestion, kilometers: Number(current.kilometers), calculationMethod: 'manual_override', calculatedKilometers: suggestion.kilometers }
      : suggestion
    const changed = current.mode !== synchronizedSuggestion.mode
      || current.origin !== suggestion.origin
      || current.destination !== suggestion.destination
      || Number(current.kilometers) !== Number(synchronizedSuggestion.kilometers)
      || current.date !== suggestion.date
      || current.eventDate !== suggestion.eventDate
      || current.eventEndTime !== suggestion.eventEndTime
      || current.calculationMethod !== synchronizedSuggestion.calculationMethod
      || (manuallyAdjusted && Number(current.calculatedKilometers) !== Number(suggestion.kilometers))

    if (changed) {
      operations.push({ type: 'update', ref: existing.ref, suggestion: synchronizedSuggestion })
    }
  })

  existingAgendaSuggestions.forEach((item, sourceKey) => {
    if (!currentSuggestionKeys.has(sourceKey)) {
      operations.push({ type: 'delete', ref: item.ref })
    }
  })

  for (let index = 0; index < operations.length; index += 400) {
    const batch = writeBatch(db)
    operations.slice(index, index + 400).forEach((operation) => {
      if (operation.type === 'delete') {
        batch.delete(operation.ref)
        return
      }

      if (operation.type === 'update') {
        batch.update(operation.ref, {
          ...operation.suggestion,
          updatedAt: serverTimestamp(),
        })
        return
      }

      const distanceRef = doc(distancesCollection())
      batch.set(distanceRef, {
        id: distanceRef.id,
        tripId,
        ...operation.suggestion,
        source: 'suggested',
        notes: 'Sugestão semiautomática baseada na agenda e nas coordenadas; revise se necessário.',
        createdBy,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
    })
    await batch.commit()
  }

  return operations.length
}
