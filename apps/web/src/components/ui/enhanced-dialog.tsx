/**
 * Enhanced Dialog Components - P29 Enhanced Component Library
 * 
 * Professional modal và dialog system với Radix UI:
 * - Enhanced modal với backdrop animations và focus management
 * - Confirmation dialogs với destructive actions
 * - Session detail modals với audio player integration
 * - Alert dialogs với severity-based styling
 * 
 * Based on: Radix UI Dialog + shadcn/ui + Framer Motion animations
 * Usage: Session details, confirmations, settings panels, alerts
 * Dependencies: Radix UI Dialog, Framer Motion, lucide-react
 */

'use client';

import * as React from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { cva, type VariantProps } from 'class-variance-authority';
import { motion, AnimatePresence } from 'framer-motion';
import { X, AlertTriangle, CheckCircle, Info, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

// Dialog variants for different use cases
const dialogVariants = cva(
  "fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-6 shadow-lg duration-200 sm:rounded-lg",
  {
    variants: {
      size: {
        sm: "max-w-sm",
        default: "max-w-lg", 
        lg: "max-w-2xl",
        xl: "max-w-4xl",
        full: "max-w-[95vw] max-h-[95vh]",
      },
    },
    defaultVariants: {
      size: "default",
    },
  }
);

// Enhanced Dialog Root
const Dialog = DialogPrimitive.Root;

// Enhanced Dialog Trigger
const DialogTrigger = DialogPrimitive.Trigger;

// Enhanced Dialog Portal với animation support
const DialogPortal = ({ children, ...props }: DialogPrimitive.DialogPortalProps) => (
  <DialogPrimitive.Portal {...props}>
    <AnimatePresence mode="wait">
      {children}
    </AnimatePresence>
  </DialogPrimitive.Portal>
);
DialogPortal.displayName = DialogPrimitive.Portal.displayName;

// Enhanced Dialog Overlay với backdrop animation
const DialogOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    asChild
    {...props}
  >
    <motion.div
      className={cn(
        "fixed inset-0 z-50 bg-black/80 backdrop-blur-sm",
        className
      )}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
    />
  </DialogPrimitive.Overlay>
));
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName;

// Enhanced Dialog Content với size variants
interface DialogContentProps
  extends React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>,
    VariantProps<typeof dialogVariants> {
  showCloseButton?: boolean;
}

const DialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  DialogContentProps
>(({ className, size, showCloseButton = true, children, ...props }, ref) => (
  <DialogPortal>
    <DialogOverlay />
    <DialogPrimitive.Content
      ref={ref}
      asChild
      {...props}
    >
      <motion.div
        className={cn(dialogVariants({ size }), className)}
        initial={{ opacity: 0, scale: 0.95, y: -20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: -20 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
      >
        {children}
        {showCloseButton && (
          <DialogPrimitive.Close className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none">
            <X className="h-4 w-4" />
            <span className="sr-only">Close</span>
          </DialogPrimitive.Close>
        )}
      </motion.div>
    </DialogPrimitive.Content>
  </DialogPortal>
));
DialogContent.displayName = DialogPrimitive.Content.displayName;

// Dialog Header
const DialogHeader = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "flex flex-col space-y-1.5 text-center sm:text-left",
      className
    )}
    {...props}
  />
);
DialogHeader.displayName = "DialogHeader";

// Dialog Footer
const DialogFooter = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2",
      className
    )}
    {...props}
  />
);
DialogFooter.displayName = "DialogFooter";

// Dialog Title
const DialogTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn(
      "text-lg font-semibold leading-none tracking-tight",
      className
    )}
    {...props}
  />
));
DialogTitle.displayName = DialogPrimitive.Title.displayName;

// Dialog Description
const DialogDescription = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description
    ref={ref}
    className={cn("text-sm text-muted-foreground", className)}
    {...props}
  />
));
DialogDescription.displayName = DialogPrimitive.Description.displayName;

/**
 * Alert Dialog - Specialized dialog for confirmations và alerts
 */
interface AlertDialogProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  title: string;
  description?: string;
  variant?: 'default' | 'destructive' | 'warning' | 'success';
  confirmText?: string;
  cancelText?: string;
  onConfirm?: () => void | Promise<void>;
  onCancel?: () => void;
  loading?: boolean;
  children?: React.ReactNode;
}

const AlertDialog: React.FC<AlertDialogProps> = ({
  open,
  onOpenChange,
  title,
  description,
  variant = 'default',
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  onConfirm,
  onCancel,
  loading = false,
  children,
}) => {
  const [isLoading, setIsLoading] = React.useState(false);

  const handleConfirm = async () => {
    if (onConfirm) {
      setIsLoading(true);
      try {
        await onConfirm();
        onOpenChange?.(false);
      } catch (error) {
        console.error('Alert dialog confirmation failed:', error);
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleCancel = () => {
    onCancel?.();
    onOpenChange?.(false);
  };

  // Icon selection based on variant
  const getIcon = () => {
    switch (variant) {
      case 'destructive':
        return <AlertTriangle className="h-6 w-6 text-destructive" />;
      case 'warning':
        return <AlertCircle className="h-6 w-6 text-amber-500" />;
      case 'success':
        return <CheckCircle className="h-6 w-6 text-green-500" />;
      default:
        return <Info className="h-6 w-6 text-blue-500" />;
    }
  };

  // Button styling based on variant
  const getConfirmButtonClass = () => {
    switch (variant) {
      case 'destructive':
        return "bg-destructive text-destructive-foreground hover:bg-destructive/90";
      case 'warning':
        return "bg-amber-500 text-white hover:bg-amber-600";
      case 'success':
        return "bg-green-500 text-white hover:bg-green-600";
      default:
        return "bg-primary text-primary-foreground hover:bg-primary/90";
    }
  };

  return (
    <Dialog open={open ?? false} onOpenChange={onOpenChange ?? (() => {})}>
      <DialogContent size="sm" showCloseButton={false}>
        <DialogHeader>
          <div className="flex items-center gap-3 mb-4">
            {getIcon()}
            <DialogTitle>{title}</DialogTitle>
          </div>
          {description && (
            <DialogDescription className="text-left">
              {description}
            </DialogDescription>
          )}
        </DialogHeader>

        {children && (
          <div className="py-4">
            {children}
          </div>
        )}

        <DialogFooter>
          <button
            type="button"
            onClick={handleCancel}
            disabled={isLoading || loading}
            className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground h-9 px-4 py-2 mt-2 sm:mt-0"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={isLoading || loading}
            className={cn(
              "inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 h-9 px-4 py-2",
              getConfirmButtonClass()
            )}
          >
            {(isLoading || loading) && (
              <motion.div
                className="mr-2 h-4 w-4 border-2 border-current border-t-transparent rounded-full"
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              />
            )}
            {confirmText}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

/**
 * Session Detail Dialog - Specialized dialog for session information
 */
interface SessionDetailDialogProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  session: {
    id: string;
    name: string;
    description?: string;
    createdAt: Date;
    duration?: number;
    transcriptLength: number;
    detectionCount: number;
    status: 'idle' | 'recording' | 'processing' | 'completed' | 'error';
  };
  onEdit?: () => void;
  onDelete?: () => void;
  onPlay?: () => void;
}

const SessionDetailDialog: React.FC<SessionDetailDialogProps> = ({
  open,
  onOpenChange,
  session,
  onEdit,
  onDelete,
  onPlay,
}) => {
  const formatDuration = (ms?: number) => {
    if (!ms) return 'N/A';
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfigs = {
      idle: { bg: 'bg-gray-100', text: 'text-gray-700', label: 'Idle' },
      recording: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Recording' },
      processing: { bg: 'bg-amber-100', text: 'text-amber-700', label: 'Processing' },
      completed: { bg: 'bg-green-100', text: 'text-green-700', label: 'Completed' },
      error: { bg: 'bg-red-100', text: 'text-red-700', label: 'Error' },
    };
    
    const config = statusConfigs[status as keyof typeof statusConfigs] || statusConfigs.idle;
    
    return (
      <span className={cn(
        "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium",
        config.bg,
        config.text
      )}>
        {config.label}
      </span>
    );
  };

  return (
    <Dialog open={open ?? false} onOpenChange={onOpenChange ?? (() => {})}>
      <DialogContent size="lg">
        <DialogHeader>
          <div className="flex items-start justify-between">
            <div>
              <DialogTitle className="text-xl">{session.name}</DialogTitle>
              {session.description && (
                <DialogDescription className="mt-2 text-base">
                  {session.description}
                </DialogDescription>
              )}
            </div>
            {getStatusBadge(session.status)}
          </div>
        </DialogHeader>

        {/* Session Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 py-6">
          <div className="text-center p-4 bg-muted/50 rounded-lg">
            <div className="text-2xl font-bold text-foreground">
              {formatDuration(session.duration)}
            </div>
            <div className="text-sm text-muted-foreground mt-1">Duration</div>
          </div>
          
          <div className="text-center p-4 bg-muted/50 rounded-lg">
            <div className="text-2xl font-bold text-foreground">
              {session.transcriptLength.toLocaleString()}
            </div>
            <div className="text-sm text-muted-foreground mt-1">Characters</div>
          </div>
          
          <div className="text-center p-4 bg-muted/50 rounded-lg">
            <div className="text-2xl font-bold text-foreground">
              {session.detectionCount}
            </div>
            <div className="text-sm text-muted-foreground mt-1">Detections</div>
          </div>
          
          <div className="text-center p-4 bg-muted/50 rounded-lg">
            <div className="text-2xl font-bold text-foreground">
              {session.createdAt.toLocaleDateString('vi-VN')}
            </div>
            <div className="text-sm text-muted-foreground mt-1">Created</div>
          </div>
        </div>

        {/* Session Actions */}
        <DialogFooter>
          <div className="flex gap-2 w-full sm:w-auto">
            {onPlay && (
              <button
                onClick={onPlay}
                className="flex-1 sm:flex-none inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground h-9 px-4 py-2"
              >
                Play Audio
              </button>
            )}
            {onEdit && (
              <button
                onClick={onEdit}
                className="flex-1 sm:flex-none inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground shadow hover:bg-primary/90 h-9 px-4 py-2"
              >
                Edit Session
              </button>
            )}
            {onDelete && (
              <button
                onClick={onDelete}
                className="flex-1 sm:flex-none inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90 h-9 px-4 py-2"
              >
                Delete
              </button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// Exports
export {
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
  AlertDialog,
  SessionDetailDialog,
};

export type {
  DialogContentProps,
  AlertDialogProps,
  SessionDetailDialogProps,
};