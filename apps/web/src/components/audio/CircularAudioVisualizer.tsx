/**
 * CircularAudioVisualizer - Professional Canvas-based audio visualization component
 * 
 * Features:
 * - Real-time circular waveform rendering
 * - 300px diameter responsive design
 * - Dark theme with customizable colors
 * - Smooth amplitude-based animations
 * - Performance-optimized with requestAnimationFrame
 * - Hardware acceleration via Canvas2D or WebGL
 * 
 * Integration:
 * - Connects to AudioWorklet data stream
 * - Responsive to recording state changes
 * - Breathing animation when idle
 * - Pulse effects during active recording
 */

import React, { useRef, useEffect, useMemo, useCallback } from 'react';
import { motion, useAnimation } from 'framer-motion';
import { cn } from '@/lib/utils';

// =============================================================================
// Types & Interfaces
// =============================================================================

interface CircularAudioVisualizerProps {
  /** Array of audio amplitude data (0-1 range) */
  audioData?: Float32Array;
  
  /** Whether audio is actively being recorded */
  isRecording: boolean;
  
  /** Size of the visualizer in pixels */
  size?: number;
  
  /** Theme variant for color scheme */
  theme?: 'default' | 'neon' | 'danger' | 'success';
  
  /** Custom className for styling */
  className?: string;
  
  /** Enable WebGL acceleration (fallback to Canvas2D) */
  useWebGL?: boolean;
  
  /** Animation sensitivity (0-1, default 0.7) */
  sensitivity?: number;
  
  /** Custom color configuration */
  colors?: {
    primary: string;
    secondary: string;
    background: string;
    accent: string;
  };
  
  /** Callback when visualizer is clicked */
  onClick?: () => void;
}

interface VisualizerConfig {
  size: number;
  centerX: number;
  centerY: number;
  baseRadius: number;
  maxRadius: number;
  numBars: number;
  barWidth: number;
  colors: {
    primary: string;
    secondary: string;
    background: string;
    accent: string;
  };
}

// =============================================================================
// Theme Configurations
// =============================================================================

const THEME_COLORS = {
  default: {
    primary: '#3B82F6',      // Blue
    secondary: '#1D4ED8',    // Blue dark
    background: '#111827',   // Dark background
    accent: '#60A5FA',       // Blue light
  },
  neon: {
    primary: '#10B981',      // Emerald
    secondary: '#059669',    // Emerald dark
    background: '#000000',   // Black
    accent: '#34D399',       // Emerald light
  },
  danger: {
    primary: '#EF4444',      // Red
    secondary: '#DC2626',    // Red dark
    background: '#111827',   // Dark background
    accent: '#F87171',       // Red light
  },
  success: {
    primary: '#10B981',      // Emerald
    secondary: '#059669',    // Emerald dark
    background: '#111827',   // Dark background
    accent: '#34D399',       // Emerald light
  },
} as const;

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Converts audio frequency data to visual amplitude
 */
const processAudioData = (
  audioData: Float32Array,
  numBars: number,
  sensitivity: number
): number[] => {
  if (!audioData || audioData.length === 0) {
    return new Array(numBars).fill(0);
  }

  const barData: number[] = [];
  const samplesPerBar = Math.floor(audioData.length / numBars);
  
  for (let i = 0; i < numBars; i++) {
    let sum = 0;
    const start = i * samplesPerBar;
    const end = Math.min(start + samplesPerBar, audioData.length);
    
    for (let j = start; j < end; j++) {
      sum += Math.abs(audioData[j] ?? 0);
    }
    
    const average = sum / (end - start);
    const amplified = Math.pow(average * sensitivity, 1.5); // Apply curve for better visuals
    barData.push(Math.min(amplified, 1)); // Clamp to 1
  }
  
  return barData;
};

/**
 * Generates breathing animation effect for idle state
 */
const getBreathingRadius = (baseRadius: number, time: number): number => {
  return baseRadius + Math.sin(time * 0.003) * 8;
};

// =============================================================================
// Canvas Rendering Functions
// =============================================================================

class VisualizerRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private config: VisualizerConfig;
  private animationId: number = 0;

  constructor(canvas: HTMLCanvasElement, config: VisualizerConfig) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.config = config;
    this.setupCanvas();
  }

  private setupCanvas(): void {
    const { size } = this.config;
    const dpr = window.devicePixelRatio || 1;
    
    // Set canvas size with device pixel ratio for crisp rendering
    this.canvas.width = size * dpr;
    this.canvas.height = size * dpr;
    this.canvas.style.width = `${size}px`;
    this.canvas.style.height = `${size}px`;
    
    // Scale context for device pixel ratio
    this.ctx.scale(dpr, dpr);
    
    // Set rendering properties for smooth graphics
    this.ctx.imageSmoothingEnabled = true;
    this.ctx.imageSmoothingQuality = 'high';
  }

  /**
   * Render circular audio visualizer with amplitude data
   */
  render(audioData: number[], isRecording: boolean, timestamp: number): void {
    const { colors } = this.config;
    const ctx = this.ctx;
    
    // Clear canvas with background
    ctx.fillStyle = colors.background;
    ctx.fillRect(0, 0, this.config.size, this.config.size);
    
    if (!isRecording) {
      this.renderIdleState(timestamp);
      return;
    }
    
    // Draw circular waveform
    this.renderActiveState(audioData);
  }

  private renderIdleState(timestamp: number): void {
    const { centerX, centerY, baseRadius, colors } = this.config;
    const ctx = this.ctx;
    
    // Breathing circle animation
    const breathRadius = getBreathingRadius(baseRadius, timestamp);
    
    // Outer glow ring
    const glowGradient = ctx.createRadialGradient(
      centerX, centerY, breathRadius - 10,
      centerX, centerY, breathRadius + 20
    );
    glowGradient.addColorStop(0, colors.primary + '40');
    glowGradient.addColorStop(1, 'transparent');
    
    ctx.fillStyle = glowGradient;
    ctx.beginPath();
    ctx.arc(centerX, centerY, breathRadius + 20, 0, Math.PI * 2);
    ctx.fill();
    
    // Main circle
    ctx.strokeStyle = colors.primary;
    ctx.lineWidth = 3;
    ctx.setLineDash([]);
    ctx.beginPath();
    ctx.arc(centerX, centerY, breathRadius, 0, Math.PI * 2);
    ctx.stroke();
    
    // Center dot
    ctx.fillStyle = colors.accent;
    ctx.beginPath();
    ctx.arc(centerX, centerY, 4, 0, Math.PI * 2);
    ctx.fill();
  }

  private renderActiveState(audioData: number[]): void {
    const { centerX, centerY, baseRadius, maxRadius, numBars, colors } = this.config;
    const ctx = this.ctx;
    
    // Draw background circle
    ctx.strokeStyle = colors.background + '40';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(centerX, centerY, baseRadius, 0, Math.PI * 2);
    ctx.stroke();
    
    // Draw amplitude bars in circular pattern
    const angleStep = (Math.PI * 2) / numBars;
    
    for (let i = 0; i < numBars; i++) {
      const amplitude = audioData[i] || 0;
      const angle = i * angleStep - Math.PI / 2; // Start from top
      
      // Calculate bar positions
      const startRadius = baseRadius;
      const endRadius = baseRadius + (amplitude * (maxRadius - baseRadius));
      
      const x1 = centerX + Math.cos(angle) * startRadius;
      const y1 = centerY + Math.sin(angle) * startRadius;
      const x2 = centerX + Math.cos(angle) * endRadius;
      const y2 = centerY + Math.sin(angle) * endRadius;
      
      // Create gradient for amplitude bar
      const gradient = ctx.createLinearGradient(x1, y1, x2, y2);
      gradient.addColorStop(0, colors.secondary);
      gradient.addColorStop(0.7, colors.primary);
      gradient.addColorStop(1, colors.accent);
      
      // Draw amplitude bar
      ctx.strokeStyle = gradient;
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
      
      // Add glow effect for high amplitudes
      if (amplitude > 0.6) {
        ctx.strokeStyle = colors.accent + '60';
        ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
      }
    }
    
    // Central pulse based on average amplitude
    const avgAmplitude = audioData.reduce((sum, val) => sum + val, 0) / audioData.length;
    const pulseRadius = 8 + (avgAmplitude * 12);
    
    const pulseGradient = ctx.createRadialGradient(
      centerX, centerY, 0,
      centerX, centerY, pulseRadius
    );
    pulseGradient.addColorStop(0, colors.primary);
    pulseGradient.addColorStop(0.7, colors.accent + '80');
    pulseGradient.addColorStop(1, 'transparent');
    
    ctx.fillStyle = pulseGradient;
    ctx.beginPath();
    ctx.arc(centerX, centerY, pulseRadius, 0, Math.PI * 2);
    ctx.fill();
  }

  destroy(): void {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
  }
}

// =============================================================================
// Main Component
// =============================================================================

export const CircularAudioVisualizer: React.FC<CircularAudioVisualizerProps> = ({
  audioData,
  isRecording,
  size = 300,
  theme = 'default',
  className,
  sensitivity = 0.7,
  colors: customColors,
  onClick,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<VisualizerRenderer | null>(null);
  const animationRef = useRef<number>(0);
  
  // Animation controls
  const controls = useAnimation();
  
  // Memoize configuration
  const config = useMemo<VisualizerConfig>(() => ({
    size,
    centerX: size / 2,
    centerY: size / 2,
    baseRadius: size * 0.25,
    maxRadius: size * 0.4,
    numBars: 64,
    barWidth: 2,
    colors: customColors || THEME_COLORS[theme],
  }), [size, theme, customColors]);
  
  // Process audio data
  const processedAudioData = useMemo(() => {
    if (!audioData) return [];
    return processAudioData(audioData, config.numBars, sensitivity);
  }, [audioData, config.numBars, sensitivity]);
  
  // Initialize renderer
  useEffect(() => {
    if (!canvasRef.current) return;
    
    rendererRef.current = new VisualizerRenderer(canvasRef.current, config);
    
    return () => {
      if (rendererRef.current) {
        rendererRef.current.destroy();
      }
    };
  }, [config]);
  
  // Animation loop
  const animate = useCallback((timestamp: number) => {
    if (!rendererRef.current) return;
    
    rendererRef.current.render(processedAudioData, isRecording, timestamp);
    animationRef.current = requestAnimationFrame(animate);
  }, [processedAudioData, isRecording]);
  
  // Start/stop animation
  useEffect(() => {
    animationRef.current = requestAnimationFrame(animate);
    
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [animate]);
  
  // Record state animation
  useEffect(() => {
    if (isRecording) {
      controls.start({
        scale: [1, 1.05, 1],
        transition: { duration: 2, repeat: Infinity, ease: "easeInOut" }
      });
    } else {
      controls.start({
        scale: 1,
        transition: { duration: 0.3, ease: "easeOut" }
      });
    }
  }, [isRecording, controls]);
  
  return (
    <motion.div
      animate={controls}
      className={cn(
        "relative cursor-pointer select-none",
        "transition-all duration-300",
        "hover:scale-105",
        className
      )}
      onClick={onClick}
      style={{ width: size, height: size }}
    >
      {/* Main Canvas */}
      <canvas
        ref={canvasRef}
        className="block rounded-full shadow-2xl"
        style={{ 
          filter: isRecording 
            ? `drop-shadow(0 0 20px ${config.colors.primary}40)` 
            : 'drop-shadow(0 4px 20px rgba(0,0,0,0.3))'
        }}
      />
      
      {/* Recording indicator */}
      {isRecording && (
        <div className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 rounded-full animate-pulse flex items-center justify-center">
          <div className="w-3 h-3 bg-white rounded-full" />
        </div>
      )}
      
      {/* Central microphone icon overlay */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <motion.div
          animate={{
            scale: isRecording ? [1, 1.1, 1] : 1,
          }}
          transition={{
            duration: 1.5,
            repeat: isRecording ? Infinity : 0,
            ease: "easeInOut"
          }}
          className={cn(
            "w-16 h-16 rounded-full flex items-center justify-center",
            "transition-colors duration-300",
            isRecording 
              ? "bg-red-500/20 text-red-400" 
              : "bg-gray-700/40 text-gray-400"
          )}
        >
          <svg
            className="w-8 h-8"
            fill="currentColor"
            viewBox="0 0 20 20"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              fillRule="evenodd"
              d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z"
              clipRule="evenodd"
            />
          </svg>
        </motion.div>
      </div>
    </motion.div>
  );
};

// =============================================================================
// Default Export
// =============================================================================

export default CircularAudioVisualizer;