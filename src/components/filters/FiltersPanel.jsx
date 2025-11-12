import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { Label } from '../ui/label'
import { Button } from '../ui/button'
import { RefreshCcw } from 'lucide-react'
import { Select, SelectContent, SelectItem, SelectTrigger } from '../ui/select'
import OperatorSearch from './OperatorSearch'
import { cn } from '../../lib/utils'
import { comparisonOptions } from '../../lib/comparisonModes'

function FiltersPanel({
  filters,
  options,
  onChange,
  onReset,
  onOperatorSelect,
  className,
  comparisonMode,
  onComparisonModeChange,
}) {
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
        <div className="space-y-1">
          <Label className="text-xs uppercase text-muted-foreground">Comparar com</Label>
          <Select value={comparisonMode} onValueChange={onComparisonModeChange}>
            <SelectTrigger className="h-9">
              <span className="flex-1 truncate text-left text-sm">
                {comparisonOptions.find((option) => option.value === comparisonMode)?.label ?? 'Selecione'}
              </span>
            </SelectTrigger>
            <SelectContent>
              {comparisonOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardContent>
    </Card>
  )
}

export default FiltersPanel
