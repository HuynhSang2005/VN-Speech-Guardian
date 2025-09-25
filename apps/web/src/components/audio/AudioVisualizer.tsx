/**
 * AudioVisualizer Component - P32 Component Testing Implementation
 * Mục đích: Canvas-based audio waveform visualization với theme support
 * Research: Real-time audio visualization patterns với performance optimization
 */

import React, { useRef, useEffect, useCallback } from 'react'

export interface AudioVisualizerProps {
  audioData: Float32Array | null
  isActive: boolean
  size?: 'small' | 'medium' | 'large' | 'xlarge'
  theme?: 'default' | 'neon' | 'minimal'
  className?: string
}

export const AudioVisualizer: React.FC<AudioVisualizerProps> = React.memo(({
  audioData,
  isActive,
  size = 'medium',
  theme = 'default',
  className = '',
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animationIdRef = useRef<number | undefined>()

  // Size mappings
  const sizeMap = {
    small: 150,
    medium: 300,
    large: 400,
    xlarge: 500,
  }

  const canvasSize = sizeMap[size]

  // Theme colors
  const themeColors = {
    default: '#3B82F6',
    neon: '#00FF88',
    minimal: '#6366F1',
  }

  const strokeColor = themeColors[theme]

  const drawIdleState = useCallback((ctx: CanvasRenderingContext2D, width: number, height: number) => {
    const centerX = width / 2
    const centerY = height / 2
    const radius = width / 4

    // Clear canvas
    ctx.clearRect(0, 0, width, height)

    // Create radial gradient for breathing effect
    const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius)
    gradient.addColorStop(0, `${strokeColor}40`)
    gradient.addColorStop(1, `${strokeColor}10`)

    // Draw breathing circle
    ctx.beginPath()
    ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI)
    ctx.fillStyle = gradient
    ctx.fill()
  }, [strokeColor])

  const drawWaveform = useCallback((
    ctx: CanvasRenderingContext2D, 
    data: Float32Array, 
    width: number, 
    height: number
  ) => {
    // Clear canvas
    ctx.clearRect(0, 0, width, height)

    if (!data || data.length === 0) {
      return
    }

    const centerX = width / 2
    const centerY = height / 2
    const radius = width / 3

    ctx.strokeStyle = strokeColor
    ctx.lineWidth = 2
    ctx.globalAlpha = 0.8

    // Draw circular waveform
    ctx.beginPath()
    
    for (let i = 0; i < data.length; i++) {
      const amplitude = Math.abs(data[i] || 0)
      const angle = (i / data.length) * 2 * Math.PI
      const innerRadius = radius * 0.3
      const outerRadius = innerRadius + (amplitude * radius * 0.7)
      
      const x = centerX + Math.cos(angle) * outerRadius
      const y = centerY + Math.sin(angle) * outerRadius
      
      if (i === 0) {
        ctx.moveTo(x, y)
      } else {
        ctx.lineTo(x, y)
      }
    }
    
    ctx.stroke()
  }, [strokeColor])

  const draw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    try {
      if (isActive && audioData && audioData.length > 0) {
        drawWaveform(ctx, audioData, canvas.width, canvas.height)
      } else {
        drawIdleState(ctx, canvas.width, canvas.height)
      }
    } catch (error) {
      // Graceful error handling - don't crash the app
      console.warn('AudioVisualizer drawing error:', error)
    }
  }, [audioData, isActive, drawWaveform, drawIdleState])

  useEffect(() => {
    draw()
  }, [draw])

  useEffect(() => {
    const handleResize = () => {
      draw()
    }

    window.addEventListener('resize', handleResize)
    return () => {
      window.removeEventListener('resize', handleResize)
      if (animationIdRef.current) {
        cancelAnimationFrame(animationIdRef.current)
      }
    }
  }, [draw])

  return (
    <canvas
      ref={canvasRef}
      width={canvasSize}
      height={canvasSize}
      className={`rounded-full ${className}`}
      role="img"
      aria-label="Audio waveform visualization"
      style={{ maxWidth: '100%', height: 'auto' }}
    />
  )
})