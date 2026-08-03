import test from 'node:test'
import assert from 'node:assert/strict'
import { buildSmartChecklistSuggestions, filterNewChecklistSuggestions } from '../src/utils/checklistSuggestions.js'

test('adiciona itens de praia para Salvador', () => {
  const suggestions = buildSmartChecklistSuggestions({ destination: 'Salvador, BA' })
  assert.ok(suggestions.some((item) => item.title === 'Protetor solar e pós-sol'))
  assert.ok(suggestions.some((item) => item.title === 'Roupas de banho e proteção UV'))
})

test('adiciona casaco para destinos de serra', () => {
  const suggestions = buildSmartChecklistSuggestions({ destination: 'Gramado, RS' })
  assert.ok(suggestions.some((item) => item.title.includes('Casaco')))
})

test('não sugere novamente um item já existente', () => {
  const suggestions = buildSmartChecklistSuggestions({ destination: 'Salvador, BA' })
  const filtered = filterNewChecklistSuggestions([{ title: 'Protetor solar e pós-sol' }], suggestions)
  assert.equal(filtered.some((item) => item.title === 'Protetor solar e pós-sol'), false)
})
