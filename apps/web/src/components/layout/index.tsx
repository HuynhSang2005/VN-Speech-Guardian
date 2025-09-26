/**
 * Layout Components - VN Speech Guardian
 * Responsive layout system với modern navigation patterns
 */

import React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../lib/utils';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { 
  Menu, 
  X, 
  Home, 
  BarChart3, 
  FileText, 
  Settings, 
  User,
  ChevronDown,
  ChevronRight,
  Bell,
  Search,
  Mic,
  MicOff
} from 'lucide-react';

// =============================================================================
// Layout Container
// =============================================================================

const layoutVariants = cva(
  "min-h-screen bg-background",
  {
    variants: {
      variant: {
        default: "flex flex-col",
        sidebar: "flex h-screen overflow-hidden",
        full: "h-screen flex flex-col",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface LayoutProps 
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof layoutVariants> {
  children: React.ReactNode;
}

export function Layout({ className, variant, children, ...props }: LayoutProps) {
  return (
    <div className={cn(layoutVariants({ variant }), className)} {...props}>
      {children}
    </div>
  );
}

// =============================================================================
// Header Component
// =============================================================================

export interface HeaderProps {
  title?: string;
  subtitle?: string;
  actions?: React.ReactNode;
  showSearch?: boolean;
  onSearchChange?: (query: string) => void;
  notifications?: number;
  onNotificationsClick?: () => void;
  className?: string;
}

export function Header({
  title = "VN Speech Guardian",
  subtitle,
  actions,
  showSearch = false,
  onSearchChange,
  notifications = 0,
  onNotificationsClick,
  className
}: HeaderProps) {
  const [searchQuery, setSearchQuery] = React.useState('');

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchQuery(value);
    onSearchChange?.(value);
  };

  return (
    <header className={cn(
      "sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60",
      className
    )}>
      <div className="container flex h-16 max-w-screen-2xl items-center">
        <div className="mr-4 flex">
          <div className="mr-6 flex items-center space-x-2">
            <Mic className="h-6 w-6 text-primary" />
            <div className="hidden font-bold sm:inline-block">{title}</div>
          </div>
        </div>

        {subtitle && (
          <div className="hidden md:flex items-center text-sm text-muted-foreground">
            <span className="mx-2">/</span>
            <span>{subtitle}</span>
          </div>
        )}

        <div className="flex flex-1 items-center justify-between space-x-2 md:justify-end">
          {showSearch && (
            <div className="w-full flex-1 md:w-auto md:flex-none">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <input
                  type="search"
                  placeholder="Search..."
                  value={searchQuery}
                  onChange={handleSearchChange}
                  className="w-full bg-background pl-8 pr-4 py-2 border border-input rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent md:w-[300px]"
                />
              </div>
            </div>
          )}

          <div className="flex items-center space-x-2">
            {/* Notifications */}
            <Button
              variant="ghost"
              size="sm"
              className="relative"
              onClick={onNotificationsClick}
            >
              <Bell className="h-4 w-4" />
              {notifications > 0 && (
                <Badge 
                  variant="destructive" 
                  className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
                >
                  {notifications > 99 ? '99+' : notifications}
                </Badge>
              )}
            </Button>

            {/* Actions */}
            {actions}
          </div>
        </div>
      </div>
    </header>
  );
}

// =============================================================================
// Sidebar Navigation
// =============================================================================

export interface NavItem {
  title: string;
  href?: string;
  icon?: React.ComponentType<{ className?: string }>;
  badge?: string | number;
  children?: NavItem[];
  onClick?: () => void;
  active?: boolean;
  disabled?: boolean;
}

export interface SidebarProps {
  navigation: NavItem[];
  collapsed?: boolean;
  onToggle?: () => void;
  footer?: React.ReactNode;
  className?: string;
}

export function Sidebar({
  navigation,
  collapsed = false,
  onToggle,
  footer,
  className
}: SidebarProps) {
  return (
    <div className={cn(
      "flex flex-col border-r border-border bg-card",
      collapsed ? "w-16" : "w-64",
      "transition-all duration-300 ease-in-out",
      className
    )}>
      {/* Sidebar Header */}
      <div className="flex h-16 items-center justify-between px-4 border-b border-border">
        {!collapsed && (
          <div className="flex items-center space-x-2">
            <Mic className="h-5 w-5 text-primary" />
            <span className="font-semibold text-sm">VN Speech Guardian</span>
          </div>
        )}
        
        <Button
          variant="ghost"
          size="sm"
          onClick={onToggle}
          className={cn(
            "h-8 w-8 p-0",
            collapsed && "mx-auto"
          )}
        >
          <Menu className="h-4 w-4" />
        </Button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 p-2 overflow-y-auto">
        {navigation.map((item, index) => (
          <NavItemComponent
            key={index}
            item={item}
            collapsed={collapsed}
          />
        ))}
      </nav>

      {/* Footer */}
      {footer && (
        <div className="border-t border-border p-4">
          {footer}
        </div>
      )}
    </div>
  );
}

function NavItemComponent({ item, collapsed }: { item: NavItem; collapsed: boolean }) {
  const [expanded, setExpanded] = React.useState(false);
  const hasChildren = item.children && item.children.length > 0;

  const handleClick = () => {
    if (hasChildren) {
      setExpanded(!expanded);
    } else {
      item.onClick?.();
    }
  };

  return (
    <div>
      <button
        onClick={handleClick}
        disabled={item.disabled}
        className={cn(
          "w-full flex items-center justify-between px-3 py-2 text-sm font-medium rounded-md transition-colors",
          item.active 
            ? "bg-primary text-primary-foreground" 
            : "text-muted-foreground hover:text-foreground hover:bg-muted",
          item.disabled && "opacity-50 cursor-not-allowed",
          collapsed && "justify-center px-2"
        )}
      >
        <div className="flex items-center space-x-3">
          {item.icon && (
            <item.icon className={cn("h-4 w-4", collapsed && "h-5 w-5")} />
          )}
          {!collapsed && (
            <>
              <span>{item.title}</span>
              {item.badge && (
                <Badge variant="secondary" className="ml-auto">
                  {item.badge}
                </Badge>
              )}
            </>
          )}
        </div>
        
        {!collapsed && hasChildren && (
          <div className="flex items-center">
            {expanded ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </div>
        )}
      </button>

      {/* Children */}
      {hasChildren && expanded && !collapsed && (
        <div className="ml-6 mt-1 space-y-1">
          {item.children!.map((child, index) => (
            <NavItemComponent
              key={index}
              item={child}
              collapsed={false}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// =============================================================================
// Main Content Area
// =============================================================================

export interface MainContentProps {
  children: React.ReactNode;
  className?: string;
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

const mainContentVariants = cva(
  "flex-1 overflow-auto",
  {
    variants: {
      padding: {
        none: "",
        sm: "p-4",
        md: "p-6",
        lg: "p-8",
      },
    },
    defaultVariants: {
      padding: "md",
    },
  }
);

export function MainContent({ 
  children, 
  className, 
  padding 
}: MainContentProps) {
  return (
    <main className={cn(mainContentVariants({ padding }), className)}>
      {children}
    </main>
  );
}

// =============================================================================
// Breadcrumb Navigation
// =============================================================================

export interface BreadcrumbItem {
  title: string;
  href?: string;
  onClick?: () => void;
}

export interface BreadcrumbProps {
  items: BreadcrumbItem[];
  separator?: React.ReactNode;
  className?: string;
}

export function Breadcrumb({ 
  items, 
  separator = "/", 
  className 
}: BreadcrumbProps) {
  return (
    <nav className={cn("flex items-center space-x-1 text-sm text-muted-foreground", className)}>
      {items.map((item, index) => (
        <React.Fragment key={index}>
          {index > 0 && (
            <span className="mx-2 text-muted-foreground/60">{separator}</span>
          )}
          
          {index === items.length - 1 ? (
            <span className="font-medium text-foreground">{item.title}</span>
          ) : (
            <button
              onClick={item.onClick}
              className="hover:text-foreground transition-colors"
            >
              {item.title}
            </button>
          )}
        </React.Fragment>
      ))}
    </nav>
  );
}

// =============================================================================
// Page Header Component
// =============================================================================

export interface PageHeaderProps {
  title: string;
  description?: string;
  breadcrumbs?: BreadcrumbItem[];
  actions?: React.ReactNode;
  className?: string;
}

export function PageHeader({
  title,
  description,
  breadcrumbs,
  actions,
  className
}: PageHeaderProps) {
  return (
    <div className={cn("space-y-4 pb-8 border-b border-border", className)}>
      {breadcrumbs && (
        <Breadcrumb items={breadcrumbs} />
      )}
      
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
          {description && (
            <p className="text-muted-foreground max-w-2xl">{description}</p>
          )}
        </div>
        
        {actions && (
          <div className="flex items-center space-x-2">
            {actions}
          </div>
        )}
      </div>
    </div>
  );
}

// =============================================================================
// Status Bar Component
// =============================================================================

export interface StatusBarProps {
  children?: React.ReactNode;
  connectionStatus?: 'connected' | 'connecting' | 'disconnected' | 'error';
  recordingStatus?: 'recording' | 'paused' | 'stopped';
  className?: string;
}

export function StatusBar({
  children,
  connectionStatus = 'disconnected',
  recordingStatus = 'stopped',
  className
}: StatusBarProps) {
  const getConnectionColor = (status: typeof connectionStatus) => {
    switch (status) {
      case 'connected': return 'text-green-500';
      case 'connecting': return 'text-yellow-500';
      case 'error': return 'text-red-500';
      default: return 'text-gray-500';
    }
  };

  const getRecordingColor = (status: typeof recordingStatus) => {
    switch (status) {
      case 'recording': return 'text-red-500 animate-pulse';
      case 'paused': return 'text-yellow-500';
      default: return 'text-gray-500';
    }
  };

  return (
    <div className={cn(
      "flex items-center justify-between h-8 px-4 bg-muted/30 border-t border-border text-xs",
      className
    )}>
      <div className="flex items-center space-x-4">
        <div className="flex items-center space-x-1">
          <div className={cn("w-2 h-2 rounded-full", getConnectionColor(connectionStatus))} />
          <span className="capitalize">{connectionStatus}</span>
        </div>
        
        <div className="flex items-center space-x-1">
          {recordingStatus === 'recording' ? (
            <Mic className={cn("h-3 w-3", getRecordingColor(recordingStatus))} />
          ) : (
            <MicOff className={cn("h-3 w-3", getRecordingColor(recordingStatus))} />
          )}
          <span className="capitalize">{recordingStatus}</span>
        </div>
      </div>
      
      <div className="flex items-center space-x-4">
        {children}
      </div>
    </div>
  );
}

// =============================================================================
// Responsive Layout Hook
// =============================================================================

export function useResponsiveLayout() {
  const [isMobile, setIsMobile] = React.useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = React.useState(false);

  React.useEffect(() => {
    const checkScreenSize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (mobile) {
        setSidebarCollapsed(true);
      }
    };

    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  const toggleSidebar = React.useCallback(() => {
    setSidebarCollapsed(prev => !prev);
  }, []);

  return {
    isMobile,
    sidebarCollapsed,
    setSidebarCollapsed,
    toggleSidebar,
  };
}