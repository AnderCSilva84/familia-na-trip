function normalizeText(value) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase()
}

const locationPresets = [
  {
    includes: ['belem', 'saida de casa'],
    mapX: '18',
    mapY: '14',
    mapQuery: 'Belem, PA',
  },
  {
    includes: ['belem', 'aeroporto'],
    mapX: '22',
    mapY: '18',
    mapQuery: 'Aeroporto Internacional de Belem, PA',
  },
  {
    includes: ['brasilia', 'aeroporto'],
    mapX: '36',
    mapY: '24',
    mapQuery: 'Aeroporto Internacional de Brasilia, DF',
  },
  {
    includes: ['salvador', 'aeroporto'],
    mapX: '59',
    mapY: '40',
    mapQuery: 'Aeroporto Internacional de Salvador, BA',
  },
  {
    includes: ['salvador', 'hotel'],
    mapX: '56',
    mapY: '50',
    mapQuery: 'Hotel em Salvador, BA',
  },
  {
    includes: ['salvador', 'praia de itapua'],
    mapX: '64',
    mapY: '47',
    mapQuery: 'Praia de Itapua, Salvador, BA',
  },
  {
    includes: ['salvador', 'largo de santana'],
    mapX: '48',
    mapY: '46',
    mapQuery: 'Largo de Santana, Rio Vermelho, Salvador, BA',
  },
  {
    includes: ['salvador', 'ribeira'],
    mapX: '45',
    mapY: '52',
    mapQuery: 'Ribeira, Salvador, BA',
  },
  {
    includes: ['salvador', 'supermercado'],
    mapX: '54',
    mapY: '54',
    mapQuery: 'Supermercado em Salvador, BA',
  },
  {
    includes: ['salvador', 'almoco'],
    mapX: '53',
    mapY: '48',
    mapQuery: 'Restaurante em Salvador, BA',
  },
  {
    includes: ['salvador', 'jantar'],
    mapX: '51',
    mapY: '45',
    mapQuery: 'Restaurante em Salvador, BA',
  },
  {
    includes: ['aracaju', 'hospedagem'],
    mapX: '73',
    mapY: '60',
    mapQuery: 'Hospedagem em Aracaju, SE',
  },
  {
    includes: ['aracaju', 'orla'],
    mapX: '76',
    mapY: '62',
    mapQuery: 'Orla de Atalaia, Aracaju, SE',
  },
  {
    includes: ['aracaju', 'jantar'],
    mapX: '73',
    mapY: '58',
    mapQuery: 'Restaurante em Aracaju, SE',
  },
]

export function resolveMapMetadata(item = {}) {
  const address = [item.address, item.neighborhood, item.city, item.postalCode].filter(Boolean).join(', ')
  const location = normalizeText(item.location || address || '')
  const title = normalizeText(item.title || item.hotelName || item.vehicleModel || '')
  const description = normalizeText(item.description || '')
  const combined = `${location} ${title} ${description}`.trim()

  const preset = locationPresets.find((candidate) => candidate.includes.every((token) => combined.includes(token)))

  if (preset) {
    return {
      mapX: item.mapX ?? preset.mapX,
      mapY: item.mapY ?? preset.mapY,
      mapQuery: item.mapQuery || preset.mapQuery,
    }
  }

  return {
    mapX: item.mapX ?? '',
    mapY: item.mapY ?? '',
    mapQuery: item.mapQuery || address || item.location || item.address || item.title || '',
  }
}
