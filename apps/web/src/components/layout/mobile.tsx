/**
 * Mobile Components - VN Speech Guardian  
 * Mobile-specific navigation và responsive components
 */

import React from 'react';
import { cn } from '../../lib/utils';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Menu, X } from 'lucide-react';
import type { NavItem } from './index';

// =============================================================================
// Mobile Navigation Drawer
// =============================================================================

export interface MobileNavProps {
  navigation: NavItem[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentPath?: string;
  className?: string;
}

export function MobileNav({
  navigation,
  open,
  onOpenChange,
  currentPath,
  className,
}: MobileNavProps) {
  const handleNavClick = (item: NavItem) => {
    if (item.onClick) {
      item.onClick();
    }
    onOpenChange(false); // Close drawer after navigation
  };

  return (
    <>
      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={() => onOpenChange(false)}
        />
      )}

      {/* Mobile Navigation Drawer */}
      <div
        className={cn(
          "fixed left-0 top-0 z-50 h-full w-80 transform bg-card border-r border-border transition-transform duration-300 ease-in-out md:hidden",
          open ? "translate-x-0" : "-translate-x-full",
          className
        )}
      >
        {/* Mobile Header */}
        <div className="flex h-16 items-center justify-between px-4 border-b border-border">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">VN</span>
            </div>
            <span className="font-semibold">Speech Guardian</span>
          </div>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onOpenChange(false)}
            className="h-8 w-8 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Mobile Navigation */}
        <nav className="flex-1 space-y-1 p-4 overflow-y-auto">
          {navigation.map((item, index) => (
            <MobileNavItem
              key={index}
              item={item}
              {...(currentPath && { currentPath })}
              onClick={handleNavClick}
            />
          ))}
        </nav>

        {/* Mobile Footer */}
        <div className="border-t border-border p-4">
          <div className="text-xs text-muted-foreground">
            VN Speech Guardian v1.0.0
          </div>
        </div>
      </div>
    </>
  );
}

function MobileNavItem({ 
  item, 
  currentPath, 
  onClick 
}: { 
  item: NavItem; 
  currentPath?: string; 
  onClick: (item: NavItem) => void;
}) {
  const [expanded, setExpanded] = React.useState(false);
  const hasChildren = item.children && item.children.length > 0;
  const isActive = item.href === currentPath || 
                   item.children?.some(child => child.href === currentPath);

  const handleClick = () => {
    if (hasChildren) {
      setExpanded(!expanded);
    } else {
      onClick(item);
    }
  };

  return (
    <div>
      <button
        onClick={handleClick}
        disabled={item.disabled}
        className={cn(
          "w-full flex items-center justify-between px-3 py-3 text-sm font-medium rounded-lg transition-colors",
          isActive 
            ? "bg-primary text-primary-foreground" 
            : "text-foreground hover:bg-muted",
          item.disabled && "opacity-50 cursor-not-allowed"
        )}
      >
        <div className="flex items-center space-x-3">
          {item.icon && <item.icon className="h-5 w-5" />}
          <span>{item.title}</span>
          {item.badge && (
            <Badge variant="secondary" className="ml-auto">
              {item.badge}
            </Badge>
          )}
        </div>
        
        {hasChildren && (
          <div className="ml-2">
            {expanded ? "−" : "+"}
          </div>
        )}
      </button>

      {/* Children */}
      {hasChildren && expanded && (
        <div className="ml-8 mt-2 space-y-1">
          {item.children!.map((child, index) => (
            <button
              key={index}
              onClick={() => onClick(child)}
              disabled={child.disabled}
              className={cn(
                "w-full flex items-start px-3 py-2 text-sm rounded-md transition-colors text-left",
                child.href === currentPath
                  ? "bg-primary/10 text-primary font-medium"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted",
                child.disabled && "opacity-50 cursor-not-allowed"
              )}
            >
              <span>{child.title}</span>
              {child.badge && (
                <Badge variant="outline" size="sm" className="ml-auto">
                  {child.badge}
                </Badge>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// =============================================================================
// Mobile Header Toggle
// =============================================================================

export interface MobileNavToggleProps {
  onClick: () => void;
  className?: string;
}

export function MobileNavToggle({ onClick, className }: MobileNavToggleProps) {
  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={onClick}
      className={cn("h-8 w-8 p-0 md:hidden", className)}
    >
      <Menu className="h-4 w-4" />
      <span className="sr-only">Toggle navigation</span>
    </Button>
  );
}

// =============================================================================
// Mobile Bottom Navigation
// =============================================================================

export interface MobileBottomNavProps {
  navigation: NavItem[];
  currentPath?: string;
  className?: string;
}

export function MobileBottomNav({
  navigation,
  currentPath,
  className,
}: MobileBottomNavProps) {
  return (
    <div className={cn(
      "fixed bottom-0 left-0 right-0 z-40 bg-card border-t border-border md:hidden",
      className
    )}>
      <nav className="flex">
        {navigation.map((item, index) => {
          const isActive = item.href === currentPath;
          
          return (
            <button
              key={index}
              onClick={item.onClick}
              disabled={item.disabled}
              className={cn(
                "flex-1 flex flex-col items-center justify-center py-2 px-1 text-xs transition-colors min-h-[60px]",
                isActive
                  ? "text-primary bg-primary/5"
                  : "text-muted-foreground hover:text-foreground",
                item.disabled && "opacity-50 cursor-not-allowed"
              )}
            >
              {item.icon && (
                <item.icon className={cn(
                  "h-5 w-5 mb-1",
                  isActive && "text-primary"
                )} />
              )}
              <span className={cn(
                "font-medium",
                isActive && "text-primary"
              )}>
                {item.title}
              </span>
              {item.badge && (
                <Badge 
                  variant="destructive" 
                  className="absolute top-1 right-1 h-4 w-4 p-0 text-xs"
                >
                  {item.badge}
                </Badge>
              )}
            </button>
          );
        })}
      </nav>
    </div>
  );
}

// =============================================================================
// Mobile-Responsive Hook
// =============================================================================

export function useMobileNav() {
  const [mobileNavOpen, setMobileNavOpen] = React.useState(false);
  const [isMobile, setIsMobile] = React.useState(false);

  React.useEffect(() => {
    const checkScreenSize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      
      // Close mobile nav when switching to desktop
      if (!mobile && mobileNavOpen) {
        setMobileNavOpen(false);
      }
    };

    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    return () => window.removeEventListener('resize', checkScreenSize);
  }, [mobileNavOpen]);

  const toggleMobileNav = React.useCallback(() => {
    setMobileNavOpen(prev => !prev);
  }, []);

  const closeMobileNav = React.useCallback(() => {
    setMobileNavOpen(false);
  }, []);

  return {
    isMobile,
    mobileNavOpen,
    setMobileNavOpen,
    toggleMobileNav,
    closeMobileNav,
  };
}