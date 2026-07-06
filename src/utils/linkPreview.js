function normalizeText(value) {
  return String(value ?? '').trim()
}

function isDirectImageUrl(pathname = '') {
  return /\.(png|jpe?g|webp|gif|avif|svg)$/i.test(pathname)
}

function buildProviderTitle(hostname = '') {
  const provider = hostname.replace(/^www\./i, '').split('.').filter(Boolean)[0] ?? ''

  if (!provider) {
    return null
  }

  return provider.charAt(0).toUpperCase() + provider.slice(1)
}

function readFirstParam(searchParams, keys) {
  for (const key of keys) {
    const value = normalizeText(searchParams.get(key))

    if (value) {
      return value
    }
  }

  return ''
}

function extractMapQuery(parsedUrl) {
  const directQuery = readFirstParam(parsedUrl.searchParams, [
    'q',
    'query',
    'destination',
    'dest',
    'where',
    'address',
    'location',
    'local',
    'city',
    'ss',
  ])

  if (directQuery) {
    return directQuery
  }

  const pathname = decodeURIComponent(parsedUrl.pathname || '')
    .replace(/[-_]/g, ' ')
    .split('/')
    .map((part) => normalizeText(part))
    .filter(Boolean)

  const lastPart = pathname.at(-1) ?? ''

  if (lastPart && lastPart.length > 3) {
    return lastPart
  }

  return ''
}

export async function getLinkPreviewData(url) {
  const rawUrl = normalizeText(url)

  if (!rawUrl) {
    return null
  }

  try {
    const parsedUrl = new URL(rawUrl)
    const hostname = normalizeText(parsedUrl.hostname)
    const providerTitle = buildProviderTitle(hostname)
    const mapQuery = extractMapQuery(parsedUrl)
    const image = isDirectImageUrl(parsedUrl.pathname) ? parsedUrl.toString() : null
    const icon = hostname ? `https://www.google.com/s2/favicons?domain=${encodeURIComponent(hostname)}&sz=256` : null

    return {
      url: parsedUrl.toString(),
      title: providerTitle,
      description: hostname ? `Link detectado: ${hostname.replace(/^www\./i, '')}` : null,
      image,
      icon,
      mapQuery: mapQuery || null,
      provider: hostname.replace(/^www\./i, '') || null,
    }
  } catch {
    return {
      url: rawUrl,
      title: null,
      description: null,
      image: null,
      icon: null,
      mapQuery: null,
      provider: null,
    }
  }
}
