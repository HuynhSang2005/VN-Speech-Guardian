/**
 * Enhanced Metric Card Component (P27.3)
 * Professional metric card với trend indicators, formatted numbers, loading states
 * Accessibility compliant với ARIA labels
 */

import { useMemo } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  Users, 
  Shield, 
  Activity,
  CheckCircle,
  AlertTriangle,
  Clock
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Icon mapping
const iconMap = {
  Users,
  Shield,
  Activity,
  CheckCircle,
  AlertTriangle,
  Clock,
} as const;

export interface EnhancedMetricCardProps {
  title: string;
  value: string | number;
  unit?: string;
  trend?: number;
  icon: keyof typeof iconMap;
  color?: 'blue' | 'green' | 'red' | 'yellow' | 'purple';
  isLoading?: boolean;
  className?: string;
}

// Color scheme mappings
const colorSchemes = {
  blue: {
    icon: 'bg-blue-500 text-blue-50',
    positive: 'text-blue-600 bg-blue-50',
    negative: 'text-blue-600 bg-blue-50',
  },
  green: {
    icon: 'bg-green-500 text-green-50',
    positive: 'text-green-600 bg-green-50',
    negative: 'text-red-600 bg-red-50',
  },
  red: {
    icon: 'bg-red-500 text-red-50',
    positive: 'text-green-600 bg-green-50',
    negative: 'text-red-600 bg-red-50',
  },
  yellow: {
    icon: 'bg-yellow-500 text-yellow-50',
    positive: 'text-green-600 bg-green-50',
    negative: 'text-red-600 bg-red-50',
  },
  purple: {
    icon: 'bg-purple-500 text-purple-50',
    positive: 'text-green-600 bg-green-50',
    negative: 'text-red-600 bg-red-50',
  },
} as const;

// Loading skeleton component
function MetricCardSkeleton() {
  return (
    <div data-testid="metric-card-skeleton" className="bg-white rounded-lg border border-gray-200 p-6 animate-pulse">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 bg-gray-200 rounded-lg" />
          <div className="space-y-2">
            <div className="h-4 bg-gray-200 rounded w-24" />
            <div className="h-6 bg-gray-200 rounded w-16" />
          </div>
        </div>
        <div className="w-16 h-6 bg-gray-200 rounded-full" />
      </div>
    </div>
  );
}

// Number formatting utility
function formatNumber(value: string | number): string {
  const numValue = typeof value === 'string' ? parseFloat(value) : value;
  
  if (isNaN(numValue)) return '0';
  
  // Format large numbers with commas
  if (numValue >= 1000) {
    return numValue.toLocaleString('en-US');
  }
  
  // Handle decimals
  if (numValue % 1 !== 0) {
    return numValue.toFixed(1);
  }
  
  return numValue.toString();
}

// Trend formatting
function formatTrend(trend: number): { 
  text: string; 
  isPositive: boolean;
  icon: typeof TrendingUp | typeof TrendingDown;
} {
  const isPositive = trend > 0;
  
  return {
    text: `${isPositive ? '+' : ''}${trend}%`,
    isPositive,
    icon: isPositive ? TrendingUp : TrendingDown,
  };
}

export function EnhancedMetricCard({
  title,
  value,
  unit,
  trend,
  icon,
  color = 'blue',
  isLoading = false,
  className,
}: EnhancedMetricCardProps) {
  // Show loading skeleton
  if (isLoading) {
    return <MetricCardSkeleton />;
  }

  const IconComponent = iconMap[icon];
  const colorScheme = colorSchemes[color];
  
  const formattedValue = useMemo(() => formatNumber(value), [value]);
  const trendData = useMemo(() => trend !== undefined ? formatTrend(trend) : null, [trend]);
  
  // ARIA label for accessibility
  const ariaLabel = `${title} metric: ${formattedValue}${unit || ''}${
    trendData ? ` with ${Math.abs(trend!)}% ${trendData.isPositive ? 'positive' : 'negative'} trend` : ''
  }`;

  return (
    <article
      role="article"
      aria-label={ariaLabel}
      className={cn(
        'bg-white rounded-lg border border-gray-200 p-6 shadow-sm hover:shadow-md transition-all duration-200',
        'focus-within:ring-2 focus-within:ring-blue-500 focus-within:ring-opacity-50',
        className
      )}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          {/* Icon */}
          <div className={cn('p-3 rounded-lg', colorScheme.icon)}>
            <IconComponent className="h-6 w-6" aria-hidden="true" />
          </div>
          
          {/* Content */}
          <div>
            <p className="text-sm font-medium text-gray-600">{title}</p>
            <p className="text-2xl font-bold text-gray-900">
              {formattedValue}
              {unit && (
                <span className="text-lg font-normal text-gray-500 ml-1">
                  {unit}
                </span>
              )}
            </p>
          </div>
        </div>
        
        {/* Trend indicator */}
        {trendData && (
          <div 
            data-testid="trend-indicator"
            className={cn(
              'flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium',
              trendData.isPositive ? 'positive' : 'negative',
              trendData.isPositive ? colorScheme.positive : colorScheme.negative
            )}
            aria-label={`Trend: ${trendData.text}`}
          >
            <trendData.icon className="h-3 w-3" aria-hidden="true" />
            <span>{trendData.text}</span>
          </div>
        )}
      </div>
    </article>
  );
}