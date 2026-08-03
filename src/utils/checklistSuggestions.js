export const baseChecklistSuggestions = [
  { title: 'Conferir documentos de todos', kind: 'task', category: 'documentos', priority: 'alta' },
  { title: 'Baixar reservas para acesso offline', kind: 'task', category: 'checkin', priority: 'alta' },
  { title: 'Separar medicamentos de uso contínuo', kind: 'packing', category: 'saude', priority: 'alta' },
  { title: 'Carregadores e bateria externa', kind: 'packing', category: 'eletronicos', priority: 'normal' },
  { title: 'Kit de higiene pessoal', kind: 'packing', category: 'higiene', priority: 'normal' },
]

export function buildSmartChecklistSuggestions(trip) {
  const destination = String(trip?.destination ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
  const suggestions = [...baseChecklistSuggestions]

  if (/praia|salvador|recife|maceio|fortaleza|natal|aracaju/.test(destination)) {
    suggestions.push(
      { title: 'Protetor solar e pós-sol', kind: 'packing', category: 'saude', priority: 'alta' },
      { title: 'Roupas de banho e proteção UV', kind: 'packing', category: 'pessoal', priority: 'normal' },
    )
  }

  if (/serra|montanha|gramado|canela|campos do jordao/.test(destination)) {
    suggestions.push({ title: 'Casaco para mudanças de temperatura', kind: 'packing', category: 'pessoal', priority: 'alta' })
  }

  return suggestions
}

export function filterNewChecklistSuggestions(items, suggestions) {
  const existing = new Set(items.map((item) => String(item.title).trim().toLocaleLowerCase('pt-BR')))
  return suggestions.filter((item) => !existing.has(item.title.toLocaleLowerCase('pt-BR')))
}
