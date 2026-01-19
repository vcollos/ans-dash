import { useEffect, useMemo, useRef, useState } from 'react'
import { AlertCircle } from 'lucide-react'
import { useDashboardController } from './hooks/useDashboardController'
import AppHeader from './components/layout/AppHeader'
import LoginScreen from './components/auth/LoginScreen'
import FiltersPanel from './components/filters/FiltersPanel'
import KpiCards from './components/dashboard/KpiCards'
import UniodontoKpiCards from './components/dashboard/UniodontoKpiCards'
import RankingPanel from './components/dashboard/RankingPanel'
import IndicatorTrendChart from './components/dashboard/IndicatorTrendChart'
import UniodontoCorrelationPanel from './components/dashboard/UniodontoCorrelationPanel'
import DataTable from './components/dashboard/DataTable'
import MonetarySummary from './components/dashboard/MonetarySummary'
import DashboardAnalysisDialog from './components/dashboard/DashboardAnalysisDialog'
import { Skeleton } from './components/ui/skeleton'
import { Card, CardContent } from './components/ui/card'
import { Button } from './components/ui/button'
import { describeComparisonFilters } from './lib/comparisonModes'
import DataLoadingIndicator from './components/dashboard/DataLoadingIndicator'
import { AuthProvider, useAuth } from './contexts/AuthProvider'
import { UNIODONTO_INDICATORS } from './lib/uniodontoMetrics'

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

function DashboardApp({ onLogout }) {
  const [filtersSidebarOpen, setFiltersSidebarOpen] = useState(false)
  const [analysisOpen, setAnalysisOpen] = useState(false)
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
    uniodontoMode,
    setUniodontoMode,
    uniodontoRankingMetric,
    setUniodontoRankingMetric,
    uniodontoPeerSummary,
    monetaryRankingMetric,
    setMonetaryRankingMetric,
    monetaryRankingData,
    trendSeriesByMetric,
    isTrendLoading,
    tableData,
    isQuerying,
    isUploading,
    uploadFeedback,
    updateFilters,
    resetFilters,
    applyOperatorSelection,
    replaceDataset,
    operatorInsight,
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
  const isRefreshingData = isQuerying || isTrendLoading

  if (status === 'loading') {
    return (
      <main className="min-h-screen w-full px-[3vw] py-[3vh]">
        <LoadingState />
      </main>
    )
  }

  if (status === 'error') {
    return (
      <main className="flex min-h-screen w-full flex-col justify-center px-[3vw] py-[3vh]">
        <ErrorState error={error} onRetry={() => window.location.reload()} />
      </main>
    )
  }

  return (
    <div className="min-h-screen bg-muted/20">
      <main className="flex min-h-screen w-full flex-col gap-6 px-[3vw] py-[3vh]">
        <AppHeader
          summary={kpis}
          onOpenFilters={() => setFiltersSidebarOpen(true)}
          onLogout={onLogout}
          uniodontoMode={uniodontoMode}
          onUniodontoModeChange={setUniodontoMode}
          onOpenAnalysis={() => setAnalysisOpen(true)}
        />
        <DashboardAnalysisDialog
          open={analysisOpen}
          onOpenChange={setAnalysisOpen}
          uniodontoMode={uniodontoMode}
          filters={filters}
          comparisonFilters={comparisonFilters}
          operatorName={operatorInsight?.operatorName}
          kpis={kpis}
          monetarySummary={monetarySummary}
          rankingData={rankingData}
          rankingMetric={rankingMetric}
          uniodontoRankingMetric={uniodontoRankingMetric}
          trendSeriesByMetric={trendSeriesByMetric}
          isLoading={isRefreshingData}
        />
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
        {filtersSidebarOpen ? (
          <>
            <div
              className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm transition-opacity"
              onClick={() => setFiltersSidebarOpen(false)}
            />
            <div className="fixed inset-y-0 left-0 z-50 w-full max-w-[380px] overflow-y-auto border-r border-border/70 bg-background shadow-2xl transition-transform animate-in slide-in-from-left">
              <div className="flex items-center justify-between border-b px-4 py-3">
                <div>
                  <p className="text-sm font-semibold">Filtros</p>
                  <p className="text-xs text-muted-foreground">Escolha recortes, depois feche para ganhar tela.</p>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setFiltersSidebarOpen(false)}>
                  Fechar
                </Button>
              </div>
              <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
                <FiltersPanel
                  filters={filters}
                  options={options}
                  onChange={updateFilters}
                  onReset={resetFilters}
                  onOperatorSelect={applyOperatorSelection}
                  className="border border-border/60 shadow-none"
                  comparisonFilters={comparisonFiltersDraft}
                  onComparisonFiltersChange={updateComparisonFilters}
                  onComparisonFiltersReset={resetComparisonFiltersState}
                />
                <DatasetUploadCard
                  onUploadDataset={replaceDataset}
                  isUploading={isUploading}
                  uploadFeedback={uploadFeedback}
                />
              </div>
              <div className="border-t p-4">
                <Button
                  className="w-full"
                  onClick={() => {
                    commitComparisonFilters()
                    setFiltersSidebarOpen(false)
                  }}
                >
                  Aplicar filtros
                </Button>
              </div>
            </div>
          </>
        ) : null}
        <div className="space-y-6 min-w-0">
            {uniodontoMode ? (
              <UniodontoKpiCards
                snapshot={operatorInsight}
                fallbackSummary={kpis}
                peerSummary={uniodontoPeerSummary}
                onPeriodChange={setOperatorPeriod}
                period={operatorPeriod}
                peerLabel={comparisonLabel}
                fallbackPeriods={periodOptions}
              />
            ) : (
              <KpiCards
                snapshot={operatorInsight}
                fallbackSummary={kpis}
                onPeriodChange={setOperatorPeriod}
                period={operatorPeriod}
                peerLabel={comparisonLabel}
                fallbackPeriods={periodOptions}
                regulatoryScore={regulatoryScore}
              />
            )}
            <MonetarySummary summary={monetarySummary} isLoading={isQuerying} className="h-full" />
            <RankingPanel
              indicatorRanking={rankingData.rows}
              operatorRow={rankingData.operatorRow}
              operatorName={operatorInsight?.operatorName}
              comparisonLabel={comparisonLabel}
              indicatorMetric={rankingMetric}
              onIndicatorMetricChange={setRankingMetric}
              isUniodontoMode={uniodontoMode}
              uniodontoMetric={uniodontoRankingMetric}
              onUniodontoMetricChange={setUniodontoRankingMetric}
              monetaryRanking={monetaryRankingData.rows}
              monetaryOperatorRow={monetaryRankingData.operatorRow}
              monetaryMetric={monetaryRankingMetric}
              onMonetaryMetricChange={setMonetaryRankingMetric}
              onOperatorClick={(row) => applyOperatorSelection(row.nome_operadora)}
            />
            <IndicatorTrendChart
              dataByMetric={trendSeriesByMetric}
              isLoading={isTrendLoading || isQuerying}
              primaryLabel={trendPrimaryLabel}
              comparisonLabel={comparisonLabel}
              metrics={uniodontoMode ? UNIODONTO_INDICATORS : null}
              title={uniodontoMode ? 'Evolução dos indicadores Uniodonto' : undefined}
              description={
                uniodontoMode
                  ? 'Séries históricas dos indicadores exclusivos do sistema Uniodonto.'
                  : undefined
              }
            />
            {uniodontoMode ? (
              <UniodontoCorrelationPanel rows={rankingData.rows ?? []} isLoading={isQuerying} />
            ) : null}
            <DataTable
              rows={tableData.rows ?? []}
              columns={tableData.columns ?? []}
              isLoading={isQuerying}
              maxHeightClass="max-h-[620px]"
            />
          </div>
      </main>
    </div>
  )
}

function AppContent() {
  const { user, isLoading, error, signInWithEmail, signInWithGoogle, signOut } = useAuth()
  const [authMessage, setAuthMessage] = useState(null)
  const [isAuthLoading, setIsAuthLoading] = useState(false)

  useEffect(() => {
    function handleExpired() {
      setAuthMessage('Sessao expirada. Faca login novamente.')
    }
    window.addEventListener('auth:expired', handleExpired)
    return () => {
      window.removeEventListener('auth:expired', handleExpired)
    }
  }, [])

  async function handleLogin({ email, password }) {
    setIsAuthLoading(true)
    setAuthMessage(null)
    try {
      await signInWithEmail(email, password)
    } catch (err) {
      setAuthMessage(err?.message ?? 'Falha ao autenticar.')
    } finally {
      setIsAuthLoading(false)
    }
  }

  async function handleGoogleLogin() {
    setIsAuthLoading(true)
    setAuthMessage(null)
    try {
      await signInWithGoogle()
    } catch (err) {
      setAuthMessage(err?.message ?? 'Falha ao autenticar com Google.')
    } finally {
      setIsAuthLoading(false)
    }
  }

  if (isLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-muted/20 px-4 py-12 text-sm text-muted-foreground">
        Verificando autenticacao...
      </main>
    )
  }

  if (!user) {
    return (
      <LoginScreen
        onLogin={handleLogin}
        onGoogleLogin={handleGoogleLogin}
        isLoading={isAuthLoading}
        errorMessage={authMessage ?? error?.message ?? null}
      />
    )
  }

  return <DashboardApp onLogout={signOut} />
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  )
}
