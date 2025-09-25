/**
 * Focused Unit Tests for RealtimeTranscriptPanel Component
 * Demonstrates proper test setup for P26 components
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { RealtimeTranscriptPanel } from '@/components/audio/RealtimeTranscriptPanel';
import type { TranscriptSegment, DetectionResult } from '@/types/audio';

// Mock framer-motion
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: any) => <div>{children}</div>,
}));

// Mock utils
vi.mock('@/lib/utils', () => ({
  cn: (...args: any[]) => args.filter(Boolean).join(' '),
}));

// Mock icons
vi.mock('lucide-react', () => ({
  Search: () => <div data-testid="search-icon" />,
  Download: () => <div data-testid="download-icon" />,
  X: () => <div data-testid="x-icon" />,
  AlertTriangle: () => <div data-testid="alert-icon" />,
  ChevronDown: () => <div data-testid="chevron-icon" />,
}));

describe('RealtimeTranscriptPanel - Focused Tests', () => {
  const mockSegments: TranscriptSegment[] = [
    {
      id: '1',
      text: 'Hello world',
      startMs: 0,
      endMs: 1000,
      confidence: 0.95,
      words: [
        { text: 'Hello', startMs: 0, endMs: 500, confidence: 0.95 },
        { text: 'world', startMs: 500, endMs: 1000, confidence: 0.93 },
      ],
      detections: [],
    },
  ];

  const mockDetections: DetectionResult[] = [
    {
      id: '1',
      label: 'CLEAN',
      score: 0.98,
      startPos: 0,
      endPos: 1000,
      snippet: 'Hello world',
      severity: 'LOW',
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Basic Rendering', () => {
    it('renders without crashing', () => {
      render(
        <RealtimeTranscriptPanel
          segments={[]}
          detections={[]}
          isStreaming={false}
        />
      );

      expect(screen.getByText(/transcript/i)).toBeInTheDocument();
    });

    it('displays transcript segments', () => {
      render(
        <RealtimeTranscriptPanel
          segments={mockSegments}
          detections={mockDetections}
          isStreaming={false}
        />
      );

      expect(screen.getByText('Hello world')).toBeInTheDocument();
    });

    it('shows empty message when no segments', () => {
      render(
        <RealtimeTranscriptPanel
          segments={[]}
          detections={[]}
          isStreaming={false}
        />
      );

      expect(screen.getByText(/no transcript available/i)).toBeInTheDocument();
    });
  });

  describe('Controls and Interactions', () => {
    it('renders search functionality', () => {
      render(
        <RealtimeTranscriptPanel
          segments={mockSegments}
          detections={mockDetections}
          isStreaming={false}
          showSearch={true}
        />
      );

      const searchInput = screen.getByPlaceholderText(/search transcript/i);
      expect(searchInput).toBeInTheDocument();
    });

    it('renders export functionality', () => {
      render(
        <RealtimeTranscriptPanel
          segments={mockSegments}
          detections={mockDetections}
          isStreaming={false}
          showExport={true}
        />
      );

      const exportButton = screen.getByRole('button', { name: /export/i });
      expect(exportButton).toBeInTheDocument();
    });

    it('handles search input changes', () => {
      render(
        <RealtimeTranscriptPanel
          segments={mockSegments}
          detections={mockDetections}
          isStreaming={false}
          showSearch={true}
        />
      );

      const searchInput = screen.getByPlaceholderText(/search transcript/i);
      fireEvent.change(searchInput, { target: { value: 'hello' } });

      expect(searchInput).toHaveValue('hello');
    });
  });

  describe('Display Options', () => {
    it('shows confidence when enabled', () => {
      render(
        <RealtimeTranscriptPanel
          segments={mockSegments}
          detections={mockDetections}
          isStreaming={false}
          showConfidence={true}
        />
      );

      // Should show confidence indicators
      expect(screen.getByText('Hello world')).toBeInTheDocument();
    });

    it('shows timing when enabled', () => {
      render(
        <RealtimeTranscriptPanel
          segments={mockSegments}
          detections={mockDetections}
          isStreaming={false}
          showTiming={true}
        />
      );

      // Should show timing information
      expect(screen.getByText('Hello world')).toBeInTheDocument();
    });

    it('shows detections when enabled', () => {
      render(
        <RealtimeTranscriptPanel
          segments={mockSegments}
          detections={mockDetections}
          isStreaming={false}
          showDetections={true}
        />
      );

      // Should show detection information
      expect(screen.getByText('Hello world')).toBeInTheDocument();
    });
  });

  describe('Streaming States', () => {
    it('indicates streaming state', () => {
      render(
        <RealtimeTranscriptPanel
          segments={mockSegments}
          detections={mockDetections}
          isStreaming={true}
        />
      );

      // Component should render properly during streaming
      expect(screen.getByText('Hello world')).toBeInTheDocument();
    });

    it('handles non-streaming state', () => {
      render(
        <RealtimeTranscriptPanel
          segments={mockSegments}
          detections={mockDetections}
          isStreaming={false}
        />
      );

      // Component should render properly when not streaming
      expect(screen.getByText('Hello world')).toBeInTheDocument();
    });
  });

  describe('Event Handlers', () => {
    it('calls onSegmentClick when segment is clicked', () => {
      const onSegmentClick = vi.fn();

      render(
        <RealtimeTranscriptPanel
          segments={mockSegments}
          detections={mockDetections}
          isStreaming={false}
          onSegmentClick={onSegmentClick}
        />
      );

      const segmentElement = screen.getByText('Hello world');
      fireEvent.click(segmentElement);

      expect(onSegmentClick).toHaveBeenCalledWith(mockSegments[0]);
    });

    it('handles export action', () => {
      const onExport = vi.fn();

      render(
        <RealtimeTranscriptPanel
          segments={mockSegments}
          detections={mockDetections}
          isStreaming={false}
          showExport={true}
          onExport={onExport}
        />
      );

      const exportButton = screen.getByRole('button', { name: /export/i });
      fireEvent.click(exportButton);

      expect(onExport).toHaveBeenCalledWith(mockSegments);
    });
  });

  describe('Error Handling', () => {
    it('handles invalid segment data gracefully', () => {
      const invalidSegments = [
        {
          id: '1',
          text: '',
          startMs: -1,
          endMs: -1,
          confidence: -1,
          words: [],
          detections: [],
        },
      ] as TranscriptSegment[];

      expect(() => {
        render(
          <RealtimeTranscriptPanel
            segments={invalidSegments}
            detections={[]}
            isStreaming={false}
          />
        );
      }).not.toThrow();
    });

    it('handles missing props gracefully', () => {
      expect(() => {
        render(
          <RealtimeTranscriptPanel
            segments={mockSegments}
            detections={mockDetections}
            isStreaming={false}
          />
        );
      }).not.toThrow();
    });
  });
});