/**
 * Loading Spinner Component
 * Simple animated spinner cho loading states
 */

import { type HTMLAttributes } from 'react'
import { cn } from '../../lib/utils'

interface LoadingSpinnerProps extends HTMLAttributes<HTMLDivElement> {
  size?: 'sm' | 'md' | 'lg'
  color?: string
}

export function LoadingSpinner({ 
  size = 'md', 
  color = 'currentColor',
  className,
  ...props 
}: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6', 
    lg: 'w-8 h-8'
  }
  
  return (
    <div
      className={cn(
        'animate-spin rounded-full border-2 border-transparent border-t-current',
        sizeClasses[size],
        className
      )}
      style={{ color }}
      {...props}
    >
      <span className="sr-only">Đang tải...</span>
    </div>
  )
}