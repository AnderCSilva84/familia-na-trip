function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': status === 200 ? 'public, max-age=86400' : 'no-store' },
  })
}

function validCoordinate(value, minimum, maximum) {
  const number = Number(value)
  return Number.isFinite(number) && number >= minimum && number <= maximum
}

function categoryFromTags(tags = {}) {
  if (tags.tourism === 'museum' || tags.tourism === 'gallery') return 'museu'
  if (tags.tourism === 'viewpoint') return 'mirante'
  if (['park', 'nature_reserve'].includes(tags.leisure)) return 'parque'
  if (tags.natural === 'beach') return 'praia'
  if (tags.amenity === 'place_of_worship') return 'igreja'
  if (tags.amenity === 'marketplace') return 'mercado'
  if (['monument', 'memorial'].includes(tags.historic)) return 'monumento'
  return 'ponto_turistico'
}

function normalizeCommonsFile(value) {
  const file = String(value ?? '').trim().replace(/^file:/i, '')
  return file && !/^category:/i.test(file) ? file : ''
}

async function fetchWikidataImages(attractions) {
  const ids = [...new Set(attractions.map((item) => item.wikidataId).filter((id) => /^Q\d+$/.test(id)))].slice(0, 50)
  if (!ids.length) return new Map()
  try {
    const url = new URL('https://www.wikidata.org/w/api.php')
    url.search = new URLSearchParams({ action: 'wbgetentities', format: 'json', props: 'claims', ids: ids.join('|') })
    const response = await fetch(url, { headers: { 'user-agent': 'FamiliaNaTrip/1.0' } })
    if (!response.ok) return new Map()
    const result = await response.json()
    return new Map(Object.entries(result.entities ?? {}).map(([id, entity]) => [
      id,
      normalizeCommonsFile(entity.claims?.P18?.[0]?.mainsnak?.datavalue?.value),
    ]).filter(([, file]) => file))
  } catch { return new Map() }
}

async function fetchCommonsThumbnails(files) {
  const uniqueFiles = [...new Set(files.filter(Boolean))].slice(0, 50)
  if (!uniqueFiles.length) return new Map()
  try {
    const url = new URL('https://commons.wikimedia.org/w/api.php')
    url.search = new URLSearchParams({
      action: 'query', format: 'json', prop: 'imageinfo', iiprop: 'url', iiurlwidth: '900',
      titles: uniqueFiles.map((file) => `File:${file}`).join('|'),
    })
    const response = await fetch(url, { headers: { 'user-agent': 'FamiliaNaTrip/1.0' } })
    if (!response.ok) return new Map()
    const result = await response.json()
    return new Map(Object.values(result.query?.pages ?? {}).map((page) => [
      normalizeCommonsFile(page.title),
      page.imageinfo?.[0]?.thumburl || page.imageinfo?.[0]?.url || '',
    ]).filter(([, image]) => image))
  } catch { return new Map() }
}

async function enrichImages(attractions) {
  const wikidataImages = await fetchWikidataImages(attractions)
  const files = attractions.map((item) => item.commonsFile || wikidataImages.get(item.wikidataId)).filter(Boolean)
  const thumbnails = await fetchCommonsThumbnails(files)
  return attractions.map(({ commonsFile, wikidataId, ...item }) => ({
    ...item,
    image: item.image || thumbnails.get(commonsFile || wikidataImages.get(wikidataId)) || '',
    imageSource: item.image ? 'openstreetmap' : thumbnails.has(commonsFile || wikidataImages.get(wikidataId)) ? 'wikimedia-commons' : '',
  }))
}

function normalizeElement(element, city, state) {
  const tags = element.tags ?? {}
  const latitude = Number(element.lat ?? element.center?.lat)
  const longitude = Number(element.lon ?? element.center?.lon)
  if (!tags.name || !Number.isFinite(latitude) || !Number.isFinite(longitude)) return null
  const address = [tags['addr:street'], tags['addr:housenumber'], tags['addr:suburb'], tags['addr:city'] || city, tags['addr:state'] || state].filter(Boolean).join(', ')
  return {
    id: `osm-${element.type}-${element.id}`,
    name: tags.name,
    city,
    state,
    category: categoryFromTags(tags),
    description: tags['description:pt'] || tags.description || '',
    address,
    latitude,
    longitude,
    link: tags.website || tags['contact:website'] || `https://www.openstreetmap.org/${element.type}/${element.id}`,
    image: /^https?:\/\//i.test(tags.image || '') ? tags.image : '',
    commonsFile: normalizeCommonsFile(tags.wikimedia_commons),
    wikidataId: tags.wikidata || '',
    source: 'openstreetmap',
  }
}

export default async (request) => {
  if (request.method !== 'POST') return json({ error: 'Metodo nao permitido.' }, 405)
  let body
  try { body = await request.json() } catch { return json({ error: 'Requisicao invalida.' }, 400) }

  const { latitude, longitude, city = '', state = '' } = body
  const radiusKm = Math.min(50, Math.max(3, Number(body.radiusKm) || 20))
  if (!validCoordinate(latitude, -90, 90) || !validCoordinate(longitude, -180, 180)) {
    return json({ error: 'A cidade ainda nao possui coordenadas validas.' }, 400)
  }

  const around = `(around:${Math.round(radiusKm * 1000)},${Number(latitude)},${Number(longitude)})`
  const query = `[out:json][timeout:25];(
    nwr["tourism"~"^(attraction|museum|viewpoint|gallery)$"]${around};
    nwr["historic"~"^(monument|memorial|castle|ruins|archaeological_site)$"]${around};
    nwr["leisure"~"^(park|nature_reserve)$"]${around};
    nwr["natural"="beach"]${around};
    nwr["amenity"~"^(place_of_worship|marketplace)$"]["name"]${around};
  );out center tags;`

  try {
    const endpoints = [
      'https://overpass-api.de/api/interpreter',
      'https://overpass.kumi.systems/api/interpreter',
      'https://overpass.private.coffee/api/interpreter',
    ]
    let result = null
    for (const endpoint of endpoints) {
      try {
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: { 'content-type': 'application/x-www-form-urlencoded; charset=UTF-8', 'user-agent': 'FamiliaNaTrip/1.0' },
          body: new URLSearchParams({ data: query }),
          signal: AbortSignal.timeout(28000),
        })
        if (response.ok) {
          result = await response.json()
          break
        }
      } catch { /* tenta o proximo servidor publico */ }
    }
    if (!result) return json({ error: 'Os servidores de pontos turisticos estao temporariamente indisponiveis. Tente novamente em alguns minutos.' }, 502)
    const normalized = (result.elements ?? []).map((element) => normalizeElement(element, String(city), String(state))).filter(Boolean)
      .filter((item, index, all) => all.findIndex((candidate) => candidate.name.toLocaleLowerCase('pt-BR') === item.name.toLocaleLowerCase('pt-BR')) === index)
      .slice(0, 80)
    const attractions = await enrichImages(normalized)
    return json({ attractions, radiusKm, provider: 'openstreetmap' })
  } catch { return json({ error: 'Nao foi possivel buscar sugestoes agora.' }, 502) }
}

export const config = { path: '/api/tourist-attractions', method: ['POST'] }
