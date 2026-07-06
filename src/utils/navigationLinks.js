function normalizeValue(value) {
  return String(value ?? '').trim()
}

export function buildDestinationLabel(item = {}) {
  return normalizeValue(item.mapQuery || item.location || item.address || item.title || item.hotelName || item.vehicleModel)
}

export function buildGoogleMapsUrl(item = {}) {
  const latitude = normalizeValue(item.latitude)
  const longitude = normalizeValue(item.longitude)

  if (latitude && longitude) {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${latitude},${longitude}`)}`
  }

  const destination = buildDestinationLabel(item)

  if (!destination) {
    return ''
  }

  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(destination)}`
}

export function buildWazeUrl(item = {}) {
  const latitude = normalizeValue(item.latitude)
  const longitude = normalizeValue(item.longitude)

  if (latitude && longitude) {
    return `https://waze.com/ul?ll=${encodeURIComponent(`${latitude},${longitude}`)}&navigate=yes`
  }

  const destination = buildDestinationLabel(item)

  if (!destination) {
    return ''
  }

  return `https://waze.com/ul?q=${encodeURIComponent(destination)}&navigate=yes`
}
