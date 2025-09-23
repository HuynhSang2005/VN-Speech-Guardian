/**
 * Auth Provider Component  
 * Integrates custom useAuth hook với API client token provider
 * Cung cấp authentication context cho entire app
 */

import { type ReactNode, useEffect } from 'react'
import { useAuth } from '../../hooks/useAuth'
import { setTokenProvider } from '../../lib/api-client'

interface AuthProviderProps {
  children: ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const { getToken } = useAuth()
  
  // Set token provider cho API client
  useEffect(() => {
    setTokenProvider(getToken)
  }, [getToken])
  
  return <>{children}</>
}