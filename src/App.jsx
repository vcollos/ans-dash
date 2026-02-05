import { useEffect, useMemo, useState } from 'react'
import { AlertCircle } from 'lucide-react'
import { useDashboardController } from './hooks/useDashboardController'
import AppHeader from './components/layout/AppHeader'
import LoginScreen from './components/auth/LoginScreen'
import FiltersPanel from './components/filters/FiltersPanel'
import KpiCards from './components/dashboard/KpiCards'
import UniodontoKpiCards from './components/dashboard/UniodontoKpiCards'
import RankingPanel from './components/dashboard/RankingPanel'
import IndicatorTrendChart from './components/dashboard/IndicatorTrendChart'
import DataTable from './components/dashboard/DataTable'
import MonetarySummary from './components/dashboard/MonetarySummary'
import { Skeleton } from './components/ui/skeleton'
import { Card, CardContent } from './components/ui/card'
import { Button } from './components/ui/button'
import { Tabs, TabsList, TabsTrigger, TabsContent } from './components/ui/tabs'
import { describeComparisonFilters } from './lib/comparisonModes'
import DataLoadingIndicator from './components/dashboard/DataLoadingIndicator'
import { AuthProvider } from './contexts/AuthProvider'
import { useAuth } from './contexts/useAuth'
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

function ErrorState({ error, onRetry }) {
  return (
    <Card className="border-destructive/40 bg-destructive/5">
      <CardContent className="flex flex-col items-start gap-4 p-6">
        <div className="flex items-center gap-3 text-destructive">
          <AlertCircle className="h-6 w-6" />
          <div>
            <p className="text-lg font-semibold">Não foi possível carregar os dados</p>
            <p className="text-sm">
              {error?.message ?? 'Verifique as credenciais do BigQuery/Firebase e tente novamente.'}
            </p>
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
  const [activeTab, setActiveTab] = useState('indicadores')
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
    ansPeerSummary,
    uniodontoPeerSummary,
    monetaryRankingMetric,
    setMonetaryRankingMetric,
    monetaryRankingData,
    trendSeriesByMetric,
    isTrendLoading,
    tableData,
    isQuerying,
    updateFilters,
    resetFilters,
    applyOperatorSelection,
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
  } = useDashboardController({ activeTab })

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
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="w-fit">
              <TabsTrigger value="indicadores">Indicadores</TabsTrigger>
              <TabsTrigger value="ranking">Ranking</TabsTrigger>
              <TabsTrigger value="historico">Gráficos históricos</TabsTrigger>
            </TabsList>
            <TabsContent value="indicadores" className="mt-6 space-y-6">
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
                  peerSummary={ansPeerSummary}
                  onPeriodChange={setOperatorPeriod}
                  period={operatorPeriod}
                  peerLabel={comparisonLabel}
                  fallbackPeriods={periodOptions}
                  regulatoryScore={regulatoryScore}
                />
              )}
              <MonetarySummary summary={monetarySummary} isLoading={isQuerying} className="h-full" />
              <DataTable
                rows={tableData.rows ?? []}
                columns={tableData.columns ?? []}
                isLoading={isQuerying}
                maxHeightClass="max-h-[620px]"
              />
            </TabsContent>
            <TabsContent value="ranking" className="mt-6 space-y-6">
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
            </TabsContent>
            <TabsContent value="historico" className="mt-6 space-y-6">
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
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  )
}

function AppContent() {
  const {
    user,
    isLoading,
    error,
    signInWithEmail,
    signUpWithEmail,
    signInWithGoogle,
    sendEmailLink,
    completeEmailLinkSignIn,
    isEmailLink,
    signOut,
  } = useAuth()
  const [authMessage, setAuthMessage] = useState(null)
  const [isAuthLoading, setIsAuthLoading] = useState(false)
  const [isEmailLinkFlow, setIsEmailLinkFlow] = useState(false)
  const allowSignUp = import.meta.env?.VITE_ALLOW_SIGNUP !== 'false'

  useEffect(() => {
    function handleExpired() {
      setAuthMessage('Sessao expirada. Faca login novamente.')
    }
    window.addEventListener('auth:expired', handleExpired)
    return () => {
      window.removeEventListener('auth:expired', handleExpired)
    }
  }, [])

  useEffect(() => {
    if (!isLoading) {
      setIsAuthLoading(false)
    }
  }, [isLoading])

  useEffect(() => {
    if (typeof window === 'undefined') return
    const linkDetected = isEmailLink?.(window.location.href)
    if (!linkDetected) return
    setIsEmailLinkFlow(true)
    const storedEmail = window.localStorage.getItem('auth:emailLink')
    if (!storedEmail) return
    setIsAuthLoading(true)
    completeEmailLinkSignIn(storedEmail, window.location.href)
      .catch((err) => {
        setAuthMessage(err?.message ?? 'Falha ao concluir login por link.')
      })
      .finally(() => {
        setIsAuthLoading(false)
      })
  }, [completeEmailLinkSignIn, isEmailLink])

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

  async function handleSendEmailLink({ email }) {
    setIsAuthLoading(true)
    setAuthMessage(null)
    try {
      await sendEmailLink(email)
      setAuthMessage('Link enviado. Verifique o email para continuar.')
    } catch (err) {
      setAuthMessage(err?.message ?? 'Falha ao enviar link de acesso.')
    } finally {
      setIsAuthLoading(false)
    }
  }

  async function handleCompleteEmailLink({ email }) {
    setIsAuthLoading(true)
    setAuthMessage(null)
    try {
      await completeEmailLinkSignIn(email, window.location.href)
    } catch (err) {
      setAuthMessage(err?.message ?? 'Falha ao concluir login por link.')
    } finally {
      setIsAuthLoading(false)
    }
  }

  async function handleSignUp({ email, password }) {
    setIsAuthLoading(true)
    setAuthMessage(null)
    try {
      await signUpWithEmail(email, password)
    } catch (err) {
      setAuthMessage(err?.message ?? 'Falha ao criar conta.')
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
        onSignUp={allowSignUp ? handleSignUp : null}
        onGoogleLogin={handleGoogleLogin}
        onSendEmailLink={handleSendEmailLink}
        onCompleteEmailLink={handleCompleteEmailLink}
        isEmailLinkFlow={isEmailLinkFlow}
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
