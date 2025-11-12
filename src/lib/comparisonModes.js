export const comparisonOptions = [
  { value: 'all-operators', label: 'Todas operadoras' },
  { value: 'all-uniodonto', label: 'Todas Uniodontos' },
  { value: 'non-uniodonto', label: 'Todas nao Uniodonto' },
  { value: 'modality-non-uniodonto', label: 'Modalidade nao Uniodonto' },
  { value: 'same-porte', label: 'Todas do mesmo porte' },
  { value: 'same-porte-uniodonto', label: 'Uniodontos do mesmo porte' },
  { value: 'same-porte-non-uniodonto', label: 'Mesmo porte nao Uniodonto' },
]

export const DEFAULT_COMPARISON_MODE = 'all-operators'

const comparisonMap = new Map(comparisonOptions.map((option) => [option.value, option.label]))

export function getComparisonOptionLabel(value) {
  return comparisonMap.get(value) ?? 'Filtros ativos'
}
