/**
 * Enhanced Tabs Component
 * Modern tab system với Radix UI Primitives
 * Support: keyboard navigation, dynamic content, animations
 */

import * as React from 'react'
import * as TabsPrimitive from '@radix-ui/react-tabs'
import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '@/lib/utils'

const Tabs = TabsPrimitive.Root

// Tabs List variants
const tabsListVariants = cva(
  "inline-flex items-center justify-center rounded-lg bg-muted p-1 text-muted-foreground",
  {
    variants: {
      variant: {
        default: "bg-muted",
        pills: "bg-transparent space-x-1",
        underline: "bg-transparent border-b border-border",
      },
      size: {
        sm: "h-8 text-xs",
        default: "h-9 text-sm",
        lg: "h-11 text-base",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

interface TabsListProps
  extends React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>,
    VariantProps<typeof tabsListVariants> {}

const TabsList = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.List>,
  TabsListProps
>(({ className, variant, size, ...props }, ref) => (
  <TabsPrimitive.List
    ref={ref}
    className={cn(tabsListVariants({ variant, size }), className)}
    {...props}
  />
))
TabsList.displayName = TabsPrimitive.List.displayName

// Tabs Trigger variants
const tabsTriggerVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm",
        pills: "rounded-full data-[state=active]:bg-primary data-[state=active]:text-primary-foreground",
        underline: "rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-primary",
      },
      size: {
        sm: "h-6 px-2 text-xs",
        default: "h-7 px-3 text-sm",
        lg: "h-9 px-4 text-base",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

interface TabsTriggerProps
  extends React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>,
    VariantProps<typeof tabsTriggerVariants> {
  badge?: string | number
  icon?: React.ReactNode
}

const TabsTrigger = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Trigger>,
  TabsTriggerProps
>(({ className, variant, size, badge, icon, children, ...props }, ref) => (
  <TabsPrimitive.Trigger
    ref={ref}
    className={cn(tabsTriggerVariants({ variant, size }), className)}
    {...props}
  >
    <div className="flex items-center gap-2">
      {icon && <span className="h-4 w-4">{icon}</span>}
      <span>{children}</span>
      {badge && (
        <span className="inline-flex items-center justify-center rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">
          {badge}
        </span>
      )}
    </div>
  </TabsPrimitive.Trigger>
))
TabsTrigger.displayName = TabsPrimitive.Trigger.displayName

const TabsContent = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Content
    ref={ref}
    className={cn(
      "mt-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
      className
    )}
    {...props}
  />
))
TabsContent.displayName = TabsPrimitive.Content.displayName

// =============================================================================
// Enhanced Composite Components
// =============================================================================

interface TabItem {
  value: string
  label: string
  content: React.ReactNode
  badge?: string | number
  icon?: React.ReactNode
  disabled?: boolean
}

interface EnhancedTabsProps {
  items: TabItem[]
  defaultValue?: string
  value?: string
  onValueChange?: (value: string) => void
  variant?: 'default' | 'pills' | 'underline'
  size?: 'sm' | 'default' | 'lg'
  orientation?: 'horizontal' | 'vertical'
  className?: string
  contentClassName?: string
}

export function EnhancedTabs({
  items,
  defaultValue,
  value,
  onValueChange,
  variant = 'default',
  size = 'default',
  orientation = 'horizontal',
  className,
  contentClassName,
}: EnhancedTabsProps) {
  return (
    <Tabs
      defaultValue={defaultValue}
      value={value}
      onValueChange={onValueChange}
      orientation={orientation}
      className={cn("w-full", className)}
    >
      <TabsList variant={variant} size={size} className={cn(orientation === 'vertical' && "flex-col h-auto")}>
        {items.map((item) => (
          <TabsTrigger
            key={item.value}
            value={item.value}
            variant={variant}
            size={size}
            badge={item.badge}
            icon={item.icon}
            disabled={item.disabled}
          >
            {item.label}
          </TabsTrigger>
        ))}
      </TabsList>
      
      {items.map((item) => (
        <TabsContent
          key={item.value}
          value={item.value}
          className={contentClassName}
        >
          {item.content}
        </TabsContent>
      ))}
    </Tabs>
  )
}

// =============================================================================
// Vertical Tabs Layout
// =============================================================================

interface VerticalTabsProps {
  items: TabItem[]
  defaultValue?: string
  value?: string
  onValueChange?: (value: string) => void
  className?: string
}

export function VerticalTabs({
  items,
  defaultValue,
  value,
  onValueChange,
  className,
}: VerticalTabsProps) {
  return (
    <Tabs
      defaultValue={defaultValue}
      value={value}
      onValueChange={onValueChange}
      orientation="vertical"
      className={cn("flex gap-6", className)}
    >
      <TabsList className="flex-col h-auto w-48 justify-start">
        {items.map((item) => (
          <TabsTrigger
            key={item.value}
            value={item.value}
            className="w-full justify-start"
            badge={item.badge}
            icon={item.icon}
            disabled={item.disabled}
          >
            {item.label}
          </TabsTrigger>
        ))}
      </TabsList>
      
      <div className="flex-1">
        {items.map((item) => (
          <TabsContent key={item.value} value={item.value} className="mt-0">
            {item.content}
          </TabsContent>
        ))}
      </div>
    </Tabs>
  )
}

// =============================================================================
// Card Tabs (each tab trong một card)
// =============================================================================

interface CardTabsProps {
  items: TabItem[]
  defaultValue?: string
  value?: string
  onValueChange?: (value: string) => void
  className?: string
}

export function CardTabs({
  items,
  defaultValue,
  value,
  onValueChange,
  className,
}: CardTabsProps) {
  return (
    <Tabs
      defaultValue={defaultValue}
      value={value}
      onValueChange={onValueChange}
      className={cn("w-full", className)}
    >
      <TabsList className="grid w-full grid-cols-2 lg:grid-cols-4 gap-1">
        {items.map((item) => (
          <TabsTrigger
            key={item.value}
            value={item.value}
            className="data-[state=active]:bg-card data-[state=active]:shadow-sm border border-transparent data-[state=active]:border-border"
            badge={item.badge}
            icon={item.icon}
            disabled={item.disabled}
          >
            {item.label}
          </TabsTrigger>
        ))}
      </TabsList>
      
      {items.map((item) => (
        <TabsContent
          key={item.value}
          value={item.value}
          className="border border-border rounded-lg p-6 bg-card"
        >
          {item.content}
        </TabsContent>
      ))}
    </Tabs>
  )
}

// =============================================================================
// Scrollable Tabs (cho nhiều tabs)
// =============================================================================

interface ScrollableTabsProps {
  items: TabItem[]
  defaultValue?: string
  value?: string
  onValueChange?: (value: string) => void
  className?: string
}

export function ScrollableTabs({
  items,
  defaultValue,
  value,
  onValueChange,
  className,
}: ScrollableTabsProps) {
  return (
    <Tabs
      defaultValue={defaultValue}
      value={value}
      onValueChange={onValueChange}
      className={cn("w-full", className)}
    >
      <div className="relative">
        <TabsList className="w-full justify-start overflow-x-auto scrollbar-hide">
          {items.map((item) => (
            <TabsTrigger
              key={item.value}
              value={item.value}
              className="flex-shrink-0"
              badge={item.badge}
              icon={item.icon}
              disabled={item.disabled}
            >
              {item.label}
            </TabsTrigger>
          ))}
        </TabsList>
        
        {/* Gradient overlays để show scrollability */}
        <div className="absolute left-0 top-0 w-8 h-full bg-gradient-to-r from-background to-transparent pointer-events-none" />
        <div className="absolute right-0 top-0 w-8 h-full bg-gradient-to-l from-background to-transparent pointer-events-none" />
      </div>
      
      {items.map((item) => (
        <TabsContent key={item.value} value={item.value}>
          {item.content}
        </TabsContent>
      ))}
    </Tabs>
  )
}

export { Tabs, TabsList, TabsTrigger, TabsContent }