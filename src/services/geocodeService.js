function normalizeText(value) {
  return String(value ?? '').trim()
}

function normalizePostalCode(value) {
  return String(value ?? '').replace(/\D/g, '').trim()
}

function extractPostalCodeFromText(value) {
  const text = String(value ?? '')
  const match = text.match(/\b\d{5}-?\d{3}\b/)
  return match ? normalizePostalCode(match[0]) : ''
}

function resolvePostalCode(item = {}) {
  return (
    normalizePostalCode(item.postalCode) ||
    extractPostalCodeFromText(item.address) ||
    extractPostalCodeFromText(item.location) ||
    extractPostalCodeFromText(item.local) ||
    extractPostalCodeFromText(item.mapQuery) ||
    extractPostalCodeFromText(item.description)
  )
}

export function buildGeocodingQuery(item = {}) {
  const postalCode = resolvePostalCode(item)
  return [
    postalCode ? `${postalCode}, Brasil` : '',
    normalizeText(item.address),
    normalizeText(item.local),
    normalizeText(item.location),
    normalizeText(item.city),
    'Brasil',
  ]
    .filter(Boolean)
    .join(', ')
}

async function enrichAddressFromPostalCode(item = {}) {
  const postalCode = resolvePostalCode(item)

  if (postalCode.length !== 8) {
    return {
      address: normalizeText(item.address),
      city: normalizeText(item.city),
      postalCode,
    }
  }

  try {
    const response = await fetch(`https://viacep.com.br/ws/${postalCode}/json/`, {
      headers: {
        Accept: 'application/json',
      },
    })

    if (!response.ok) {
      throw new Error('Falha ao consultar CEP.')
    }

    const result = await response.json()

    if (result?.erro) {
      throw new Error('CEP nao encontrado.')
    }

    return {
      address: [result.logradouro, result.bairro].filter(Boolean).join(', ') || normalizeText(item.address),
      city: [result.localidade, result.uf].filter(Boolean).join(' - ') || normalizeText(item.city),
      postalCode,
    }
  } catch {
    return {
      address: normalizeText(item.address),
      city: normalizeText(item.city),
      postalCode,
    }
  }
}

function buildGeocodingCandidates(item = {}) {
  const postalCode = resolvePostalCode(item)
  const address = normalizeText(item.address)
  const local = normalizeText(item.local)
  const location = normalizeText(item.location)
  const city = normalizeText(item.city)
  const title = normalizeText(item.title)
  const mapQuery = normalizeText(item.mapQuery)
  const description = normalizeText(item.description)

  return [
    [postalCode ? `${postalCode}, Brasil` : '', address, city, 'Brasil'].filter(Boolean).join(', '),
    [address, city, 'Brasil'].filter(Boolean).join(', '),
    [local, city, 'Brasil'].filter(Boolean).join(', '),
    [location, city, 'Brasil'].filter(Boolean).join(', '),
    [title, local, city, 'Brasil'].filter(Boolean).join(', '),
    [title, location, city, 'Brasil'].filter(Boolean).join(', '),
    [mapQuery].filter(Boolean).join(', '),
    [description, city, 'Brasil'].filter(Boolean).join(', '),
  ].filter(Boolean)
}

async function fetchGeocodeCandidate(query) {
  const response = await fetch(
    `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&countrycodes=br&q=${encodeURIComponent(query)}`,
    {
      headers: {
        Accept: 'application/json',
      },
    },
  )

  if (!response.ok) {
    throw new Error('Falha ao consultar o mapa.')
  }

  const [firstResult] = await response.json()
  return firstResult ?? null
}

export async function geocodeLocation(item = {}) {
  const latitude = Number(item.latitude)
  const longitude = Number(item.longitude)

  if (Number.isFinite(latitude) && Number.isFinite(longitude)) {
    return {
      latitude,
      longitude,
      mapQuery: buildGeocodingQuery(item) || item.mapQuery || '',
    }
  }

  const postalCodeData = await enrichAddressFromPostalCode(item)
  const enrichedItem = {
      ...item,
      address: postalCodeData.address || item.address,
      city: postalCodeData.city || item.city,
      postalCode: postalCodeData.postalCode || item.postalCode,
    }
  const query =
    buildGeocodingQuery(enrichedItem) || String(item.mapQuery ?? '').trim()
  const candidates = buildGeocodingCandidates(enrichedItem)

  if (!query && candidates.length === 0) {
    return {
      latitude: '',
      longitude: '',
      mapQuery: '',
    }
  }

  try {
    for (const candidate of candidates) {
      const firstResult = await fetchGeocodeCandidate(candidate)

      if (firstResult) {
        return {
          latitude: Number(firstResult.lat),
          longitude: Number(firstResult.lon),
          mapQuery: firstResult.display_name || candidate,
        }
      }
    }

    return {
      latitude: '',
      longitude: '',
      mapQuery: query || candidates[0] || '',
    }
  } catch {
    return {
      latitude: '',
      longitude: '',
      mapQuery: query || candidates[0] || '',
    }
  }
}
