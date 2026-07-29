/* global Netlify */

const travelModes = {
  car: 'DRIVE',
  walking: 'WALK',
  transit: 'TRANSIT',
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': status === 200 ? 'public, max-age=86400' : 'no-store',
    },
  })
}

function validCoordinate(value, minimum, maximum) {
  const number = Number(value)
  return Number.isFinite(number) && number >= minimum && number <= maximum
}

export default async (request) => {
  if (request.method !== 'POST') {
    return json({ error: 'Método não permitido.' }, 405)
  }

  const apiKey = Netlify.env.get('GOOGLE_ROUTES_API_KEY')
  if (!apiKey) {
    return json({ error: 'Serviço de rotas não configurado.' }, 503)
  }

  let body
  try {
    body = await request.json()
  } catch {
    return json({ error: 'Requisição inválida.' }, 400)
  }

  const { origin, destination, mode } = body
  if (!travelModes[mode]
    || !validCoordinate(origin?.latitude, -90, 90)
    || !validCoordinate(origin?.longitude, -180, 180)
    || !validCoordinate(destination?.latitude, -90, 90)
    || !validCoordinate(destination?.longitude, -180, 180)) {
    return json({ error: 'Coordenadas ou transporte inválidos.' }, 400)
  }

  const routeRequest = {
    origin: {
      location: {
        latLng: {
          latitude: Number(origin.latitude),
          longitude: Number(origin.longitude),
        },
      },
    },
    destination: {
      location: {
        latLng: {
          latitude: Number(destination.latitude),
          longitude: Number(destination.longitude),
        },
      },
    },
    travelMode: travelModes[mode],
    languageCode: 'pt-BR',
    units: 'METRIC',
  }

  if (mode === 'car') {
    routeRequest.routingPreference = 'TRAFFIC_UNAWARE'
  }

  try {
    const response = await fetch('https://routes.googleapis.com/directions/v2:computeRoutes', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-goog-api-key': apiKey,
        'x-goog-fieldmask': 'routes.distanceMeters,routes.duration',
      },
      body: JSON.stringify(routeRequest),
    })
    const result = await response.json()

    if (!response.ok || !result.routes?.length) {
      return json({ error: result.error?.message || 'Rota não encontrada.' }, response.ok ? 404 : response.status)
    }

    return json({
      distanceMeters: Number(result.routes[0].distanceMeters),
      duration: result.routes[0].duration ?? '',
      provider: 'google-routes',
    })
  } catch {
    return json({ error: 'Não foi possível consultar o serviço de rotas.' }, 502)
  }
}

export const config = {
  path: '/api/route-distance',
  method: ['POST'],
}
