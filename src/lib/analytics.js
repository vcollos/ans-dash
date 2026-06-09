import { getAnalytics, isSupported, logEvent, setUserId, setUserProperties } from 'firebase/analytics'
import { app } from './firebaseClient'

let analyticsPromise = null

function getAnalyticsInstance() {
  if (typeof window === 'undefined') return Promise.resolve(null)
  if (!analyticsPromise) {
    analyticsPromise = isSupported()
      .then((supported) => (supported ? getAnalytics(app) : null))
      .catch((err) => {
        console.warn('[analytics] Firebase Analytics indisponivel', err)
        return null
      })
  }
  return analyticsPromise
}

function getEmailDomain(email) {
  const [, domain = ''] = String(email ?? '').trim().toLowerCase().split('@')
  return domain || undefined
}

function getPrimaryOperator(profile) {
  const operators = Array.isArray(profile?.operators) ? profile.operators : []
  return operators[0] ?? null
}

export async function identifyAnalyticsUser(user, profile = {}) {
  const analytics = await getAnalyticsInstance()
  if (!analytics || !user?.uid) return
  const primaryOperator = getPrimaryOperator(profile)
  setUserId(analytics, user.uid)
  setUserProperties(analytics, {
    email_domain: getEmailDomain(user.email ?? profile?.email),
    is_admin: profile?.isAdmin ? 'true' : 'false',
    operator_reg_ans: primaryOperator?.regAns ? String(primaryOperator.regAns) : undefined,
    operator_name: primaryOperator?.operatorName ?? undefined,
  })
}

export async function trackAppEvent(name, params = {}) {
  const analytics = await getAnalyticsInstance()
  if (!analytics) return
  logEvent(analytics, name, params)
}
