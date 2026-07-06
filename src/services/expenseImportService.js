import { getDefaultEventImage } from '../utils/eventDefaults'
import { resolveMapMetadata } from '../utils/locationPresets'

const categoryOptions = new Set([
  'Hospedagem',
  'Transporte',
  'Alimentacao',
  'Passeios',
  'Compras',
  'Emergencia',
  'Outros',
])
const DEFAULT_IMPORT_YEAR = 2026
const OFFICIAL_IMPORT_SHEET = 'Praia do Forte'

function normalizeHeader(value) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase()
}

function buildNormalizedRow(row) {
  return Object.fromEntries(
    Object.entries(row).map(([key, value]) => [normalizeHeader(key), value]),
  )
}

function getFirstValue(row, aliases) {
  const normalizedRow = buildNormalizedRow(row)

  for (const alias of aliases) {
    if (normalizedRow[alias] !== undefined && normalizedRow[alias] !== '') {
      return normalizedRow[alias]
    }
  }

  return ''
}

function normalizeDate(value) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    const excelEpoch = Date.UTC(1899, 11, 30)
    const parsedFromSerial = new Date(excelEpoch + Math.round(value) * 86400000)
    return parsedFromSerial.toISOString().slice(0, 10)
  }

  const textValue = String(value ?? '').trim()

  if (!textValue) {
    return new Date().toISOString().slice(0, 10)
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(textValue)) {
    return textValue
  }

  if (/^\d{2}\/\d{2}\/\d{4}$/.test(textValue)) {
    const [day, month, year] = textValue.split('/')
    return `${year}-${month}-${day}`
  }

  if (/^\d{2}\/\d{2}\/\d{2}$/.test(textValue)) {
    const [day, month, shortYear] = textValue.split('/')
    const year = Number(shortYear) > 50 ? `19${shortYear}` : `20${shortYear}`
    return `${year}-${month}-${day}`
  }

  if (/^\d{1,2}\/[a-z]{3}$/i.test(textValue)) {
    const [day, monthLabel] = textValue.split('/')
    const months = {
      jan: '01',
      fev: '02',
      mar: '03',
      abr: '04',
      mai: '05',
      jun: '06',
      jul: '07',
      ago: '08',
      set: '09',
      oct: '10',
      out: '10',
      nov: '11',
      dez: '12',
    }
    const month = months[monthLabel.toLowerCase()] ?? '01'
    const year = DEFAULT_IMPORT_YEAR
    return `${year}-${month}-${String(day).padStart(2, '0')}`
  }

  if (/^\d{1,2}[-/][a-z]{3}[-/]\d{2}$/i.test(textValue)) {
    const [day, monthLabel, shortYear] = textValue.split(/[-/]/)
    const months = {
      jan: '01',
      fev: '02',
      mar: '03',
      abr: '04',
      mai: '05',
      jun: '06',
      jul: '07',
      ago: '08',
      set: '09',
      oct: '10',
      out: '10',
      nov: '11',
      dez: '12',
    }
    const month = months[monthLabel.toLowerCase()] ?? '01'
    const year = Number(shortYear) > 50 ? `19${shortYear}` : `20${shortYear}`
    return `${year}-${month}-${String(day).padStart(2, '0')}`
  }

  const parsedDate = new Date(textValue)

  if (!Number.isNaN(parsedDate.getTime())) {
    const parsedYear = parsedDate.getUTCFullYear()

    if (parsedYear < 2010) {
      const fallback = new Date(Date.UTC(DEFAULT_IMPORT_YEAR, parsedDate.getUTCMonth(), parsedDate.getUTCDate()))
      return fallback.toISOString().slice(0, 10)
    }

    return parsedDate.toISOString().slice(0, 10)
  }

  return `${DEFAULT_IMPORT_YEAR}-01-01`
}

function normalizeTime(value) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    if (value >= 0 && value < 1) {
      const totalMinutes = Math.round(value * 24 * 60)
      const hours = Math.floor(totalMinutes / 60) % 24
      const minutes = totalMinutes % 60
      return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:00`
    }

    if (value >= 0 && value <= 24 && Number.isInteger(value)) {
      return `${String(value).padStart(2, '0')}:00:00`
    }

    if (value > 24) {
      const hours = Math.floor(value)
      const minutes = Math.round((value - hours) * 60)

      if (hours >= 0 && hours < 24 && minutes >= 0 && minutes < 60) {
        return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:00`
      }
    }

    const totalMinutes = Math.round((value % 1) * 24 * 60)
    const hours = Math.floor(totalMinutes / 60) % 24
    const minutes = totalMinutes % 60
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:00`
  }

  const textValue = String(value ?? '').trim()

  if (!textValue) {
    return ''
  }

  if (/^\d{1,2}:\d{2}$/.test(textValue)) {
    const [hours, minutes] = textValue.split(':')
    return `${String(hours).padStart(2, '0')}:${minutes}`
  }

  if (/^\d{1,2}:\d{2}:\d{2}$/.test(textValue)) {
    const [hours, minutes, seconds] = textValue.split(':')
    return `${String(hours).padStart(2, '0')}:${minutes}:${seconds}`
  }

  if (/^\d+(?:[.,]\d+)?$/.test(textValue)) {
    const numericValue = Number(textValue.replace(',', '.'))

    if (numericValue >= 0 && numericValue <= 24) {
      if (Number.isInteger(numericValue)) {
        return `${String(numericValue).padStart(2, '0')}:00`
      }

      const hours = Math.floor(numericValue)
      const minutes = Math.round((numericValue - hours) * 60)
      return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
    }

    if (numericValue > 24) {
      const hours = Math.floor(numericValue)
      const minutes = Math.round((numericValue - hours) * 60)

      if (hours >= 0 && hours < 24 && minutes >= 0 && minutes < 60) {
        return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:00`
      }
    }

    return normalizeTime(numericValue)
  }

  const meridiemMatch = textValue.match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)$/i)

  if (meridiemMatch) {
    const meridiem = meridiemMatch[3].toLowerCase()
    let hours = Number(meridiemMatch[1])
    const minutes = meridiemMatch[2] ?? '00'

    if (meridiem === 'am') {
      hours = hours === 12 ? 0 : hours
    } else if (hours < 12) {
      hours += 12
    }

    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:00`
  }

  const hourOnlyMatch = textValue.match(/^(\d{1,2})\s*h$/i)

  if (hourOnlyMatch) {
    return `${String(hourOnlyMatch[1]).padStart(2, '0')}:00:00`
  }

  const match = textValue.match(/(\d{1,2}):(\d{2})(?::(\d{2}))?/)

  if (match) {
    if (match[3]) {
      return `${String(match[1]).padStart(2, '0')}:${match[2]}:${match[3]}`
    }

    return `${String(match[1]).padStart(2, '0')}:${match[2]}`
  }

  const parsed = new Date(`1970-01-01T${textValue}`)
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toISOString().slice(11, 16)
  }

  return ''
}

function normalizeValue(value) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    if (Number.isInteger(value)) {
      return value / 100
    }

    return value
  }

  const textValue = String(value ?? '').trim()

  if (!textValue) {
    return 0
  }

  const digitsOnly = textValue.replace(/\s/g, '')

  if (/^\d+$/.test(digitsOnly)) {
    const parsedInteger = Number(digitsOnly)

    if (Number.isFinite(parsedInteger)) {
      return parsedInteger / 100
    }
  }

  const normalized = textValue
    .replace(/[R$\s]/g, '')
    .replace(/\./g, '')
    .replace(',', '.')

  const parsed = Number(normalized)
  return Number.isFinite(parsed) ? parsed : 0
}

function normalizeCategory(value, description = '', location = '') {
  const textValue = String(value ?? '').trim()

  if (categoryOptions.has(textValue)) {
    return textValue
  }

  const normalizedType = normalizeHeader(textValue)

  if (normalizedType.includes('transporte')) return 'Transporte'
  if (normalizedType.includes('aliment')) return 'Alimentacao'
  if (normalizedType.includes('hosped')) return 'Hospedagem'
  if (normalizedType.includes('lazer') || normalizedType.includes('passeio')) return 'Passeios'
  if (normalizedType.includes('compra')) return 'Compras'

  const combined = normalizeHeader(`${description} ${location}`)

  if (combined.includes('hotel') || combined.includes('hosped')) return 'Hospedagem'
  if (combined.includes('aeroporto') || combined.includes('carro') || combined.includes('uber') || combined.includes('saida')) return 'Transporte'
  if (combined.includes('almoco') || combined.includes('jantar') || combined.includes('cafe') || combined.includes('lanche')) return 'Alimentacao'
  if (combined.includes('praia') || combined.includes('passeio') || combined.includes('orla') || combined.includes('city') || combined.includes('museu')) return 'Passeios'
  if (combined.includes('compra') || combined.includes('mercado') || combined.includes('supermercado') || combined.includes('shopping')) return 'Compras'

  return 'Outros'
}

function normalizeTipCategory(value) {
  const normalized = normalizeHeader(value)

  if (normalized.includes('comida') || normalized.includes('restaurante')) return 'Restaurante'
  if (normalized.includes('praia') || normalized.includes('passeio') || normalized.includes('lazer')) return 'Passeio'
  if (normalized.includes('crianca')) return 'Criancas'
  if (normalized.includes('compra')) return 'Compras'
  if (normalized.includes('transporte')) return 'Transporte'
  if (normalized.includes('seguran')) return 'Seguranca'
  if (normalized.includes('econom')) return 'Economia'

  return 'Outros'
}

function buildLocation(city, location) {
  return [city, location].filter(Boolean).join(' - ')
}

function inferImportedImage(row, city, place, description) {
  const explicitImage = String(
    getFirstValue(row, ['imagem', 'image', 'foto', 'cover', 'capa', 'link imagem', 'image url']),
  ).trim()

  return getDefaultEventImage({
    title: description,
    description,
    location: buildLocation(city, place),
    image: explicitImage,
  })
}

function inferDestinationFromSheetName(sheetName) {
  return String(sheetName ?? '')
    .replace(/^dicas\s+/i, '')
    .replace(/\(\d+\)/g, '')
    .trim()
}

function isTipSheet(sheetName, rows) {
  const normalizedName = normalizeHeader(sheetName)

  if (normalizedName.includes('dica')) {
    return true
  }

  const firstRow = rows[0] ? buildNormalizedRow(rows[0]) : {}
  return Boolean(firstRow.tipo || firstRow['melhor dia'] || firstRow['vale a pena'])
}

function parseTripSheet(rows, sheetName) {
  const agendaItems = rows
    .map((row, index) => {
      const date = normalizeDate(getFirstValue(row, ['data', 'date']))
      const city = String(getFirstValue(row, ['cidade', 'city'])).trim()
      const place = String(getFirstValue(row, ['local', 'place', 'location'])).trim()
      const description = String(getFirstValue(row, ['descricao', 'description', 'evento'])).trim()
      const startTime = normalizeTime(getFirstValue(row, ['hora', 'time']))
      const address = String(getFirstValue(row, ['endereco', 'endereço', 'address'])).trim()
      const postalCode = String(getFirstValue(row, ['cep', 'postal code', 'zipcode', 'zip code'])).trim()
      const estimatedCost = normalizeValue(getFirstValue(row, ['custo', 'custo estimado', 'valor', 'amount']))
      const actualCost = normalizeValue(getFirstValue(row, ['pago', 'paid']))
      const resolvedLocation = buildLocation(city, place)
      const mapMetadata = resolveMapMetadata({
        title: place || description || city || 'Evento importado',
        description,
        location: resolvedLocation,
        address,
        postalCode,
        city,
      })

      if (!description && !place && !city) {
        return null
      }

      return {
        importKey: `${sheetName}-${index + 2}-agenda`,
        rowNumber: index + 2,
        sheetName,
        title: place || description || city || 'Evento importado',
        description,
        date,
        startTime,
        endTime: '',
        location: resolvedLocation,
        image: inferImportedImage(row, city, place, description),
        mapX: mapMetadata.mapX,
        mapY: mapMetadata.mapY,
        mapQuery: mapMetadata.mapQuery,
        city,
        local: place,
        address,
        postalCode,
        weekday: String(getFirstValue(row, ['dia da semana', 'dia semana', 'weekday'])).trim(),
        estimatedCost,
        actualCost,
        expenseCategory: normalizeCategory(
          getFirstValue(row, ['categoria', 'category', 'tipo']),
          description || place,
          place,
        ),
        type: 'evento',
      }
    })
    .filter(Boolean)

  const expenses = rows
    .flatMap((row, index) => {
      const date = normalizeDate(getFirstValue(row, ['data', 'date']))
      const city = String(getFirstValue(row, ['cidade', 'city'])).trim()
      const place = String(getFirstValue(row, ['local', 'place', 'location'])).trim()
      const description = String(getFirstValue(row, ['descricao', 'description', 'evento'])).trim()
      const estimatedValue = normalizeValue(getFirstValue(row, ['custo', 'custo estimado', 'valor', 'amount']))
      const paidValue = normalizeValue(getFirstValue(row, ['pago', 'paid']))

      if (!estimatedValue && !paidValue) {
        return []
      }

      const resolvedDescription = description || place || city || 'Custo importado'
      const category = normalizeCategory(
        getFirstValue(row, ['categoria', 'category', 'tipo']),
        resolvedDescription,
        place,
      )

      const result = []

      if (estimatedValue) {
        result.push({
          importKey: `${sheetName}-${index + 2}-estimated`,
          rowNumber: index + 2,
          sheetName,
          description: resolvedDescription,
          category,
          type: 'estimado',
          value: estimatedValue,
          paidBy: '',
          dividedBetween: [],
          date,
        })
      }

      if (paidValue) {
        result.push({
          importKey: `${sheetName}-${index + 2}-paid`,
          rowNumber: index + 2,
          sheetName,
          description: `${resolvedDescription} (pago)`,
          category,
          type: 'efetivado',
          value: paidValue,
          paidBy: '',
          dividedBetween: [],
          date,
        })
      }

      return result
    })
    .filter(Boolean)

  return { agendaItems, expenses }
}

function parseTipSheet(rows, sheetName) {
  const inferredDestination = inferDestinationFromSheetName(sheetName)

  return rows
    .map((row, index) => {
      const title = String(getFirstValue(row, ['local', 'location', 'lugar', 'nome'])).trim()
      const rawType = String(getFirstValue(row, ['tipo', 'category'])).trim()
      const bestDay = String(getFirstValue(row, ['melhor dia', 'best day'])).trim()
      const description = String(getFirstValue(row, ['descricao', 'description'])).trim()
      const worthIt = String(getFirstValue(row, ['vale a pena', 'valeapena'])).trim()
      const extra = [description, bestDay ? `Melhor dia: ${bestDay}` : '', worthIt ? `Vale a pena: ${worthIt}` : '']
        .filter(Boolean)
        .join(' • ')

      if (!title) {
        return null
      }

      return {
        importKey: `${sheetName}-${index + 2}-tip`,
        rowNumber: index + 2,
        sheetName,
        title,
        description: extra || 'Dica importada da planilha oficial.',
        category: normalizeTipCategory(rawType),
        location: inferredDestination,
        link: '',
      }
    })
    .filter(Boolean)
}

export async function parseExpenseSpreadsheet(file) {
  const XLSX = await import('xlsx')
  const fileBuffer = await file.arrayBuffer()
  const workbook = XLSX.read(fileBuffer, { type: 'array', cellDates: false, raw: false })

  if (!workbook.SheetNames.length) {
    throw new Error('Nao foi encontrada nenhuma aba na planilha.')
  }

  const selectedSheetNames = workbook.SheetNames.filter(
    (sheetName) => normalizeHeader(sheetName) === normalizeHeader(OFFICIAL_IMPORT_SHEET),
  )

  if (!selectedSheetNames.length) {
    throw new Error(`A planilha precisa ter a aba "${OFFICIAL_IMPORT_SHEET}" para importar.`)
  }

  const parsedSheets = selectedSheetNames.map((sheetName) => {
    const worksheet = workbook.Sheets[sheetName]
    const rows = XLSX.utils.sheet_to_json(worksheet, { defval: '', raw: false })

    return {
      sheetName,
      rows,
      isTipSheet: isTipSheet(sheetName, rows),
    }
  })

  const agendaItems = []
  const expenses = []
  const tips = []

  parsedSheets.forEach(({ sheetName, rows, isTipSheet: tipSheet }) => {
    if (!rows.length) {
      return
    }

    if (tipSheet) {
      tips.push(...parseTipSheet(rows, sheetName))
      return
    }

    const parsedTripSheet = parseTripSheet(rows, sheetName)
    agendaItems.push(...parsedTripSheet.agendaItems)
    expenses.push(...parsedTripSheet.expenses)
  })

  if (agendaItems.length === 0 && expenses.length === 0 && tips.length === 0) {
    throw new Error('A planilha nao possui linhas validas para importar.')
  }

  return {
    sheetName: parsedSheets[0]?.sheetName ?? '',
    sheetNames: parsedSheets.map((sheet) => sheet.sheetName),
    totalRows: parsedSheets.reduce((accumulator, sheet) => accumulator + sheet.rows.length, 0),
    agendaItems,
    expenses,
    tips,
  }
}
