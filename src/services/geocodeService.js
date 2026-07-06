function normalizeText(value) {
  return String(value ?? '').trim()
}

function normalizePostalCode(value) {
  return String(value ?? '').replace(/\D/g, '').trim()
}

export function buildGeocodingQuery(item = {}) {
  const postalCode = normalizePostalCode(item.postalCode)
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
  const postalCode = normalizePostalCode(item.postalCode)

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
  const query =
    buildGeocodingQuery({
      ...item,
      address: postalCodeData.address || item.address,
      city: postalCodeData.city || item.city,
      postalCode: postalCodeData.postalCode || item.postalCode,
    }) || String(item.mapQuery ?? '').trim()

  if (!query) {
    return {
      latitude: '',
      longitude: '',
      mapQuery: '',
    }
  }

  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&q=${encodeURIComponent(query)}`,
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

    if (!firstResult) {
      return {
        latitude: '',
        longitude: '',
        mapQuery: query,
      }
    }

    return {
      latitude: Number(firstResult.lat),
      longitude: Number(firstResult.lon),
      mapQuery: firstResult.display_name || query,
    }
  } catch {
    return {
      latitude: '',
      longitude: '',
      mapQuery: query,
    }
  }
}
