import test from 'node:test'
import assert from 'node:assert/strict'
import { compareEventChronology, getDefaultEventImage } from '../src/utils/eventDefaults.js'

test('preserva imagem informada pelo usuário', () => {
  assert.equal(getDefaultEventImage({ image: 'https://example.com/hotel.jpg' }), 'https://example.com/hotel.jpg')
})

test('escolhe imagens padrão conforme o título', () => {
  assert.equal(getDefaultEventImage({ title: 'Chegada no aeroporto' }), '/aeroporto.jpg')
  assert.equal(getDefaultEventImage({ title: 'Jantar em família' }), '/jantar.jpg')
  assert.equal(getDefaultEventImage({ title: 'Passeio em Salvador' }), '/salvador.jpg')
})

test('ordena eventos por data e horário', () => {
  const events = [
    { title: 'Segundo', date: '2026-08-02', startTime: '14:00' },
    { title: 'Primeiro', date: '2026-08-02', startTime: '09:00' },
  ].sort(compareEventChronology)
  assert.equal(events[0].title, 'Primeiro')
})
