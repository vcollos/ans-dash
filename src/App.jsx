import './lib/charts'
import { AlertCircle } from 'lucide-react'
import { useDashboardController } from './hooks/useDashboardController'
import AppHeader from './components/layout/AppHeader'
import FiltersPanel from './components/filters/FiltersPanel'
import KpiCards from './components/dashboard/KpiCards'
import TrendChart from './components/dashboard/TrendChart'
import RankingChart from './components/dashboard/RankingChart'
import ScatterChart from './components/dashboard/ScatterChart'
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
      <Skeleton className="h-64 w-full" />
      <Skeleton className="h-[360px] w-full" />
      <Skeleton className="h-[360px] w-full" />
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
  const {
    status,
    error,
    filters,
    options,
    kpis,
    trendMetric,
    setTrendMetric,
    trendData,
    rankingMetric,
    setRankingMetric,
    rankingData,
    rankingOrder,
    setRankingOrder,
    scatterMetrics,
    setScatterMetrics,
    scatterData,
    tableData,
    isQuerying,
    updateFilters,
    resetFilters,
    metricsCatalog,
    sourceInfo,
  } = useDashboardController()

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
      <main className="mx-auto flex w-full max-w-[1600px] flex-col gap-6 p-4 sm:p-6">
        <AppHeader onResetFilters={resetFilters} tableData={tableData} trendData={trendData} sourceInfo={sourceInfo} summary={kpis} />
        <div className="grid gap-6 lg:grid-cols-[320px,1fr]">
          <FiltersPanel filters={filters} options={options} onChange={updateFilters} onReset={resetFilters} />
          <div className="space-y-6">
            <KpiCards data={kpis} isLoading={isQuerying} />
            <MonetarySummary data={kpis} isLoading={isQuerying} />
            <div className="grid gap-6 xl:grid-cols-2">
              <TrendChart
                data={trendData}
                metric={trendMetric}
                metricsCatalog={metricsCatalog}
                onMetricChange={setTrendMetric}
              />
              <RankingChart data={rankingData} metric={rankingMetric} onMetricChange={setRankingMetric} order={rankingOrder} onOrderChange={setRankingOrder} />
            </div>
            <ScatterChart
              data={scatterData}
              metricsCatalog={metricsCatalog}
              metrics={scatterMetrics}
              onMetricsChange={setScatterMetrics}
            />
            <DataTable rows={tableData.rows ?? []} isLoading={isQuerying} />
          </div>
        </div>
      </main>
    </div>
  )
}

export default App
