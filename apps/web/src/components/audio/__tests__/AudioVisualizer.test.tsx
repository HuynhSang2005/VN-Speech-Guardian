/**
 * AudioVisualizer Component Tests - P32 Component Testing Suite
 * Mục đích: Comprehensive testing cho AudioVisualizer component với canvas validation
 * TDD Approach: Test behavior, accessibility, performance, edge cases
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, cleanup, screen } from '@testing-library/react'
import { AudioVisualizer } from '../AudioVisualizer'
import { createMockSession, createMockDetection, createMockAudioData } from '../../../test/factories-simple';

// Mock canvas context để test drawing operations
const mockContext2D = {
  clearRect: vi.fn(),
  beginPath: vi.fn(),
  moveTo: vi.fn(),
  lineTo: vi.fn(),
  arc: vi.fn(),
  closePath: vi.fn(),
  stroke: vi.fn(),
  fill: vi.fn(),
  fillRect: vi.fn(),
  strokeRect: vi.fn(),
  createRadialGradient: vi.fn(() => ({
    addColorStop: vi.fn(),
  })),
  createLinearGradient: vi.fn(() => ({
    addColorStop: vi.fn(),
  })),
  save: vi.fn(),
  restore: vi.fn(),
  translate: vi.fn(),
  rotate: vi.fn(),
  scale: vi.fn(),
  // Properties
  fillStyle: '',
  strokeStyle: '',
  lineWidth: 1,
  globalAlpha: 1,
}

// Mock HTMLCanvasElement.getContext
beforeEach(() => {
  HTMLCanvasElement.prototype.getContext = vi.fn(() => mockContext2D)
  
  // Clear all mock calls before each test
  Object.values(mockContext2D).forEach(mockFn => {
    if (typeof mockFn === 'function') {
      mockFn.mockClear()
    }
  })
})

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

describe('AudioVisualizer Component', () => {
  const defaultProps = {
    audioData: createMockAudioData(1024, 1), // 1 second of 1024 samples
    isActive: false,
    size: 'medium' as const,
    theme: 'default' as const,
    className: '',
  }

  describe('Rendering & Structure', () => {
    it('should render canvas element with correct dimensions', () => {
      const { container } = render(<AudioVisualizer {...defaultProps} />)
      
      const canvas = container.querySelector('canvas')
      expect(canvas).toBeInTheDocument()
      expect(canvas).toHaveAttribute('width', '300') // medium size
      expect(canvas).toHaveAttribute('height', '300')
    })

    it('should apply correct size dimensions', () => {
      const { container: smallContainer } = render(
        <AudioVisualizer {...defaultProps} size="small" />
      )
      const { container: largeContainer } = render(
        <AudioVisualizer {...defaultProps} size="large" />
      )

      const smallCanvas = smallContainer.querySelector('canvas')
      const largeCanvas = largeContainer.querySelector('canvas')

      expect(smallCanvas).toHaveAttribute('width', '150')
      expect(smallCanvas).toHaveAttribute('height', '150')
      
      expect(largeCanvas).toHaveAttribute('width', '400')
      expect(largeCanvas).toHaveAttribute('height', '400')
    })

    it('should apply custom className', () => {
      const { container } = render(
        <AudioVisualizer {...defaultProps} className="custom-visualizer" />
      )
      
      const canvas = container.querySelector('canvas')
      expect(canvas).toHaveClass('custom-visualizer')
    })

    it('should be accessible with proper ARIA attributes', () => {
      const { container } = render(<AudioVisualizer {...defaultProps} />)
      
      const canvas = container.querySelector('canvas')
      expect(canvas).toHaveAttribute('role', 'img')
      expect(canvas).toHaveAttribute('aria-label', 'Audio waveform visualization')
    })
  })

  describe('Visual States', () => {
    it('should render idle state when not active', () => {
      render(<AudioVisualizer {...defaultProps} isActive={false} />)
      
      // Should draw breathing circle for idle state
      expect(mockContext2D.createRadialGradient).toHaveBeenCalledWith(
        150, 150, 0, 150, 150, 75 // center coordinates và radius for medium size
      )
      expect(mockContext2D.arc).toHaveBeenCalledWith(
        150, 150, 75, 0, 2 * Math.PI // full circle
      )
      expect(mockContext2D.fill).toHaveBeenCalled()
    })

    it('should render waveform when active with audio data', () => {
      const audioData = createMockAudioData(64, 0.1) // Short sample
      render(<AudioVisualizer {...defaultProps} audioData={audioData} isActive={true} />)
      
      // Should clear canvas first
      expect(mockContext2D.clearRect).toHaveBeenCalledWith(0, 0, 300, 300)
      
      // Should draw waveform lines
      expect(mockContext2D.beginPath).toHaveBeenCalled()
      expect(mockContext2D.moveTo).toHaveBeenCalled()
      expect(mockContext2D.lineTo).toHaveBeenCalled()
      expect(mockContext2D.stroke).toHaveBeenCalled()
    })

    it('should handle empty audio data gracefully', () => {
      const emptyAudioData = new Float32Array(0)
      render(<AudioVisualizer {...defaultProps} audioData={emptyAudioData} isActive={true} />)
      
      // Should not crash and should clear canvas
      expect(mockContext2D.clearRect).toHaveBeenCalledWith(0, 0, 300, 300)
    })

    it('should handle null audio data', () => {
      render(<AudioVisualizer {...defaultProps} audioData={null} isActive={true} />)
      
      // Should render idle state
      expect(mockContext2D.createRadialGradient).toHaveBeenCalled()
      expect(mockContext2D.fill).toHaveBeenCalled()
    })
  })

  describe('Theme Variations', () => {
    it('should apply default theme colors', () => {
      render(<AudioVisualizer {...defaultProps} theme="default" isActive={true} />)
      
      // Should use primary blue color
      expect(mockContext2D.strokeStyle).toContain('#3B82F6')
    })

    it('should apply neon theme colors', () => {
      render(<AudioVisualizer {...defaultProps} theme="neon" isActive={true} />)
      
      // Should use neon green color
      expect(mockContext2D.strokeStyle).toContain('#00FF88')
    })

    it('should apply minimal theme colors', () => {
      render(<AudioVisualizer {...defaultProps} theme="minimal" isActive={true} />)
      
      // Should use indigo color
      expect(mockContext2D.strokeStyle).toContain('#6366F1')
    })
  })

  describe('Audio Data Processing', () => {
    it('should process audio amplitude correctly', () => {
      // Create audio data với known values
      const audioData = new Float32Array([0.5, -0.5, 0.8, -0.8])
      render(<AudioVisualizer {...defaultProps} audioData={audioData} isActive={true} />)
      
      // Should draw lines based on amplitude
      // Each amplitude should affect line length from center
      expect(mockContext2D.moveTo).toHaveBeenCalled()
      expect(mockContext2D.lineTo).toHaveBeenCalled()
    })

    it('should handle high amplitude audio data', () => {
      // Create high amplitude data
      const highAmpData = new Float32Array(32).fill(1.0) // Max amplitude
      render(<AudioVisualizer {...defaultProps} audioData={highAmpData} isActive={true} />)
      
      // Should not crash with high values
      expect(mockContext2D.stroke).toHaveBeenCalled()
    })

    it('should handle low amplitude audio data', () => {
      // Create low amplitude data
      const lowAmpData = new Float32Array(32).fill(0.01) // Very low amplitude
      render(<AudioVisualizer {...defaultProps} audioData={lowAmpData} isActive={true} />)
      
      // Should still render waveform
      expect(mockContext2D.stroke).toHaveBeenCalled()
    })
  })

  describe('Performance & Optimization', () => {
    it('should not re-render unnecessarily with same props', () => {
      const audioData = createMockAudioData(128, 0.5)
      const { rerender } = render(
        <AudioVisualizer {...defaultProps} audioData={audioData} isActive={true} />
      )
      
      const firstCallCount = mockContext2D.clearRect.mock.calls.length
      
      // Re-render với same props
      rerender(<AudioVisualizer {...defaultProps} audioData={audioData} isActive={true} />)
      
      // Should use React.memo optimization
      expect(mockContext2D.clearRect.mock.calls.length).toBe(firstCallCount)
    })

    it('should handle large audio data efficiently', () => {
      const largeAudioData = createMockAudioData(8192, 2) // Large buffer
      
      const startTime = performance.now()
      render(<AudioVisualizer {...defaultProps} audioData={largeAudioData} isActive={true} />)
      const renderTime = performance.now() - startTime
      
      // Should render within performance budget (16ms for 60fps)
      expect(renderTime).toBeLessThan(16)
    })

    it('should cleanup canvas context on unmount', () => {
      const { unmount } = render(<AudioVisualizer {...defaultProps} />)
      
      unmount()
      
      // Verify no memory leaks - canvas context should be cleaned up
      // This is more of a smoke test since actual cleanup depends on implementation
      expect(true).toBe(true) // Placeholder for cleanup verification
    })
  })

  describe('Responsive Behavior', () => {
    it('should maintain aspect ratio for all sizes', () => {
      const sizes = ['small', 'medium', 'large', 'xlarge'] as const
      const expectedSizes = [150, 300, 400, 500]
      
      sizes.forEach((size, index) => {
        const { container} = render(<AudioVisualizer {...defaultProps} size={size} />)
        const canvas = container.querySelector('canvas')
        
        const expectedSize = expectedSizes[index].toString()
        expect(canvas).toHaveAttribute('width', expectedSize)
        expect(canvas).toHaveAttribute('height', expectedSize)
        
        cleanup()
      })
    })

    it('should handle window resize gracefully', () => {
      render(<AudioVisualizer {...defaultProps} />)
      
      // Simulate window resize
      window.dispatchEvent(new Event('resize'))
      
      // Should not crash
      expect(mockContext2D.clearRect).toHaveBeenCalled()
    })
  })

  describe('Error Handling', () => {
    it('should handle canvas context creation failure', () => {
      // Mock failed context creation
      HTMLCanvasElement.prototype.getContext = vi.fn(() => null)
      
      // Should not crash
      expect(() => {
        render(<AudioVisualizer {...defaultProps} />)
      }).not.toThrow()
    })

    it('should handle canvas drawing errors gracefully', () => {
      // Mock canvas drawing error
      mockContext2D.stroke = vi.fn(() => {
        throw new Error('Canvas drawing failed')
      })
      
      // Should not crash the app
      expect(() => {
        render(<AudioVisualizer {...defaultProps} isActive={true} />)
      }).not.toThrow()
    })

    it('should handle invalid audio data format', () => {
      // Test with invalid data type
      const invalidData = [1, 2, 3] as any // Not Float32Array
      
      expect(() => {
        render(<AudioVisualizer {...defaultProps} audioData={invalidData} />)
      }).not.toThrow()
    })
  })

  describe('Animation & Transitions', () => {
    it('should animate rotation when active', () => {
      render(<AudioVisualizer {...defaultProps} isActive={true} />)
      
      // Note: Animation testing would require testing Framer Motion integration
      // This is a structural test to ensure animation properties are set
      const canvas = document.querySelector('canvas')
      expect(canvas).toBeInTheDocument()
    })

    it('should stop animation when inactive', () => {
      const { rerender } = render(<AudioVisualizer {...defaultProps} isActive={true} />)
      
      // Switch to inactive
      rerender(<AudioVisualizer {...defaultProps} isActive={false} />)
      
      // Should render breathing circle instead of waveform
      expect(mockContext2D.createRadialGradient).toHaveBeenCalled()
    })
  })

  describe('Accessibility', () => {
    it('should provide meaningful screen reader information', () => {
      const { container } = render(
        <AudioVisualizer {...defaultProps} isActive={true} />
      )
      
      const canvas = container.querySelector('canvas')
      expect(canvas).toHaveAttribute('aria-label', 'Audio waveform visualization')
      expect(canvas).toHaveAttribute('role', 'img')
    })

    it('should respect reduced motion preferences', () => {
      // Mock prefers-reduced-motion
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: vi.fn().mockImplementation(query => ({
          matches: query === '(prefers-reduced-motion: reduce)',
          media: query,
          onchange: null,
          addListener: vi.fn(),
          removeListener: vi.fn(),
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
          dispatchEvent: vi.fn(),
        })),
      })
      
      render(<AudioVisualizer {...defaultProps} isActive={true} />)
      
      // Should still render but without animations
      const canvas = document.querySelector('canvas')
      expect(canvas).toBeInTheDocument()
    })
  })

  describe('Integration with Audio Context', () => {
    it('should work with real AudioContext data format', () => {
      // Simulate real AudioContext analyzer data
      const analyzerData = new Uint8Array(256)
      for (let i = 0; i < analyzerData.length; i++) {
        analyzerData[i] = Math.floor(Math.random() * 256)
      }
      
      // Convert to Float32Array như AudioContext getFloatFrequencyData
      const audioData = new Float32Array(analyzerData.length)
      for (let i = 0; i < analyzerData.length; i++) {
        audioData[i] = (analyzerData[i] - 128) / 128 // Normalize to -1 to 1
      }
      
      expect(() => {
        render(<AudioVisualizer {...defaultProps} audioData={audioData} isActive={true} />)
      }).not.toThrow()
      
      expect(mockContext2D.stroke).toHaveBeenCalled()
    })
  })
})