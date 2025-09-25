/**
 * P28 TDD Test Suite - Enhanced Forms & Motion Components
 * Mục đích: Comprehensive testing for React 19 + Framer Motion v12 implementation
 * Coverage: Form validation, Zustand stores, Motion performance, Integration workflows
 * Tech: Vitest, React Testing Library, MSW, JSDOM, performance testing
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { motion, MotionConfig } from 'framer-motion';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';

// Import components to test
import { EnhancedSessionForm } from '../forms/EnhancedSessionForm';
import { EnhancedAudioVisualizer, EnhancedSessionCard, GestureTranscriptPanel } from '../motion/EnhancedMotionComponents';
import { useAudioStore, useUIStore } from '../../stores/enhanced-stores';

// Mock setup
const mockAudioData = new Float32Array(128).fill(0.5);
const mockSession = {
  id: 'test-session-1',
  name: 'Test Session',
  description: 'Test description',
  startedAt: new Date('2025-01-21T10:00:00Z'),
  endedAt: new Date('2025-01-21T10:05:00Z'),
  lang: 'vi',
};

const mockTranscriptSegments = [
  {
    id: 'segment-1',
    text: 'Hello world',
    timestamp: new Date('2025-01-21T10:01:00Z'),
    confidence: 0.95,
  },
  {
    id: 'segment-2', 
    text: 'This is a test',
    timestamp: new Date('2025-01-21T10:02:00Z'),
    confidence: 0.87,
  },
];

// MSW server setup for API mocking
const server = setupServer(
  http.post('/api/sessions', () => {
    return HttpResponse.json({
      success: true,
      data: { ...mockSession, id: 'new-session-id' },
    });
  }),
  
  http.get('/api/sessions', () => {
    return HttpResponse.json({
      success: true,
      data: [mockSession],
      meta: { pagination: { page: 1, limit: 20, total: 1 } },
    });
  }),
  
  http.get('/api/sessions/:id', ({ params }) => {
    return HttpResponse.json({
      success: true,
      data: { ...mockSession, id: params.id },
    });
  }),
  
  http.delete('/api/sessions/:id', () => {
    return HttpResponse.json({ success: true });
  })
);

// Test wrapper component
function TestWrapper({ children }: { children: React.ReactNode }) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  
  return (
    <BrowserRouter>
      <QueryClientProvider client={queryClient}>
        <MotionConfig reducedMotion="user">
          {children}
        </MotionConfig>
      </QueryClientProvider>
    </BrowserRouter>
  );
}

// Mock framer-motion for testing
vi.mock('framer-motion', async () => {
  const actual = await vi.importActual('framer-motion');
  return {
    ...actual,
    motion: {
      div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
      form: ({ children, ...props }: any) => <form {...props}>{children}</form>,
      input: ({ children, ...props }: any) => <input {...props}>{children}</input>,
      button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
      svg: ({ children, ...props }: any) => <svg {...props}>{children}</svg>,
      line: ({ children, ...props }: any) => <line {...props}>{children}</line>,
      circle: ({ children, ...props }: any) => <circle {...props}>{children}</circle>,
    },
    useMotionValue: () => ({ get: () => 0, set: vi.fn() }),
    useSpring: () => ({ get: () => 0, set: vi.fn() }),
    useTransform: () => ({ get: () => 0 }),
    useAnimation: () => ({ start: vi.fn(), stop: vi.fn() }),
    useDragControls: () => ({ start: vi.fn() }),
    useReducedMotion: () => false,
    AnimatePresence: ({ children }: any) => children,
  };
});

// Setup and teardown
beforeEach(() => {
  server.listen();
  // Reset Zustand stores
  useAudioStore.getState().actions.clearSession();
  useUIStore.setState({ theme: 'light', sidebarOpen: true });
});

afterEach(() => {
  server.resetHandlers();
  vi.clearAllMocks();
});

afterAll(() => {
  server.close();
});

describe('P28 Enhanced Session Form Tests', () => {
  describe('Form Rendering & UI', () => {
    it('renders form with all required fields', () => {
      render(
        <TestWrapper>
          <EnhancedSessionForm />
        </TestWrapper>
      );
      
      expect(screen.getByLabelText(/session name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/description/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/language/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/sensitivity/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/auto-stop/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /create session/i })).toBeInTheDocument();
    });
    
    it('displays validation errors for empty required fields', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <EnhancedSessionForm />
        </TestWrapper>
      );
      
      const submitButton = screen.getByRole('button', { name: /create session/i });
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText(/name must be at least 3 characters/i)).toBeInTheDocument();
      });
    });
    
    it('validates session name length constraints', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <EnhancedSessionForm />
        </TestWrapper>
      );
      
      const nameInput = screen.getByLabelText(/session name/i);
      
      // Test minimum length
      await user.type(nameInput, 'Ab');
      await user.tab();
      
      await waitFor(() => {
        expect(screen.getByText(/name must be at least 3 characters/i)).toBeInTheDocument();
      });
      
      // Test maximum length
      const longName = 'A'.repeat(51);
      await user.clear(nameInput);
      await user.type(nameInput, longName);
      await user.tab();
      
      await waitFor(() => {
        expect(screen.getByText(/name cannot exceed 50 characters/i)).toBeInTheDocument();
      });
    });
  });
  
  describe('Form Validation & Submission', () => {
    it('successfully submits valid form data', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <EnhancedSessionForm />
        </TestWrapper>
      );
      
      // Fill in valid form data
      await user.type(screen.getByLabelText(/session name/i), 'Test Session');
      await user.type(screen.getByLabelText(/description/i), 'Test description for session');
      await user.selectOptions(screen.getByLabelText(/language/i), 'vi');
      await user.selectOptions(screen.getByLabelText(/sensitivity/i), 'medium');
      
      const submitButton = screen.getByRole('button', { name: /create session/i });
      await user.click(submitButton);
      
      // Should show loading state
      await waitFor(() => {
        expect(screen.getByText(/creating/i)).toBeInTheDocument();
      });
    });
    
    it('handles server validation errors', async () => {
      server.use(
        http.post('/api/sessions', () => {
          return HttpResponse.json(
            {
              error: 'Validation failed',
              fieldErrors: {
                name: ['Session name already exists'],
              },
            },
            { status: 400 }
          );
        })
      );
      
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <EnhancedSessionForm />
        </TestWrapper>
      );
      
      await user.type(screen.getByLabelText(/session name/i), 'Existing Session');
      await user.type(screen.getByLabelText(/description/i), 'Test description');
      
      const submitButton = screen.getByRole('button', { name: /create session/i });
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText(/session name already exists/i)).toBeInTheDocument();
      });
    });
    
    it('supports nested field validation for settings', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <EnhancedSessionForm />
        </TestWrapper>
      );
      
      const nameInput = screen.getByLabelText(/session name/i);
      const descInput = screen.getByLabelText(/description/i);
      const langSelect = screen.getByLabelText(/language/i);
      const sensitivitySelect = screen.getByLabelText(/sensitivity/i);
      const autoStopCheckbox = screen.getByLabelText(/auto-stop/i);
      
      await user.type(nameInput, 'Valid Session Name');
      await user.type(descInput, 'Valid description');
      await user.selectOptions(langSelect, 'en');
      await user.selectOptions(sensitivitySelect, 'high');
      await user.click(autoStopCheckbox);
      
      // Verify form state
      expect(nameInput).toHaveValue('Valid Session Name');
      expect(descInput).toHaveValue('Valid description');
      expect(langSelect).toHaveValue('en');
      expect(sensitivitySelect).toHaveValue('high');
      expect(autoStopCheckbox).toBeChecked();
    });
  });
  
  describe('React 19 useActionState Integration', () => {
    it('handles pending state correctly', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <EnhancedSessionForm />
        </TestWrapper>
      );
      
      await user.type(screen.getByLabelText(/session name/i), 'Test Session');
      await user.type(screen.getByLabelText(/description/i), 'Test description');
      
      const submitButton = screen.getByRole('button', { name: /create session/i });
      
      // Submit form
      await user.click(submitButton);
      
      // Check loading state
      expect(submitButton).toBeDisabled();
      expect(screen.getByText(/creating/i)).toBeInTheDocument();
    });
    
    it('preserves form values on validation error', async () => {
      server.use(
        http.post('/api/sessions', () => {
          return HttpResponse.json(
            {
              error: 'Validation failed',
              fieldErrors: { name: ['Invalid name'] },
              values: { name: 'Test Session', description: 'Test desc' },
            },
            { status: 400 }
          );
        })
      );
      
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <EnhancedSessionForm />
        </TestWrapper>
      );
      
      await user.type(screen.getByLabelText(/session name/i), 'Test Session');
      await user.type(screen.getByLabelText(/description/i), 'Test desc');
      
      const submitButton = screen.getByRole('button', { name: /create session/i });
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByDisplayValue('Test Session')).toBeInTheDocument();
        expect(screen.getByDisplayValue('Test desc')).toBeInTheDocument();
      });
    });
  });
});

describe('P28 Zustand Store Tests', () => {
  describe('Audio Store', () => {
    it('initializes with correct default state', () => {
      const state = useAudioStore.getState();
      
      expect(state.isRecording).toBe(false);
      expect(state.audioData).toBe(null);
      expect(state.volume).toBe(0);
      expect(state.sensitivity).toBe(0.5);
      expect(state.currentSession).toBe(null);
      expect(state.transcript).toEqual([]);
      expect(state.detections).toEqual([]);
      expect(state.visualizerTheme).toBe('default');
    });
    
    it('updates audio data and calculates volume', () => {
      const { updateAudioData } = useAudioStore.getState().actions;
      const testData = new Float32Array([0.1, -0.2, 0.3, -0.4]);
      
      act(() => {
        updateAudioData(testData);
      });
      
      const state = useAudioStore.getState();
      expect(state.audioData).toEqual(testData);
      expect(state.volume).toBeGreaterThan(0);
      expect(state.volume).toBeLessThanOrEqual(1);
    });
    
    it('manages transcript segments correctly', () => {
      const { addTranscriptSegment, clearSession } = useAudioStore.getState().actions;
      const segment = {
        id: 'test-segment',
        text: 'Test transcript',
        timestamp: new Date(),
        confidence: 0.95,
      };
      
      act(() => {
        addTranscriptSegment(segment);
      });
      
      expect(useAudioStore.getState().transcript).toContain(segment);
      
      act(() => {
        clearSession();
      });
      
      expect(useAudioStore.getState().transcript).toEqual([]);
    });
    
    it('handles detection management', () => {
      const { addDetection } = useAudioStore.getState().actions;
      const detection = {
        id: 'test-detection',
        type: 'OFFENSIVE' as const,
        severity: 'high' as const,
        confidence: 0.92,
        snippet: 'offensive content',
        timestamp: new Date(),
      };
      
      act(() => {
        addDetection(detection);
      });
      
      expect(useAudioStore.getState().detections).toContain(detection);
    });
    
    it('persists settings across sessions', () => {
      const { updateSensitivity, changeTheme } = useAudioStore.getState().actions;
      
      act(() => {
        updateSensitivity(0.8);
        changeTheme('neon');
      });
      
      const state = useAudioStore.getState();
      expect(state.sensitivity).toBe(0.8);
      expect(state.visualizerTheme).toBe('neon');
    });
  });
  
  describe('UI Store', () => {
    it('manages theme state correctly', () => {
      const { setTheme } = useUIStore.getState().actions;
      
      act(() => {
        setTheme('dark');
      });
      
      expect(useUIStore.getState().theme).toBe('dark');
    });
    
    it('handles modal state management', () => {
      const { openModal, closeModal } = useUIStore.getState().actions;
      
      act(() => {
        openModal('test-modal');
      });
      
      expect(useUIStore.getState().activeModal).toBe('test-modal');
      
      act(() => {
        closeModal();
      });
      
      expect(useUIStore.getState().activeModal).toBe(null);
    });
    
    it('manages notifications queue', () => {
      const { addNotification, removeNotification } = useUIStore.getState().actions;
      
      act(() => {
        addNotification({
          type: 'success',
          message: 'Test notification',
          duration: 3000,
        });
      });
      
      const state = useUIStore.getState();
      expect(state.notifications).toHaveLength(1);
      expect(state.notifications[0].message).toBe('Test notification');
      
      const notificationId = state.notifications[0].id;
      
      act(() => {
        removeNotification(notificationId);
      });
      
      expect(useUIStore.getState().notifications).toHaveLength(0);
    });
  });
  
  describe('Store Subscriptions', () => {
    it('triggers subscriptions on state changes', () => {
      const mockCallback = vi.fn();
      
      // Subscribe to recording state changes
      const unsubscribe = useAudioStore.subscribe(
        (state) => state.isRecording,
        mockCallback
      );
      
      act(() => {
        useAudioStore.setState({ isRecording: true });
      });
      
      expect(mockCallback).toHaveBeenCalledWith(true, false);
      
      unsubscribe();
    });
  });
});

describe('P28 Motion Components Tests', () => {
  describe('Enhanced Audio Visualizer', () => {
    it('renders with correct dimensions based on size prop', () => {
      const { container } = render(
        <TestWrapper>
          <EnhancedAudioVisualizer
            isActive={false}
            size="large"
            audioData={mockAudioData}
          />
        </TestWrapper>
      );
      
      const visualizer = container.querySelector('[style*="width: 300"]');
      expect(visualizer).toBeInTheDocument();
    });
    
    it('displays different themes correctly', () => {
      const { rerender } = render(
        <TestWrapper>
          <EnhancedAudioVisualizer
            isActive={true}
            theme="neon"
            audioData={mockAudioData}
          />
        </TestWrapper>
      );
      
      // Test theme switching
      rerender(
        <TestWrapper>
          <EnhancedAudioVisualizer
            isActive={true}
            theme="minimal"
            audioData={mockAudioData}
          />
        </TestWrapper>
      );
      
      // Should render without errors
      expect(screen.queryByRole('img', { hidden: true })).toBeInTheDocument();
    });
    
    it('shows status indicator based on active state', () => {
      const { rerender } = render(
        <TestWrapper>
          <EnhancedAudioVisualizer
            isActive={false}
            audioData={mockAudioData}
          />
        </TestWrapper>
      );
      
      // Check inactive state
      expect(document.querySelector('.bg-gray-400')).toBeInTheDocument();
      
      rerender(
        <TestWrapper>
          <EnhancedAudioVisualizer
            isActive={true}
            audioData={mockAudioData}
          />
        </TestWrapper>
      );
      
      // Check active state
      expect(document.querySelector('.bg-green-500')).toBeInTheDocument();
    });
    
    it('handles reduced motion preference', () => {
      // Mock reduced motion preference
      vi.mocked(require('framer-motion').useReducedMotion).mockReturnValue(true);
      
      render(
        <TestWrapper>
          <EnhancedAudioVisualizer
            isActive={true}
            audioData={mockAudioData}
          />
        </TestWrapper>
      );
      
      // Should render but with reduced animations
      expect(screen.queryByRole('img', { hidden: true })).toBeInTheDocument();
    });
  });
  
  describe('Enhanced Session Card', () => {
    it('renders session information correctly', () => {
      render(
        <TestWrapper>
          <EnhancedSessionCard session={mockSession} />
        </TestWrapper>
      );
      
      expect(screen.getByText('Test Session')).toBeInTheDocument();
      expect(screen.getByText(/1\/21\/2025/)).toBeInTheDocument();
    });
    
    it('toggles expanded state on click', async () => {
      const user = userEvent.setup();
      const mockToggle = vi.fn();
      
      render(
        <TestWrapper>
          <EnhancedSessionCard
            session={mockSession}
            isExpanded={false}
            onToggle={mockToggle}
          />
        </TestWrapper>
      );
      
      const card = screen.getByText('Test Session').closest('div');
      await user.click(card!);
      
      expect(mockToggle).toHaveBeenCalled();
    });
    
    it('shows expanded content when expanded', () => {
      render(
        <TestWrapper>
          <EnhancedSessionCard
            session={mockSession}
            isExpanded={true}
          />
        </TestWrapper>
      );
      
      expect(screen.getByText(/duration:/i)).toBeInTheDocument();
      expect(screen.getByText(/language:/i)).toBeInTheDocument();
      expect(screen.getByText('View Details')).toBeInTheDocument();
      expect(screen.getByText('Delete')).toBeInTheDocument();
    });
    
    it('handles delete action', async () => {
      const user = userEvent.setup();
      const mockDelete = vi.fn();
      
      render(
        <TestWrapper>
          <EnhancedSessionCard
            session={mockSession}
            isExpanded={true}
            onDelete={mockDelete}
          />
        </TestWrapper>
      );
      
      const deleteButton = screen.getByText('Delete');
      await user.click(deleteButton);
      
      expect(mockDelete).toHaveBeenCalled();
    });
  });
  
  describe('Gesture Transcript Panel', () => {
    it('renders transcript segments correctly', () => {
      render(
        <TestWrapper>
          <GestureTranscriptPanel segments={mockTranscriptSegments} />
        </TestWrapper>
      );
      
      expect(screen.getByText('Hello world')).toBeInTheDocument();
      expect(screen.getByText('This is a test')).toBeInTheDocument();
      expect(screen.getByText(/confidence: 95%/i)).toBeInTheDocument();
    });
    
    it('shows empty state when no segments', () => {
      render(
        <TestWrapper>
          <GestureTranscriptPanel segments={[]} />
        </TestWrapper>
      );
      
      expect(screen.getByText(/no transcript segments yet/i)).toBeInTheDocument();
      expect(screen.getByText(/start recording/i)).toBeInTheDocument();
    });
    
    it('handles segment deletion', async () => {
      const user = userEvent.setup();
      const mockDelete = vi.fn();
      
      render(
        <TestWrapper>
          <GestureTranscriptPanel
            segments={mockTranscriptSegments}
            onSegmentDelete={mockDelete}
          />
        </TestWrapper>
      );
      
      const deleteButtons = screen.getAllByRole('button');
      await user.click(deleteButtons[0]);
      
      expect(mockDelete).toHaveBeenCalledWith('segment-1');
    });
  });
});

describe('P28 Integration Tests', () => {
  describe('Form + Store Integration', () => {
    it('creates session and updates store state', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <EnhancedSessionForm />
        </TestWrapper>
      );
      
      // Fill and submit form
      await user.type(screen.getByLabelText(/session name/i), 'Integration Test Session');
      await user.type(screen.getByLabelText(/description/i), 'Integration test description');
      
      const submitButton = screen.getByRole('button', { name: /create session/i });
      await user.click(submitButton);
      
      // Wait for form submission
      await waitFor(() => {
        expect(screen.getByText(/creating/i)).toBeInTheDocument();
      });
    });
  });
  
  describe('Store + Motion Integration', () => {
    it('visualizer responds to store audio data changes', () => {
      const { updateAudioData } = useAudioStore.getState().actions;
      
      render(
        <TestWrapper>
          <EnhancedAudioVisualizer isActive={true} />
        </TestWrapper>
      );
      
      act(() => {
        updateAudioData(mockAudioData);
      });
      
      // Should render audio visualization
      expect(screen.queryByRole('img', { hidden: true })).toBeInTheDocument();
    });
  });
  
  describe('Performance Integration', () => {
    it('handles multiple rapid state updates efficiently', () => {
      const { updateAudioData } = useAudioStore.getState().actions;
      
      // Simulate rapid audio data updates
      const startTime = performance.now();
      
      for (let i = 0; i < 100; i++) {
        const testData = new Float32Array(128).fill(Math.random());
        act(() => {
          updateAudioData(testData);
        });
      }
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      // Should complete within reasonable time (< 100ms)
      expect(duration).toBeLessThan(100);
    });
    
    it('memory usage remains stable with many components', () => {
      const initialMemory = (performance as any).memory?.usedJSHeapSize;
      
      // Render multiple components
      const { rerender } = render(
        <TestWrapper>
          <div>
            {Array.from({ length: 10 }, (_, i) => (
              <EnhancedSessionCard key={i} session={{ ...mockSession, id: `session-${i}` }} />
            ))}
          </div>
        </TestWrapper>
      );
      
      // Re-render multiple times
      for (let i = 0; i < 5; i++) {
        rerender(
          <TestWrapper>
            <div>
              {Array.from({ length: 10 }, (_, j) => (
                <EnhancedSessionCard key={j} session={{ ...mockSession, id: `session-${j}-${i}` }} />
              ))}
            </div>
          </TestWrapper>
        );
      }
      
      const finalMemory = (performance as any).memory?.usedJSHeapSize;
      
      if (initialMemory && finalMemory) {
        const memoryIncrease = finalMemory - initialMemory;
        // Memory increase should be reasonable (< 10MB)
        expect(memoryIncrease).toBeLessThan(10 * 1024 * 1024);
      }
    });
  });
});

describe('P28 Accessibility Tests', () => {
  it('form has proper accessibility attributes', () => {
    render(
      <TestWrapper>
        <EnhancedSessionForm />
      </TestWrapper>
    );
    
    // Check form labels
    expect(screen.getByLabelText(/session name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/description/i)).toBeInTheDocument();
    
    // Check button accessibility
    const submitButton = screen.getByRole('button', { name: /create session/i });
    expect(submitButton).toBeInTheDocument();
    expect(submitButton).not.toHaveAttribute('aria-disabled', 'true');
  });
  
  it('motion components respect reduced motion preference', () => {
    // This is already tested in individual component tests
    // but important to verify in integration context
    vi.mocked(require('framer-motion').useReducedMotion).mockReturnValue(true);
    
    render(
      <TestWrapper>
        <EnhancedAudioVisualizer isActive={true} audioData={mockAudioData} />
      </TestWrapper>
    );
    
    // Should render without throwing errors
    expect(screen.queryByRole('img', { hidden: true })).toBeInTheDocument();
  });
  
  it('keyboard navigation works correctly', async () => {
    const user = userEvent.setup();
    
    render(
      <TestWrapper>
        <EnhancedSessionForm />
      </TestWrapper>
    );
    
    // Test tab navigation
    await user.tab();
    expect(screen.getByLabelText(/session name/i)).toHaveFocus();
    
    await user.tab();
    expect(screen.getByLabelText(/description/i)).toHaveFocus();
    
    await user.tab();
    expect(screen.getByLabelText(/language/i)).toHaveFocus();
  });
});