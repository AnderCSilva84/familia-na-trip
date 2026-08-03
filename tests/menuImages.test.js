import test from 'node:test'
import assert from 'node:assert/strict'
import { resolveMenuImage } from '../src/utils/menuImages.js'

test('imagem personalizada pelo superadmin tem prioridade', () => {
  const trip = { menuImages: { hotels: 'https://example.com/custom-hotel.jpg' } }
  assert.equal(resolveMenuImage(trip, 'hotels', 'https://example.com/record.jpg'), 'https://example.com/custom-hotel.jpg')
})

test('usa imagem do registro quando não existe personalização', () => {
  assert.equal(resolveMenuImage({}, 'hotels', 'https://example.com/record.jpg'), 'https://example.com/record.jpg')
})

test('usa fallback quando nenhuma imagem foi informada', () => {
  assert.equal(resolveMenuImage({}, 'vehicles'), '/uber.jpg')
})
