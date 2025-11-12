import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { Label } from '../ui/label'
import { Button } from '../ui/button'
import { RefreshCcw } from 'lucide-react'
import OperatorSearch from './OperatorSearch'
import { cn } from '../../lib/utils'
import { Checkbox } from '../ui/checkbox'
import { comparisonFilterOptions, DEFAULT_COMPARISON_FILTERS, sanitizeComparisonFilters } from '../../lib/comparisonModes'

function ComparisonFilterGroup({ title, options, values = [], onToggle }) {
  return (
    <div className="space-y-2 rounded-lg border border-border/70 p-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</p>
      <div className="space-y-2">
        {options.map((option) => {
          const checked = values.includes(option.value)
          return (
            <label key={option.value} className="flex items-center gap-2 text-sm font-medium">
              <Checkbox
                checked={checked}
                onCheckedChange={(nextChecked) => onToggle(option.value, Boolean(nextChecked))}
                className="h-4 w-4"
              />
              <span className="truncate">{option.label}</span>
            </label>
          )
        })}
      </div>
    </div>
  )
}

function cloneDefaultComparisonFilters() {
  const sanitized = sanitizeComparisonFilters(DEFAULT_COMPARISON_FILTERS)
  return {
    modalidades: [...sanitized.modalidades],
    portes: [...sanitized.portes],
    uniodonto: [...sanitized.uniodonto],
    ativa: [...sanitized.ativa],
  }
}

function FiltersPanel({
  filters,
  options,
  onChange,
  onReset,
  onOperatorSelect,
  className,
  comparisonFilters,
  onComparisonFiltersChange,
}) {
  const safeComparisonFilters = sanitizeComparisonFilters(comparisonFilters)

  const handleComparisonToggle = (key, value, shouldEnable) => {
    const currentValues = safeComparisonFilters[key] ?? []
    const exists = currentValues.includes(value)
    if (shouldEnable && !exists) {
      onComparisonFiltersChange({
        ...safeComparisonFilters,
        [key]: [...currentValues, value],
      })
      return
    }
    if (!shouldEnable && exists) {
      if (currentValues.length === 1) {
        return
      }
      onComparisonFiltersChange({
        ...safeComparisonFilters,
        [key]: currentValues.filter((item) => item !== value),
      })
    }
  }

  const handleResetComparison = () => {
    onComparisonFiltersChange(cloneDefaultComparisonFilters())
  }

  return (
    <Card className={cn('lg:sticky lg:top-6 lg:max-h-[calc(100vh-3rem)] lg:overflow-y-auto', className)}>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Filtros</CardTitle>
          <Button size="icon" variant="ghost" onClick={onReset} title="Limpar filtros">
            <RefreshCcw className="h-4 w-4" />
          </Button>
        </div>
        <p className="text-sm text-muted-foreground">Combine recortes para avaliar o desempenho regulatório.</p>
      </CardHeader>
      <CardContent className="space-y-4">
        <OperatorSearch
          label="Buscar operadora"
          value={filters.search}
          onChange={(value) => {
            onChange({ search: value })
            if (!value) {
              onOperatorSelect(null)
            }
          }}
          onSelect={onOperatorSelect}
          options={options.operadoras}
        />
        <p className="text-xs text-muted-foreground">
          Selecione uma operadora para carregar automaticamente o último período disponível. Modalidade, porte, situação cadastral e
          Uniodonto agora fazem parte das opções de comparação.
        </p>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-xs uppercase text-muted-foreground">Comparar com</Label>
            <Button size="sm" variant="outline" className="h-8" onClick={handleResetComparison}>
              Todas operadoras
            </Button>
          </div>
          <div className="space-y-3">
            <ComparisonFilterGroup
              title="Modalidade"
              options={comparisonFilterOptions.modalidades}
              values={safeComparisonFilters.modalidades}
              onToggle={(value, checked) => handleComparisonToggle('modalidades', value, checked)}
            />
            <ComparisonFilterGroup
              title="Porte"
              options={comparisonFilterOptions.portes}
              values={safeComparisonFilters.portes}
              onToggle={(value, checked) => handleComparisonToggle('portes', value, checked)}
            />
            <ComparisonFilterGroup
              title="Uniodonto"
              options={comparisonFilterOptions.uniodonto}
              values={safeComparisonFilters.uniodonto}
              onToggle={(value, checked) => handleComparisonToggle('uniodonto', value, checked)}
            />
            <ComparisonFilterGroup
              title="Ativa"
              options={comparisonFilterOptions.ativa}
              values={safeComparisonFilters.ativa}
              onToggle={(value, checked) => handleComparisonToggle('ativa', value, checked)}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default FiltersPanel
