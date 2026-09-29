import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  getRedirectResult,
  signInWithPopup,
  signOut as firebaseSignOut,
  sendSignInLinkToEmail,
  isSignInWithEmailLink,
  signInWithEmailLink,
} from 'firebase/auth'
import { auth, googleProvider, SSO_QA_ISOLATED } from '../lib/firebaseClient'
import AuthContext from './auth-context'
import { getSsoState, setSsoState, readSsoSession, ssoRequestOptions } from '../lib/ssoSession'

const SSO_ENABLED = import.meta.env.VITE_PFC_SSO_ENABLED === 'true'
const EMAIL_LINK_STORAGE_KEY = 'auth:emailLink'
const DEV_AUTH_BYPASS_ENABLED = import.meta.env.DEV && import.meta.env.VITE_DEV_AUTH_BYPASS === 'true'
const DEV_AUTH_EMAIL = import.meta.env.VITE_DEV_AUTH_EMAIL || 'vitor@collos.com.br'

export function AuthProvider({ children }) {
  const [ssoAvailable, setSsoAvailable] = useState(SSO_ENABLED)
  const [user, setUser] = useState(null)
  const [authError, setAuthError] = useState(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    let unsub = () => {}
    const expired = () => {
      if (getSsoState().status === 'blocked') {
        setUser(null)
        setAuthError(new Error('Sua sessão UHub expirou. Entre novamente pelo UHub.'))
      }
    }
    window.addEventListener('auth:expired', expired)
    async function initialize() {
      if (SSO_ENABLED) {
        try {
          const session = await readSsoSession({ isolated: SSO_QA_ISOLATED })
          if (cancelled) return
          setSsoState(session)
          setSsoAvailable(session.available !== false)
          if (new URLSearchParams(window.location.search).get('sso') === 'error') {
            throw new Error('Não foi possível concluir o acesso pelo UHub. Tente novamente.')
          }
          if (session.status === 'blocked') {
            setAuthError(new Error('Ambiente de QA isolado. Entre pelo UHub para continuar.'))
            setIsLoading(false)
            return
          }
          if (session.status === 'active') {
            setUser(session.user)
            setIsLoading(false)
            return
          }
        } catch (error) {
          if (cancelled) return
          setSsoState({ status: 'blocked', csrf: null, user: null })
          setAuthError(error)
          setIsLoading(false)
          return
        }
      }
      getRedirectResult(auth).catch(setAuthError)
      unsub = onAuthStateChanged(auth, (currentUser) => {
        if (cancelled || getSsoState().status !== 'legacy') return
        setUser(getSsoState().status === 'legacy' && DEV_AUTH_BYPASS_ENABLED ? { uid: 'local-preview-admin', email: DEV_AUTH_EMAIL } : (currentUser ?? null))
        setIsLoading(false)
      }, (error) => { setAuthError(error); setIsLoading(false) })
    }
    initialize()
    return () => { cancelled = true; unsub(); window.removeEventListener('auth:expired', expired) }
  }, [])

  const signInWithUhub = useCallback(() => {
    window.location.assign('/api/auth/sso/start')
  }, [])

  const signInWithEmail = useCallback(async (email, password) => {
    if (SSO_QA_ISOLATED || getSsoState().status !== 'legacy') throw new Error('Use o UHub para gerenciar sua sessão e credenciais.')
    setAuthError(null)
    const result = await signInWithEmailAndPassword(auth, email, password)
    return result.user
  }, [])

  const signUpWithEmail = useCallback(async (email, password) => {
    if (SSO_QA_ISOLATED || getSsoState().status !== 'legacy') throw new Error('Use o UHub para gerenciar sua sessão e credenciais.')
    setAuthError(null)
    const result = await createUserWithEmailAndPassword(auth, email, password)
    return result.user
  }, [])

  const signInWithGoogle = useCallback(async () => {
    if (SSO_QA_ISOLATED || getSsoState().status !== 'legacy') throw new Error('Use o UHub para gerenciar sua sessão e credenciais.')
    setAuthError(null)
    const result = await signInWithPopup(auth, googleProvider)
    return result.user
  }, [])

  const sendEmailLink = useCallback(async (email, continueUrl) => {
    if (SSO_QA_ISOLATED || getSsoState().status !== 'legacy') throw new Error('Use o UHub para gerenciar sua sessão e credenciais.')
    setAuthError(null)
    const trimmed = String(email ?? '').trim()
    if (!trimmed) {
      throw new Error('Informe um email valido.')
    }
    const actionCodeSettings = {
      url: continueUrl ?? window.location.origin,
      handleCodeInApp: true,
    }
    await sendSignInLinkToEmail(auth, trimmed, actionCodeSettings)
    window.localStorage.setItem(EMAIL_LINK_STORAGE_KEY, trimmed)
    return trimmed
  }, [])

  const completeEmailLinkSignIn = useCallback(async (email, link) => {
    if (SSO_QA_ISOLATED || getSsoState().status !== 'legacy') throw new Error('Use o UHub para gerenciar sua sessão e credenciais.')
    setAuthError(null)
    const trimmed = String(email ?? '').trim()
    if (!trimmed) {
      throw new Error('Informe o email usado para receber o link.')
    }
    const finalLink = link ?? window.location.href
    const result = await signInWithEmailLink(auth, trimmed, finalLink)
    window.localStorage.removeItem(EMAIL_LINK_STORAGE_KEY)
    return result.user
  }, [])

  const isEmailLink = useCallback((link) => {
    if (SSO_QA_ISOLATED) return false
    const target = link ?? window.location.href
    return isSignInWithEmailLink(auth, target)
  }, [])

  const signOut = useCallback(async () => {
    if (getSsoState().status === 'active') {
      try {
        const response = await fetch('/api/auth/sso/logout', ssoRequestOptions({ method: 'POST' }))
        if (!response.ok) throw new Error('Não foi possível encerrar a sessão UHub. Tente novamente.')
        setSsoState({ status: 'blocked', csrf: null, user: null })
      } catch (error) { setAuthError(error); return }
    }
    if (auth) await firebaseSignOut(auth)
    setUser(getSsoState().status === 'legacy' && DEV_AUTH_BYPASS_ENABLED ? { uid: 'local-preview-admin', email: DEV_AUTH_EMAIL } : null)
  }, [])

  const sendPasswordReset = useCallback(async (email) => {
    if (SSO_QA_ISOLATED || getSsoState().status !== 'legacy') throw new Error('Use o UHub para gerenciar sua sessão e credenciais.')
    setAuthError(null)
    const fallback = auth.currentUser?.email ?? ''
    const target = String(email ?? fallback).trim()
    if (!target) {
      throw new Error('Não foi possível identificar o e-mail da conta.')
    }
    const response = await fetch('/api/auth/password-reset', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: target }),
    })
    const payload = await response.json().catch(() => ({}))
    if (!response.ok) {
      throw new Error(payload?.error ?? 'Falha ao enviar e-mail de redefinição de senha.')
    }
    return target
  }, [])

  const value = useMemo(
    () => ({
      user,
      ssoEnabled: ssoAvailable,
      legacyLoginAllowed: !SSO_QA_ISOLATED && getSsoState().status === 'legacy',
      signInWithUhub,
      isLoading,
      error: authError,
      signInWithEmail,
      signUpWithEmail,
      signInWithGoogle,
      sendEmailLink,
      completeEmailLinkSignIn,
      isEmailLink,
      signOut,
      sendPasswordReset,
    }),
    [
      user,
      isLoading,
      authError,
      ssoAvailable,
      signInWithUhub,
      signInWithEmail,
      signUpWithEmail,
      signInWithGoogle,
      sendEmailLink,
      completeEmailLinkSignIn,
      isEmailLink,
      signOut,
      sendPasswordReset,
    ],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
