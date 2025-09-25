/**
 * RealtimeTranscriptPanel - Professional scrolling transcript display
 * 
 * Features:
 * - Real-time transcript streaming display
 * - Word-level confidence visualization via opacity
 * - Auto-scroll to latest content with smooth animations
 * - Detection highlighting for harmful content
 * - Proper text formatting and typography
 * - Performance-optimized rendering for large transcripts
 * - Responsive design with mobile support
 * 
 * Integration:
 * - Connects to Socket.IO transcript events
 * - Highlights detected harmful content
 * - Supports transcript history management
 * - Includes copy/export functionality
 */

import React, { useRef, useEffect, useMemo, useCallback, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Copy, Download, Trash2, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

// =============================================================================
// Types & Interfaces
// =============================================================================

export interface TranscriptWord {
  /** Word text content */
  text: string;
  
  /** Start time in milliseconds */
  startMs: number;
  
  /** End time in milliseconds */
  endMs: number;
  
  /** Confidence score (0-1) */
  confidence: number;
  
  /** Unique word identifier */
  id: string;
}

export interface TranscriptSegment {
  /** Unique segment identifier */
  id: string;
  
  /** Segment sequence number */
  sequence: number;
  
  /** Full segment text */
  text: string;
  
  /** Array of words with timing and confidence */
  words: TranscriptWord[];
  
  /** Segment start time in milliseconds */
  startMs: number;
  
  /** Segment end time in milliseconds */
  endMs: number;
  
  /** Whether this is a final segment or partial */
  isFinal: boolean;
  
  /** Associated detections for this segment */
  detections?: DetectionResult[];
  
  /** Timestamp when segment was created */
  timestamp: Date;
}

export interface DetectionResult {
  /** Detection unique identifier */
  id: string;
  
  /** Detection type */
  type: 'CLEAN' | 'OFFENSIVE' | 'HATE';
  
  /** Detection severity level */
  severity: 'LOW' | 'MEDIUM' | 'HIGH';
  
  /** Confidence score for detection */
  confidence: number;
  
  /** Text snippet that triggered detection */
  snippet: string;
  
  /** Start position in segment text */
  startPos: number;
  
  /** End position in segment text */
  endPos: number;
}

interface RealtimeTranscriptPanelProps {
  /** Array of transcript segments */
  segments: TranscriptSegment[];
  
  /** Whether transcript is actively being recorded */
  isRecording: boolean;
  
  /** Custom className for styling */
  className?: string;
  
  /** Maximum number of segments to display */
  maxSegments?: number;
  
  /** Whether to show confidence indicators */
  showConfidence?: boolean;
  
  /** Whether to show detection highlights */
  showDetections?: boolean;
  
  /** Whether to show word-level timing */
  showTiming?: boolean;
  
  /** Whether to auto-scroll to latest content */
  autoScroll?: boolean;
  
  /** Custom height for transcript panel */
  height?: string;
  
  /** Callback when segment is clicked */
  onSegmentClick?: (segment: TranscriptSegment) => void;
  
  /** Callback when transcript is cleared */
  onClear?: () => void;
  
  /** Callback when transcript is exported */
  onExport?: (segments: TranscriptSegment[]) => void;
  
  /** Callback when text is copied */
  onCopy?: (text: string) => void;
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Formats timestamp to human-readable format
 */
const formatTime = (milliseconds: number): string => {
  const seconds = Math.floor(milliseconds / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  
  const remainingSeconds = seconds % 60;
  const remainingMinutes = minutes % 60;
  
  if (hours > 0) {
    return `${hours}:${remainingMinutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  }
  return `${remainingMinutes}:${remainingSeconds.toString().padStart(2, '0')}`;
};

/**
 * Gets color for confidence level
 */
const getConfidenceColor = (confidence: number): string => {
  if (confidence >= 0.8) return 'text-green-400';
  if (confidence >= 0.6) return 'text-yellow-400';
  return 'text-red-400';
};

/**
 * Gets styling for detection type
 */
const getDetectionStyling = (type: DetectionResult['type']) => {
  const baseClass = 'relative';
  
  switch (type) {
    case 'OFFENSIVE':
      return {
        className: `${baseClass} bg-yellow-500/20 border-l-4 border-yellow-500`,
        badge: 'bg-yellow-500 text-yellow-50',
      };
    case 'HATE':
      return {
        className: `${baseClass} bg-red-500/20 border-l-4 border-red-500`,
        badge: 'bg-red-500 text-red-50',
      };
    default:
      return {
        className: `${baseClass} bg-green-500/10 border-l-4 border-green-500`,
        badge: 'bg-green-500 text-green-50',
      };
  }
};

// =============================================================================
// Word Component
// =============================================================================

interface WordProps {
  word: TranscriptWord;
  showConfidence: boolean;
  showTiming: boolean;
  detections: DetectionResult[];
  onClick?: (word: TranscriptWord) => void;
}

const Word: React.FC<WordProps> = ({ 
  word, 
  showConfidence, 
  showTiming,
  detections,
  onClick 
}) => {
  const hasDetection = detections.some(d => 
    d.startPos <= word.startMs && d.endPos >= word.endMs
  );
  
  const detection = detections.find(d => 
    d.startPos <= word.startMs && d.endPos >= word.endMs
  );
  
  const opacity = showConfidence ? word.confidence : 1;
  
  return (
    <motion.span
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity, y: 0 }}
      className={cn(
        "inline-block mr-1 px-1 rounded cursor-pointer transition-all duration-200",
        "hover:bg-gray-700/30",
        hasDetection && detection && getDetectionStyling(detection.type).className.includes('bg-red') && "bg-red-500/20",
        hasDetection && detection && getDetectionStyling(detection.type).className.includes('bg-yellow') && "bg-yellow-500/20",
        showConfidence && opacity < 0.6 && "border-b border-dashed border-red-400/50"
      )}
      onClick={() => onClick?.(word)}
      title={showTiming ? `${formatTime(word.startMs)} - ${formatTime(word.endMs)}` : undefined}
    >
      {word.text}
      {showConfidence && (
        <span className={cn(
          "text-xs ml-1 opacity-60",
          getConfidenceColor(word.confidence)
        )}>
          {Math.round(word.confidence * 100)}%
        </span>
      )}
    </motion.span>
  );
};

// =============================================================================
// Segment Component
// =============================================================================

interface SegmentProps {
  segment: TranscriptSegment;
  showConfidence: boolean;
  showTiming: boolean;
  showDetections: boolean;
  onSegmentClick?: (segment: TranscriptSegment) => void;
  onWordClick?: (word: TranscriptWord) => void;
}

const Segment: React.FC<SegmentProps> = ({
  segment,
  showConfidence,
  showTiming,
  showDetections,
  onSegmentClick,
  onWordClick,
}) => {
  const hasDetections = segment.detections && segment.detections.length > 0;
  const highestSeverity = segment.detections?.reduce((max, detection) => {
    const severityOrder = { LOW: 1, MEDIUM: 2, HIGH: 3 };
    return severityOrder[detection.severity] > severityOrder[max.severity] ? detection : max;
  });

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: segment.isFinal ? 1 : 0.7, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className={cn(
        "p-4 mb-3 rounded-lg bg-gray-800/50 border border-gray-700/30",
        "hover:bg-gray-800/70 cursor-pointer transition-all duration-200",
        hasDetections && highestSeverity && "border-l-4",
        hasDetections && highestSeverity?.type === 'HATE' && "border-l-red-500",
        hasDetections && highestSeverity?.type === 'OFFENSIVE' && "border-l-yellow-500",
        hasDetections && highestSeverity?.type === 'CLEAN' && "border-l-green-500",
        !segment.isFinal && "animate-pulse"
      )}
      onClick={() => onSegmentClick?.(segment)}
    >
      {/* Segment Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center space-x-2">
          <span className="text-xs text-gray-400">
            #{segment.sequence}
          </span>
          {showTiming && (
            <span className="text-xs text-gray-400">
              {formatTime(segment.startMs)} - {formatTime(segment.endMs)}
            </span>
          )}
          {!segment.isFinal && (
            <Badge variant="outline" className="text-xs">
              Processing...
            </Badge>
          )}
        </div>
        
        {/* Detection Badges */}
        {showDetections && segment.detections && (
          <div className="flex space-x-1">
            {segment.detections.map((detection, index) => {
              const styling = getDetectionStyling(detection.type);
              return (
                <Badge
                  key={index}
                  className={cn("text-xs", styling.badge)}
                >
                  {detection.type} ({Math.round(detection.confidence * 100)}%)
                </Badge>
              );
            })}
          </div>
        )}
      </div>
      
      {/* Segment Text with Words */}
      <div className="text-gray-200 leading-relaxed">
        {segment.words.map((word, index) => (
          <Word
            key={`${segment.id}-${index}`}
            word={word}
            showConfidence={showConfidence}
            showTiming={showTiming}
            detections={segment.detections || []}
            {...(onWordClick && { onClick: onWordClick })}
          />
        ))}
      </div>
      
      {/* Detection Details */}
      {showDetections && segment.detections && segment.detections.length > 0 && (
        <div className="mt-3 pt-3 border-t border-gray-700/30">
          {segment.detections.map((detection, index) => (
            <div key={index} className="text-xs text-gray-400 mb-1">
              <span className="font-medium text-gray-300">"{detection.snippet}"</span>
              {' '}- {detection.type} ({detection.severity})
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
};

// =============================================================================
// Main Component
// =============================================================================

export const RealtimeTranscriptPanel: React.FC<RealtimeTranscriptPanelProps> = ({
  segments,
  isRecording,
  className,
  maxSegments = 50,
  showConfidence = false,
  showDetections = true,
  showTiming = false,
  autoScroll = true,
  height = '400px',
  onSegmentClick,
  onClear,
  onExport,
  onCopy,
}) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isUserScrolling, setIsUserScrolling] = useState(false);
  
  // Memoize filtered and limited segments
  const displaySegments = useMemo(() => {
    let filteredSegments = segments;
    
    // Apply search filter
    if (searchTerm) {
      filteredSegments = segments.filter(segment => 
        segment.text.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    // Limit to max segments
    return filteredSegments.slice(-maxSegments);
  }, [segments, searchTerm, maxSegments]);
  
  // Auto-scroll to latest content
  const scrollToBottom = useCallback(() => {
    if (scrollContainerRef.current && autoScroll && !isUserScrolling) {
      scrollContainerRef.current.scrollTo({
        top: scrollContainerRef.current.scrollHeight,
        behavior: 'smooth',
      });
    }
  }, [autoScroll, isUserScrolling]);
  
  // Scroll to bottom when new segments arrive
  useEffect(() => {
    const timeoutId = setTimeout(scrollToBottom, 100);
    return () => clearTimeout(timeoutId);
  }, [displaySegments.length, scrollToBottom]);
  
  // Handle user scroll to detect manual scrolling
  const handleScroll = useCallback(() => {
    if (!scrollContainerRef.current) return;
    
    const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
    const isAtBottom = scrollTop + clientHeight >= scrollHeight - 50;
    
    setIsUserScrolling(!isAtBottom);
  }, []);
  
  // Copy transcript text
  const handleCopy = useCallback(() => {
    const text = displaySegments
      .map(segment => `[${formatTime(segment.startMs)}] ${segment.text}`)
      .join('\n');
    
    navigator.clipboard.writeText(text).then(() => {
      onCopy?.(text);
    });
  }, [displaySegments, onCopy]);
  
  // Export transcript
  const handleExport = useCallback(() => {
    onExport?.(displaySegments);
  }, [displaySegments, onExport]);
  
  // Calculate stats
  const stats = useMemo(() => {
    const totalWords = displaySegments.reduce((count, segment) => count + segment.words.length, 0);
    const totalDetections = displaySegments.reduce((count, segment) => count + (segment.detections?.length || 0), 0);
    const avgConfidence = displaySegments.reduce((sum, segment) => {
      const segmentAvg = segment.words.reduce((wordSum, word) => wordSum + word.confidence, 0) / segment.words.length;
      return sum + (segmentAvg || 0);
    }, 0) / (displaySegments.length || 1);
    
    return { totalWords, totalDetections, avgConfidence };
  }, [displaySegments]);
  
  return (
    <div 
      className={cn(
        "flex flex-col bg-gray-900/90 border border-gray-700/30 rounded-lg backdrop-blur-sm",
        className
      )}
      style={{ height }}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-700/30">
        <div className="flex items-center space-x-4">
          <h3 className="text-lg font-semibold text-gray-100">Live Transcript</h3>
          <div className="flex items-center space-x-2 text-sm text-gray-400">
            {isRecording && (
              <div className="flex items-center space-x-1">
                <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                <span>Recording</span>
              </div>
            )}
            <span>{displaySegments.length} segments</span>
            <span>{stats.totalWords} words</span>
            {stats.totalDetections > 0 && (
              <span className="text-yellow-400">{stats.totalDetections} detections</span>
            )}
          </div>
        </div>
        
        {/* Actions */}
        <div className="flex items-center space-x-2">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search transcript..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 pr-3 py-1 bg-gray-800/50 border border-gray-600/50 rounded text-sm text-gray-200 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={handleCopy}
            disabled={displaySegments.length === 0}
            className="text-gray-400 hover:text-gray-200"
          >
            <Copy className="w-4 h-4" />
          </Button>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={handleExport}
            disabled={displaySegments.length === 0}
            className="text-gray-400 hover:text-gray-200"
          >
            <Download className="w-4 h-4" />
          </Button>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={onClear}
            disabled={displaySegments.length === 0}
            className="text-gray-400 hover:text-red-400"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>
      
      {/* Content */}
      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto p-4 space-y-3"
      >
        <AnimatePresence mode="popLayout">
          {displaySegments.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-center justify-center h-full text-gray-500"
            >
              <div className="text-center">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-800/50 flex items-center justify-center">
                  <Search className="w-8 h-8" />
                </div>
                <p className="text-lg">No transcript yet</p>
                <p className="text-sm text-gray-600 mt-1">
                  {isRecording ? 'Listening for speech...' : 'Start recording to see transcript'}
                </p>
              </div>
            </motion.div>
          ) : (
            displaySegments.map((segment) => (
              <Segment
                key={segment.id}
                segment={segment}
                showConfidence={showConfidence}
                showTiming={showTiming}
                showDetections={showDetections}
                {...(onSegmentClick && { onSegmentClick })}
              />
            ))
          )}
        </AnimatePresence>
      </div>
      
      {/* Footer Stats */}
      {displaySegments.length > 0 && (
        <div className="px-4 py-2 border-t border-gray-700/30 text-xs text-gray-500 flex items-center justify-between">
          <span>
            Avg Confidence: {Math.round(stats.avgConfidence * 100)}%
          </span>
          {!isUserScrolling && autoScroll && (
            <span className="flex items-center space-x-1">
              <div className="w-2 h-2 bg-green-500 rounded-full" />
              <span>Auto-scroll enabled</span>
            </span>
          )}
          {isUserScrolling && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setIsUserScrolling(false);
                scrollToBottom();
              }}
              className="text-blue-400 hover:text-blue-300"
            >
              Scroll to bottom
            </Button>
          )}
        </div>
      )}
    </div>
  );
};

// =============================================================================
// Default Export
// =============================================================================

export default RealtimeTranscriptPanel;