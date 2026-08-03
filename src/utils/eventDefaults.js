import { normalizeDisplayTime } from './formatters.js'

function normalizeText(value) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
}

function hasAny(text, terms) {
  return terms.some((term) => text.includes(term))
}

export function getDefaultEventImage({ title = '', description = '', location = '', image = '' } = {}) {
  if (String(image ?? '').trim()) {
    return image
  }

  const text = normalizeText(`${title} ${description} ${location}`)

  if (hasAny(text, ['aeroporto'])) {
    return '/aeroporto.jpg'
  }

  if (hasAny(text, ['almoco', 'almoço'])) {
    return '/almoço.jpg'
  }

  if (hasAny(text, ['jantar'])) {
    return '/jantar.jpg'
  }

  if (hasAny(text, ['cafe da manha', 'café da manhã', 'cafe-da-manha', 'cafe da manhã'])) {
    return '/cafe-da-manha.jpg'
  }

  if (hasAny(text, ['uber'])) {
    return '/uber.jpg'
  }

  if (hasAny(text, ['belem', 'belém'])) {
    return '/Belém.jpg'
  }

  if (hasAny(text, ['aracaju'])) {
    return '/aracaju.jpg'
  }

  if (hasAny(text, ['salvador'])) {
    return '/salvador.jpg'
  }

  return '/familia.png'
}

export function compareEventChronology(left, right) {
  const leftKey = `${String(left?.date ?? '')}|${normalizeDisplayTime(left?.startTime ?? '')}|${String(left?.title ?? '')}`
  const rightKey = `${String(right?.date ?? '')}|${normalizeDisplayTime(right?.startTime ?? '')}|${String(right?.title ?? '')}`
  return leftKey.localeCompare(rightKey)
}
