function normalizeDateValue(value) {
  if (!value) {
    return null
  }

  if (typeof value?.toDate === 'function') {
    return value.toDate()
  }

  if (value instanceof Date) {
    return value
  }

  if (typeof value === 'string') {
    const parsed = value.includes('T') ? new Date(value) : new Date(`${value}T12:00:00`)
    return Number.isNaN(parsed.getTime()) ? null : parsed
  }

  return null
}

export function formatCurrency(value) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(Number(value ?? 0))
}

export function formatDisplayDate(value) {
  const date = normalizeDateValue(value)

  if (!date) {
    return '--'
  }

  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date)
}

export function formatDisplayDateShort(value) {
  const date = normalizeDateValue(value)

  if (!date) {
    return '--'
  }

  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
  }).format(date)
}

export function formatDayNumber(value) {
  const date = normalizeDateValue(value)
  return date ? String(date.getDate()).padStart(2, '0') : '--'
}

export function formatWeekdayShort(value) {
  const date = normalizeDateValue(value)

  if (!date) {
    return '--'
  }

  return new Intl.DateTimeFormat('pt-BR', {
    weekday: 'short',
  })
    .format(date)
    .replace('.', '')
    .toUpperCase()
}

export function formatDateInput(value) {
  const date = normalizeDateValue(value)

  if (!date) {
    return ''
  }

  return date.toISOString().slice(0, 10)
}

export function formatTimeWithPeriod(value) {
  const text = String(value ?? '').trim()

  if (!text) {
    return '--'
  }

  const match = text.match(/^(\d{1,2}):(\d{2})$/)

  if (!match) {
    return text
  }

  const hours = Number(match[1])
  const minutes = match[2]

  if (!Number.isFinite(hours)) {
    return text
  }

  return `${String(hours).padStart(2, '0')}:${minutes} ${hours < 12 ? 'AM' : 'PM'}`
}

export function normalizeDisplayTime(value, { includeSeconds = true } = {}) {
  const text = String(value ?? '').trim()

  if (!text) {
    return ''
  }

  const fullMatch = text.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/)

  if (fullMatch) {
    const hours = String(Number(fullMatch[1]) || 0).padStart(2, '0')
    const minutes = fullMatch[2]
    const seconds = fullMatch[3] ?? '00'

    return includeSeconds ? `${hours}:${minutes}:${seconds}` : `${hours}:${minutes}`
  }

  const meridiemMatch = text.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(am|pm)$/i)

  if (meridiemMatch) {
    let hours = Number(meridiemMatch[1])
    const minutes = meridiemMatch[2]
    const seconds = meridiemMatch[3] ?? '00'
    const meridiem = meridiemMatch[4].toLowerCase()

    if (meridiem === 'am') {
      hours = hours === 12 ? 0 : hours
    } else if (hours < 12) {
      hours += 12
    }

    const normalizedHours = String(hours).padStart(2, '0')
    return includeSeconds
      ? `${normalizedHours}:${minutes}:${seconds}`
      : `${normalizedHours}:${minutes}`
  }

  return text
}

export function buildMonthGrid(selectedDate) {
  const selected = normalizeDateValue(selectedDate) ?? new Date()
  const year = selected.getFullYear()
  const month = selected.getMonth()
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0).getDate()
  const leadingEmptyDays = firstDay.getDay()
  const cells = []

  for (let index = 0; index < leadingEmptyDays; index += 1) {
    cells.push(null)
  }

  for (let day = 1; day <= lastDay; day += 1) {
    cells.push({
      day,
      formatted: `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
    })
  }

  return cells
}
