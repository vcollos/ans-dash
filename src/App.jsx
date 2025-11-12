import './lib/charts'
import { useState, useMemo } from 'react'
import { AlertCircle } from 'lucide-react'
import { useDashboardController } from './hooks/useDashboardController'
import AppHeader from './components/layout/AppHeader'
import FiltersPanel from './components/filters/FiltersPanel'
import KpiCards from './components/dashboard/KpiCards'
import RankingChart from './components/dashboard/RankingChart'
import DataTable from './components/dashboard/DataTable'
import MonetarySummary from './components/dashboard/MonetarySummary'
import { Skeleton } from './components/ui/skeleton'
import { Card, CardContent } from './components/ui/card'
import { Button } from './components/ui/button'

function LoadingState() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-28 w-full" />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 8 }).map((_, index) => (
          <Skeleton key={index} className="h-28 w-full" />
        ))}
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <Skeleton className="h-[360px] w-full" />
        <Skeleton className="h-[360px] w-full" />
      </div>
      <Skeleton className="h-[360px] w-full" />
    </div>
  )
}

function ErrorState({ error, onRetry }) {
  return (
    <Card className="border-destructive/40 bg-destructive/5">
      <CardContent className="flex flex-col items-start gap-4 p-6">
        <div className="flex items-center gap-3 text-destructive">
          <AlertCircle className="h-6 w-6" />
          <div>
            <p className="text-lg font-semibold">Não foi possível carregar os dados</p>
            <p className="text-sm">{error?.message ?? 'Verifique os arquivos na pasta public/data e tente novamente.'}</p>
          </div>
        </div>
        <Button variant="destructive" onClick={onRetry}>
          Tentar novamente
        </Button>
      </CardContent>
    </Card>
  )
}

function App() {
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false)
  const {
    status,
    error,
    filters,
    options,
    kpis,
    rankingMetric,
    setRankingMetric,
    rankingData,
    rankingOrder,
    setRankingOrder,
    tableData,
    isQuerying,
    isUploading,
    uploadFeedback,
    updateFilters,
    resetFilters,
    applyOperatorSelection,
    replaceDataset,
    sourceInfo,
    operatorInsight,
    operatorPeriod,
    setOperatorPeriod,
    operatorContext,
    comparisonMode,
    setComparisonMode,
  } = useDashboardController()

  const comparisonLabel = useMemo(() => {
    if (!operatorContext?.name) {
      return 'Média dos filtros ativos'
    }
    switch (comparisonMode) {
      case 'all-operators':
        return 'Média das operadoras'
      case 'all-uniodonto':
        return 'Média das Uniodontos'
      case 'non-uniodonto':
        return 'Média das operadoras não Uniodonto'
      case 'modality-non-uniodonto':
        return operatorContext?.modalidade
          ? `Média das ${operatorContext.modalidade} não Uniodonto`
          : 'Média das operadoras da modalidade (não Uniodonto)'
      case 'same-porte':
        return operatorContext?.porte
          ? `Média das operadoras de porte ${operatorContext.porte}`
          : 'Média das operadoras do mesmo porte'
      case 'same-porte-uniodonto':
        return operatorContext?.porte
          ? `Média das Uniodontos de porte ${operatorContext.porte}`
          : 'Média das Uniodontos do mesmo porte'
      case 'same-porte-non-uniodonto':
        return operatorContext?.porte
          ? `Média das operadoras não Uniodonto de porte ${operatorContext.porte}`
          : 'Média das operadoras do mesmo porte (não Uniodonto)'
      default:
        return 'Média dos pares'
    }
  }, [operatorContext, comparisonMode])

  if (status === 'loading') {
    return (
      <main className="mx-auto min-h-screen w-full max-w-[1600px] p-6">
        <LoadingState />
      </main>
    )
  }

  if (status === 'error') {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-4xl flex-col justify-center p-6">
        <ErrorState error={error} onRetry={() => window.location.reload()} />
      </main>
    )
  }

  return (
    <div className="min-h-screen bg-muted/20">
      <main className="mx-auto flex w-full max-w-[1600px] flex-col gap-6 px-4 pb-12 pt-4 sm:px-6 sm:pt-6">
        <AppHeader
          onResetFilters={resetFilters}
          tableData={tableData}
          sourceInfo={sourceInfo}
          summary={kpis}
          operatorName={operatorInsight?.operatorName}
          operatorContext={operatorContext}
          onUploadDataset={replaceDataset}
          isUploading={isUploading}
          uploadFeedback={uploadFeedback}
        />
        <div className="lg:hidden">
          <div className="sticky top-2 z-20 -mx-4 mb-3 px-4 sm:px-0">
          <Button className="w-full" variant="secondary" onClick={() => setMobileFiltersOpen(true)}>
              Ajustar filtros
            </Button>
          </div>
          {mobileFiltersOpen ? (
            <div className="fixed inset-0 z-40 flex flex-col bg-background/95 backdrop-blur">
              <div className="flex items-center justify-between border-b px-4 py-3">
                <p className="text-sm font-semibold">Filtros</p>
                <Button variant="ghost" size="sm" onClick={() => setMobileFiltersOpen(false)}>
                  Fechar
                </Button>
              </div>
              <div className="flex-1 overflow-y-auto px-4 py-4">
                <FiltersPanel
                  filters={filters}
                  options={options}
                  onChange={updateFilters}
                  onReset={resetFilters}
                  onOperatorSelect={applyOperatorSelection}
                  className="border border-border/60 shadow-none"
                  comparisonMode={comparisonMode}
                  onComparisonModeChange={setComparisonMode}
                />
              </div>
              <div className="border-t p-4">
                <Button className="w-full" onClick={() => setMobileFiltersOpen(false)}>
                  Aplicar filtros
                </Button>
              </div>
            </div>
          ) : null}
        </div>
        <div className="grid gap-6 lg:grid-cols-[320px,minmax(0,1fr)] lg:items-start lg:gap-8">
          <div className="hidden min-w-0 lg:block">
            <FiltersPanel
              filters={filters}
              options={options}
              onChange={updateFilters}
              onReset={resetFilters}
              onOperatorSelect={applyOperatorSelection}
              comparisonMode={comparisonMode}
              onComparisonModeChange={setComparisonMode}
            />
          </div>
          <div className="space-y-6 min-w-0">
            <KpiCards
              snapshot={operatorInsight}
              fallbackSummary={kpis}
              onPeriodChange={setOperatorPeriod}
              period={operatorPeriod}
              peerLabel={comparisonLabel}
            />
            <div className="grid gap-6 lg:grid-cols-2 lg:items-stretch">
              <RankingChart
                data={rankingData.rows}
                operatorRow={rankingData.operatorRow}
                metric={rankingMetric}
                onMetricChange={setRankingMetric}
                order={rankingOrder}
                onOrderChange={setRankingOrder}
                operatorName={operatorInsight?.operatorName}
                comparisonLabel={comparisonLabel}
              />
              <MonetarySummary data={kpis} isLoading={isQuerying} className="h-full" />
            </div>
            <DataTable rows={tableData.rows ?? []} columns={tableData.columns ?? []} isLoading={isQuerying} />
          </div>
        </div>
      </main>
    </div>
  )
}

export default App
