import { formatInteger } from '../../lib/utils'
import { Switch } from '../ui/switch'
import { Label } from '../ui/label'

function SummaryBadge({ label, value }) {
  return (
    <div className="flex min-w-[140px] shrink-0 flex-col rounded-lg border border-border/70 bg-muted/30 px-3 py-2">
      <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{label}</span>
      <span className="text-lg font-semibold leading-tight">{value}</span>
    </div>
  )
}

function AppHeader({
  summary,
  onOpenFilters,
  onLogout,
  uniodontoMode = false,
  onUniodontoModeChange,
  onOpenDataImport,
  canOpenDataImport = false,
}) {
  const operadorasValue = formatInteger(summary?.operadoras)
  const beneficiariosValue = formatInteger(summary?.beneficiarios)
  const prestadoresValue = formatInteger(summary?.qt_prestadores)
  const headerTitle = uniodontoMode ? 'Painel Uniodonto' : 'Painel Regulatório RN 518'
  const headerSubtitle = uniodontoMode ? 'Indicadores exclusivos do sistema Uniodonto.' : 'DIOPS Financeiro'

  return (
    <header className="sticky top-2 z-30 flex flex-col gap-5 rounded-2xl border bg-card/95 p-5 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-card/80 sm:p-6 lg:flex-row lg:items-start lg:justify-between lg:gap-8">
      <div className="space-y-4 lg:max-w-[520px]">
        <div className="flex items-center gap-4">
          <img src="https://collos.com.br/wp-content/uploads/2024/12/logo_contag.png" alt="Contag" className="h-14 w-auto" />
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold leading-tight">{headerTitle}</h1>
            <p className="text-sm font-medium text-muted-foreground">{headerSubtitle}</p>
          </div>
        </div>
      </div>
      <div className="flex flex-1 flex-col gap-3 lg:items-end">
        <div className="flex flex-wrap items-center gap-3 sm:justify-end">
          <SummaryBadge label="Operadoras selecionadas" value={operadorasValue} />
          <SummaryBadge label="Beneficiários (último período)" value={beneficiariosValue} />
          <SummaryBadge label="Prestadores (último período)" value={prestadoresValue} />
          {typeof onUniodontoModeChange === 'function' ? (
            <div className="flex items-center gap-2 rounded-md border border-border bg-muted/30 px-3 py-2">
              <Switch
                id="toggle-uniodonto-mode"
                checked={uniodontoMode}
                onCheckedChange={onUniodontoModeChange}
              />
              <Label htmlFor="toggle-uniodonto-mode" className="text-xs text-muted-foreground">
                Modo Uniodonto
              </Label>
            </div>
          ) : null}
          {onOpenFilters ? (
            <button
              type="button"
              onClick={onOpenFilters}
              className="rounded-md border border-border bg-secondary px-3 py-2 text-sm font-semibold text-foreground shadow-sm transition hover:bg-secondary/80"
            >
              Abrir filtros
            </button>
          ) : null}
          {onOpenDataImport ? (
            <button
              type="button"
              onClick={onOpenDataImport}
              disabled={!canOpenDataImport}
              title={
                canOpenDataImport
                  ? 'Importar demonstrações contábeis da operadora Singular selecionada'
                  : 'Selecione uma operadora Singular para habilitar este botão'
              }
              className="rounded-md border border-border bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground shadow-sm transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Atualize seus dados
            </button>
          ) : null}
          {onLogout ? (
            <button
              type="button"
              onClick={onLogout}
              className="rounded-md border border-border bg-background px-3 py-2 text-sm font-semibold text-foreground shadow-sm transition hover:bg-muted"
            >
              Sair
            </button>
          ) : null}
        </div>
      </div>
    </header>
  )
}

export default AppHeader
