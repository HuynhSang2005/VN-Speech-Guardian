/**
 * Layout System Exports - VN Speech Guardian
 * Complete layout system với all components
 */

// =============================================================================
// Core Layout Components
// =============================================================================

export * from './index';
export * from './templates';
export * from './mobile';
export * from './navigation-config';

// =============================================================================
// Layout Hooks
// =============================================================================

export { useResponsiveLayout } from './index';
export { useMobileNav } from './mobile';

// =============================================================================
// Navigation Data
// =============================================================================

export {
  mainNavigation,
  secondaryNavigation,
  settingsNavigation,
  userMenuItems,
  mobileNavigationItems,
  quickActions,
  footerLinks,
  breadcrumbMap,
  generateBreadcrumbs,
  getPageTitle,
  isNavItemActive,
  updateNavigationActive,
  findNavigationItem,
} from './navigation-config';

// =============================================================================
// Layout Templates
// =============================================================================

export {
  DashboardLayout,
  LiveLayout,
  SettingsLayout,
  SimpleLayout,
  FullScreenLayout,
  AuthLayout,
} from './templates';

// =============================================================================
// Mobile Components
// =============================================================================

export {
  MobileNav,
  MobileNavToggle,
  MobileBottomNav,
} from './mobile';

// =============================================================================
// Type Definitions
// =============================================================================

export type {
  LayoutProps,
  HeaderProps,
  SidebarProps,
  MainContentProps,
  BreadcrumbProps,
  PageHeaderProps,
  StatusBarProps,
  NavItem,
} from './index';

export type {
  DashboardLayoutProps,
  LiveLayoutProps,
  SettingsLayoutProps,
  SimpleLayoutProps,
  FullScreenLayoutProps,
  AuthLayoutProps,
} from './templates';

export type {
  MobileNavProps,
  MobileNavToggleProps,
  MobileBottomNavProps,
} from './mobile';