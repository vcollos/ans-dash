import './lib/charts'
import { useState, useMemo, useRef } from 'react'
import { AlertCircle } from 'lucide-react'
import { useDashboardController } from './hooks/useDashboardController'
import AppHeader from './components/layout/AppHeader'
import FiltersPanel from './components/filters/FiltersPanel'
import KpiCards from './components/dashboard/KpiCards'
import RankingChart from './components/dashboard/RankingChart'
import IndicatorTrendChart from './components/dashboard/IndicatorTrendChart'
import DataTable from './components/dashboard/DataTable'
import MonetarySummary from './components/dashboard/MonetarySummary'
import { Skeleton } from './components/ui/skeleton'
import { Card, CardContent } from './components/ui/card'
import { Button } from './components/ui/button'
import { describeComparisonFilters } from './lib/comparisonModes'
import DataLoadingIndicator from './components/dashboard/DataLoadingIndicator'

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

function DatasetUploadCard({ onUploadDataset, isUploading, uploadFeedback }) {
  const fileInputRef = useRef(null)

  const handleUploadClick = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = (event) => {
    const file = event.target.files?.[0]
    if (file && onUploadDataset) {
      onUploadDataset(file)
    }
    event.target.value = ''
  }

  return (
    <div className="rounded-xl border border-border/60 bg-muted/30 p-4 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Atualizar arquivo base</p>
      <p className="mt-1 text-sm text-muted-foreground">
        Substitua o dataset carregado enviando um novo CSV ou Parquet curado.
      </p>
      <input ref={fileInputRef} type="file" accept=".csv,.parquet" className="hidden" onChange={handleFileChange} />
      <Button variant="outline" className="mt-3 w-full gap-2" onClick={handleUploadClick} disabled={isUploading}>
        {isUploading ? 'Importando...' : 'Selecionar arquivo'}
      </Button>
      {uploadFeedback ? (
        <p className="mt-2 text-xs text-muted-foreground">{uploadFeedback.message}</p>
      ) : null}
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
    periodOptions,
    kpis,
    rankingMetric,
    setRankingMetric,
    rankingData,
    rankingOrder,
    setRankingOrder,
    trendMetric,
    setTrendMetric,
    trendSeries,
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
    operatorContext,
    operatorPeriod,
    setOperatorPeriod,
    comparisonFilters,
    comparisonFiltersDraft,
    updateComparisonFilters,
    commitComparisonFilters,
    resetComparisonFiltersState,
    monetarySummary,
    regulatoryScore,
  } = useDashboardController()

  const comparisonLabel = useMemo(() => describeComparisonFilters(comparisonFilters), [comparisonFilters])
  const trendPrimaryLabel = operatorInsight?.operatorName ?? 'Média dos filtros'
  const isRefreshingData = isQuerying || trendSeries.isLoading

  const agentContext = useMemo(() => {
    const tableRows = tableData?.rows ?? []
    const beneficiaryTotal = tableRows.reduce((sum, row) => {
      const value = Number(row?.qt_beneficiarios ?? 0)
      return sum + (Number.isFinite(value) ? value : 0)
    }, 0)
    return {
      status,
      filters,
      comparisonFilters,
      operatorPeriod,
      operatorContext,
      operatorInsight,
      periodOptions,
      summary: kpis,
      regulatoryScore,
      ranking: {
        metric: rankingMetric,
        order: rankingOrder,
        topRows: rankingData?.rows ?? [],
        operatorRow: rankingData?.operatorRow ?? null,
      },
      monetarySummary,
      trend: {
        metric: trendMetric,
        rows: trendSeries?.rows ?? [],
      },
      tableSummary: {
        visibleRows: tableRows.length,
        beneficiaryTotal,
      },
      sourceInfo,
    }
  }, [
    status,
    filters,
    comparisonFilters,
    operatorPeriod,
    operatorContext,
    operatorInsight,
    periodOptions,
    kpis,
    regulatoryScore,
    rankingMetric,
    rankingOrder,
    rankingData,
    monetarySummary,
    trendMetric,
    trendSeries,
    tableData,
    sourceInfo,
  ])

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
        <AppHeader tableData={tableData} sourceInfo={sourceInfo} summary={kpis} />
        <DataLoadingIndicator
          isActive={isRefreshingData}
          className="hidden lg:block"
          description="Consultando indicadores e séries históricas para os filtros aplicados."
        />
        <div className="lg:hidden">
          <DataLoadingIndicator
            isActive={isRefreshingData}
            className="mb-2"
            description="Aplicando filtros e atualizando os indicadores."
          />
        </div>
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
              <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
                <FiltersPanel
                  filters={filters}
                  options={options}
                  onChange={updateFilters}
                  onReset={resetFilters}
                  onOperatorSelect={applyOperatorSelection}
                  className="border border-border/60 shadow-none"
                  comparisonFilters={comparisonFiltersDraft}
                  comparisonAppliedFilters={comparisonFilters}
                  onComparisonFiltersChange={updateComparisonFilters}
                  onComparisonFiltersApply={commitComparisonFilters}
                  onComparisonFiltersReset={resetComparisonFiltersState}
                />
                <DatasetUploadCard
                  onUploadDataset={replaceDataset}
                  isUploading={isUploading}
                  uploadFeedback={uploadFeedback}
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
          <div className="hidden min-w-[320px] lg:block">
            <div className="space-y-4 lg:sticky lg:top-6">
              <FiltersPanel
                filters={filters}
                options={options}
                onChange={updateFilters}
                onReset={resetFilters}
                onOperatorSelect={applyOperatorSelection}
                comparisonFilters={comparisonFiltersDraft}
                comparisonAppliedFilters={comparisonFilters}
                onComparisonFiltersChange={updateComparisonFilters}
                onComparisonFiltersApply={commitComparisonFilters}
                onComparisonFiltersReset={resetComparisonFiltersState}
              />
              <DatasetUploadCard
                onUploadDataset={replaceDataset}
                isUploading={isUploading}
                uploadFeedback={uploadFeedback}
              />
            </div>
          </div>
          <div className="space-y-6 min-w-0">
            <KpiCards
              snapshot={operatorInsight}
              fallbackSummary={kpis}
              onPeriodChange={setOperatorPeriod}
              period={operatorPeriod}
              peerLabel={comparisonLabel}
              fallbackPeriods={periodOptions}
              regulatoryScore={regulatoryScore}
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
              <MonetarySummary summary={monetarySummary} isLoading={isQuerying} className="h-full" />
            </div>
            <IndicatorTrendChart
              data={trendSeries.rows}
              metric={trendMetric}
              onMetricChange={setTrendMetric}
              isLoading={trendSeries.isLoading || isQuerying}
              primaryLabel={trendPrimaryLabel}
              comparisonLabel={comparisonLabel}
            />
            <DataTable rows={tableData.rows ?? []} columns={tableData.columns ?? []} isLoading={isQuerying} />
          </div>
        </div>
      </main>
    </div>
  )
}

export default App
