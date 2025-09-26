/**
 * Enhanced Motion Components - P28 Implementation
 * Mục đích: Framer Motion v12 performance optimizations với hardware acceleration
 * Features: Independent transforms, layout animations, gesture recognition, performance monitoring
 * Tech: Framer Motion v12, hardware acceleration, performance optimization
 * 
 * Research sources:
 * - https://www.framer.com/motion/ (Motion v12 features)
 * - Performance optimization patterns, hardware acceleration
 */

import { useRef, useEffect } from 'react';
import { 
  motion, 
  useMotionValue, 
  useSpring, 
  useTransform,
  useMotionTemplate,

  useDragControls,
  useReducedMotion,
  AnimatePresence,
  type PanInfo,
  type Variants
} from 'framer-motion';
// import { useAudioStore } from '../../stores/enhanced-stores';

// Performance-optimized audio visualizer với hardware acceleration
interface EnhancedAudioVisualizerProps {
  audioData?: Float32Array;
  isActive: boolean;
  size?: 'small' | 'medium' | 'large' | 'xlarge';
  theme?: 'default' | 'neon' | 'minimal';
  className?: string;
}

export function EnhancedAudioVisualizer({ 
  audioData, 
  isActive, 
  size = 'medium',
  theme = 'default',
  className 
}: EnhancedAudioVisualizerProps) {
  const prefersReducedMotion = useReducedMotion();
  
  // Hardware-accelerated motion values
  const scale = useMotionValue(1);
  const rotate = useMotionValue(0);
  const opacity = useMotionValue(0.6);
  
  // Spring physics for smooth animations
  const springScale = useSpring(scale, { 
    stiffness: 300, 
    damping: 30,
    mass: 0.8
  });
  const springRotate = useSpring(rotate, { 
    stiffness: 100, 
    damping: 20 
  });
  const springOpacity = useSpring(opacity, { 
    stiffness: 400, 
    damping: 40 
  });
  
  // Transform scale to opacity for breathing effect
  const breathingOpacity = useTransform(springScale, [0.8, 1.2], [0.4, 1]);
  
  // Dynamic gradient based on audio amplitude
  const gradientTemplate = useMotionTemplate`conic-gradient(from ${springRotate}deg, #3B82F6, #10B981, #F59E0B, #EF4444, #3B82F6)`;
  
  const sizeMap = {
    small: 120,
    medium: 200,
    large: 300,
    xlarge: 400,
  };
  
  const themeColors = {
    default: {
      primary: '#3B82F6',
      secondary: '#10B981',
      accent: '#F59E0B',
    },
    neon: {
      primary: '#00FF88',
      secondary: '#FF0080',
      accent: '#00D9FF',
    },
    minimal: {
      primary: '#6366F1',
      secondary: '#8B5CF6',
      accent: '#EC4899',
    },
  };
  
  const colors = themeColors[theme];
  const dimensions = sizeMap[size];
  
  // Audio-reactive animation logic
  useEffect(() => {
    if (!audioData || prefersReducedMotion) return;
    
    const updateAnimation = () => {
      if (isActive && audioData.length > 0) {
        // Calculate audio metrics
        const avgAmplitude = audioData.reduce((sum, val) => sum + Math.abs(val), 0) / audioData.length;
        // const maxAmplitude = Math.max(...audioData.map(Math.abs));
        const intensity = Math.min(avgAmplitude * 5, 1);
        
        // Update motion values based on audio
        scale.set(1 + intensity * 0.3);
        rotate.set(rotate.get() + intensity * 2);
        opacity.set(0.6 + intensity * 0.4);
      } else {
        // Breathing animation when idle
        const time = Date.now() * 0.002;
        scale.set(1 + Math.sin(time) * 0.05);
        opacity.set(0.6 + Math.sin(time * 0.5) * 0.1);
      }
    };
    
    const animationFrame = requestAnimationFrame(updateAnimation);
    return () => cancelAnimationFrame(animationFrame);
  }, [audioData, isActive, scale, rotate, opacity, prefersReducedMotion]);
  
  // Animation variants for entry/exit
  const visualizerVariants: Variants = {
    hidden: { 
      scale: 0.8, 
      opacity: 0,
      rotate: -10,
    },
    visible: { 
      scale: 1, 
      opacity: 1,
      rotate: 0,
      transition: { 
        type: "spring",
        stiffness: 300,
        damping: 30,
        staggerChildren: 0.1
      }
    },
    exit: {
      scale: 0.8,
      opacity: 0,
      rotate: 10,
      transition: { duration: 0.2 }
    }
  };
  
  const waveVariants: Variants = {
    hidden: { pathLength: 0, opacity: 0 },
    visible: { 
      pathLength: 1, 
      opacity: 1,
      transition: {
        pathLength: { duration: 0.5, ease: "easeInOut" },
        opacity: { duration: 0.3 }
      }
    }
  };
  
  return (
    <motion.div
      className={`relative flex items-center justify-center ${className}`}
      variants={visualizerVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      style={{
        width: dimensions,
        height: dimensions,
      }}
    >
      {/* Background gradient circle */}
      <motion.div
        className="absolute inset-0 rounded-full"
        style={{
          background: gradientTemplate,
          scale: springScale,
          opacity: breathingOpacity,
          filter: 'blur(20px)',
        }}
      />
      
      {/* Main visualizer SVG */}
      <motion.svg
        width={dimensions}
        height={dimensions}
        viewBox={`0 0 ${dimensions} ${dimensions}`}
        className="relative z-10"
        style={{
          scale: springScale,
          rotate: springRotate,
          opacity: springOpacity,
        }}
      >
        {/* Circular waveform */}
        {audioData && audioData.length > 0 && (
          <>
            {Array.from({ length: Math.min(audioData.length, 64) }, (_, i) => {
              const angle = (i / 64) * Math.PI * 2;
              const amplitude = Math.abs(audioData[i * Math.floor(audioData.length / 64)] || 0);
              const radius = dimensions * 0.2;
              const waveRadius = radius + amplitude * dimensions * 0.15;
              
              const x1 = dimensions / 2 + Math.cos(angle) * radius;
              const y1 = dimensions / 2 + Math.sin(angle) * radius;
              const x2 = dimensions / 2 + Math.cos(angle) * waveRadius;
              const y2 = dimensions / 2 + Math.sin(angle) * waveRadius;
              
              return (
                <motion.line
                  key={i}
                  x1={x1}
                  y1={y1}
                  x2={x2}
                  y2={y2}
                  stroke={colors.primary}
                  strokeWidth={2}
                  strokeLinecap="round"
                  variants={waveVariants}
                  style={{
                    opacity: useTransform(springOpacity, [0.6, 1], [0.6, amplitude * 2]),
                  }}
                />
              );
            })}
          </>
        )}
        
        {/* Center pulse circle */}
        <motion.circle
          cx={dimensions / 2}
          cy={dimensions / 2}
          r={dimensions * 0.08}
          fill={colors.secondary}
          animate={{
            r: isActive 
              ? [dimensions * 0.08, dimensions * 0.12, dimensions * 0.08]
              : dimensions * 0.08,
          }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      </motion.svg>
      
      {/* Status indicator */}
      <motion.div
        className="absolute bottom-2 right-2 z-20"
        initial={{ scale: 0 }}
        animate={{ scale: isActive ? 1 : 0.8 }}
        transition={{ type: "spring", stiffness: 400 }}
      >
        <div 
          className={`w-3 h-3 rounded-full ${
            isActive ? 'bg-green-500' : 'bg-gray-400'
          } shadow-lg`}
        />
      </motion.div>
    </motion.div>
  );
}

// Enhanced session card với layout animations
interface EnhancedSessionCardProps {
  session: any; // Replace with proper Session type
  isExpanded?: boolean;
  onToggle?: () => void;
  onDelete?: () => void;
  className?: string;
}

export function EnhancedSessionCard({ 
  session, 
  isExpanded = false, 
  onToggle,
  onDelete,
  className 
}: EnhancedSessionCardProps) {
  const dragControls = useDragControls();
  // Motion values for swipe gestures
  const x = useMotionValue(0);
  
  // Transform x to background color for swipe feedback
  const swipeBackground = useTransform(
    x,
    [-200, -100, 0, 100, 200],
    ['#fee2e2', '#fef3c7', '#ffffff', '#dcfce7', '#dbeafe']
  );
  
  const handleDragEnd = (_event: MouseEvent | TouchEvent, info: PanInfo) => {
    const offset = info.offset.x;
    const velocity = info.velocity.x;
    
    // Swipe left to delete
    if (offset < -150 || velocity < -500) {
      onDelete?.();
    } else {
      // Snap back to center
      x.set(0);
    }
  };
  
  const cardVariants: Variants = {
    collapsed: {
      height: 'auto',
      transition: { duration: 0.3, ease: 'easeInOut' }
    },
    expanded: {
      height: 'auto',
      transition: { duration: 0.3, ease: 'easeInOut' }
    }
  };
  
  const contentVariants: Variants = {
    collapsed: {
      opacity: 0,
      height: 0,
      transition: { duration: 0.2 }
    },
    expanded: {
      opacity: 1,
      height: 'auto',
      transition: { duration: 0.3, delay: 0.1 }
    }
  };
  
  return (
    <motion.div
      layout
      layoutId={`session-${session.id}`}
      className={`relative overflow-hidden rounded-xl border border-gray-200 shadow-sm ${className}`}
      variants={cardVariants}
      animate={isExpanded ? 'expanded' : 'collapsed'}
      whileHover={{ 
        y: -2,
        boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)',
        transition: { type: "spring", stiffness: 300 }
      }}
      drag="x"
      dragControls={dragControls}
      dragElastic={0.1}
      dragConstraints={{ left: -250, right: 50 }}
      onDragEnd={handleDragEnd}
      style={{
        x,
        backgroundColor: swipeBackground,
      }}
    >
      {/* Swipe action indicators */}
      <motion.div 
        className="absolute left-4 top-1/2 transform -translate-y-1/2 text-red-500"
        style={{
          opacity: useTransform(x, [-200, -50, 0], [1, 0.5, 0]),
          scale: useTransform(x, [-200, -50, 0], [1.2, 1, 0.8]),
        }}
      >
        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
        </svg>
      </motion.div>
      
      {/* Card content */}
      <motion.div
        className="p-4 cursor-pointer"
        onClick={onToggle}
        whileTap={{ scale: 0.98 }}
      >
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <motion.h3 
              layout="position"
              className="text-lg font-semibold text-gray-900"
            >
              {session.name}
            </motion.h3>
            <motion.p 
              layout="position"
              className="text-sm text-gray-600 mt-1"
            >
              {new Date(session.startedAt).toLocaleString()}
            </motion.p>
          </div>
          
          <motion.div
            animate={{ rotate: isExpanded ? 180 : 0 }}
            transition={{ type: "spring", stiffness: 300 }}
            className="ml-4"
          >
            <svg className="w-5 h-5 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </motion.div>
        </div>
      </motion.div>
      
      {/* Expandable content */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            key="expanded-content"
            variants={contentVariants}
            initial="collapsed"
            animate="expanded"
            exit="collapsed"
            className="px-4 pb-4 border-t border-gray-100"
          >
            <div className="pt-4 space-y-3">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium text-gray-700">Duration:</span>
                  <span className="ml-2 text-gray-600">
                    {session.endedAt 
                      ? `${Math.round((new Date(session.endedAt).getTime() - new Date(session.startedAt).getTime()) / 1000)}s`
                      : 'Active'
                    }
                  </span>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Language:</span>
                  <span className="ml-2 text-gray-600">{session.lang}</span>
                </div>
              </div>
              
              {session.description && (
                <div>
                  <span className="font-medium text-gray-700">Description:</span>
                  <p className="mt-1 text-sm text-gray-600">{session.description}</p>
                </div>
              )}
              
              <div className="flex justify-end space-x-2 pt-2">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 transition-colors"
                >
                  View Details
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete?.();
                  }}
                  className="px-3 py-1 text-sm bg-red-100 text-red-700 rounded-md hover:bg-red-200 transition-colors"
                >
                  Delete
                </motion.button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// Performance monitoring hook for Motion components
export function useMotionPerformance() {
  const metricsRef = useRef({
    animationCount: 0,
    averageFrameTime: 0,
    droppedFrames: 0,
  });
  
  useEffect(() => {
    let lastFrameTime = performance.now();
    let frameCount = 0;
    let totalFrameTime = 0;
    
    const trackPerformance = () => {
      const currentTime = performance.now();
      const frameTime = currentTime - lastFrameTime;
      
      frameCount++;
      totalFrameTime += frameTime;
      
      // Track dropped frames (>16.67ms = below 60fps)
      if (frameTime > 16.67) {
        metricsRef.current.droppedFrames++;
      }
      
      // Update average every 60 frames
      if (frameCount % 60 === 0) {
        metricsRef.current.averageFrameTime = totalFrameTime / frameCount;
        
        if (process.env.NODE_ENV === 'development') {
          console.log(`Motion Performance: 
            Avg Frame Time: ${metricsRef.current.averageFrameTime.toFixed(2)}ms
            Dropped Frames: ${metricsRef.current.droppedFrames}
            FPS: ${(1000 / metricsRef.current.averageFrameTime).toFixed(1)}`);
        }
      }
      
      lastFrameTime = currentTime;
      requestAnimationFrame(trackPerformance);
    };
    
    const animationFrame = requestAnimationFrame(trackPerformance);
    
    return () => {
      cancelAnimationFrame(animationFrame);
    };
  }, []);
  
  return metricsRef.current;
}

// Gesture-enabled transcript panel
interface GestureTranscriptPanelProps {
  segments: any[]; // Replace with proper TranscriptSegment type
  onSegmentDelete?: (id: string) => void;
  className?: string;
}

export function GestureTranscriptPanel({ 
  segments, 
  onSegmentDelete,
  className 
}: GestureTranscriptPanelProps) {
  // const prefersReducedMotion = useReducedMotion(); // TODO: Use for accessibility
  
  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2,
      }
    }
  };
  
  const segmentVariants: Variants = {
    hidden: { 
      opacity: 0, 
      y: 20,
      scale: 0.9 
    },
    visible: { 
      opacity: 1, 
      y: 0,
      scale: 1,
      transition: {
        type: "spring",
        stiffness: 300,
        damping: 25
      }
    },
    exit: {
      opacity: 0,
      x: -100,
      scale: 0.8,
      transition: { duration: 0.2 }
    }
  };
  
  return (
    <motion.div
      className={`space-y-2 ${className}`}
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      <AnimatePresence mode="popLayout">
        {segments.map((segment) => (
          <motion.div
            key={segment.id}
            layout
            variants={segmentVariants}
            exit="exit"
            className="group relative p-3 bg-white rounded-lg border border-gray-200 shadow-sm"
            drag="x"
            dragConstraints={{ left: -200, right: 50 }}
            dragElastic={0.1}
            whileDrag={{ 
              backgroundColor: "#fef3c7",
              scale: 1.02,
              boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1)"
            }}
            onDragEnd={(_event, info) => {
              const offset = info.offset.x;
              const velocity = info.velocity.x;
              
              if (offset < -100 || velocity < -500) {
                onSegmentDelete?.(segment.id);
              }
            }}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-sm text-gray-800">{segment.text}</p>
                <div className="flex items-center mt-2 text-xs text-gray-500">
                  <span>{new Date(segment.timestamp).toLocaleTimeString()}</span>
                  {segment.confidence && (
                    <span className="ml-3">
                      Confidence: {Math.round(segment.confidence * 100)}%
                    </span>
                  )}
                </div>
              </div>
              
              <motion.button
                className="opacity-0 group-hover:opacity-100 ml-2 p-1 text-gray-400 hover:text-red-500 transition-colors"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => onSegmentDelete?.(segment.id)}
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </motion.button>
            </div>
            
            {/* Swipe indicator */}
            <motion.div 
              className="absolute left-2 top-1/2 transform -translate-y-1/2 text-red-500 opacity-0"
              animate={{
                opacity: segment.id === 'dragging' ? 1 : 0,
              }}
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9z" clipRule="evenodd" />
              </svg>
            </motion.div>
          </motion.div>
        ))}
      </AnimatePresence>
      
      {segments.length === 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center py-8 text-gray-500"
        >
          <svg className="w-12 h-12 mx-auto mb-3 text-gray-300" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" clipRule="evenodd" />
            <path fillRule="evenodd" d="M4 5a2 2 0 012-2v1a1 1 0 001 1h6a1 1 0 001-1V3a2 2 0 012 2v6a2 2 0 01-2 2H6a2 2 0 01-2-2V5zM8 8a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1zm1 3a1 1 0 100 2h2a1 1 0 100-2H9z" clipRule="evenodd" />
          </svg>
          <p>No transcript segments yet</p>
          <p className="text-sm">Start recording to see transcripts appear here</p>
        </motion.div>
      )}
    </motion.div>
  );
}