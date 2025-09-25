/**
 * Professional Test Utilities - P32 Testing Infrastructure
 * Mục đích: Comprehensive testing utilities for React components, hooks, and integrations
 * Research: Enterprise testing patterns với RTL, MSW, và custom matchers
 */

import { render, RenderOptions, within } from '@testing-library/react'
import { ReactElement, ReactNode } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ClerkProvider } from '@clerk/clerk-react'
import { BrowserRouter } from 'react-router-dom'
import userEvent from '@testing-library/user-event'
import { vi } from 'vitest'

// =============================================================================
// Custom Render Function với Providers
// =============================================================================

interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  // Provider options
  withRouter?: boolean
  withQueryClient?: boolean  
  withClerk?: boolean
  initialRouterEntries?: string[]
  
  // Query client options
  queryClient?: QueryClient
  
  // Clerk options
  clerkProps?: any
}

const AllTheProviders = ({ 
  children, 
  queryClient,
  withRouter = true,
  withQueryClient = true,
  withClerk = true,
  clerkProps = {},
}: {
  children: ReactNode
  queryClient?: QueryClient
  withRouter?: boolean
  withQueryClient?: boolean
  withClerk?: boolean
  clerkProps?: any
}) => {
  // Create default query client nếu không có
  const defaultQueryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false, // Disable retries trong tests
        gcTime: Infinity, // Keep cache forever trong tests
      },
      mutations: {
        retry: false,
      },
    },
  })

  const client = queryClient || defaultQueryClient

  let component = children as ReactElement

  // Wrap với TanStack Query
  if (withQueryClient) {
    component = (
      <QueryClientProvider client={client}>
        {component}
      </QueryClientProvider>
    )
  }

  // Wrap với React Router
  if (withRouter) {
    component = (
      <BrowserRouter>
        {component}
      </BrowserRouter>
    )
  }

  // Wrap với Clerk Provider
  if (withClerk) {
    const defaultClerkProps = {
      publishableKey: process.env.VITE_CLERK_PUBLISHABLE_KEY || 'pk_test_mock',
      appearance: { baseTheme: 'light' },
      ...clerkProps,
    }

    component = (
      <ClerkProvider {...defaultClerkProps}>
        {component}
      </ClerkProvider>  
    )
  }

  return component
}

export const customRender = (
  ui: ReactElement,
  options: CustomRenderOptions = {}
) => {
  const {
    withRouter = true,
    withQueryClient = true,
    withClerk = true,
    queryClient,
    clerkProps,
    ...renderOptions
  } = options

  const Wrapper = ({ children }: { children: ReactNode }) => (
    <AllTheProviders
      queryClient={queryClient}
      withRouter={withRouter}
      withQueryClient={withQueryClient}
      withClerk={withClerk}
      clerkProps={clerkProps}
    >
      {children}
    </AllTheProviders>
  )

  return {
    user: userEvent.setup(),
    ...render(ui, { wrapper: Wrapper, ...renderOptions }),
  }
}

// =============================================================================
// Custom Matchers & Assertions
// =============================================================================

export const expectToBeVisible = (element: HTMLElement) => {
  expect(element).toBeInTheDocument()
  expect(element).toBeVisible()
}

export const expectToHaveAccessibleName = (element: HTMLElement, name: string) => {
  expect(element).toHaveAccessibleName(name)
}

export const expectToHaveAriaLabel = (element: HTMLElement, label: string) => {
  expect(element).toHaveAttribute('aria-label', label)
}

export const expectFormValidation = async (
  form: HTMLElement,
  expectedErrors: Record<string, string>
) => {
  // Submit form để trigger validation
  const submitButton = within(form).getByRole('button', { name: /submit/i })
  await userEvent.click(submitButton)

  // Check for validation errors
  for (const [fieldName, errorMessage] of Object.entries(expectedErrors)) {
    const errorElement = within(form).getByText(errorMessage)
    expect(errorElement).toBeInTheDocument()
  }
}

// =============================================================================
// Audio Testing Utilities
// =============================================================================

export const mockAudioWorklet = () => {
  const mockProcessor = {
    port: {
      postMessage: vi.fn(),
      onmessage: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    },
    connect: vi.fn(),
    disconnect: vi.fn(),
    context: {},
  }

  // Mock AudioWorkletNode globally
  global.AudioWorkletNode = vi.fn().mockImplementation(() => mockProcessor)

  return mockProcessor
}

export const simulateAudioStream = (audioContext: any, sampleRate = 44100, duration = 1) => {
  const frames = sampleRate * duration
  const buffer = audioContext.createBuffer(1, frames, sampleRate)
  const channelData = buffer.getChannelData(0)
  
  // Generate sine wave for testing
  for (let i = 0; i < frames; i++) {
    channelData[i] = Math.sin(2 * Math.PI * 440 * i / sampleRate) // 440Hz tone
  }
  
  return buffer
}

export const mockGetUserMedia = (shouldReject = false, error?: DOMException) => {
  const mockStream = {
    getTracks: () => [
      {
        kind: 'audio',
        stop: vi.fn(),
        enabled: true,
      }
    ],
    active: true,
  }

  if (shouldReject) {
    const defaultError = new DOMException('Permission denied', 'NotAllowedError')
    navigator.mediaDevices.getUserMedia = vi.fn(() => 
      Promise.reject(error || defaultError)
    )
  } else {
    navigator.mediaDevices.getUserMedia = vi.fn(() => 
      Promise.resolve(mockStream as any)
    )
  }

  return mockStream
}

// =============================================================================
// Socket.IO Testing Utilities
// =============================================================================

export const mockSocketIO = () => {
  const eventListeners: Record<string, Function[]> = {}

  const mockSocket = {
    id: 'test-socket-id',
    connected: true,
    
    connect: vi.fn(),
    disconnect: vi.fn(),
    
    emit: vi.fn(),
    
    on: vi.fn((event: string, callback: Function) => {
      if (!eventListeners[event]) {
        eventListeners[event] = []
      }
      eventListeners[event].push(callback)
    }),
    
    off: vi.fn((event: string, callback?: Function) => {
      if (callback) {
        const listeners = eventListeners[event] || []
        const index = listeners.indexOf(callback)
        if (index > -1) {
          listeners.splice(index, 1)
        }
      } else {
        eventListeners[event] = []
      }
    }),
    
    // Test utility methods
    simulateEvent: (event: string, data?: any) => {
      const listeners = eventListeners[event] || []
      listeners.forEach(callback => callback(data))
    },
    
    getListeners: (event: string) => eventListeners[event] || [],
  }

  return mockSocket
}

// =============================================================================
// State Management Testing
// =============================================================================

export const createMockZustandStore = <T>(initialState: T) => {
  let state = initialState

  const getState = () => state
  const setState = (partial: Partial<T> | ((state: T) => Partial<T>)) => {
    const nextState = typeof partial === 'function' ? partial(state) : partial
    state = { ...state, ...nextState }
  }

  return {
    getState,
    setState,
    subscribe: vi.fn(),
    destroy: vi.fn(),
  }
}

// =============================================================================
// Performance Testing Utilities
// =============================================================================

export const measureRenderPerformance = async (renderFunction: () => Promise<void> | void) => {
  const startTime = performance.now()
  
  await renderFunction()
  
  const endTime = performance.now()
  const renderTime = endTime - startTime

  return {
    renderTime,
    isPerformant: renderTime < 16.67, // 60fps target
  }
}

export const simulateSlowNetwork = (delay = 2000) => {
  return new Promise(resolve => setTimeout(resolve, delay))
}

// =============================================================================
// Form Testing Utilities
// =============================================================================

export const fillForm = async (
  form: HTMLElement,
  data: Record<string, string | boolean | number>
) => {
  const user = userEvent.setup()

  for (const [fieldName, value] of Object.entries(data)) {
    const field = within(form).getByLabelText(new RegExp(fieldName, 'i'))
    
    if (field.getAttribute('type') === 'checkbox') {
      if (value) {
        await user.click(field)
      }
    } else {
      await user.clear(field)
      await user.type(field, String(value))
    }
  }
}

export const submitForm = async (form: HTMLElement) => {
  const user = userEvent.setup()
  const submitButton = within(form).getByRole('button', { name: /submit|create|save/i })
  await user.click(submitButton)
}

// =============================================================================
// API Testing Utilities
// =============================================================================

export const waitForLoadingToFinish = () => 
  screen.findByText(/loading/i).then(() => 
    expect(screen.queryByText(/loading/i)).not.toBeInTheDocument()
  ).catch(() => {
    // Loading text might not appear - that's OK
  })

export const expectApiCall = (mockFn: any, expectedUrl: string, expectedOptions?: any) => {
  expect(mockFn).toHaveBeenCalledWith(
    expect.stringContaining(expectedUrl),
    expectedOptions ? expect.objectContaining(expectedOptions) : expect.anything()
  )
}

// =============================================================================
// Error Testing Utilities
// =============================================================================

export const expectErrorBoundary = async (errorComponent: ReactElement) => {
  // Suppress console errors durante error boundary testing
  const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

  try {
    render(errorComponent)
    
    // Should show error boundary UI
    expect(screen.getByText(/something went wrong/i)).toBeInTheDocument()
  } finally {
    consoleSpy.mockRestore()
  }
}

export const simulateNetworkError = () => {
  return new Response(null, {
    status: 500,
    statusText: 'Internal Server Error',
  })
}

// =============================================================================
// Accessibility Testing Utilities
// =============================================================================

export const expectAccessibleButton = (button: HTMLElement) => {
  expect(button).toHaveAttribute('type', 'button')
  expect(button).not.toHaveAttribute('aria-disabled', 'true')
  
  // Should be focusable
  button.focus()
  expect(button).toHaveFocus()
}

export const expectAccessibleForm = (form: HTMLElement) => {
  // All inputs should have labels
  const inputs = within(form).getAllByRole('textbox')
  inputs.forEach(input => {
    expect(input).toHaveAccessibleName()
  })

  // Form should have submit button
  expect(within(form).getByRole('button', { name: /submit/i })).toBeInTheDocument()
}

// =============================================================================
// Component-Specific Testing Utilities
// =============================================================================

export const expectAudioVisualizer = (container: HTMLElement) => {
  // Should have canvas element
  const canvas = within(container).getByRole('img', { hidden: true })
  expect(canvas).toBeInTheDocument()
  expect(canvas.tagName).toBe('CANVAS')
}

export const expectSessionCard = (card: HTMLElement, session: any) => {
  expect(within(card).getByText(session.name)).toBeInTheDocument()
  expect(within(card).getByText(session.startedAt)).toBeInTheDocument()
}

export const expectMetricCard = (card: HTMLElement, expectedValue: string | number) => {
  expect(within(card).getByText(String(expectedValue))).toBeInTheDocument()
}

// =============================================================================
// Export all utilities
// =============================================================================

// Re-export testing library utilities
export * from '@testing-library/react'
export * from '@testing-library/user-event'
export { customRender as render }
export { vi } from 'vitest'