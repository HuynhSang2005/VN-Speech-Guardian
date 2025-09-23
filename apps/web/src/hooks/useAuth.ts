/**
 * Enhanced useAuth hook wrapper cho VN Speech Guardian  
 * Mở rộng Clerk useAuth với additional features:
 * - Token management với automatic refresh
 * - Error handling và retry logic  
 * - TanStack Query integration
 * - Vietnamese-friendly error messages
 * - Type-safe user data access
 */

import { useAuth as useClerkAuth, useUser } from '@clerk/clerk-react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useCallback, useMemo } from 'react'
import type { UserResource } from '@clerk/types'

// Types
export interface AuthUser {
  id: string
  email: string | null
  firstName: string | null
  lastName: string | null
  fullName: string | null
  imageUrl: string
  primaryEmailAddress: string | null
  primaryPhoneNumber: string | null
  username: string | null
  publicMetadata: Record<string, any>
  createdAt: Date
  updatedAt: Date
}

export interface AuthState {
  // Authentication status
  isLoaded: boolean
  isSignedIn: boolean
  isLoading: boolean
  
  // User data
  user: AuthUser | null
  userId: string | null
  
  // Session management
  sessionId: string | null
  
  // Token management
  getToken: () => Promise<string | null>
  refreshToken: () => Promise<string | null>
  
  // Auth actions
  signOut: () => Promise<void>
  
  // Error handling
  error: string | null
  
  // Utility flags
  hasRole: (role: string) => boolean
  hasPermission: (permission: string) => boolean
}

// Vietnamese error messages
const AUTH_ERRORS = {
  TOKEN_EXPIRED: 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.',
  NETWORK_ERROR: 'Lỗi kết nối mạng. Vui lòng kiểm tra internet và thử lại.',
  UNAUTHORIZED: 'Bạn không có quyền truy cập tính năng này.',
  SESSION_INVALID: 'Phiên đăng nhập không hợp lệ. Vui lòng đăng nhập lại.',
  USER_NOT_FOUND: 'Không tìm thấy thông tin người dùng.',
  UNKNOWN_ERROR: 'Đã xảy ra lỗi không xác định. Vui lòng thử lại sau.',
} as const

/**
 * Transform Clerk UserResource to our AuthUser type
 */
const transformClerkUser = (clerkUser: UserResource | null | undefined): AuthUser | null => {
  if (!clerkUser) return null
  
  return {
    id: clerkUser.id,
    email: clerkUser.emailAddresses[0]?.emailAddress || null,
    firstName: clerkUser.firstName,
    lastName: clerkUser.lastName,
    fullName: clerkUser.fullName,
    imageUrl: clerkUser.imageUrl,
    primaryEmailAddress: clerkUser.primaryEmailAddress?.emailAddress || null,
    primaryPhoneNumber: clerkUser.primaryPhoneNumber?.phoneNumber || null,
    username: clerkUser.username,
    publicMetadata: clerkUser.publicMetadata || {},
    createdAt: clerkUser.createdAt!,
    updatedAt: clerkUser.updatedAt!,
  }
}

/**
 * Enhanced useAuth hook với Vietnamese support và extended functionality
 */
export const useAuth = (): AuthState => {
  const clerkAuth = useClerkAuth()
  const { user: clerkUser, isLoaded: isUserLoaded } = useUser()
  const queryClient = useQueryClient()
  
  // Token management với caching và error handling
  const {
    data: cachedToken,
    error: tokenError,
    refetch: refetchToken,
    isLoading: isTokenLoading,
  } = useQuery({
    queryKey: ['auth', 'token', clerkAuth.userId],
    queryFn: async () => {
      if (!clerkAuth.isSignedIn) return null
      
      try {
        const token = await clerkAuth.getToken()
        return token
      } catch (error) {
        console.error('[useAuth] Token fetch error:', error)
        throw new Error(AUTH_ERRORS.TOKEN_EXPIRED)
      }
    },
    enabled: !!clerkAuth.isSignedIn && !!clerkAuth.userId,
    staleTime: 1000 * 60 * 5, // 5 minutes - tokens are valid for 60 seconds but we refresh earlier
    retry: (failureCount, error) => {
      // Don't retry on auth errors
      if (error.message.includes('TOKEN_EXPIRED') || error.message.includes('UNAUTHORIZED')) {
        return false
      }
      return failureCount < 2
    },
    refetchInterval: 1000 * 60 * 4, // Refresh every 4 minutes (before 5 min expiry)
    refetchIntervalInBackground: false, // Don't refresh in background to save resources
  })
  
  // Enhanced getToken với retry logic
  const getToken = useCallback(async (): Promise<string | null> => {
    if (!clerkAuth.isSignedIn) {
      console.warn('[useAuth] getToken called but user not signed in')
      return null
    }
    
    try {
      // Try to get fresh token first
      const token = await clerkAuth.getToken()
      
      // Update cache with fresh token
      queryClient.setQueryData(['auth', 'token', clerkAuth.userId], token)
      
      return token
    } catch (error) {
      console.error('[useAuth] getToken error:', error)
      
      // Try using cached token as fallback
      if (cachedToken) {
        console.warn('[useAuth] Using cached token as fallback')
        return cachedToken
      }
      
      throw new Error(AUTH_ERRORS.TOKEN_EXPIRED)
    }
  }, [clerkAuth, cachedToken, queryClient])
  
  // Enhanced refreshToken
  const refreshToken = useCallback(async (): Promise<string | null> => {
    try {
      // Force refetch token
      const result = await refetchToken()
      return result.data || null
    } catch (error) {
      console.error('[useAuth] refreshToken error:', error)
      throw new Error(AUTH_ERRORS.TOKEN_EXPIRED)
    }
  }, [refetchToken])
  
  // Enhanced signOut với cleanup
  const signOut = useCallback(async (): Promise<void> => {
    try {
      // Clear auth-related queries
      queryClient.removeQueries({ queryKey: ['auth'] })
      queryClient.removeQueries({ queryKey: ['user'] })
      
      // Sign out from Clerk
      await clerkAuth.signOut()
    } catch (error) {
      console.error('[useAuth] signOut error:', error)
      // Still clear local state even if Clerk signOut fails
      queryClient.removeQueries({ queryKey: ['auth'] })
      queryClient.removeQueries({ queryKey: ['user'] })
      throw new Error(AUTH_ERRORS.UNKNOWN_ERROR)
    }
  }, [clerkAuth, queryClient])
  
  // Role checking (from public metadata)
  const hasRole = useCallback((role: string): boolean => {
    if (!clerkUser?.publicMetadata) return false
    const userRoles = clerkUser.publicMetadata.roles as string[] | undefined
    return Array.isArray(userRoles) && userRoles.includes(role)
  }, [clerkUser])
  
  // Permission checking (from public metadata)
  const hasPermission = useCallback((permission: string): boolean => {
    if (!clerkUser?.publicMetadata) return false
    const userPermissions = clerkUser.publicMetadata.permissions as string[] | undefined
    return Array.isArray(userPermissions) && userPermissions.includes(permission)
  }, [clerkUser])
  
  // Transform and memoize user data
  const transformedUser = useMemo(() => {
    return transformClerkUser(clerkUser)
  }, [clerkUser])
  
  // Error handling
  const error = useMemo(() => {
    if (tokenError) {
      return tokenError.message || AUTH_ERRORS.TOKEN_EXPIRED
    }
    
    if (clerkAuth.isSignedIn && !isUserLoaded) {
      return AUTH_ERRORS.USER_NOT_FOUND
    }
    
    return null
  }, [tokenError, clerkAuth.isSignedIn, isUserLoaded])
  
  // Loading state computation
  const isLoading = useMemo(() => {
    return !clerkAuth.isLoaded || isTokenLoading || (clerkAuth.isSignedIn && !isUserLoaded)
  }, [clerkAuth.isLoaded, isTokenLoading, clerkAuth.isSignedIn, isUserLoaded])
  
  return {
    // Authentication status
    isLoaded: clerkAuth.isLoaded && isUserLoaded,
    isSignedIn: !!clerkAuth.isSignedIn,
    isLoading,
    
    // User data
    user: transformedUser,
    userId: clerkAuth.userId || null,
    
    // Session management
    sessionId: clerkAuth.sessionId || null,
    
    // Token management
    getToken,
    refreshToken,
    
    // Auth actions
    signOut,
    
    // Error handling
    error,
    
    // Utility functions
    hasRole,
    hasPermission,
  }
}

/**
 * Hook để check authentication status mà không cần full user data
 * Useful cho components chỉ cần biết signed in/out status
 */
export const useAuthStatus = () => {
  const { isLoaded, isSignedIn, isLoading, error } = useAuth()
  
  return {
    isLoaded,
    isSignedIn,
    isLoading,
    error,
  }
}

/**
 * Hook để get authentication token cho API calls
 * Simplified version chỉ focus vào token management
 */
export const useAuthToken = () => {
  const { getToken, refreshToken, isSignedIn, error } = useAuth()
  
  return {
    getToken,
    refreshToken,
    isSignedIn,
    error,
  }
}