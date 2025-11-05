import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import MultiSelect from './MultiSelect'
import { Label } from '../ui/label'
import { Input } from '../ui/input'
import { Button } from '../ui/button'
import { RefreshCcw } from 'lucide-react'
import { Select, SelectContent, SelectItem, SelectTrigger } from '../ui/select'
import OperatorSearch from './OperatorSearch'

function NumberRange({ label, value, onChange, minPlaceholder, maxPlaceholder }) {
  const handleMin = (event) => {
    const raw = event.target.value
    const numeric = Number(raw)
    onChange({ ...value, min: raw === '' || Number.isNaN(numeric) ? undefined : numeric })
  }

  const handleMax = (event) => {
    const raw = event.target.value
    const numeric = Number(raw)
    onChange({ ...value, max: raw === '' || Number.isNaN(numeric) ? undefined : numeric })
  }

  return (
    <div className="space-y-1">
      <Label className="text-xs uppercase text-muted-foreground">{label}</Label>
      <div className="flex items-center gap-2">
        <Input type="number" placeholder={minPlaceholder} value={value?.min ?? ''} onChange={handleMin} className="h-9" />
        <span className="text-sm text-muted-foreground">até</span>
        <Input type="number" placeholder={maxPlaceholder} value={value?.max ?? ''} onChange={handleMax} className="h-9" />
      </div>
    </div>
  )
}

function FiltersPanel({ filters, options, onChange, onReset }) {
  const situacaoValue = filters.ativa === null ? 'all' : filters.ativa ? 'true' : 'false'
  const situacaoLabel =
    situacaoValue === 'true' ? 'Apenas ativas' : situacaoValue === 'false' ? 'Apenas inativas' : 'Todas'

  const uniodontoValue = filters.uniodonto === null ? 'all' : filters.uniodonto ? 'true' : 'false'
  const uniodontoLabel =
    uniodontoValue === 'true' ? 'Somente Uniodonto' : uniodontoValue === 'false' ? 'Demais operadoras' : 'Todas'

  return (
    <Card className="sticky top-6">
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
        <MultiSelect
          label="Modalidade"
          options={options.modalidades}
          values={filters.modalidades}
          onChange={(values) => onChange({ modalidades: values })}
        />
        <MultiSelect label="Porte" options={options.portes} values={filters.portes} onChange={(values) => onChange({ portes: values })} />
        <MultiSelect label="Ano" options={options.anos} values={filters.anos} onChange={(values) => onChange({ anos: values })} />
        <MultiSelect
          label="Trimestre"
          options={options.trimestres}
          values={filters.trimestres}
          onChange={(values) => onChange({ trimestres: values })}
        />
        <MultiSelect
          label="Registro ANS"
          options={options.regAns}
          values={filters.regAns}
          onChange={(values) => onChange({ regAns: values })}
        />

        <div className="space-y-1">
          <Label className="text-xs uppercase text-muted-foreground">Situação cadastral</Label>
          <Select
            value={situacaoValue}
            onValueChange={(value) => {
              if (value === 'all') onChange({ ativa: null })
              else if (value === 'true') onChange({ ativa: true })
              else onChange({ ativa: false })
            }}
          >
            <SelectTrigger className="h-9">
              <span className="flex-1 truncate text-left text-sm">{situacaoLabel}</span>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              <SelectItem value="true">Apenas ativas</SelectItem>
              <SelectItem value="false">Apenas inativas</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs uppercase text-muted-foreground">Operadoras Uniodonto</Label>
          <Select
            value={uniodontoValue}
            onValueChange={(value) => {
              if (value === 'all') onChange({ uniodonto: null })
              else if (value === 'true') onChange({ uniodonto: true })
              else onChange({ uniodonto: false })
            }}
          >
            <SelectTrigger className="h-9">
              <span className="flex-1 truncate text-left text-sm">{uniodontoLabel}</span>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              <SelectItem value="true">Somente Uniodonto</SelectItem>
              <SelectItem value="false">Demais operadoras</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <OperatorSearch
          label="Buscar operadora"
          value={filters.search}
          onChange={(value) => onChange({ search: value })}
          options={options.operadoras}
        />

        <NumberRange
          label="Sinistralidade (%)"
          value={filters.sinistralidade}
          onChange={(value) => onChange({ sinistralidade: value })}
          minPlaceholder="0"
          maxPlaceholder="150"
        />
        <NumberRange
          label="Margem Líquida (%)"
          value={filters.margem}
          onChange={(value) => onChange({ margem: value })}
          minPlaceholder="-100"
          maxPlaceholder="100"
        />
        <NumberRange
          label="Liquidez Corrente"
          value={filters.liquidez}
          onChange={(value) => onChange({ liquidez: value })}
          minPlaceholder="0"
          maxPlaceholder="10"
        />
      </CardContent>
    </Card>
  )
}

export default FiltersPanel
