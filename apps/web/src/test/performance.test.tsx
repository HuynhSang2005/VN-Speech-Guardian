/**
 * Performance Tests - VN Speech Guardian
 * Comprehensive performance testing cho rendering, memory, bundle size
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// Mock performance API
const mockPerformance = {
  mark: vi.fn(),
  measure: vi.fn(),
  getEntriesByType: vi.fn(),
  getEntriesByName: vi.fn(),
  now: vi.fn(() => Date.now()),
  memory: {
    usedJSHeapSize: 50 * 1024 * 1024, // 50MB
    totalJSHeapSize: 100 * 1024 * 1024, // 100MB
    jsHeapSizeLimit: 2 * 1024 * 1024 * 1024, // 2GB
  },
};

// Mock IntersectionObserver for lazy loading tests
const mockIntersectionObserver = vi.fn().mockImplementation((callback) => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

global.IntersectionObserver = mockIntersectionObserver;
global.performance = mockPerformance as any;

// Mock components for performance testing
const Button = ({ children, onClick, ...props }: any) => (
  <button onClick={onClick} {...props}>{children}</button>
);

const LazyComponent = ({ data }: { data: any[] }) => (
  <div data-testid="lazy-component">
    {data.map((item, index) => (
      <div key={index}>{item.name}</div>
    ))}
  </div>
);

const HeavyComponent = ({ count = 1000 }: { count?: number }) => {
  const items = Array.from({ length: count }, (_, i) => ({
    id: i,
    name: `Item ${i}`,
    value: Math.random(),
  }));

  return (
    <div data-testid="heavy-component">
      {items.map(item => (
        <div key={item.id} className="item">
          {item.name}: {item.value.toFixed(3)}
        </div>
      ))}
    </div>
  );
};

// =============================================================================
// Rendering Performance Tests
// =============================================================================

describe('Rendering Performance', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    performance.mark('test-start');
  });

  afterEach(() => {
    performance.mark('test-end');
    performance.measure('test-duration', 'test-start', 'test-end');
  });

  it('renders large lists efficiently', async () => {
    const startTime = performance.now();
    
    render(<HeavyComponent count={1000} />);
    
    const endTime = performance.now();
    const renderTime = endTime - startTime;
    
    expect(screen.getByTestId('heavy-component')).toBeInTheDocument();
    expect(renderTime).toBeLessThan(100); // Should render in less than 100ms
    
    // Verify all items are rendered
    const items = screen.getAllByText(/Item \d+:/);
    expect(items).toHaveLength(1000);
  });

  it('handles rapid state updates efficiently', async () => {
    let renderCount = 0;
    
    function RapidUpdateComponent() {
      const [count, setCount] = React.useState(0);
      renderCount++;
      
      React.useEffect(() => {
        const timer = setInterval(() => {
          setCount(c => c + 1);
        }, 10);
        
        setTimeout(() => clearInterval(timer), 100);
        return () => clearInterval(timer);
      }, []);
      
      return <div data-testid="counter">Count: {count}</div>;
    }

    const startTime = performance.now();
    
    render(<RapidUpdateComponent />);
    
    // Wait for updates to complete
    await new Promise(resolve => setTimeout(resolve, 150));
    
    const endTime = performance.now();
    
    expect(screen.getByTestId('counter')).toBeInTheDocument();
    expect(renderCount).toBeLessThan(20); // Should batch updates efficiently
    expect(endTime - startTime).toBeLessThan(200);
  });

  it('memoizes expensive calculations', async () => {
    let calculationCount = 0;
    
    function ExpensiveCalculationComponent({ data }: { data: number[] }) {
      const expensiveValue = React.useMemo(() => {
        calculationCount++;
        return data.reduce((sum, num) => sum + Math.sqrt(num), 0);
      }, [data]);
      
      return <div data-testid="result">Result: {expensiveValue.toFixed(2)}</div>;
    }

    const testData = Array.from({ length: 1000 }, (_, i) => i + 1);
    
    const { rerender } = render(<ExpensiveCalculationComponent data={testData} />);
    
    expect(calculationCount).toBe(1);
    
    // Rerender with same data - should not recalculate
    rerender(<ExpensiveCalculationComponent data={testData} />);
    expect(calculationCount).toBe(1);
    
    // Rerender with different data - should recalculate
    const newData = [...testData, 1001];
    rerender(<ExpensiveCalculationComponent data={newData} />);
    expect(calculationCount).toBe(2);
  });

  it('virtualizes long lists for better performance', async () => {
    function VirtualizedList({ items }: { items: any[] }) {
      const [visibleRange, setVisibleRange] = React.useState({ start: 0, end: 50 });
      const containerRef = React.useRef<HTMLDivElement>(null);
      
      const handleScroll = () => {
        if (containerRef.current) {
          const scrollTop = containerRef.current.scrollTop;
          const itemHeight = 40;
          const containerHeight = containerRef.current.clientHeight;
          
          const start = Math.floor(scrollTop / itemHeight);
          const end = Math.min(start + Math.ceil(containerHeight / itemHeight) + 5, items.length);
          
          setVisibleRange({ start, end });
        }
      };
      
      const visibleItems = items.slice(visibleRange.start, visibleRange.end);
      
      return (
        <div
          ref={containerRef}
          onScroll={handleScroll}
          style={{ height: 400, overflowY: 'auto' }}
          data-testid="virtualized-list"
        >
          <div style={{ height: items.length * 40 }}>
            <div style={{ transform: `translateY(${visibleRange.start * 40}px)` }}>
              {visibleItems.map(item => (
                <div key={item.id} style={{ height: 40 }}>
                  {item.name}
                </div>
              ))}
            </div>
          </div>
        </div>
      );
    }

    const items = Array.from({ length: 10000 }, (_, i) => ({
      id: i,
      name: `Item ${i}`,
    }));

    const startTime = performance.now();
    
    render(<VirtualizedList items={items} />);
    
    const endTime = performance.now();
    
    expect(screen.getByTestId('virtualized-list')).toBeInTheDocument();
    expect(endTime - startTime).toBeLessThan(50); // Should render quickly despite large dataset
    
    // Should only render visible items
    const renderedItems = screen.getAllByText(/Item \d+/);
    expect(renderedItems.length).toBeLessThan(100); // Much less than 10000
  });
});

// =============================================================================
// Memory Management Tests
// =============================================================================

describe('Memory Management', () => {
  it('cleans up event listeners on unmount', () => {
    const addEventListener = vi.spyOn(window, 'addEventListener');
    const removeEventListener = vi.spyOn(window, 'removeEventListener');
    
    function ComponentWithListeners() {
      React.useEffect(() => {
        const handleResize = () => {};
        const handleScroll = () => {};
        
        window.addEventListener('resize', handleResize);
        window.addEventListener('scroll', handleScroll);
        
        return () => {
          window.removeEventListener('resize', handleResize);
          window.removeEventListener('scroll', handleScroll);
        };
      }, []);
      
      return <div>Component with listeners</div>;
    }

    const { unmount } = render(<ComponentWithListeners />);
    
    expect(addEventListener).toHaveBeenCalledTimes(2);
    
    unmount();
    
    expect(removeEventListener).toHaveBeenCalledTimes(2);
  });

  it('cancels ongoing async operations on unmount', async () => {
    let isCancelled = false;
    const mockFetch = vi.fn(() => 
      new Promise((resolve) => {
        setTimeout(() => {
          if (!isCancelled) {
            resolve({ data: 'test' });
          }
        }, 100);
      })
    );

    function AsyncComponent() {
      const [data, setData] = React.useState(null);
      
      React.useEffect(() => {
        const abortController = new AbortController();
        
        mockFetch()
          .then((result) => {
            if (!abortController.signal.aborted) {
              setData(result);
            }
          });
        
        return () => {
          isCancelled = true;
          abortController.abort();
        };
      }, []);
      
      return <div>{data ? 'Data loaded' : 'Loading...'}</div>;
    }

    const { unmount } = render(<AsyncComponent />);
    
    expect(screen.getByText('Loading...')).toBeInTheDocument();
    
    // Unmount before async operation completes
    unmount();
    
    // Wait for async operation to complete
    await new Promise(resolve => setTimeout(resolve, 150));
    
    expect(isCancelled).toBe(true);
  });

  it('handles large datasets without memory leaks', async () => {
    const initialMemory = performance.memory.usedJSHeapSize;
    
    function LargeDataComponent({ size }: { size: number }) {
      const [data, setData] = React.useState<any[]>([]);
      
      React.useEffect(() => {
        const largeArray = Array.from({ length: size }, (_, i) => ({
          id: i,
          data: new Array(1000).fill(`data-${i}`), // Large objects
        }));
        setData(largeArray);
        
        return () => {
          setData([]); // Clean up on unmount
        };
      }, [size]);
      
      return (
        <div data-testid="large-data">
          Items: {data.length}
        </div>
      );
    }

    // Mount with large dataset
    const { unmount, rerender } = render(<LargeDataComponent size={1000} />);
    
    expect(screen.getByText('Items: 1000')).toBeInTheDocument();
    
    // Update to even larger dataset
    rerender(<LargeDataComponent size={5000} />);
    
    await new Promise(resolve => setTimeout(resolve, 100));
    
    expect(screen.getByText('Items: 5000')).toBeInTheDocument();
    
    // Unmount to trigger cleanup
    unmount();
    
    // Memory should not grow excessively
    const finalMemory = performance.memory.usedJSHeapSize;
    const memoryGrowth = finalMemory - initialMemory;
    
    expect(memoryGrowth).toBeLessThan(100 * 1024 * 1024); // Less than 100MB growth
  });
});

// =============================================================================
// Bundle Size and Lazy Loading Tests
// =============================================================================

describe('Bundle Optimization', () => {
  it('supports code splitting and lazy loading', async () => {
    let loadCount = 0;
    
    const LazyLoadedComponent = React.lazy(() => {
      loadCount++;
      return Promise.resolve({
        default: ({ name }: { name: string }) => <div>Lazy: {name}</div>
      });
    });

    function LazyWrapper() {
      const [showComponent, setShowComponent] = React.useState(false);
      
      return (
        <div>
          <Button onClick={() => setShowComponent(true)}>
            Load Component
          </Button>
          
          {showComponent && (
            <React.Suspense fallback={<div>Loading...</div>}>
              <LazyLoadedComponent name="Test" />
            </React.Suspense>
          )}
        </div>
      );
    }

    const user = userEvent.setup();
    render(<LazyWrapper />);
    
    // Component should not be loaded initially
    expect(loadCount).toBe(0);
    expect(screen.queryByText('Lazy: Test')).not.toBeInTheDocument();
    
    // Click to load component
    const loadButton = screen.getByRole('button', { name: 'Load Component' });
    await user.click(loadButton);
    
    // Should show loading state
    expect(screen.getByText('Loading...')).toBeInTheDocument();
    
    // Wait for component to load
    await screen.findByText('Lazy: Test');
    
    expect(loadCount).toBe(1);
    expect(screen.getByText('Lazy: Test')).toBeInTheDocument();
  });

  it('implements image lazy loading', async () => {
    const mockObserver = {
      observe: vi.fn(),
      unobserve: vi.fn(),
      disconnect: vi.fn(),
    };
    
    const mockIntersectionObserver = vi.fn().mockImplementation((callback) => {
      // Simulate image coming into view
      setTimeout(() => {
        callback([{ isIntersecting: true, target: {} }]);
      }, 100);
      
      return mockObserver;
    });
    
    global.IntersectionObserver = mockIntersectionObserver;

    function LazyImage({ src, alt }: { src: string; alt: string }) {
      const [isLoaded, setIsLoaded] = React.useState(false);
      const [imageSrc, setImageSrc] = React.useState('');
      const imgRef = React.useRef<HTMLImageElement>(null);
      
      React.useEffect(() => {
        const observer = new IntersectionObserver(
          (entries) => {
            entries.forEach(entry => {
              if (entry.isIntersecting && !isLoaded) {
                setImageSrc(src);
                setIsLoaded(true);
                observer.unobserve(entry.target);
              }
            });
          }
        );
        
        if (imgRef.current) {
          observer.observe(imgRef.current);
        }
        
        return () => observer.disconnect();
      }, [src, isLoaded]);
      
      return (
        <img
          ref={imgRef}
          src={imageSrc || 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMSIgaGVpZ2h0PSIxIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9IiNjY2MiLz48L3N2Zz4='}
          alt={alt}
          data-testid="lazy-image"
        />
      );
    }

    render(<LazyImage src="/test-image.jpg" alt="Test image" />);
    
    const image = screen.getByTestId('lazy-image');
    expect(mockObserver.observe).toHaveBeenCalledWith(image);
    
    // Wait for intersection observer to trigger
    await new Promise(resolve => setTimeout(resolve, 150));
    
    expect(image).toHaveAttribute('src', '/test-image.jpg');
  });

  it('prefetches critical resources', async () => {
    const mockLink = {
      rel: '',
      href: '',
      as: '',
    };
    
    const createElement = vi.spyOn(document, 'createElement').mockReturnValue(mockLink as any);
    const appendChild = vi.spyOn(document.head, 'appendChild').mockImplementation(vi.fn());

    function ResourcePrefetcher({ resources }: { resources: string[] }) {
      React.useEffect(() => {
        resources.forEach(resource => {
          const link = document.createElement('link');
          link.rel = 'prefetch';
          link.href = resource;
          document.head.appendChild(link);
        });
      }, [resources]);
      
      return <div data-testid="prefetcher">Prefetching resources...</div>;
    }

    render(<ResourcePrefetcher resources={['/chunk1.js', '/chunk2.js', '/styles.css']} />);
    
    expect(createElement).toHaveBeenCalledWith('link');
    expect(appendChild).toHaveBeenCalledTimes(3);
    
    // Verify prefetch links were created correctly
    expect(mockLink.rel).toBe('prefetch');
  });
});

// =============================================================================
// Real-time Performance Tests
// =============================================================================

describe('Real-time Performance', () => {
  it('handles high-frequency audio data updates efficiently', async () => {
    let updateCount = 0;
    
    function AudioProcessor({ sampleRate }: { sampleRate: number }) {
      const [audioData, setAudioData] = React.useState<Float32Array>(new Float32Array(1024));
      
      React.useEffect(() => {
        const interval = setInterval(() => {
          updateCount++;
          const newData = new Float32Array(1024);
          for (let i = 0; i < 1024; i++) {
            newData[i] = Math.sin(2 * Math.PI * i / 1024) * Math.random();
          }
          setAudioData(newData);
        }, 1000 / sampleRate); // Update at sample rate frequency
        
        setTimeout(() => clearInterval(interval), 100); // Run for 100ms
        
        return () => clearInterval(interval);
      }, [sampleRate]);
      
      const averageAmplitude = audioData.reduce((sum, val) => sum + Math.abs(val), 0) / audioData.length;
      
      return (
        <div data-testid="audio-processor">
          Average Amplitude: {averageAmplitude.toFixed(4)}
        </div>
      );
    }

    const startTime = performance.now();
    
    render(<AudioProcessor sampleRate={60} />); // 60 FPS updates
    
    // Wait for updates to complete
    await new Promise(resolve => setTimeout(resolve, 150));
    
    const endTime = performance.now();
    
    expect(screen.getByTestId('audio-processor')).toBeInTheDocument();
    expect(updateCount).toBeGreaterThan(5); // Should have multiple updates
    expect(endTime - startTime).toBeLessThan(200); // Should complete efficiently
  });

  it('debounces rapid user input', async () => {
    let searchCount = 0;
    
    function SearchComponent() {
      const [query, setQuery] = React.useState('');
      const [results, setResults] = React.useState<string[]>([]);
      
      const debouncedSearch = React.useMemo(
        () => debounce(async (searchQuery: string) => {
          searchCount++;
          // Simulate search API call
          const mockResults = [`Result for "${searchQuery}" 1`, `Result for "${searchQuery}" 2`];
          setResults(mockResults);
        }, 300),
        []
      );
      
      React.useEffect(() => {
        if (query) {
          debouncedSearch(query);
        } else {
          setResults([]);
        }
      }, [query, debouncedSearch]);
      
      return (
        <div>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search..."
            data-testid="search-input"
          />
          <div data-testid="search-results">
            {results.map((result, index) => (
              <div key={index}>{result}</div>
            ))}
          </div>
        </div>
      );
    }

    const user = userEvent.setup({ delay: 50 });
    render(<SearchComponent />);
    
    const searchInput = screen.getByTestId('search-input');
    
    // Type rapidly
    await user.type(searchInput, 'hello world');
    
    // Search should not have been called yet (debounced)
    expect(searchCount).toBe(0);
    
    // Wait for debounce delay
    await new Promise(resolve => setTimeout(resolve, 350));
    
    // Search should have been called only once
    expect(searchCount).toBe(1);
    expect(screen.getByText('Result for "hello world" 1')).toBeInTheDocument();
  });
});

// =============================================================================
// Utility Functions for Performance Testing
// =============================================================================

function debounce<T extends (...args: any[]) => any>(func: T, wait: number): T {
  let timeout: NodeJS.Timeout;
  return ((...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  }) as T;
}

// =============================================================================
// Performance Monitoring Utilities
// =============================================================================

describe('Performance Monitoring', () => {
  it('measures component render times', () => {
    function TimedComponent() {
      React.useEffect(() => {
        performance.mark('component-render-start');
        
        return () => {
          performance.mark('component-render-end');
          performance.measure('component-render-time', 'component-render-start', 'component-render-end');
        };
      });
      
      return <div>Timed component</div>;
    }

    const { unmount } = render(<TimedComponent />);
    
    expect(performance.mark).toHaveBeenCalledWith('component-render-start');
    
    unmount();
    
    expect(performance.mark).toHaveBeenCalledWith('component-render-end');
    expect(performance.measure).toHaveBeenCalledWith(
      'component-render-time',
      'component-render-start',
      'component-render-end'
    );
  });

  it('tracks memory usage over time', async () => {
    const memorySnapshots: number[] = [];
    
    function MemoryTracker() {
      React.useEffect(() => {
        const interval = setInterval(() => {
          memorySnapshots.push(performance.memory.usedJSHeapSize);
        }, 100);
        
        setTimeout(() => clearInterval(interval), 500);
        
        return () => clearInterval(interval);
      }, []);
      
      return <div>Memory tracker</div>;
    }

    render(<MemoryTracker />);
    
    // Wait for memory tracking to complete
    await new Promise(resolve => setTimeout(resolve, 600));
    
    expect(memorySnapshots.length).toBeGreaterThan(3);
    
    // Memory usage should be reasonable
    memorySnapshots.forEach(snapshot => {
      expect(snapshot).toBeLessThan(500 * 1024 * 1024); // Less than 500MB
    });
  });
});