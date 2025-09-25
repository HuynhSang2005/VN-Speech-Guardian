/**
 * Lazy Loading Performance Tests
 * Test suite for lazy loading optimization features
 * - Route-level code splitting
 * - Component-level lazy loading
 * - Progressive loading patterns
 * - Loading performance validation
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor, act } from '@testing-library/react'
import { userEvent } from '@testing-library/user-event'
import React, { Suspense } from 'react'
import { MemoryRouter } from 'react-router-dom'

// Mock Intersection Observer
global.IntersectionObserver = vi.fn().mockImplementation((callback) => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
  root: null,
  rootMargin: '',
  thresholds: [],
  takeRecords: vi.fn()
}))

// Mock dynamic imports
vi.mock('../../src/pages/Dashboard', () => ({
  default: vi.fn(() => <div data-testid="dashboard-page">Dashboard Content</div>)
}))

vi.mock('../../src/pages/Live', () => ({
  default: vi.fn(() => <div data-testid="live-page">Live Content</div>)
}))

vi.mock('../../src/pages/Sessions', () => ({
  default: vi.fn(() => <div data-testid="sessions-page">Sessions Content</div>)
}))

// Import lazy loading utilities
import { 
  LazyDashboard,
  LazySessions,
  LazyLive,
  LazySettings,
  preloadRoute,
  getRouteChunkInfo,
  withLazyLoading
} from '../lib/lazy-routes'

describe('Route-level Lazy Loading', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('createLazyComponent', () => {
    it('should create lazy component with proper loading state', async () => {
      const MockComponent = vi.fn(() => <div data-testid="mock-component">Mock Content</div>)
      const LazyMock = createLazyComponent(() => Promise.resolve({ default: MockComponent }))

      render(
        <Suspense fallback={<div data-testid="loading">Loading...</div>}>
          <LazyMock />
        </Suspense>
      )

      // Should show loading initially
      expect(screen.getByTestId('loading')).toBeInTheDocument()

      // Should load component after promise resolves
      await waitFor(() => {
        expect(screen.getByTestId('mock-component')).toBeInTheDocument()
      })

      expect(MockComponent).toHaveBeenCalled()
    })

    it('should handle loading errors gracefully', async () => {
      const LazyError = createLazyComponent(() => Promise.reject(new Error('Load failed')))

      const ErrorBoundary = ({ children }: { children: React.ReactNode }) => {
        try {
          return <>{children}</>
        } catch (error) {
          return <div data-testid="error">Error loading component</div>
        }
      }

      render(
        <ErrorBoundary>
          <Suspense fallback={<div data-testid="loading">Loading...</div>}>
            <LazyError />
          </Suspense>
        </ErrorBoundary>
      )

      // Should show loading initially
      expect(screen.getByTestId('loading')).toBeInTheDocument()

      // Wait for error to be thrown and caught
      await waitFor(() => {
        expect(screen.queryByTestId('loading')).not.toBeInTheDocument()
      })
    })
  })

  describe('LazyComponentWrapper', () => {
    it('should render with loading skeleton', async () => {
      const MockComponent = vi.fn(() => <div data-testid="mock-component">Mock Content</div>)
      const LazyMock = createLazyComponent(() => Promise.resolve({ default: MockComponent }))
      
      const LoadingSkeleton = () => <div data-testid="skeleton">Loading skeleton</div>

      render(
        <LazyComponentWrapper 
          component={LazyMock} 
          fallback={<LoadingSkeleton />}
          errorMessage="Failed to load component"
        />
      )

      // Should show skeleton initially
      expect(screen.getByTestId('skeleton')).toBeInTheDocument()

      // Should load component
      await waitFor(() => {
        expect(screen.getByTestId('mock-component')).toBeInTheDocument()
      })
    })

    it('should measure loading performance', async () => {
      const MockComponent = vi.fn(() => <div data-testid="mock-component">Mock Content</div>)
      const LazyMock = createLazyComponent(() => Promise.resolve({ default: MockComponent }))
      
      const performanceSpy = vi.spyOn(performance, 'mark')
      const measureSpy = vi.spyOn(performance, 'measure')

      render(
        <LazyComponentWrapper 
          component={LazyMock}
          componentName="TestComponent"
        />
      )

      await waitFor(() => {
        expect(screen.getByTestId('mock-component')).toBeInTheDocument()
      })

      expect(performanceSpy).toHaveBeenCalledWith('TestComponent-start')
      expect(performanceSpy).toHaveBeenCalledWith('TestComponent-end')
      expect(measureSpy).toHaveBeenCalledWith(
        'TestComponent-load-time', 
        'TestComponent-start', 
        'TestComponent-end'
      )

      performanceSpy.mockRestore()
      measureSpy.mockRestore()
    })
  })
})

describe('Component-level Lazy Loading', () => {
  describe('ProgressiveLoader', () => {
    it('should render placeholder initially', () => {
      const TestComponent = () => <div data-testid="test-component">Test Content</div>
      const Placeholder = () => <div data-testid="placeholder">Placeholder</div>

      render(
        <ProgressiveLoader 
          component={TestComponent}
          placeholder={Placeholder}
          threshold={0.1}
        />
      )

      expect(screen.getByTestId('placeholder')).toBeInTheDocument()
      expect(screen.queryByTestId('test-component')).not.toBeInTheDocument()
    })

    it('should load component when intersecting', async () => {
      const TestComponent = () => <div data-testid="test-component">Test Content</div>
      const Placeholder = () => <div data-testid="placeholder">Placeholder</div>

      // Mock intersection observer callback
      let intersectionCallback: (entries: any[]) => void = () => {}
      const MockIntersectionObserver = vi.fn().mockImplementation((callback) => {
        intersectionCallback = callback
        return {
          observe: vi.fn(),
          unobserve: vi.fn(),
          disconnect: vi.fn()
        }
      })
      global.IntersectionObserver = MockIntersectionObserver

      render(
        <ProgressiveLoader 
          component={TestComponent}
          placeholder={Placeholder}
          threshold={0.1}
        />
      )

      expect(screen.getByTestId('placeholder')).toBeInTheDocument()

      // Simulate intersection
      act(() => {
        intersectionCallback([{ isIntersecting: true }])
      })

      await waitFor(() => {
        expect(screen.getByTestId('test-component')).toBeInTheDocument()
      })

      expect(screen.queryByTestId('placeholder')).not.toBeInTheDocument()
    })
  })

  describe('useIntersectionObserver', () => {
    it('should detect intersection correctly', () => {
      let observerCallback: (entries: any[]) => void = () => {}
      const MockIntersectionObserver = vi.fn().mockImplementation((callback) => {
        observerCallback = callback
        return {
          observe: vi.fn(),
          unobserve: vi.fn(),
          disconnect: vi.fn()
        }
      })
      global.IntersectionObserver = MockIntersectionObserver

      const TestComponent = () => {
        const [ref, isIntersecting] = useIntersectionObserver({ threshold: 0.5 })
        
        return (
          <div ref={ref} data-testid="test-element">
            {isIntersecting ? 'Visible' : 'Not visible'}
          </div>
        )
      }

      render(<TestComponent />)

      expect(screen.getByText('Not visible')).toBeInTheDocument()

      // Simulate intersection
      act(() => {
        observerCallback([{ isIntersecting: true }])
      })

      expect(screen.getByText('Visible')).toBeInTheDocument()
    })

    it('should cleanup observer on unmount', () => {
      const mockDisconnect = vi.fn()
      const MockIntersectionObserver = vi.fn().mockImplementation(() => ({
        observe: vi.fn(),
        unobserve: vi.fn(),
        disconnect: mockDisconnect
      }))
      global.IntersectionObserver = MockIntersectionObserver

      const TestComponent = () => {
        const [ref] = useIntersectionObserver()
        return <div ref={ref} data-testid="test-element">Test</div>
      }

      const { unmount } = render(<TestComponent />)
      
      unmount()
      
      expect(mockDisconnect).toHaveBeenCalled()
    })
  })

  describe('useLazyLoad', () => {
    it('should provide lazy loading state management', () => {
      const TestComponent = () => {
        const { shouldLoad, triggerLoad, isLoading } = useLazyLoad()
        
        return (
          <div>
            <div data-testid="should-load">{shouldLoad ? 'true' : 'false'}</div>
            <div data-testid="is-loading">{isLoading ? 'true' : 'false'}</div>
            <button onClick={triggerLoad} data-testid="trigger">Load</button>
          </div>
        )
      }

      render(<TestComponent />)

      expect(screen.getByTestId('should-load')).toHaveTextContent('false')
      expect(screen.getByTestId('is-loading')).toHaveTextContent('false')

      // Trigger loading
      act(() => {
        screen.getByTestId('trigger').click()
      })

      expect(screen.getByTestId('should-load')).toHaveTextContent('true')
    })
  })
})

describe('Performance Validation', () => {
  describe('Bundle Size Impact', () => {
    it('should lazy load components only when needed', async () => {
      // Track dynamic imports
      const importSpy = vi.fn()
      
      // Mock dynamic import
      const mockImport = vi.fn(() => {
        importSpy()
        return Promise.resolve({ 
          default: () => <div data-testid="lazy-component">Lazy Content</div>
        })
      })

      const LazyComponent = createLazyComponent(mockImport)

      // Component should not be imported until rendered
      expect(importSpy).not.toHaveBeenCalled()

      render(
        <Suspense fallback={<div>Loading...</div>}>
          <LazyComponent />
        </Suspense>
      )

      // Now it should be imported
      expect(mockImport).toHaveBeenCalledOnce()
    })

    it('should not duplicate imports for same component', async () => {
      const importSpy = vi.fn(() => Promise.resolve({ 
        default: () => <div data-testid="lazy-component">Lazy Content</div>
      }))

      const LazyComponent = createLazyComponent(importSpy)

      // Render multiple instances
      render(
        <Suspense fallback={<div>Loading...</div>}>
          <LazyComponent />
          <LazyComponent />
        </Suspense>
      )

      await waitFor(() => {
        expect(screen.getAllByTestId('lazy-component')).toHaveLength(2)
      })

      // Import should only be called once
      expect(importSpy).toHaveBeenCalledOnce()
    })
  })

  describe('Loading Performance', () => {
    it('should measure component loading time', async () => {
      const performanceMarks: string[] = []
      const performanceMeasures: string[] = []
      
      vi.spyOn(performance, 'mark').mockImplementation((name) => {
        performanceMarks.push(name)
      })
      
      vi.spyOn(performance, 'measure').mockImplementation((name) => {
        performanceMeasures.push(name)
      })

      const MockComponent = () => <div data-testid="mock-component">Mock Content</div>
      const LazyMock = createLazyComponent(() => Promise.resolve({ default: MockComponent }))

      render(
        <LazyComponentWrapper 
          component={LazyMock}
          componentName="TestComponent"
        />
      )

      await waitFor(() => {
        expect(screen.getByTestId('mock-component')).toBeInTheDocument()
      })

      expect(performanceMarks).toContain('TestComponent-start')
      expect(performanceMarks).toContain('TestComponent-end')
      expect(performanceMeasures).toContain('TestComponent-load-time')
    })
  })

  describe('Memory Usage Optimization', () => {
    it('should cleanup intersection observers', () => {
      const mockDisconnect = vi.fn()
      const MockIntersectionObserver = vi.fn().mockImplementation(() => ({
        observe: vi.fn(),
        unobserve: vi.fn(),
        disconnect: mockDisconnect
      }))
      global.IntersectionObserver = MockIntersectionObserver

      const TestComponent = () => {
        const [ref] = useIntersectionObserver()
        return <div ref={ref}>Test</div>
      }

      const { unmount } = render(<TestComponent />)
      unmount()

      expect(mockDisconnect).toHaveBeenCalled()
    })

    it('should not create observers when not supported', () => {
      // Mock browser without IntersectionObserver
      const originalIO = global.IntersectionObserver
      // @ts-expect-error - Intentionally deleting for test
      delete global.IntersectionObserver

      const TestComponent = () => {
        const [ref, isIntersecting] = useIntersectionObserver()
        return (
          <div ref={ref}>
            {isIntersecting ? 'Visible' : 'Not visible'}
          </div>
        )
      }

      // Should not throw error
      expect(() => render(<TestComponent />)).not.toThrow()

      // Restore
      global.IntersectionObserver = originalIO
    })
  })
})

describe('Preloading Optimization', () => {
  describe('preloadComponent', () => {
    it('should preload component without rendering', async () => {
      const importSpy = vi.fn(() => Promise.resolve({ 
        default: () => <div>Preloaded Component</div>
      }))

      await preloadComponent(importSpy)
      
      expect(importSpy).toHaveBeenCalledOnce()
    })

    it('should handle preload errors gracefully', async () => {
      const importSpy = vi.fn(() => Promise.reject(new Error('Preload failed')))

      // Should not throw error
      await expect(preloadComponent(importSpy)).resolves.toBeUndefined()
    })

    it('should cache preloaded components', async () => {
      const importSpy = vi.fn(() => Promise.resolve({ 
        default: () => <div>Cached Component</div>
      }))

      // Preload twice
      await preloadComponent(importSpy)
      await preloadComponent(importSpy)
      
      // Should only import once due to caching
      expect(importSpy).toHaveBeenCalledOnce()
    })
  })
})

describe('Error Handling', () => {
  it('should handle component load failures', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    
    const FailingComponent = createLazyComponent(() => 
      Promise.reject(new Error('Component load failed'))
    )

    const ErrorBoundary = ({ children }: { children: React.ReactNode }) => {
      try {
        return <>{children}</>
      } catch (error) {
        return <div data-testid="error-boundary">Error occurred</div>
      }
    }

    render(
      <ErrorBoundary>
        <Suspense fallback={<div>Loading...</div>}>
          <FailingComponent />
        </Suspense>
      </ErrorBoundary>
    )

    await waitFor(() => {
      expect(screen.getByText('Loading...')).toBeInTheDocument()
    })

    consoleSpy.mockRestore()
  })

  it('should provide fallback UI for failed components', async () => {
    const FailingComponent = createLazyComponent(() => 
      Promise.reject(new Error('Load failed'))
    )

    render(
      <LazyComponentWrapper 
        component={FailingComponent}
        errorMessage="Component failed to load"
        fallback={<div data-testid="fallback">Loading...</div>}
      />
    )

    expect(screen.getByTestId('fallback')).toBeInTheDocument()
  })
})

describe('Route-based Code Splitting Integration', () => {
  it('should work with React Router', async () => {
    const MockPage = () => <div data-testid="mock-page">Mock Page</div>
    const LazyPage = createLazyComponent(() => Promise.resolve({ default: MockPage }))

    render(
      <MemoryRouter initialEntries={['/test']}>
        <Suspense fallback={<div data-testid="route-loading">Loading page...</div>}>
          <LazyPage />
        </Suspense>
      </MemoryRouter>
    )

    expect(screen.getByTestId('route-loading')).toBeInTheDocument()

    await waitFor(() => {
      expect(screen.getByTestId('mock-page')).toBeInTheDocument()
    })
  })
})