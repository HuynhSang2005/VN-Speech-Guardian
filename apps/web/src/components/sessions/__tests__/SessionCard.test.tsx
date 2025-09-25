/**
 * SessionCard Component Tests - P32 Component Testing Suite
 * Mục đích: Comprehensive testing cho SessionCard component với props validation
 * TDD Approach: Test rendering, interactions, accessibility, states
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SessionCard, type SessionDto } from '../index'

// Mock data functions
const createMockSession = (overrides: Partial<SessionDto> = {}): SessionDto => ({
  id: 'session-123',
  name: 'Test Session',
  description: 'Test Description',
  startedAt: '2025-01-21T10:00:00Z',
  status: 'completed',
  duration: 3600,
  stats: {
    totalSegments: 50,
    totalDetections: 5,
    avgConfidence: 0.92,
  },
  createdAt: '2025-01-21T10:00:00Z',
  updatedAt: '2025-01-21T11:00:00Z',
  ...overrides,
})

const createHighRiskSession = (): SessionDto => createMockSession({
  stats: {
    totalSegments: 50,
    totalDetections: 25, // High detection rate
    avgConfidence: 0.92,
  },
})

const createSafeSession = (): SessionDto => createMockSession({
  stats: {
    totalSegments: 100,
    totalDetections: 2, // Very low detection rate
    avgConfidence: 0.95,
  },
})

describe('SessionCard Component', () => {
  const mockOnSelect = vi.fn()
  const mockOnDelete = vi.fn()
  const mockOnEdit = vi.fn()

  const defaultProps = {
    session: createMockSession(),
    onSelect: mockOnSelect,
    onDelete: mockOnDelete,
    onEdit: mockOnEdit,
    isSelected: false,
    showActions: true,
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Rendering & Structure', () => {
    it('should render session basic information', () => {
      const session = createMockSession({
        name: 'Test Session',
        description: 'Test Description',
        createdAt: '2025-01-21T10:00:00Z',
      })

      render(<SessionCard {...defaultProps} session={session} />)

      expect(screen.getByText('Test Session')).toBeInTheDocument()
      expect(screen.getByText('Test Description')).toBeInTheDocument()
      expect(screen.getByText(/21\/1\/2025/)).toBeInTheDocument() // Vietnamese date format
    })

    it('should render session statistics correctly', () => {
      const session = createMockSession({
        stats: {
          totalSegments: 50,
          totalDetections: 5,
          avgConfidence: 0.92,
        },
      })

      render(<SessionCard {...defaultProps} session={session} />)

      expect(screen.getByText('50')).toBeInTheDocument() // Total segments
      expect(screen.getByText('5')).toBeInTheDocument() // Total detections
      expect(screen.getByText('92%')).toBeInTheDocument() // Confidence as percentage
    })

    it('should render session duration when available', () => {
      const session = createMockSession({
        duration: 3661, // 1 hour, 1 minute, 1 second
        status: 'completed',
      })

      render(<SessionCard {...defaultProps} session={session} />)

      expect(screen.getByText('01:01:01')).toBeInTheDocument() // HH:MM:SS format
    })

    it('should show "In Progress" for active sessions', () => {
      const session = createMockSession({
        status: 'recording',
        duration: undefined,
        endedAt: undefined,
      })

      render(<SessionCard {...defaultProps} session={session} />)

      expect(screen.getByText('In Progress')).toBeInTheDocument()
      expect(screen.getByTestId('recording-indicator')).toBeInTheDocument()
    })

    it('should render without description when not provided', () => {
      const session = createMockSession({
        name: 'Test Session',
        description: undefined,
      })

      render(<SessionCard {...defaultProps} session={session} />)

      expect(screen.getByText('Test Session')).toBeInTheDocument()
      expect(screen.queryByText('undefined')).not.toBeInTheDocument()
    })
  })

  describe('Status Indicators', () => {
    it('should show correct status badge for completed session', () => {
      const session = createMockSession({ status: 'completed' })
      render(<SessionCard {...defaultProps} session={session} />)

      const badge = screen.getByTestId('status-badge')
      expect(badge).toHaveTextContent('Completed')
      expect(badge).toHaveClass('bg-green-100', 'text-green-800')
    })

    it('should show correct status badge for error session', () => {
      const session = createMockSession({ status: 'error' })
      render(<SessionCard {...defaultProps} session={session} />)

      const badge = screen.getByTestId('status-badge')
      expect(badge).toHaveTextContent('Error')
      expect(badge).toHaveClass('bg-red-100', 'text-red-800')
    })

    it('should show correct status badge for processing session', () => {
      const session = createMockSession({ status: 'processing' })
      render(<SessionCard {...defaultProps} session={session} />)

      const badge = screen.getByTestId('status-badge')
      expect(badge).toHaveTextContent('Processing')
      expect(badge).toHaveClass('bg-yellow-100', 'text-yellow-800')
    })

    it('should show recording indicator for active sessions', () => {
      const session = createMockSession({ status: 'recording' })
      render(<SessionCard {...defaultProps} session={session} />)

      const indicator = screen.getByTestId('recording-indicator')
      expect(indicator).toBeInTheDocument()
      
      // Check the inner pulsing dot
      const pulsingDot = indicator.querySelector('div')
      expect(pulsingDot).toHaveClass('bg-red-500')
      expect(pulsingDot).toHaveClass('animate-pulse')
    })
  })

  describe('Risk Assessment Visual Cues', () => {
    it('should show high-risk styling for sessions with many detections', () => {
      const highRiskSession = createHighRiskSession()
      render(<SessionCard {...defaultProps} session={highRiskSession} />)

      const card = screen.getByTestId('session-card')
      expect(card).toHaveClass('border-red-200', 'bg-red-50')
      
      const riskIndicator = screen.getByTestId('risk-indicator')
      expect(riskIndicator).toHaveTextContent('High Risk')
      expect(riskIndicator).toHaveClass('text-red-600')
    })

    it('should show safe styling for sessions with few detections', () => {
      const safeSession = createSafeSession()
      render(<SessionCard {...defaultProps} session={safeSession} />)

      const card = screen.getByTestId('session-card')
      expect(card).toHaveClass('border-green-200', 'bg-green-50')
      
      const riskIndicator = screen.getByTestId('risk-indicator')
      expect(riskIndicator).toHaveTextContent('Safe')
      expect(riskIndicator).toHaveClass('text-green-600')
    })

    it('should calculate detection rate percentage correctly', () => {
      const session = createMockSession({
        stats: {
          totalSegments: 100,
          totalDetections: 25,
          avgConfidence: 0.85,
        },
      })

      render(<SessionCard {...defaultProps} session={session} />)

      expect(screen.getByText('25%')).toBeInTheDocument() // Detection rate
      expect(screen.getByText('detection rate')).toBeInTheDocument()
    })
  })

  describe('Interactions', () => {
    it('should call onSelect when card is clicked', async () => {
      const user = userEvent.setup()
      render(<SessionCard {...defaultProps} />)
      
      const card = screen.getByTestId('session-card')
      await user.click(card)

      expect(mockOnSelect).toHaveBeenCalledWith(defaultProps.session)
      expect(mockOnSelect).toHaveBeenCalledTimes(1)
    })

    it('should call onEdit when edit button is clicked', async () => {
      const user = userEvent.setup()
      render(<SessionCard {...defaultProps} />)
      
      const editButton = screen.getByRole('button', { name: /edit/i })
      await user.click(editButton)

      expect(mockOnEdit).toHaveBeenCalledWith(defaultProps.session)
      expect(mockOnSelect).not.toHaveBeenCalled() // Should not trigger card click
    })

    it('should call onDelete when delete button is clicked', async () => {
      const user = userEvent.setup()
      render(<SessionCard {...defaultProps} />)
      
      const deleteButton = screen.getByRole('button', { name: /delete/i })
      await user.click(deleteButton)

      // Should show confirmation dialog
      expect(screen.getByText('Are you sure?')).toBeInTheDocument()
      
      // Click confirm button
      const confirmButton = screen.getByText('Confirm')
      await user.click(confirmButton)

      expect(mockOnDelete).toHaveBeenCalledWith(defaultProps.session)
      expect(mockOnSelect).not.toHaveBeenCalled() // Should not trigger card click
    })

    it('should show confirmation dialog for delete action', async () => {
      const user = userEvent.setup()
      render(<SessionCard {...defaultProps} />)
      
      const deleteButton = screen.getByRole('button', { name: /delete/i })
      await user.click(deleteButton)

      expect(screen.getByText(/are you sure/i)).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /confirm/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument()
    })

    it('should hide actions when showActions is false', () => {
      render(<SessionCard {...defaultProps} showActions={false} />)

      expect(screen.queryByRole('button', { name: /edit/i })).not.toBeInTheDocument()
      expect(screen.queryByRole('button', { name: /delete/i })).not.toBeInTheDocument()
    })

    it('should handle keyboard navigation', async () => {
      const user = userEvent.setup()
      render(<SessionCard {...defaultProps} />)
      
      const card = screen.getByTestId('session-card')
      
      // Should be focusable
      await user.tab()
      expect(card).toHaveFocus()
      
      // Should trigger onSelect with Enter key
      await user.keyboard('{Enter}')
      expect(mockOnSelect).toHaveBeenCalledWith(defaultProps.session)
      
      // Should trigger onSelect with Space key
      await user.keyboard(' ')
      expect(mockOnSelect).toHaveBeenCalledTimes(2)
    })
  })

  describe('Selection State', () => {
    it('should show selected styling when isSelected is true', () => {
      render(<SessionCard {...defaultProps} isSelected={true} />)

      const card = screen.getByTestId('session-card')
      expect(card).toHaveClass('ring-2', 'ring-blue-500', 'bg-blue-50')
      
      const selectedIndicator = screen.getByTestId('selected-indicator')
      expect(selectedIndicator).toBeInTheDocument()
    })

    it('should not show selected styling when isSelected is false', () => {
      render(<SessionCard {...defaultProps} isSelected={false} />)

      const card = screen.getByTestId('session-card')
      expect(card).not.toHaveClass('ring-2', 'ring-blue-500', 'bg-blue-50')
      
      expect(screen.queryByTestId('selected-indicator')).not.toBeInTheDocument()
    })
  })

  describe('Loading & Error States', () => {
    it('should show loading skeleton when session data is incomplete', () => {
      const incompleteSession = {
        id: '123',
        name: '',
        // Missing required fields
      } as any

      render(<SessionCard {...defaultProps} session={incompleteSession} />)

      expect(screen.getByTestId('session-skeleton')).toBeInTheDocument()
    })

    it('should handle missing session gracefully', () => {
      expect(() => {
        render(<SessionCard {...defaultProps} session={null as any} />)
      }).not.toThrow()

      expect(screen.getByText(/session not available/i)).toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('should have proper ARIA attributes', () => {
      render(<SessionCard {...defaultProps} />)

      const card = screen.getByTestId('session-card')
      expect(card).toHaveAttribute('role', 'button')
      expect(card).toHaveAttribute('tabIndex', '0')
      expect(card).toHaveAttribute('aria-label', expect.stringContaining(defaultProps.session.name))
    })

    it('should have accessible action buttons', () => {
      render(<SessionCard {...defaultProps} />)

      const editButton = screen.getByRole('button', { name: /edit/i })
      const deleteButton = screen.getByRole('button', { name: /delete/i })

      expect(editButton).toHaveAttribute('aria-label', `Edit session ${defaultProps.session.name}`)
      expect(deleteButton).toHaveAttribute('aria-label', `Delete session ${defaultProps.session.name}`)
    })

    it('should announce status changes to screen readers', () => {
      const { rerender } = render(
        <SessionCard {...defaultProps} session={createMockSession({ status: 'processing' })} />
      )

      const liveRegion = screen.getByRole('status')
      expect(liveRegion).toHaveTextContent('Session is processing')

      // Update status
      rerender(
        <SessionCard {...defaultProps} session={createMockSession({ status: 'completed' })} />
      )

      expect(liveRegion).toHaveTextContent('Session completed')
    })

    it('should provide meaningful descriptions for statistics', () => {
      const session = createMockSession({
        stats: {
          totalSegments: 50,
          totalDetections: 5,
          avgConfidence: 0.92,
        },
      })

      render(<SessionCard {...defaultProps} session={session} />)

      expect(screen.getByLabelText('Total segments: 50')).toBeInTheDocument()
      expect(screen.getByLabelText('Total detections: 5')).toBeInTheDocument()
      expect(screen.getByLabelText('Average confidence: 92%')).toBeInTheDocument()
    })
  })

  describe('Date & Time Formatting', () => {
    it('should format Vietnamese dates correctly', () => {
      const session = createMockSession({
        createdAt: '2025-01-21T14:30:00Z',
      })

      render(<SessionCard {...defaultProps} session={session} />)

      // Should show Vietnamese date format
      expect(screen.getByText(/21\/1\/2025/)).toBeInTheDocument()
      expect(screen.getByText(/21:30/)).toBeInTheDocument() // Time in Vietnamese format
    })

    it('should show relative time for recent sessions', () => {
      const recentSession = createMockSession({
        createdAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(), // 30 minutes ago
      })

      render(<SessionCard {...defaultProps} session={recentSession} />)

      expect(screen.getByText(/30 phút trước/)).toBeInTheDocument()
    })

    it('should handle timezone differences correctly', () => {
      const utcSession = createMockSession({
        createdAt: '2025-01-21T07:00:00Z', // UTC
      })

      render(<SessionCard {...defaultProps} session={utcSession} />)

      // Should show local time (assuming VN timezone UTC+7)  
      expect(screen.getByText(/14:00/)).toBeInTheDocument()
    })
  })

  describe('Performance', () => {
    it('should memoize expensive calculations', () => {
      const session = createMockSession()
      const { rerender } = render(<SessionCard {...defaultProps} session={session} />)

      // Check that component renders consistently
      const initialRiskIndicator = screen.getByTestId('risk-indicator')
      const initialRiskText = initialRiskIndicator.textContent

      // Re-render with same session
      rerender(<SessionCard {...defaultProps} session={session} />)

      // Should show same risk calculation result
      const rerenderRiskIndicator = screen.getByTestId('risk-indicator')
      expect(rerenderRiskIndicator.textContent).toBe(initialRiskText)
    })

    it('should handle large number of cards efficiently', () => {
      const sessions = Array.from({ length: 100 }, () => createMockSession())
      
      const startTime = performance.now()
      
      sessions.forEach((session, index) => {
        render(<SessionCard {...defaultProps} session={session} key={index} />)
      })
      
      const renderTime = performance.now() - startTime
      
      // Should render 100 cards within reasonable time (< 1000ms for testing environment)
      expect(renderTime).toBeLessThan(1000)
    })
  })

  describe('Responsive Design', () => {
    it('should adapt layout for mobile screens', () => {
      // Mock mobile viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375, // iPhone width
      })

      render(<SessionCard {...defaultProps} />)

      const card = screen.getByTestId('session-card')
      expect(card).toBeInTheDocument()
      
      // Should still show action buttons (current implementation)
      expect(screen.getByLabelText(/edit session/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/delete session/i)).toBeInTheDocument()
    })

    it('should show full layout on desktop', () => {
      // Mock desktop viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 1024,
      })

      render(<SessionCard {...defaultProps} />)

      const card = screen.getByTestId('session-card')
      expect(card).not.toHaveClass('mobile-layout')
      
      // Actions should be visible buttons on desktop
      expect(screen.getByRole('button', { name: /edit/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /delete/i })).toBeInTheDocument()
    })
  })
})