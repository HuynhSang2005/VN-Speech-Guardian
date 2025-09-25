/**
 * React.memo Performance Tests  
 * Test suite for React.memo optimization strategies
 * - Memoization effectiveness
 * - Custom comparison functions
 * - Re-render prevention validation
 * - Performance benchmarking
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import React, { useState, memo } from 'react'
import {
  memoWithShallowCompare,
  memoWithDeepCompare,
  memoWithCustomCompare,
  createOptimizedListComponent,
  OptimizedButton,
  OptimizedInput,
  shallowEqual,
  deepEqual,
  useStableCallback,
  useStableObject,
  createPerformanceMonitoredMemo
} from '../lib/memo-optimization'

describe('React.memo Optimization Strategies', () => {
  describe('Shallow Comparison', () => {
    it('should prevent re-renders with identical shallow props', () => {
      const renderSpy = vi.fn()
      
      const TestComponent = memoWithShallowCompare<{ name: string; age: number }>(
        ({ name, age }) => {
          renderSpy()
          return <div data-testid="test-component">{name}: {age}</div>
        }
      )

      const Parent = () => {
        const [count, setCount] = useState(0)
        const props = { name: 'John', age: 30 }
        
        return (
          <div>
            <TestComponent {...props} />
            <button onClick={() => setCount(c => c + 1)} data-testid="increment">
              Count: {count}
            </button>
          </div>
        )
      }

      render(<Parent />)
      
      expect(renderSpy).toHaveBeenCalledTimes(1)
      
      // Parent re-renders but props are same
      fireEvent.click(screen.getByTestId('increment'))
      
      // Component should not re-render
      expect(renderSpy).toHaveBeenCalledTimes(1)
    })

    it('should re-render when shallow props change', () => {
      const renderSpy = vi.fn()
      
      const TestComponent = memoWithShallowCompare<{ name: string; age: number }>(
        ({ name, age }) => {
          renderSpy()
          return <div data-testid="test-component">{name}: {age}</div>
        }
      )

      const Parent = () => {
        const [age, setAge] = useState(30)
        
        return (
          <div>
            <TestComponent name="John" age={age} />
            <button onClick={() => setAge(a => a + 1)} data-testid="increment-age">
              Increment Age
            </button>
          </div>
        )
      }

      render(<Parent />)
      
      expect(renderSpy).toHaveBeenCalledTimes(1)
      
      // Props change
      fireEvent.click(screen.getByTestId('increment-age'))
      
      // Component should re-render
      expect(renderSpy).toHaveBeenCalledTimes(2)
    })
  })

  describe('Deep Comparison', () => {
    it('should prevent re-renders with identical deep props', () => {
      const renderSpy = vi.fn()
      
      interface DeepProps {
        user: {
          id: number
          profile: {
            name: string
            settings: {
              theme: string
              notifications: boolean
            }
          }
        }
      }
      
      const TestComponent = memoWithDeepCompare<DeepProps>(({ user }) => {
        renderSpy()
        return <div data-testid="test-component">{user.profile.name}</div>
      })

      const Parent = () => {
        const [count, setCount] = useState(0)
        const user = {
          id: 1,
          profile: {
            name: 'John',
            settings: {
              theme: 'dark',
              notifications: true
            }
          }
        }
        
        return (
          <div>
            <TestComponent user={user} />
            <button onClick={() => setCount(c => c + 1)} data-testid="increment">
              Count: {count}
            </button>
          </div>
        )
      }

      render(<Parent />)
      
      expect(renderSpy).toHaveBeenCalledTimes(1)
      
      // Parent re-renders but deep props are same
      fireEvent.click(screen.getByTestId('increment'))
      
      // Component should not re-render due to deep comparison
      expect(renderSpy).toHaveBeenCalledTimes(1)
    })

    it('should re-render when deep props change', () => {
      const renderSpy = vi.fn()
      
      interface DeepProps {
        user: {
          profile: {
            settings: {
              theme: string
            }
          }
        }
      }
      
      const TestComponent = memoWithDeepCompare<DeepProps>(({ user }) => {
        renderSpy()
        return <div data-testid="test-component">{user.profile.settings.theme}</div>
      })

      const Parent = () => {
        const [theme, setTheme] = useState('dark')
        const user = {
          profile: {
            settings: {
              theme
            }
          }
        }
        
        return (
          <div>
            <TestComponent user={user} />
            <button onClick={() => setTheme('light')} data-testid="change-theme">
              Change Theme
            </button>
          </div>
        )
      }

      render(<Parent />)
      
      expect(renderSpy).toHaveBeenCalledTimes(1)
      
      // Deep props change
      fireEvent.click(screen.getByTestId('change-theme'))
      
      // Component should re-render
      expect(renderSpy).toHaveBeenCalledTimes(2)
      expect(screen.getByTestId('test-component')).toHaveTextContent('light')
    })
  })

  describe('Custom Comparison', () => {
    it('should use custom comparison logic', () => {
      const renderSpy = vi.fn()
      const compareSpy = vi.fn()
      
      interface Props {
        items: Array<{ id: number; important: boolean }>
      }
      
      // Only compare important items
      const customCompare = (prevProps: Props, nextProps: Props) => {
        compareSpy(prevProps, nextProps)
        
        const prevImportant = prevProps.items.filter(item => item.important)
        const nextImportant = nextProps.items.filter(item => item.important)
        
        return JSON.stringify(prevImportant) === JSON.stringify(nextImportant)
      }
      
      const TestComponent = memoWithCustomCompare<Props>(
        ({ items }) => {
          renderSpy()
          return (
            <div data-testid="test-component">
              {items.filter(item => item.important).length} important items
            </div>
          )
        },
        customCompare
      )

      const Parent = () => {
        const [items, setItems] = useState([
          { id: 1, important: true },
          { id: 2, important: false }
        ])
        
        return (
          <div>
            <TestComponent items={items} />
            <button 
              onClick={() => setItems([
                { id: 1, important: true },
                { id: 2, important: false },
                { id: 3, important: false } // Add non-important item
              ])} 
              data-testid="add-non-important"
            >
              Add Non-Important
            </button>
            <button 
              onClick={() => setItems([
                { id: 1, important: true },
                { id: 2, important: false },
                { id: 3, important: true } // Add important item
              ])} 
              data-testid="add-important"
            >
              Add Important
            </button>
          </div>
        )
      }

      render(<Parent />)
      
      expect(renderSpy).toHaveBeenCalledTimes(1)
      expect(compareSpy).not.toHaveBeenCalled()
      
      // Add non-important item - should not re-render
      fireEvent.click(screen.getByTestId('add-non-important'))
      
      expect(compareSpy).toHaveBeenCalledTimes(1)
      expect(renderSpy).toHaveBeenCalledTimes(1) // No re-render
      
      // Add important item - should re-render
      fireEvent.click(screen.getByTestId('add-important'))
      
      expect(compareSpy).toHaveBeenCalledTimes(2)
      expect(renderSpy).toHaveBeenCalledTimes(2) // Re-render occurred
    })
  })
})

describe('Optimized Components', () => {
  describe('MemoizedSessionCard', () => {
    it('should not re-render with same session data', () => {
      const renderSpy = vi.fn()
      
      // Mock the component to track renders
      // Mock component for testing
      const SessionCard = ({ id, title }: { id: number; title: string }) => <div>{title}</div>
      const MemoizedSessionCard = memoWithShallowCompare(SessionCard)
      const OriginalSessionCard = MemoizedSessionCard
      const SpiedSessionCard = memo((props: any) => {
        renderSpy()
        return OriginalSessionCard(props)
      })

      const session = {
        id: '1',
        startTime: new Date('2024-01-01T10:00:00Z'),
        duration: 120000,
        detections: 5,
        status: 'completed' as const
      }

      const Parent = () => {
        const [count, setCount] = useState(0)
        
        return (
          <div>
            <SpiedSessionCard session={session} />
            <button onClick={() => setCount(c => c + 1)} data-testid="increment">
              Count: {count}
            </button>
          </div>
        )
      }

      render(<Parent />)
      
      expect(renderSpy).toHaveBeenCalledTimes(1)
      
      // Parent re-renders but props are same
      fireEvent.click(screen.getByTestId('increment'))
      
      // Component should not re-render
      expect(renderSpy).toHaveBeenCalledTimes(1)
    })
  })

  describe('MemoizedStatCard', () => {
    it('should re-render only when stat values change', () => {
      const renderSpy = vi.fn()
      
      const OriginalStatCard = MemoizedStatCard
      const SpiedStatCard = memo((props: any) => {
        renderSpy()
        return OriginalStatCard(props)
      })

      const Parent = () => {
        const [value, setValue] = useState(100)
        const [otherState, setOtherState] = useState(0)
        
        return (
          <div>
            <SpiedStatCard 
              title="Test Metric"
              value={value}
              change={+5.2}
              icon="📊"
            />
            <button onClick={() => setValue(v => v + 10)} data-testid="change-value">
              Change Value
            </button>
            <button onClick={() => setOtherState(s => s + 1)} data-testid="change-other">
              Change Other
            </button>
          </div>
        )
      }

      render(<Parent />)
      
      expect(renderSpy).toHaveBeenCalledTimes(1)
      
      // Change other state - should not re-render
      fireEvent.click(screen.getByTestId('change-other'))
      expect(renderSpy).toHaveBeenCalledTimes(1)
      
      // Change value - should re-render
      fireEvent.click(screen.getByTestId('change-value'))
      expect(renderSpy).toHaveBeenCalledTimes(2)
    })
  })

  describe('createOptimizedListComponent', () => {
    it('should create list component with proper virtualization', () => {
      const ItemComponent = ({ item, index }: { item: any; index: number }) => (
        <div data-testid={`item-${index}`}>Item {item.id}</div>
      )

      const OptimizedList = createOptimizedListComponent(ItemComponent, {
        itemHeight: 50,
        windowSize: 5
      })

      const items = Array.from({ length: 20 }, (_, i) => ({ id: i + 1 }))

      render(<OptimizedList items={items} />)

      // Should only render visible items initially
      expect(screen.queryByTestId('item-0')).toBeInTheDocument()
      expect(screen.queryByTestId('item-4')).toBeInTheDocument()
      expect(screen.queryByTestId('item-15')).not.toBeInTheDocument()
    })
  })
})

describe('Performance Benchmarking', () => {
  describe('Re-render Prevention', () => {
    it('should significantly reduce re-renders in list scenarios', () => {
      const itemRenderCounts = new Map<number, number>()
      
      const ListItem = memo<{ item: { id: number; value: string }; index: number }>(({ item, index }) => {
        const currentCount = itemRenderCounts.get(index) || 0
        itemRenderCounts.set(index, currentCount + 1)
        
        return <div data-testid={`item-${index}`}>{item.value}</div>
      })

      const Parent = () => {
        const [items, setItems] = useState([
          { id: 1, value: 'Item 1' },
          { id: 2, value: 'Item 2' },
          { id: 3, value: 'Item 3' }
        ])
        const [selected, setSelected] = useState<number | null>(null)
        
        return (
          <div>
            {items.map((item, index) => (
              <ListItem key={item.id} item={item} index={index} />
            ))}
            <button onClick={() => setSelected(selected === 1 ? null : 1)} data-testid="select">
              Toggle Select
            </button>
            <button 
              onClick={() => setItems(prev => [
                ...prev,
                { id: Date.now(), value: `Item ${prev.length + 1}` }
              ])}
              data-testid="add-item"
            >
              Add Item
            </button>
          </div>
        )
      }

      render(<Parent />)
      
      // Initial render
      expect(itemRenderCounts.get(0)).toBe(1)
      expect(itemRenderCounts.get(1)).toBe(1)
      expect(itemRenderCounts.get(2)).toBe(1)
      
      // Change parent state - items should not re-render
      fireEvent.click(screen.getByTestId('select'))
      
      expect(itemRenderCounts.get(0)).toBe(1) // No additional renders
      expect(itemRenderCounts.get(1)).toBe(1)
      expect(itemRenderCounts.get(2)).toBe(1)
      
      // Add item - existing items should not re-render
      fireEvent.click(screen.getByTestId('add-item'))
      
      expect(itemRenderCounts.get(0)).toBe(1) // Still no additional renders
      expect(itemRenderCounts.get(1)).toBe(1)
      expect(itemRenderCounts.get(2)).toBe(1)
      expect(itemRenderCounts.get(3)).toBe(1) // New item rendered once
    })
  })

  describe('Memory Usage Optimization', () => {
    it('should not create new function references unnecessarily', () => {
      const callbackRefs = new Set()
      
      const TestComponent = memo<{ onClick: () => void; data: string }>(({ onClick, data }) => {
        callbackRefs.add(onClick)
        return <button onClick={onClick} data-testid="test-button">{data}</button>
      })

      const Parent = () => {
        const [count, setCount] = useState(0)
        const [data] = useState('constant data')
        
        // Stable callback reference
        const handleClick = React.useCallback(() => {
          console.log('clicked')
        }, [])
        
        return (
          <div>
            <TestComponent onClick={handleClick} data={data} />
            <button onClick={() => setCount(c => c + 1)} data-testid="increment">
              Count: {count}
            </button>
          </div>
        )
      }

      render(<Parent />)
      
      const initialRefCount = callbackRefs.size
      
      // Multiple parent re-renders
      fireEvent.click(screen.getByTestId('increment'))
      fireEvent.click(screen.getByTestId('increment'))
      fireEvent.click(screen.getByTestId('increment'))
      
      // Should not create new callback references
      expect(callbackRefs.size).toBe(initialRefCount)
    })
  })

  describe('Performance Metrics', () => {
    it('should track memoization effectiveness', () => {
      let memoHits = 0
      let memoMisses = 0
      
      const customCompare = (prevProps: any, nextProps: any) => {
        const isEqual = prevProps.value === nextProps.value
        if (isEqual) {
          memoHits++
        } else {
          memoMisses++
        }
        return isEqual
      }
      
      const TestComponent = memo<{ value: number }>(({ value }) => {
        return <div data-testid="test-component">{value}</div>
      }, customCompare)

      const Parent = () => {
        const [value, setValue] = useState(100)
        const [trigger, setTrigger] = useState(0)
        
        return (
          <div>
            <TestComponent value={value} />
            <button onClick={() => setTrigger(t => t + 1)} data-testid="trigger">
              Trigger Re-render
            </button>
            <button onClick={() => setValue(v => v + 1)} data-testid="change-value">
              Change Value
            </button>
          </div>
        )
      }

      render(<Parent />)
      
      // Trigger re-renders without changing props
      fireEvent.click(screen.getByTestId('trigger'))
      fireEvent.click(screen.getByTestId('trigger'))
      fireEvent.click(screen.getByTestId('trigger'))
      
      expect(memoHits).toBe(3)
      expect(memoMisses).toBe(0)
      
      // Change props
      fireEvent.click(screen.getByTestId('change-value'))
      
      expect(memoHits).toBe(3)
      expect(memoMisses).toBe(1)
    })
  })
})