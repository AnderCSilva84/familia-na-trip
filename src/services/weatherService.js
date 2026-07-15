const WEATHER_LABELS = {
  0: 'Ceu limpo',
  1: 'Predominio de sol',
  2: 'Parcialmente nublado',
  3: 'Nublado',
  45: 'Neblina',
  48: 'Neblina com geada',
  51: 'Garoa leve',
  53: 'Garoa',
  55: 'Garoa forte',
  61: 'Chuva leve',
  63: 'Chuva',
  65: 'Chuva forte',
  71: 'Neve leve',
  73: 'Neve',
  75: 'Neve forte',
  80: 'Pancadas leves',
  81: 'Pancadas de chuva',
  82: 'Pancadas fortes',
  95: 'Trovoadas',
  96: 'Trovoadas com granizo',
  99: 'Trovoadas fortes',
}

const WEATHER_CACHE_DURATION = 10 * 60 * 1000
const weatherCache = new Map()

export function getWeatherLabel(code) {
  return WEATHER_LABELS[Number(code)] || 'Condicao variavel'
}

export async function getDestinationWeather(destination, targetDate, signal) {
  const location = String(destination ?? '').trim()

  if (!location) {
    throw new Error('Destino da viagem nao informado.')
  }

  const cacheKey = `${location.toLocaleLowerCase('pt-BR')}|${targetDate || 'agora'}`
  const cached = weatherCache.get(cacheKey)

  if (cached && Date.now() - cached.savedAt < WEATHER_CACHE_DURATION) {
    return cached.data
  }

  const geocodingResponse = await fetch(
    `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(location)}&count=1&language=pt&format=json`,
    { signal },
  )

  if (!geocodingResponse.ok) {
    throw new Error('Nao foi possivel localizar o destino.')
  }

  const geocoding = await geocodingResponse.json()
  const place = geocoding?.results?.[0]

  if (!place) {
    throw new Error('Destino nao encontrado na previsao.')
  }

  const params = new URLSearchParams({
    latitude: String(place.latitude),
    longitude: String(place.longitude),
    current: 'temperature_2m,apparent_temperature,weather_code,wind_speed_10m',
    daily: 'weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max',
    timezone: 'auto',
    forecast_days: '16',
  })
  const weatherResponse = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`, { signal })

  if (!weatherResponse.ok) {
    throw new Error('Nao foi possivel consultar o clima.')
  }

  const weather = await weatherResponse.json()
  const forecastIndex = weather.daily.time.indexOf(targetDate)
  const hasArrivalForecast = forecastIndex >= 0
  const dailyIndex = hasArrivalForecast ? forecastIndex : 0
  const weatherCode = hasArrivalForecast
    ? weather.daily.weather_code[dailyIndex]
    : weather.current.weather_code

  const result = {
    place: [place.name, place.admin1].filter(Boolean).join(', '),
    temperature: hasArrivalForecast
      ? Math.round(weather.daily.temperature_2m_max[dailyIndex])
      : Math.round(weather.current.temperature_2m),
    currentTemperature: Math.round(weather.current.temperature_2m),
    apparentTemperature: Math.round(weather.current.apparent_temperature),
    currentCondition: getWeatherLabel(weather.current.weather_code),
    currentWeatherCode: weather.current.weather_code,
    weatherCode,
    condition: getWeatherLabel(weatherCode),
    windSpeed: Math.round(weather.current.wind_speed_10m),
    maximum: Math.round(weather.daily.temperature_2m_max[dailyIndex]),
    minimum: Math.round(weather.daily.temperature_2m_min[dailyIndex]),
    rainChance: Math.round(weather.daily.precipitation_probability_max[dailyIndex] ?? 0),
    isArrivalForecast: hasArrivalForecast,
    forecastDate: hasArrivalForecast ? targetDate : weather.daily.time[0],
  }

  weatherCache.set(cacheKey, { data: result, savedAt: Date.now() })
  return result
}
