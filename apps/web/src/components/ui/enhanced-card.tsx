/**
 * Enhanced Card Components - P29 Enhanced Component Library
 * 
 * Professional card system với Radix UI foundations:
 * - MetricCard với trend indicators và real-time updates
 * - SessionCard với audio status và session metadata
 * - Analytics cards với chart integration
 * - Responsive design và accessibility compliance
 * 
 * Based on: shadcn/ui cards + Speech Guardian design system
 * Usage: Dashboard statistics, session lists, analytics displays
 * Dependencies: Radix UI, class-variance-authority, lucide-react
 */

'use client';

import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { TrendingUp, TrendingDown, Activity, Clock, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

// Base card variants với professional styling
const cardVariants = cva(
  "rounded-xl border bg-card text-card-foreground shadow-sm transition-all duration-200",
  {
    variants: {
      variant: {
        default: "border-border hover:shadow-md",
        elevated: "shadow-lg hover:shadow-xl border-0",
        outlined: "border-2 border-primary/20 hover:border-primary/40",
        ghost: "border-0 bg-transparent hover:bg-accent/50",
        danger: "border-destructive/20 bg-destructive/5 hover:border-destructive/40",
        warning: "border-amber-200 bg-amber-50 hover:border-amber-300",
        success: "border-green-200 bg-green-50 hover:border-green-300",
      },
      size: {
        sm: "p-4",
        default: "p-6", 
        lg: "p-8",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

// Enhanced Card Root Component
interface CardProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof cardVariants> {
  interactive?: boolean;
  loading?: boolean;
}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant, size, interactive = false, loading = false, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        cardVariants({ variant, size }),
        interactive && "cursor-pointer hover:scale-[1.02] active:scale-[0.98]",
        loading && "animate-pulse",
        className
      )}
      {...props}
    />
  )
);
Card.displayName = "Card";

// Card Header với optional actions
interface CardHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  actions?: React.ReactNode;
}

const CardHeader = React.forwardRef<HTMLDivElement, CardHeaderProps>(
  ({ className, actions, children, ...props }, ref) => (
    <div
      ref={ref}
      className={cn("flex flex-col space-y-1.5 pb-4", className)}
      {...props}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">{children}</div>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>
    </div>
  )
);
CardHeader.displayName = "CardHeader";

// Card Title với size variants
const titleVariants = cva("font-semibold leading-none tracking-tight", {
  variants: {
    size: {
      sm: "text-sm",
      default: "text-lg",
      lg: "text-xl",
    },
  },
  defaultVariants: {
    size: "default",
  },
});

interface CardTitleProps
  extends React.HTMLAttributes<HTMLHeadingElement>,
    VariantProps<typeof titleVariants> {
  as?: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
}

const CardTitle = React.forwardRef<HTMLHeadingElement, CardTitleProps>(
  ({ className, size, as: Comp = 'h3', ...props }, ref) => (
    <Comp
      ref={ref}
      className={cn(titleVariants({ size }), className)}
      {...props}
    />
  )
);
CardTitle.displayName = "CardTitle";

// Card Description
const CardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn("text-sm text-muted-foreground", className)}
    {...props}
  />
));
CardDescription.displayName = "CardDescription";

// Card Content
const CardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("", className)} {...props} />
));
CardContent.displayName = "CardContent";

// Card Footer
const CardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex items-center pt-4 border-t border-border/50", className)}
    {...props}
  />
));
CardFooter.displayName = "CardFooter";

/**
 * MetricCard - Professional statistics card với trend indicators
 * Usage: Dashboard overview, real-time metrics, performance indicators
 */
interface TrendData {
  value: number;
  period: string;
  direction: 'up' | 'down' | 'neutral';
}

interface MetricCardProps extends Omit<CardProps, 'children'> {
  title: string;
  value: string | number;
  description?: string;
  trend?: TrendData;
  icon?: React.ReactNode;
  format?: 'number' | 'percentage' | 'duration' | 'bytes';
  status?: 'default' | 'success' | 'warning' | 'danger';
  loading?: boolean;
  onClick?: () => void;
}

const MetricCard = React.forwardRef<HTMLDivElement, MetricCardProps>(
  ({ 
    title, 
    value, 
    description, 
    trend, 
    icon, 
    format, 
    status = 'default',
    loading = false,
    onClick,
    className,
    ...props 
  }, ref) => {
    // Format value based on type
    const formatValue = (val: string | number) => {
      if (typeof val === 'string') return val;
      
      switch (format) {
        case 'percentage': return `${val}%`;
        case 'duration': return `${Math.round(val / 1000)}s`;
        case 'bytes': return `${(val / 1024 / 1024).toFixed(1)} MB`;
        case 'number': 
        default: 
          return new Intl.NumberFormat('vi-VN').format(val);
      }
    };

    // Status variant mapping
    const statusVariant = status === 'default' ? 'default' : status;

    return (
      <Card
        ref={ref}
        variant={statusVariant}
        interactive={!!onClick}
        loading={loading}
        onClick={onClick}
        className={cn("relative overflow-hidden", className)}
        {...props}
      >
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle size="sm" className="text-muted-foreground font-medium">
              {title}
            </CardTitle>
            {icon && (
              <div className="p-2 rounded-lg bg-primary/10 text-primary">
                {icon}
              </div>
            )}
          </div>
        </CardHeader>

        <CardContent>
          <div className="flex items-baseline justify-between">
            <div className="text-2xl font-bold text-foreground">
              {loading ? (
                <div className="h-8 w-24 bg-muted rounded animate-pulse" />
              ) : (
                formatValue(value)
              )}
            </div>
            
            {trend && !loading && (
              <div className={cn(
                "flex items-center gap-1 text-sm font-medium",
                trend.direction === 'up' && "text-green-600",
                trend.direction === 'down' && "text-red-600",
                trend.direction === 'neutral' && "text-muted-foreground"
              )}>
                {trend.direction === 'up' && <TrendingUp className="h-4 w-4" />}
                {trend.direction === 'down' && <TrendingDown className="h-4 w-4" />}
                {trend.direction === 'neutral' && <Activity className="h-4 w-4" />}
                <span>{trend.value}%</span>
                <span className="text-muted-foreground">{trend.period}</span>
              </div>
            )}
          </div>

          {description && (
            <p className="text-sm text-muted-foreground mt-2">{description}</p>
          )}
        </CardContent>

        {/* Status indicator */}
        {status !== 'default' && (
          <div className={cn(
            "absolute top-0 left-0 w-full h-1",
            status === 'success' && "bg-green-500",
            status === 'warning' && "bg-amber-500", 
            status === 'danger' && "bg-red-500"
          )} />
        )}
      </Card>
    );
  }
);
MetricCard.displayName = "MetricCard";

/**
 * SessionCard - Specialized card for audio sessions
 * Usage: Session lists, session detail previews, audio processing status
 */
interface SessionStatus {
  state: 'idle' | 'recording' | 'processing' | 'completed' | 'error';
  startedAt?: Date;
  duration?: number;
  progress?: number;
}

interface SessionCardProps extends Omit<CardProps, 'children'> {
  sessionId: string;
  name: string;
  description?: string;
  status: SessionStatus;
  detectionCount?: number;
  transcriptLength?: number;
  createdAt: Date;
  onPlay?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
}

const SessionCard = React.forwardRef<HTMLDivElement, SessionCardProps>(
  ({ 
    sessionId,
    name, 
    description, 
    status, 
    detectionCount = 0,
    transcriptLength = 0,
    createdAt,
    onPlay,
    onEdit,
    onDelete,
    className,
    ...props 
  }, ref) => {
    // Status indicators
    const getStatusConfig = (state: SessionStatus['state']) => {
      switch (state) {
        case 'recording':
          return { 
            color: 'text-blue-600', 
            bg: 'bg-blue-50', 
            icon: <Activity className="h-4 w-4 animate-pulse" />,
            label: 'Recording'
          };
        case 'processing':
          return { 
            color: 'text-amber-600', 
            bg: 'bg-amber-50', 
            icon: <Clock className="h-4 w-4 animate-spin" />,
            label: 'Processing'
          };
        case 'completed':
          return { 
            color: 'text-green-600', 
            bg: 'bg-green-50', 
            icon: <TrendingUp className="h-4 w-4" />,
            label: 'Completed'
          };
        case 'error':
          return { 
            color: 'text-red-600', 
            bg: 'bg-red-50', 
            icon: <AlertTriangle className="h-4 w-4" />,
            label: 'Error'
          };
        default:
          return { 
            color: 'text-muted-foreground', 
            bg: 'bg-muted/50', 
            icon: <Clock className="h-4 w-4" />,
            label: 'Idle'
          };
      }
    };

    const statusConfig = getStatusConfig(status.state);

    return (
      <Card
        ref={ref}
        interactive
        className={cn("group", className)}
        {...props}
      >
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <CardTitle size="default">{name}</CardTitle>
              {description && (
                <CardDescription className="mt-1">{description}</CardDescription>
              )}
            </div>
            
            {/* Status badge */}
            <div className={cn(
              "flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium",
              statusConfig.color,
              statusConfig.bg
            )}>
              {statusConfig.icon}
              {statusConfig.label}
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {/* Session metrics */}
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div className="text-center">
              <div className="text-lg font-semibold">{transcriptLength}</div>
              <div className="text-xs text-muted-foreground">Characters</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-semibold">{detectionCount}</div>
              <div className="text-xs text-muted-foreground">Detections</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-semibold">
                {status.duration ? `${Math.round(status.duration / 1000)}s` : '-'}
              </div>
              <div className="text-xs text-muted-foreground">Duration</div>
            </div>
          </div>

          {/* Progress bar for processing */}
          {status.state === 'processing' && status.progress !== undefined && (
            <div className="w-full bg-muted rounded-full h-2 mb-4">
              <div 
                className="bg-primary h-2 rounded-full transition-all duration-300"
                style={{ width: `${status.progress}%` }}
              />
            </div>
          )}
        </CardContent>

        <CardFooter className="justify-between">
          <div className="text-sm text-muted-foreground">
            {createdAt.toLocaleDateString('vi-VN')}
          </div>
          
          {/* Action buttons - visible on hover */}
          <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
            {onPlay && (
              <button 
                onClick={onPlay}
                className="text-sm text-primary hover:underline"
              >
                Play
              </button>
            )}
            {onEdit && (
              <button 
                onClick={onEdit}
                className="text-sm text-primary hover:underline"
              >
                Edit
              </button>
            )}
            {onDelete && (
              <button 
                onClick={onDelete}
                className="text-sm text-destructive hover:underline"
              >
                Delete
              </button>
            )}
          </div>
        </CardFooter>
      </Card>
    );
  }
);
SessionCard.displayName = "SessionCard";

// Exports
export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardDescription,
  CardContent,
  MetricCard,
  SessionCard,
  cardVariants,
};

export type { 
  CardProps, 
  MetricCardProps, 
  SessionCardProps,
  TrendData,
  SessionStatus,
};