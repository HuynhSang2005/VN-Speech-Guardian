/**
 * Unit tests for useAuth hook
 * Testing: authentication state, token management, error handling
 * Tools: Vitest + React Testing Library + MSW
 */

import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ClerkProvider } from '@clerk/clerk-react'
import { type ReactNode } from 'react'
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'

import { useAuth } from '../useAuth'

// Mock Clerk hooks
vi.mock('@clerk/clerk-react', () => ({
  ClerkProvider: ({ children }: { children: ReactNode }) => children,
  useAuth: vi.fn(),
  useUser: vi.fn(),
}))

// Mock environment
vi.mock('../lib/api-client', () => ({
  setTokenProvider: vi.fn(),
}))

const mockClerkAuth = {
  isLoaded: true,
  isSignedIn: true,
  userId: 'user_123',
  sessionId: 'sess_123',
  getToken: vi.fn(),
  signOut: vi.fn(),
}

const mockClerkUser = {
  id: 'user_123',
  emailAddresses: [{ emailAddress: 'test@example.com' }],
  firstName: 'Test',
  lastName: 'User',
  fullName: 'Test User',
  imageUrl: 'https://example.com/avatar.jpg',
  primaryEmailAddress: { emailAddress: 'test@example.com' },
  primaryPhoneNumber: null,
  username: 'testuser',
  publicMetadata: { roles: ['user'] },
  createdAt: new Date('2023-01-01'),
  updatedAt: new Date('2023-01-01'),
}

// Test wrapper
function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })
  
  return function TestWrapper({ children }: { children: ReactNode }) {
    return (
      <ClerkProvider publishableKey="pk_test_fake">
        <QueryClientProvider client={queryClient}>
          {children}
        </QueryClientProvider>
      </ClerkProvider>
    )
  }
}

describe('useAuth Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    
    // Default mock implementations
    const { useAuth: mockUseAuth, useUser: mockUseUser } = vi.mocked(
      require('@clerk/clerk-react')
    )
    
    mockUseAuth.mockReturnValue(mockClerkAuth)
    mockUseUser.mockReturnValue({ 
      user: mockClerkUser, 
      isLoaded: true 
    })
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  describe('Authentication State', () => {
    it('should return authenticated state when user is signed in', async () => {
      const wrapper = createWrapper()
      const { result } = renderHook(() => useAuth(), { wrapper })

      await waitFor(() => {
        expect(result.current.isSignedIn).toBe(true)
        expect(result.current.isLoaded).toBe(true)
        expect(result.current.isLoading).toBe(false)
        expect(result.current.user).toEqual({
          id: 'user_123',
          email: 'test@example.com',
          firstName: 'Test',
          lastName: 'User',
          fullName: 'Test User',
          imageUrl: 'https://example.com/avatar.jpg',
          primaryEmailAddress: 'test@example.com',
          primaryPhoneNumber: null,
          username: 'testuser',
          publicMetadata: { roles: ['user'] },
          createdAt: mockClerkUser.createdAt,
          updatedAt: mockClerkUser.updatedAt,
        })
      })
    })

    it('should return unauthenticated state when user is not signed in', async () => {
      const { useAuth: mockUseAuth } = vi.mocked(require('@clerk/clerk-react'))
      mockUseAuth.mockReturnValue({
        ...mockClerkAuth,
        isSignedIn: false,
        userId: null,
        sessionId: null,
      })

      const wrapper = createWrapper()
      const { result } = renderHook(() => useAuth(), { wrapper })

      await waitFor(() => {
        expect(result.current.isSignedIn).toBe(false)
        expect(result.current.user).toBe(null)
        expect(result.current.userId).toBe(null)
        expect(result.current.sessionId).toBe(null)
      })
    })

    it('should show loading state when not loaded', () => {
      const { useAuth: mockUseAuth } = vi.mocked(require('@clerk/clerk-react'))
      mockUseAuth.mockReturnValue({
        ...mockClerkAuth,
        isLoaded: false,
      })

      const wrapper = createWrapper()
      const { result } = renderHook(() => useAuth(), { wrapper })

      expect(result.current.isLoaded).toBe(false)
      expect(result.current.isLoading).toBe(true)
    })
  })

  describe('Token Management', () => {
    it('should get token successfully', async () => {
      const mockToken = 'mock_jwt_token'
      mockClerkAuth.getToken.mockResolvedValue(mockToken)

      const wrapper = createWrapper()
      const { result } = renderHook(() => useAuth(), { wrapper })

      await waitFor(() => {
        expect(result.current.isLoaded).toBe(true)
      })

      const token = await result.current.getToken()
      expect(token).toBe(mockToken)
      expect(mockClerkAuth.getToken).toHaveBeenCalled()
    })

    it('should handle token error gracefully', async () => {
      mockClerkAuth.getToken.mockRejectedValue(new Error('Token expired'))

      const wrapper = createWrapper()
      const { result } = renderHook(() => useAuth(), { wrapper })

      await waitFor(() => {
        expect(result.current.isLoaded).toBe(true)
      })

      await expect(result.current.getToken()).rejects.toThrow('Phiên đăng nhập đã hết hạn')
    })

    it('should return null when not signed in', async () => {
      const { useAuth: mockUseAuth } = vi.mocked(require('@clerk/clerk-react'))
      mockUseAuth.mockReturnValue({
        ...mockClerkAuth,
        isSignedIn: false,
      })

      const wrapper = createWrapper()
      const { result } = renderHook(() => useAuth(), { wrapper })

      await waitFor(() => {
        expect(result.current.isLoaded).toBe(true)
      })

      const token = await result.current.getToken()
      expect(token).toBe(null)
    })

    it('should refresh token successfully', async () => {
      const mockToken = 'refreshed_jwt_token'
      mockClerkAuth.getToken.mockResolvedValue(mockToken)

      const wrapper = createWrapper()
      const { result } = renderHook(() => useAuth(), { wrapper })

      await waitFor(() => {
        expect(result.current.isLoaded).toBe(true)
      })

      const token = await result.current.refreshToken()
      expect(token).toBe(mockToken)
    })
  })

  describe('Sign Out', () => {
    it('should sign out successfully', async () => {
      mockClerkAuth.signOut.mockResolvedValue(undefined)

      const wrapper = createWrapper()
      const { result } = renderHook(() => useAuth(), { wrapper })

      await waitFor(() => {
        expect(result.current.isLoaded).toBe(true)
      })

      await result.current.signOut()
      expect(mockClerkAuth.signOut).toHaveBeenCalled()
    })

    it('should handle sign out error', async () => {
      mockClerkAuth.signOut.mockRejectedValue(new Error('Network error'))

      const wrapper = createWrapper()
      const { result } = renderHook(() => useAuth(), { wrapper })

      await waitFor(() => {
        expect(result.current.isLoaded).toBe(true)
      })

      await expect(result.current.signOut()).rejects.toThrow('Đã xảy ra lỗi không xác định')
    })
  })

  describe('Role and Permission Checking', () => {
    it('should check roles correctly', async () => {
      const wrapper = createWrapper()
      const { result } = renderHook(() => useAuth(), { wrapper })

      await waitFor(() => {
        expect(result.current.isLoaded).toBe(true)
      })

      expect(result.current.hasRole('user')).toBe(true)
      expect(result.current.hasRole('admin')).toBe(false)
      expect(result.current.hasRole('nonexistent')).toBe(false)
    })

    it('should check permissions correctly', async () => {
      const { useUser: mockUseUser } = vi.mocked(require('@clerk/clerk-react'))
      mockUseUser.mockReturnValue({
        user: {
          ...mockClerkUser,
          publicMetadata: { 
            roles: ['user'], 
            permissions: ['read', 'write'] 
          }
        },
        isLoaded: true,
      })

      const wrapper = createWrapper()
      const { result } = renderHook(() => useAuth(), { wrapper })

      await waitFor(() => {
        expect(result.current.isLoaded).toBe(true)
      })

      expect(result.current.hasPermission('read')).toBe(true)
      expect(result.current.hasPermission('write')).toBe(true)
      expect(result.current.hasPermission('admin')).toBe(false)
    })

    it('should return false for roles/permissions when no metadata', async () => {
      const { useUser: mockUseUser } = vi.mocked(require('@clerk/clerk-react'))
      mockUseUser.mockReturnValue({
        user: {
          ...mockClerkUser,
          publicMetadata: {}
        },
        isLoaded: true,
      })

      const wrapper = createWrapper()
      const { result } = renderHook(() => useAuth(), { wrapper })

      await waitFor(() => {
        expect(result.current.isLoaded).toBe(true)
      })

      expect(result.current.hasRole('user')).toBe(false)
      expect(result.current.hasPermission('read')).toBe(false)
    })
  })

  describe('Error Handling', () => {
    it('should handle user loading error', () => {
      const { useUser: mockUseUser } = vi.mocked(require('@clerk/clerk-react'))
      mockUseUser.mockReturnValue({
        user: null,
        isLoaded: false,
      })

      const wrapper = createWrapper()
      const { result } = renderHook(() => useAuth(), { wrapper })

      expect(result.current.error).toBe('Không tìm thấy thông tin người dùng.')
    })
  })
})