const MODALITY_OPTIONS = [
  { label: 'Odontologia de Grupo', value: 'Odontologia de Grupo' },
  { label: 'Cooperativa odontológica', value: 'Cooperativa odontológica' },
]

const PORTE_OPTIONS = [
  { label: 'Pequeno Porte', value: 'Pequeno Porte' },
  { label: 'Médio Porte', value: 'Médio Porte' },
  { label: 'Grande Porte', value: 'Grande Porte' },
]

const BOOLEAN_OPTIONS = {
  uniodonto: [
    { label: 'Sim', value: true },
    { label: 'Não', value: false },
  ],
  ativa: [
    { label: 'Sim', value: true },
    { label: 'Não', value: false },
  ],
}

export const comparisonFilterOptions = {
  modalidades: MODALITY_OPTIONS,
  portes: PORTE_OPTIONS,
  uniodonto: BOOLEAN_OPTIONS.uniodonto,
  ativa: BOOLEAN_OPTIONS.ativa,
}

export const DEFAULT_COMPARISON_FILTERS = {
  modalidades: MODALITY_OPTIONS.map((option) => option.value),
  portes: PORTE_OPTIONS.map((option) => option.value),
  uniodonto: BOOLEAN_OPTIONS.uniodonto.map((option) => option.value),
  ativa: BOOLEAN_OPTIONS.ativa.map((option) => option.value),
}

function ensureSelection(values, options) {
  if (!Array.isArray(values)) {
    return options.map((option) => option.value)
  }
  const allowedValues = options.map((option) => option.value)
  const sanitized = values.filter((value) => allowedValues.includes(value))
  return sanitized.length ? sanitized : allowedValues
}

function sanitizeBooleanOptions(values, options, { allowEmpty = false } = {}) {
  if (!Array.isArray(values)) {
    return allowEmpty ? [] : options.map((option) => option.value)
  }
  const allowedValues = options.map((option) => option.value)
  const sanitized = values.filter((value) => allowedValues.includes(value))
  if (!sanitized.length && !allowEmpty) {
    return options.map((option) => option.value)
  }
  return sanitized
}

export function sanitizeComparisonFilters(filters = {}) {
  const sanitized = {
    modalidades: ensureSelection(filters.modalidades, MODALITY_OPTIONS),
    portes: ensureSelection(filters.portes, PORTE_OPTIONS),
    uniodonto: sanitizeBooleanOptions(filters.uniodonto, BOOLEAN_OPTIONS.uniodonto, { allowEmpty: true }),
    ativa: ensureSelection(filters.ativa, BOOLEAN_OPTIONS.ativa),
  }
  const hasGroup = sanitized.modalidades.includes('Odontologia de Grupo')
  const hasCoop = sanitized.modalidades.includes('Cooperativa odontológica')
  if (hasGroup) {
    sanitized.uniodonto = BOOLEAN_OPTIONS.uniodonto.map((option) => option.value)
  } else if (!hasCoop) {
    sanitized.uniodonto = []
  }
  return sanitized
}

function isFullSelection(key, values) {
  const total = comparisonFilterOptions[key]?.length ?? 0
  return (values?.length ?? 0) === total
}

function formatOptionLabel(key, value) {
  const option = comparisonFilterOptions[key]?.find((item) => item.value === value)
  return option?.label ?? String(value)
}

export function describeComparisonFilters(filters = {}) {
  const sanitized = sanitizeComparisonFilters(filters)
  const allSelected =
    isFullSelection('modalidades', sanitized.modalidades) &&
    isFullSelection('portes', sanitized.portes) &&
    isFullSelection('uniodonto', sanitized.uniodonto) &&
    isFullSelection('ativa', sanitized.ativa)

  if (allSelected) {
    return 'Todas operadoras'
  }

  const segments = []
  if (!isFullSelection('modalidades', sanitized.modalidades)) {
    segments.push(`Modalidade: ${sanitized.modalidades.map((value) => formatOptionLabel('modalidades', value)).join(', ')}`)
  }
  if (!isFullSelection('portes', sanitized.portes)) {
    segments.push(`Porte: ${sanitized.portes.map((value) => formatOptionLabel('portes', value)).join(', ')}`)
  }
  if (!isFullSelection('uniodonto', sanitized.uniodonto)) {
    segments.push(
      `Uniodonto: ${sanitized.uniodonto.map((value) => formatOptionLabel('uniodonto', value)).join(', ')}`,
    )
  }
  if (!isFullSelection('ativa', sanitized.ativa)) {
    segments.push(`Ativa: ${sanitized.ativa.map((value) => formatOptionLabel('ativa', value)).join(', ')}`)
  }

  return segments.join(' • ') || 'Filtros selecionados'
}

export function comparisonFiltersToQuery(filters = {}) {
  const sanitized = sanitizeComparisonFilters(filters)
  const result = {}
  if (sanitized.modalidades.length && !isFullSelection('modalidades', sanitized.modalidades)) {
    result.modalidades = sanitized.modalidades
  }
  if (sanitized.portes.length && !isFullSelection('portes', sanitized.portes)) {
    result.portes = sanitized.portes
  }
  if (sanitized.uniodonto.length === 1) {
    result.uniodonto = sanitized.uniodonto[0]
  }
  if (sanitized.ativa.length === 1) {
    result.ativa = sanitized.ativa[0]
  }
  return result
}
