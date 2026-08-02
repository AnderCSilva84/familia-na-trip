export async function fetchTouristSuggestions(city, radiusKm = 20) {
  const response = await fetch('/api/tourist-attractions', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ city: city.city, state: city.state, latitude: city.latitude, longitude: city.longitude, radiusKm }),
  })
  const result = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(result.error || 'Nao foi possivel buscar pontos turisticos.')
  return result.attractions ?? []
}
