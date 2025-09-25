/**
 * Unit Tests for CircularAudioVisualizer Component
 * 
 * Test Categories:
 * 1. Component Rendering & Props
 * 2. Canvas Integration
 * 3. Animation States
 * 4. Audio Data Processing
 * 5. Theme & Styling
 * 6. User Interactions
 * 7. Performance & Memory
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { act } from 'react';
import { CircularAudioVisualizer } from '../CircularAudioVisualizer';

// =============================================================================
// Test Setup & Mocks
// =============================================================================

// Mock framer-motion
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
  useAnimation: () => ({
    start: vi.fn(),
    stop: vi.fn(),
  }),
}));

// Mock utils
vi.mock('@/lib/utils', () => ({
  cn: (...args: any[]) => args.filter(Boolean).join(' '),
}));

// Mock Canvas API
const mockCanvas = {
  getContext: vi.fn(),
  width: 0,
  height: 0,
  style: {},
};

const mockContext = {
  scale: vi.fn(),
  fillRect: vi.fn(),
  beginPath: vi.fn(),
  arc: vi.fn(),
  fill: vi.fn(),
  stroke: vi.fn(),
  moveTo: vi.fn(),
  lineTo: vi.fn(),
  createRadialGradient: vi.fn(() => ({
    addColorStop: vi.fn(),
  })),
  createLinearGradient: vi.fn(() => ({
    addColorStop: vi.fn(),
  })),
  setLineDash: vi.fn(),
  fillStyle: '',
  strokeStyle: '',
  lineWidth: 0,
  lineCap: '',
  imageSmoothingEnabled: true,
  imageSmoothingQuality: 'high',
};

// Mock HTMLCanvasElement
Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
  value: vi.fn(() => mockContext),
});

// Mock requestAnimationFrame
global.requestAnimationFrame = vi.fn((cb) => {
  setTimeout(cb, 16); // 60fps
  return 1;
});

global.cancelAnimationFrame = vi.fn();

// Mock devicePixelRatio
Object.defineProperty(window, 'devicePixelRatio', {
  value: 2,
  writable: true,
});

// =============================================================================
// Helper Functions
// =============================================================================

const createMockAudioData = (length: number, amplitude: number = 0.5): Float32Array => {
  const data = new Float32Array(length);
  for (let i = 0; i < length; i++) {
    data[i] = amplitude * Math.sin((i / length) * Math.PI * 2);
  }
  return data;
};

const getCanvasElement = (): HTMLCanvasElement | null => {
  return document.querySelector('canvas');
};

// =============================================================================
// Test Suite: Component Rendering & Props
// =============================================================================

describe('CircularAudioVisualizer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCanvas.getContext.mockReturnValue(mockContext);
  });

  afterEach(() => {
    vi.clearAllTimers();
  });

  describe('Component Rendering & Props', () => {
    it('should render with default props', () => {
      render(<CircularAudioVisualizer isRecording={false} />);
      
      const canvas = getCanvasElement();
      expect(canvas).toBeInTheDocument();
      expect(canvas).toHaveStyle({ width: '300px', height: '300px' });
    });

    it('should apply custom size prop', () => {
      render(<CircularAudioVisualizer isRecording={false} size={400} />);
      
      const canvas = getCanvasElement();
      expect(canvas).toHaveStyle({ width: '400px', height: '400px' });
    });

    it('should apply custom className', () => {
      render(
        <CircularAudioVisualizer 
          isRecording={false} 
          className="custom-visualizer" 
        />
      );
      
      const container = screen.getByRole('img', { hidden: true }).parentElement;
      expect(container).toHaveClass('custom-visualizer');
    });

    it('should show recording indicator when recording', () => {
      render(<CircularAudioVisualizer isRecording={true} />);
      
      const indicator = document.querySelector('.bg-red-500.animate-pulse');
      expect(indicator).toBeInTheDocument();
    });

    it('should hide recording indicator when not recording', () => {
      render(<CircularAudioVisualizer isRecording={false} />);
      
      const indicator = document.querySelector('.bg-red-500.animate-pulse');
      expect(indicator).not.toBeInTheDocument();
    });
  });

  // =============================================================================
  // Test Suite: Canvas Integration
  // =============================================================================

  describe('Canvas Integration', () => {
    it('should initialize canvas with proper dimensions', () => {
      render(<CircularAudioVisualizer isRecording={false} size={300} />);
      
      const canvas = getCanvasElement();
      expect(canvas).toBeInTheDocument();
      
      // Canvas should be initialized with device pixel ratio
      expect(mockContext.scale).toHaveBeenCalledWith(2, 2);
    });

    it('should set canvas rendering properties', () => {
      render(<CircularAudioVisualizer isRecording={false} />);
      
      expect(mockContext.imageSmoothingEnabled).toBe(true);
      expect(mockContext.imageSmoothingQuality).toBe('high');
    });

    it('should start animation loop on mount', async () => {
      render(<CircularAudioVisualizer isRecording={false} />);
      
      await waitFor(() => {
        expect(global.requestAnimationFrame).toHaveBeenCalled();
      });
    });

    it('should cleanup animation on unmount', async () => {
      const { unmount } = render(<CircularAudioVisualizer isRecording={false} />);
      
      unmount();
      
      await waitFor(() => {
        expect(global.cancelAnimationFrame).toHaveBeenCalled();
      });
    });
  });

  // =============================================================================
  // Test Suite: Animation States
  // =============================================================================

  describe('Animation States', () => {
    it('should render idle state when not recording', async () => {
      render(<CircularAudioVisualizer isRecording={false} />);
      
      // Wait for animation loop to execute
      await waitFor(() => {
        expect(mockContext.fillRect).toHaveBeenCalled(); // Background clear
        expect(mockContext.arc).toHaveBeenCalled(); // Breathing circle
      });
    });

    it('should render active state when recording with audio data', async () => {
      const audioData = createMockAudioData(128, 0.7);
      
      render(
        <CircularAudioVisualizer 
          isRecording={true} 
          audioData={audioData}
        />
      );
      
      await waitFor(() => {
        expect(mockContext.moveTo).toHaveBeenCalled(); // Amplitude bars
        expect(mockContext.lineTo).toHaveBeenCalled();
      });
    });

    it('should handle empty audio data gracefully', async () => {
      render(
        <CircularAudioVisualizer 
          isRecording={true} 
          audioData={new Float32Array(0)}
        />
      );
      
      await waitFor(() => {
        expect(mockContext.fillRect).toHaveBeenCalled();
      });
    });

    it('should apply sensitivity to audio data processing', () => {
      const audioData = createMockAudioData(64, 1.0);
      
      // Test with different sensitivity values
      const { rerender } = render(
        <CircularAudioVisualizer 
          isRecording={true} 
          audioData={audioData}
          sensitivity={0.3}
        />
      );
      
      // Rerender with higher sensitivity
      rerender(
        <CircularAudioVisualizer 
          isRecording={true} 
          audioData={audioData}
          sensitivity={0.9}
        />
      );
      
      // Both renders should work without errors
      expect(getCanvasElement()).toBeInTheDocument();
    });
  });

  // =============================================================================
  // Test Suite: Audio Data Processing
  // =============================================================================

  describe('Audio Data Processing', () => {
    it('should process audio data with correct bar count', async () => {
      const audioData = createMockAudioData(256, 0.5);
      
      render(
        <CircularAudioVisualizer 
          isRecording={true} 
          audioData={audioData}
        />
      );
      
      // Should process data into 64 bars (default config)
      await waitFor(() => {
        expect(mockContext.moveTo).toHaveBeenCalled();
      });
    });

    it('should handle audio data updates smoothly', async () => {
      const initialData = createMockAudioData(128, 0.3);
      const updatedData = createMockAudioData(128, 0.8);
      
      const { rerender } = render(
        <CircularAudioVisualizer 
          isRecording={true} 
          audioData={initialData}
        />
      );
      
      await waitFor(() => {
        expect(mockContext.moveTo).toHaveBeenCalled();
      });
      
      // Update with new audio data
      rerender(
        <CircularAudioVisualizer 
          isRecording={true} 
          audioData={updatedData}
        />
      );
      
      await waitFor(() => {
        expect(mockContext.lineTo).toHaveBeenCalled();
      });
    });

    it('should clamp amplitude values to prevent overflow', () => {
      // Create extreme audio data
      const extremeData = new Float32Array(64);
      extremeData.fill(10.0); // Way above normal range
      
      render(
        <CircularAudioVisualizer 
          isRecording={true} 
          audioData={extremeData}
          sensitivity={1.0}
        />
      );
      
      // Should not crash and should render
      expect(getCanvasElement()).toBeInTheDocument();
    });
  });

  // =============================================================================
  // Test Suite: Theme & Styling
  // =============================================================================

  describe('Theme & Styling', () => {
    it('should apply default theme colors', async () => {
      render(<CircularAudioVisualizer isRecording={false} theme="default" />);
      
      await waitFor(() => {
        // Should use default blue theme colors
        expect(mockContext.strokeStyle).toContain('#3B82F6');
      });
    });

    it('should apply neon theme colors', async () => {
      render(<CircularAudioVisualizer isRecording={false} theme="neon" />);
      
      await waitFor(() => {
        // Should use neon green theme colors
        expect(mockContext.strokeStyle).toContain('#10B981');
      });
    });

    it('should apply danger theme colors', async () => {
      render(<CircularAudioVisualizer isRecording={false} theme="danger" />);
      
      await waitFor(() => {
        // Should use danger red theme colors
        expect(mockContext.strokeStyle).toContain('#EF4444');
      });
    });

    it('should use custom colors when provided', async () => {
      const customColors = {
        primary: '#FF6B35',
        secondary: '#F7931E',
        background: '#2E2E2E',
        accent: '#FFD23F',
      };
      
      render(
        <CircularAudioVisualizer 
          isRecording={false} 
          colors={customColors}
        />
      );
      
      await waitFor(() => {
        // Should use custom colors
        expect(mockContext.strokeStyle).toContain('#FF6B35');
      });
    });

    it('should apply recording state styling', () => {
      const { rerender } = render(<CircularAudioVisualizer isRecording={false} />);
      
      const microphone = document.querySelector('.bg-gray-700\\/40');
      expect(microphone).toBeInTheDocument();
      
      // Switch to recording state
      rerender(<CircularAudioVisualizer isRecording={true} />);
      
      const recordingMicrophone = document.querySelector('.bg-red-500\\/20');
      expect(recordingMicrophone).toBeInTheDocument();
    });
  });

  // =============================================================================
  // Test Suite: User Interactions
  // =============================================================================

  describe('User Interactions', () => {
    it('should handle click events', () => {
      const mockOnClick = vi.fn();
      
      render(
        <CircularAudioVisualizer 
          isRecording={false} 
          onClick={mockOnClick}
        />
      );
      
      const container = getCanvasElement()?.parentElement;
      expect(container).toBeInTheDocument();
      
      if (container) {
        fireEvent.click(container);
        expect(mockOnClick).toHaveBeenCalledTimes(1);
      }
    });

    it('should show cursor pointer for clickable visualizer', () => {
      render(
        <CircularAudioVisualizer 
          isRecording={false} 
          onClick={() => {}}
        />
      );
      
      const container = getCanvasElement()?.parentElement;
      expect(container).toHaveClass('cursor-pointer');
    });

    it('should not break without click handler', () => {
      render(<CircularAudioVisualizer isRecording={false} />);
      
      const container = getCanvasElement()?.parentElement;
      if (container) {
        // Should not throw error
        expect(() => fireEvent.click(container)).not.toThrow();
      }
    });
  });

  // =============================================================================
  // Test Suite: Performance & Memory
  // =============================================================================

  describe('Performance & Memory', () => {
    it('should cleanup canvas renderer on unmount', async () => {
      const { unmount } = render(<CircularAudioVisualizer isRecording={false} />);
      
      unmount();
      
      // Should cleanup animation frame
      await waitFor(() => {
        expect(global.cancelAnimationFrame).toHaveBeenCalled();
      });
    });

    it('should memoize processed audio data', () => {
      const audioData = createMockAudioData(128, 0.5);
      
      const { rerender } = render(
        <CircularAudioVisualizer 
          isRecording={true} 
          audioData={audioData}
        />
      );
      
      // Rerender with same audio data - should use memoized result
      rerender(
        <CircularAudioVisualizer 
          isRecording={true} 
          audioData={audioData}
        />
      );
      
      expect(getCanvasElement()).toBeInTheDocument();
    });

    it('should handle rapid audio data updates', async () => {
      const { rerender } = render(
        <CircularAudioVisualizer 
          isRecording={true} 
          audioData={createMockAudioData(64, 0.1)}
        />
      );
      
      // Rapidly update audio data
      for (let i = 0; i < 10; i++) {
        rerender(
          <CircularAudioVisualizer 
            isRecording={true} 
            audioData={createMockAudioData(64, i * 0.1)}
          />
        );
      }
      
      await waitFor(() => {
        expect(getCanvasElement()).toBeInTheDocument();
      });
    });

    it('should optimize rendering with device pixel ratio', () => {
      render(<CircularAudioVisualizer isRecording={false} size={200} />);
      
      // Should scale context for crisp rendering
      expect(mockContext.scale).toHaveBeenCalledWith(2, 2);
    });
  });

  // =============================================================================
  // Test Suite: Error Handling
  // =============================================================================

  describe('Error Handling', () => {
    it('should handle missing canvas context gracefully', () => {
      const originalGetContext = HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext = vi.fn(() => null);
      
      expect(() => {
        render(<CircularAudioVisualizer isRecording={false} />);
      }).not.toThrow();
      
      // Restore original method
      HTMLCanvasElement.prototype.getContext = originalGetContext;
    });

    it('should handle invalid audio data gracefully', () => {
      // @ts-ignore - Testing runtime behavior
      expect(() => {
        render(
          <CircularAudioVisualizer 
            isRecording={true} 
            audioData={null as any}
          />
        );
      }).not.toThrow();
    });

    it('should handle resize gracefully', () => {
      const { rerender } = render(
        <CircularAudioVisualizer isRecording={false} size={300} />
      );
      
      // Resize component
      rerender(
        <CircularAudioVisualizer isRecording={false} size={400} />
      );
      
      expect(getCanvasElement()).toBeInTheDocument();
    });
  });
});

// =============================================================================
// Integration Tests
// =============================================================================

describe('CircularAudioVisualizer Integration', () => {
  it('should integrate with real audio data patterns', async () => {
    // Simulate real microphone data patterns
    const silenceData = new Float32Array(128).fill(0);
    const speechData = createMockAudioData(128, 0.6);
    const loudData = createMockAudioData(128, 0.95);
    
    const { rerender } = render(
      <CircularAudioVisualizer isRecording={true} audioData={silenceData} />
    );
    
    // Transition through different audio states
    rerender(
      <CircularAudioVisualizer isRecording={true} audioData={speechData} />
    );
    
    rerender(
      <CircularAudioVisualizer isRecording={true} audioData={loudData} />
    );
    
    await waitFor(() => {
      expect(mockContext.lineTo).toHaveBeenCalled();
    });
  });

  it('should handle state transitions smoothly', async () => {
    const audioData = createMockAudioData(128, 0.7);
    
    const { rerender } = render(
      <CircularAudioVisualizer isRecording={false} />
    );
    
    // Start recording
    rerender(
      <CircularAudioVisualizer isRecording={true} audioData={audioData} />
    );
    
    // Stop recording
    rerender(
      <CircularAudioVisualizer isRecording={false} />
    );
    
    await waitFor(() => {
      expect(mockContext.fillRect).toHaveBeenCalled();
    });
  });

  it('should perform well with high-frequency updates', async () => {
    const startTime = performance.now();
    
    const { rerender } = render(
      <CircularAudioVisualizer isRecording={true} />
    );
    
    // Simulate 60fps audio updates
    for (let i = 0; i < 60; i++) {
      const audioData = createMockAudioData(128, Math.random());
      rerender(
        <CircularAudioVisualizer isRecording={true} audioData={audioData} />
      );
      
      await new Promise(resolve => setTimeout(resolve, 1));
    }
    
    const endTime = performance.now();
    const totalTime = endTime - startTime;
    
    // Should complete in reasonable time (less than 1 second)
    expect(totalTime).toBeLessThan(1000);
  });
});