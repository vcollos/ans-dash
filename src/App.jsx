import { useEffect, useMemo, useState } from 'react'
import { AlertCircle } from 'lucide-react'
import { useDashboardController } from './hooks/useDashboardController'
import AppHeader from './components/layout/AppHeader'
import LoginScreen from './components/auth/LoginScreen'
import ProfileCompletionDialog from './components/auth/ProfileCompletionDialog'
import AdminAccountsDialog from './components/auth/AdminAccountsDialog'
import FiltersPanel from './components/filters/FiltersPanel'
import KpiCards from './components/dashboard/KpiCards'
import UniodontoKpiCards from './components/dashboard/UniodontoKpiCards'
import RankingPanel from './components/dashboard/RankingPanel'
import IndicatorTrendChart from './components/dashboard/IndicatorTrendChart'
import UniodontoPerCapitaChart from './components/dashboard/UniodontoPerCapitaChart'
import OperadoraDataImportDialog from './components/dashboard/OperadoraDataImportDialog'
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
import { fetchAccessProfile, fetchOperatorsCatalog, saveProfileCompletion } from './lib/accessProfile'
import { getAuthErrorMessage } from './lib/auth'

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

function DashboardApp({ onLogout, accessProfile, onOpenProfile, onOpenAdminAccounts }) {
  const [filtersSidebarOpen, setFiltersSidebarOpen] = useState(false)
  const [activeTab, setActiveTab] = useState('indicadores')
  const [isDataImportOpen, setIsDataImportOpen] = useState(false)
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
    uniodontoPerCapitaFilters,
    updateUniodontoPerCapitaFilters,
    uniodontoPerCapitaSeries,
    isUniodontoPerCapitaLoading,
    tableData,
    isQuerying,
    updateFilters,
    resetFilters,
    applyOperatorSelection,
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
  } = useDashboardController({ activeTab })

  const comparisonLabel = useMemo(() => describeComparisonFilters(comparisonFilters), [comparisonFilters])
  const trendPrimaryLabel = operatorInsight?.operatorName ?? 'Média dos filtros'
  const isRefreshingData = isQuerying || isTrendLoading
  const uploadOperators = useMemo(
    () =>
      (accessProfile?.operators ?? [])
        .filter((item) => item?.canUpload)
        .map((item) => ({
          regAns: String(item.regAns ?? '').trim(),
          operatorName: item.operatorName ?? null,
        }))
        .filter((item) => item.regAns),
    [accessProfile?.operators],
  )
  const canOpenDataImport = uploadOperators.length > 0

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
          onOpenProfile={onOpenProfile}
          onOpenAdminAccounts={accessProfile?.isAdmin ? onOpenAdminAccounts : null}
          uniodontoMode={uniodontoMode}
          onUniodontoModeChange={setUniodontoMode}
          onOpenDataImport={() => setIsDataImportOpen(true)}
          canOpenDataImport={canOpenDataImport}
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
              {uniodontoMode ? (
                <UniodontoPerCapitaChart
                  series={uniodontoPerCapitaSeries}
                  filters={uniodontoPerCapitaFilters}
                  onFiltersChange={updateUniodontoPerCapitaFilters}
                  isLoading={isUniodontoPerCapitaLoading || isQuerying}
                  primaryLabel={trendPrimaryLabel}
                  comparisonLabel={comparisonLabel}
                  hasOperatorComparison={Boolean(operatorInsight?.operatorName)}
                />
              ) : null}
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
        <OperadoraDataImportDialog
          open={isDataImportOpen}
          onOpenChange={setIsDataImportOpen}
          allowedOperators={uploadOperators}
          defaultOperatorName={operatorInsight?.operatorName ?? null}
          defaultOperatorRegAns={operatorContext?.regAns ?? null}
          userEmail={accessProfile?.email ?? ''}
        />
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
    sendPasswordReset,
  } = useAuth()
  const [authMessage, setAuthMessage] = useState(null)
  const [isAuthLoading, setIsAuthLoading] = useState(false)
  const [isEmailLinkFlow, setIsEmailLinkFlow] = useState(false)
  const [accessProfile, setAccessProfile] = useState(null)
  const [isAccessProfileLoading, setIsAccessProfileLoading] = useState(false)
  const [accessProfileError, setAccessProfileError] = useState(null)
  const [operatorCatalog, setOperatorCatalog] = useState([])
  const [isOperatorCatalogLoading, setIsOperatorCatalogLoading] = useState(false)
  const [profileCompletionError, setProfileCompletionError] = useState(null)
  const [isSavingProfileCompletion, setIsSavingProfileCompletion] = useState(false)
  const [isProfileSettingsOpen, setIsProfileSettingsOpen] = useState(false)
  const [isAdminAccountsOpen, setIsAdminAccountsOpen] = useState(false)
  const [isSendingPasswordReset, setIsSendingPasswordReset] = useState(false)
  const [passwordResetMessage, setPasswordResetMessage] = useState(null)
  const allowSignUp = import.meta.env?.VITE_ALLOW_SIGNUP !== 'false'
  const requiresProfileCompletion = accessProfile?.requiresProfileCompletion === true
  const userUid = user?.uid ?? null
  const userEmail = user?.email ?? null

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
    if (!userUid && !userEmail) {
      setAccessProfile(null)
      setAccessProfileError(null)
      setIsAccessProfileLoading(false)
      setOperatorCatalog([])
      setProfileCompletionError(null)
      setIsProfileSettingsOpen(false)
      setIsAdminAccountsOpen(false)
      setPasswordResetMessage(null)
      return
    }
    let cancelled = false
    setIsAccessProfileLoading(true)
    setAccessProfileError(null)
    fetchAccessProfile()
      .then((profile) => {
        if (cancelled) return
        setAccessProfile(profile)
      })
      .catch((err) => {
        if (cancelled) return
        setAccessProfileError(err)
      })
      .finally(() => {
        if (cancelled) return
        setIsAccessProfileLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [userUid, userEmail])

  useEffect(() => {
    const shouldLoadOperators = requiresProfileCompletion || isProfileSettingsOpen
    if (!shouldLoadOperators) return
    let cancelled = false
    setIsOperatorCatalogLoading(true)
    fetchOperatorsCatalog()
      .then((operators) => {
        if (cancelled) return
        setOperatorCatalog(operators)
      })
      .catch((err) => {
        if (cancelled) return
        setProfileCompletionError(err?.message ?? 'Falha ao carregar operadoras.')
      })
      .finally(() => {
        if (cancelled) return
        setIsOperatorCatalogLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [requiresProfileCompletion, isProfileSettingsOpen])

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
        setAuthMessage(getAuthErrorMessage(err, 'Falha ao concluir login por link.'))
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
      setAuthMessage(getAuthErrorMessage(err, 'Falha ao autenticar.'))
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
      setAuthMessage(getAuthErrorMessage(err, 'Falha ao autenticar com Google.'))
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
      setAuthMessage(getAuthErrorMessage(err, 'Falha ao enviar link de acesso.'))
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
      setAuthMessage(getAuthErrorMessage(err, 'Falha ao concluir login por link.'))
    } finally {
      setIsAuthLoading(false)
    }
  }

  async function handleSignUp(formData) {
    setIsAuthLoading(true)
    setAuthMessage(null)
    try {
      await signUpWithEmail(formData.email, formData.password)
      const nextProfile = await saveProfileCompletion({
        regAns: formData.regAns,
        firstName: formData.firstName,
        lastName: formData.lastName,
        jobTitle: formData.jobTitle,
        roleFunction: formData.roleFunction,
        phone: formData.phone,
        phoneIsWhatsapp: formData.phoneIsWhatsapp === true,
        email: formData.email,
      })
      setAccessProfile(nextProfile)
    } catch (err) {
      setAuthMessage(getAuthErrorMessage(err, 'Falha ao criar conta.'))
    } finally {
      setIsAuthLoading(false)
    }
  }

  async function handleForgotPassword({ email }) {
    setIsAuthLoading(true)
    setAuthMessage(null)
    try {
      const targetEmail = await sendPasswordReset(email)
      setAuthMessage(`E-mail de redefinição enviado para ${targetEmail}.`)
    } catch (err) {
      setAuthMessage(getAuthErrorMessage(err, 'Falha ao enviar e-mail de redefinição de senha.'))
    } finally {
      setIsAuthLoading(false)
    }
  }

  async function handleProfileCompletionSubmit(formData) {
    setIsSavingProfileCompletion(true)
    setProfileCompletionError(null)
    setPasswordResetMessage(null)
    try {
      const nextProfile = await saveProfileCompletion(formData)
      setAccessProfile(nextProfile)
      if (isProfileSettingsOpen) {
        setIsProfileSettingsOpen(false)
      }
    } catch (err) {
      setProfileCompletionError(err?.message ?? 'Falha ao salvar cadastro.')
    } finally {
      setIsSavingProfileCompletion(false)
    }
  }

  async function handlePasswordReset() {
    setIsSendingPasswordReset(true)
    setProfileCompletionError(null)
    setPasswordResetMessage(null)
    try {
      const targetEmail = await sendPasswordReset(accessProfile?.email ?? userEmail)
      setPasswordResetMessage(`E-mail de redefinição enviado para ${targetEmail}.`)
    } catch (err) {
      setProfileCompletionError(err?.message ?? 'Falha ao enviar e-mail de redefinição de senha.')
    } finally {
      setIsSendingPasswordReset(false)
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
        onForgotPassword={handleForgotPassword}
        onCompleteEmailLink={handleCompleteEmailLink}
        isEmailLinkFlow={isEmailLinkFlow}
        isLoading={isAuthLoading}
        errorMessage={authMessage ?? error?.message ?? null}
      />
    )
  }

  if (isAccessProfileLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-muted/20 px-4 py-12 text-sm text-muted-foreground">
        Carregando perfil de acesso...
      </main>
    )
  }

  if (accessProfileError) {
    return (
      <main className="flex min-h-screen w-full flex-col justify-center px-[3vw] py-[3vh]">
        <ErrorState error={accessProfileError} onRetry={() => window.location.reload()} />
      </main>
    )
  }

  if (requiresProfileCompletion) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-muted/20 px-4 py-12">
        <Button type="button" variant="outline" className="fixed right-4 top-4" onClick={signOut}>
          Sair
        </Button>
        <ProfileCompletionDialog
          open={true}
          onOpenChange={() => {}}
          defaultProfile={accessProfile?.registrationProfile ?? null}
          defaultEmail={accessProfile?.email ?? userEmail ?? ''}
          operatorOptions={operatorCatalog}
          isLoadingOperators={isOperatorCatalogLoading}
          isSubmitting={isSavingProfileCompletion}
          isSendingPasswordReset={false}
          passwordResetMessage={null}
          errorMessage={profileCompletionError}
          title="Complete seu cadastro"
          description="Informe seu vínculo com a Uniodonto e seus dados cadastrais para validação de acesso."
          submitLabel="Salvar cadastro"
          inline={true}
          lockOpen={true}
          regAnsRequired={!accessProfile?.isAdmin}
          onSubmit={handleProfileCompletionSubmit}
        />
      </main>
    )
  }

  if (accessProfile?.canAccess === false) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-muted/20 px-4 py-12">
        <div className="w-full max-w-md rounded-lg border bg-background p-6 text-center shadow-sm">
          <h1 className="text-lg font-semibold">Conta em ativação</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Seu cadastro foi recebido e passará por ativação pela Uniodonto do Brasil.
          </p>
          {accessProfile?.approvalReason ? (
            <p className="mt-3 text-xs text-muted-foreground">Status: {accessProfile.approvalReason}</p>
          ) : null}
          <Button type="button" variant="outline" className="mt-5 w-full" onClick={signOut}>
            Sair
          </Button>
        </div>
      </main>
    )
  }

  return (
    <>
      <DashboardApp
        onLogout={signOut}
        accessProfile={accessProfile}
        onOpenProfile={() => setIsProfileSettingsOpen(true)}
        onOpenAdminAccounts={() => setIsAdminAccountsOpen(true)}
      />
      <AdminAccountsDialog open={isAdminAccountsOpen} onOpenChange={setIsAdminAccountsOpen} />
      <ProfileCompletionDialog
        open={isProfileSettingsOpen}
        onOpenChange={setIsProfileSettingsOpen}
        defaultProfile={accessProfile?.registrationProfile ?? null}
        defaultEmail={accessProfile?.email ?? ''}
        operatorOptions={operatorCatalog}
        isLoadingOperators={isOperatorCatalogLoading}
        isSubmitting={isSavingProfileCompletion}
        isSendingPasswordReset={isSendingPasswordReset}
        passwordResetMessage={passwordResetMessage}
        errorMessage={profileCompletionError}
        title="Perfil"
        description="Atualize seus dados cadastrais e senha."
        submitLabel="Salvar alterações"
        lockOpen={false}
        regAnsRequired={!accessProfile?.isAdmin}
        onSendPasswordReset={handlePasswordReset}
        onSubmit={handleProfileCompletionSubmit}
      />
    </>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  )
}
