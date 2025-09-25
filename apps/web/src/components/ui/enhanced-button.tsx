/**
 * Enhanced Button Component với React 19 Actions + Radix UI
 * Mục đích: Professional button system với loading states, variants, Actions integration
 * Features: TypeScript strict, accessibility, server actions, loading indicators
 */

import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground shadow hover:bg-primary/90",
        destructive: "bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90",
        outline: "border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground",
        secondary: "bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
        // Speech Guardian specific variants
        audio: "bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg hover:from-blue-600 hover:to-purple-700",
        record: "bg-gradient-to-r from-red-500 to-pink-600 text-white shadow-lg hover:from-red-600 hover:to-pink-700 data-[recording=true]:animate-pulse",
        danger: "bg-gradient-to-r from-red-600 to-red-700 text-white shadow-lg hover:from-red-700 hover:to-red-800",
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-8 rounded-md px-3 text-xs",
        lg: "h-10 rounded-md px-8",
        xl: "h-12 rounded-lg px-10 text-base",
        icon: "h-9 w-9",
        "icon-sm": "h-8 w-8",
        "icon-lg": "h-10 w-10",
        "icon-xl": "h-12 w-12",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

interface EnhancedButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  loading?: boolean;
  loadingText?: string;
  action?: (formData: FormData) => Promise<void>; // React 19 Server Action
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
}

const EnhancedButton = React.forwardRef<HTMLButtonElement, EnhancedButtonProps>(
  ({
    className,
    variant,
    size,
    asChild = false,
    loading = false,
    loadingText,
    action,
    icon,
    iconPosition = 'left',
    children,
    disabled,
    ...props
  }, ref) => {
    const [isPending, startTransition] = React.useTransition();
    const isLoading = loading || isPending;
    
    const handleClick = async (event: React.MouseEvent<HTMLButtonElement>) => {
      if (action && !isLoading) {
        event.preventDefault();
        startTransition(async () => {
          const formData = new FormData();
          await action(formData);
        });
      }
      props.onClick?.(event);
    };
    
    const Comp = asChild ? Slot : "button";
    
    const renderIcon = (position: 'left' | 'right') => {
      if (isLoading && position === 'left') {
        return <Loader2 className="h-4 w-4 animate-spin" />;
      }
      if (icon && iconPosition === position && !isLoading) {
        return icon;
      }
      return null;
    };
    
    const renderChildren = () => {
      if (isLoading && loadingText) {
        return loadingText;
      }
      return children;
    };
    
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        disabled={disabled || isLoading}
        onClick={handleClick}
        {...props}
      >
        {renderIcon('left')}
        {renderChildren()}
        {renderIcon('right')}
      </Comp>
    );
  }
);

EnhancedButton.displayName = "EnhancedButton";

// Specialized button compositions
export const RecordButton = React.forwardRef<HTMLButtonElement, 
  Omit<EnhancedButtonProps, 'variant'> & { recording?: boolean }
>(({ recording, children, ...props }, ref) => (
  <EnhancedButton
    ref={ref}
    variant="record"
    data-recording={recording}
    {...props}
  >
    {recording ? 'Stop Recording' : 'Start Recording'}
    {children}
  </EnhancedButton>
));

RecordButton.displayName = "RecordButton";

export const AudioButton = React.forwardRef<HTMLButtonElement, 
  Omit<EnhancedButtonProps, 'variant'>
>((props, ref) => (
  <EnhancedButton
    ref={ref}
    variant="audio"
    {...props}
  />
));

AudioButton.displayName = "AudioButton";

export const DangerButton = React.forwardRef<HTMLButtonElement, 
  Omit<EnhancedButtonProps, 'variant'>
>((props, ref) => (
  <EnhancedButton
    ref={ref}
    variant="danger"
    {...props}
  />
));

DangerButton.displayName = "DangerButton";

export { EnhancedButton, buttonVariants };
export type { EnhancedButtonProps };