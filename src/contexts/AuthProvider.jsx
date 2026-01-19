import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut as firebaseSignOut,
} from 'firebase/auth'
import { auth, googleProvider } from '../lib/firebaseClient'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [authError, setAuthError] = useState(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const unsub = onAuthStateChanged(
      auth,
      (currentUser) => {
        setUser(currentUser ?? null)
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

  const signInWithGoogle = useCallback(async () => {
    setAuthError(null)
    const result = await signInWithPopup(auth, googleProvider)
    return result.user
  }, [])

  const signOut = useCallback(async () => {
    await firebaseSignOut(auth)
    setUser(null)
  }, [])

  const value = useMemo(
    () => ({
      user,
      isLoading,
      error: authError,
      signInWithEmail,
      signInWithGoogle,
      signOut,
    }),
    [user, isLoading, authError, signInWithEmail, signInWithGoogle, signOut],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth deve ser usado dentro de AuthProvider')
  }
  return context
}
