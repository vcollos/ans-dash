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
import { auth, googleProvider } from '../lib/firebaseClient'
import AuthContext from './auth-context'

const EMAIL_LINK_STORAGE_KEY = 'auth:emailLink'
const DEV_AUTH_BYPASS_ENABLED = import.meta.env.DEV && import.meta.env.VITE_DEV_AUTH_BYPASS === 'true'
const DEV_AUTH_EMAIL = import.meta.env.VITE_DEV_AUTH_EMAIL || 'vitor@collos.com.br'

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [authError, setAuthError] = useState(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    getRedirectResult(auth).catch((error) => {
      console.warn('[auth] Falha ao concluir login Google por redirecionamento', error)
      setAuthError(error)
      setIsLoading(false)
    })
    const unsub = onAuthStateChanged(
      auth,
      (currentUser) => {
        setUser(DEV_AUTH_BYPASS_ENABLED ? { uid: 'local-preview-admin', email: DEV_AUTH_EMAIL } : (currentUser ?? null))
        setIsLoading(false)
      },
      (error) => {
        console.warn('[auth] Falha ao observar autenticacao', error)
        setAuthError(error)
        setIsLoading(false)
      },
    )
    return () => unsub()
  }, [])

  const signInWithEmail = useCallback(async (email, password) => {
    setAuthError(null)
    const result = await signInWithEmailAndPassword(auth, email, password)
    return result.user
  }, [])

  const signUpWithEmail = useCallback(async (email, password) => {
    setAuthError(null)
    const result = await createUserWithEmailAndPassword(auth, email, password)
    return result.user
  }, [])

  const signInWithGoogle = useCallback(async () => {
    setAuthError(null)
    const result = await signInWithPopup(auth, googleProvider)
    return result.user
  }, [])

  const sendEmailLink = useCallback(async (email, continueUrl) => {
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
    const target = link ?? window.location.href
    return isSignInWithEmailLink(auth, target)
  }, [])

  const signOut = useCallback(async () => {
    await firebaseSignOut(auth)
    setUser(DEV_AUTH_BYPASS_ENABLED ? { uid: 'local-preview-admin', email: DEV_AUTH_EMAIL } : null)
  }, [])

  const sendPasswordReset = useCallback(async (email) => {
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
