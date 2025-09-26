/**
 * Navigation Data - VN Speech Guardian
 * Cấu hình navigation patterns và route definitions
 */

import { 
  Home, 
  BarChart3, 
  FileText, 
  Settings, 
  User,
  Mic,
  Shield,
  Activity,
  Database,
  Bell,
  HelpCircle,
  LogOut,
  UserCircle
} from 'lucide-react';
import type { NavItem } from './index';

// =============================================================================
// Main Navigation Configuration
// =============================================================================

export const mainNavigation: NavItem[] = [
  {
    title: 'Dashboard',
    href: '/dashboard',
    icon: Home,
    active: false,
  },
  {
    title: 'Live Recording',
    href: '/live',
    icon: Mic,
    badge: 'NEW',
    active: false,
  },
  {
    title: 'Sessions',
    href: '/sessions',
    icon: FileText,
    children: [
      {
        title: 'All Sessions',
        href: '/sessions',
      },
      {
        title: 'Active Sessions',
        href: '/sessions/active',
        badge: 3,
      },
      {
        title: 'Completed Sessions',
        href: '/sessions/completed',
      },
    ],
  },
  {
    title: 'Analytics',
    href: '/analytics',
    icon: BarChart3,
    children: [
      {
        title: 'Overview',
        href: '/analytics',
      },
      {
        title: 'Detection Stats',
        href: '/analytics/detections',
      },
      {
        title: 'Performance',
        href: '/analytics/performance',
      },
    ],
  },
  {
    title: 'Moderation',
    href: '/moderation',
    icon: Shield,
    children: [
      {
        title: 'Detection Rules',
        href: '/moderation/rules',
      },
      {
        title: 'Sensitivity Settings',
        href: '/moderation/sensitivity',
      },
      {
        title: 'Blocked Content',
        href: '/moderation/blocked',
      },
    ],
  },
];

// =============================================================================
// Secondary Navigation
// =============================================================================

export const secondaryNavigation: NavItem[] = [
  {
    title: 'System Health',
    href: '/health',
    icon: Activity,
  },
  {
    title: 'Data Management',
    href: '/data',
    icon: Database,
  },
  {
    title: 'Notifications',
    href: '/notifications',
    icon: Bell,
    badge: 5,
  },
];

// =============================================================================
// Settings Navigation
// =============================================================================

export const settingsNavigation: NavItem[] = [
  {
    title: 'User Preferences',
    href: '/settings/preferences',
    icon: User,
  },
  {
    title: 'Audio Settings',
    href: '/settings/audio',
    icon: Mic,
  },
  {
    title: 'Detection Settings',
    href: '/settings/detection',
    icon: Shield,
  },
  {
    title: 'System Settings',
    href: '/settings/system',
    icon: Settings,
  },
  {
    title: 'Help & Support',
    href: '/help',
    icon: HelpCircle,
  },
];

// =============================================================================
// User Menu Configuration
// =============================================================================

export const userMenuItems: NavItem[] = [
  {
    title: 'Profile',
    href: '/profile',
    icon: UserCircle,
  },
  {
    title: 'Settings',
    href: '/settings',
    icon: Settings,
  },
  {
    title: 'Help',
    href: '/help',
    icon: HelpCircle,
  },
  {
    title: 'Sign Out',
    onClick: () => {
      // Handle logout
      console.log('Signing out...');
    },
    icon: LogOut,
  },
];

// =============================================================================
// Breadcrumb Configuration
// =============================================================================

export const breadcrumbMap: Record<string, { title: string; parent?: string }> = {
  '/dashboard': { title: 'Dashboard' },
  '/live': { title: 'Live Recording' },
  '/sessions': { title: 'Sessions' },
  '/sessions/active': { title: 'Active Sessions', parent: '/sessions' },
  '/sessions/completed': { title: 'Completed Sessions', parent: '/sessions' },
  '/sessions/[id]': { title: 'Session Details', parent: '/sessions' },
  '/analytics': { title: 'Analytics' },
  '/analytics/detections': { title: 'Detection Stats', parent: '/analytics' },
  '/analytics/performance': { title: 'Performance', parent: '/analytics' },
  '/moderation': { title: 'Moderation' },
  '/moderation/rules': { title: 'Detection Rules', parent: '/moderation' },
  '/moderation/sensitivity': { title: 'Sensitivity Settings', parent: '/moderation' },
  '/moderation/blocked': { title: 'Blocked Content', parent: '/moderation' },
  '/settings': { title: 'Settings' },
  '/settings/preferences': { title: 'Preferences', parent: '/settings' },
  '/settings/audio': { title: 'Audio Settings', parent: '/settings' },
  '/settings/detection': { title: 'Detection Settings', parent: '/settings' },
  '/settings/system': { title: 'System Settings', parent: '/settings' },
  '/profile': { title: 'Profile' },
  '/help': { title: 'Help & Support' },
  '/health': { title: 'System Health' },
  '/data': { title: 'Data Management' },
  '/notifications': { title: 'Notifications' },
};

// =============================================================================
// Route Utilities
// =============================================================================

export function generateBreadcrumbs(pathname: string) {
  const segments = pathname.split('/').filter(Boolean);
  const breadcrumbs = [{ title: 'Home', href: '/' }];

  let currentPath = '';
  
  for (const segment of segments) {
    currentPath += `/${segment}`;
    const breadcrumbInfo = breadcrumbMap[currentPath];
    
    if (breadcrumbInfo) {
      breadcrumbs.push({
        title: breadcrumbInfo.title,
        href: currentPath,
      });
    }
  }

  return breadcrumbs;
}

export function getPageTitle(pathname: string): string {
  const breadcrumbInfo = breadcrumbMap[pathname];
  return breadcrumbInfo?.title || 'VN Speech Guardian';
}

export function isNavItemActive(item: NavItem, currentPath: string): boolean {
  if (item.href === currentPath) return true;
  
  if (item.children) {
    return item.children.some(child => child.href === currentPath);
  }
  
  return false;
}

// =============================================================================
// Navigation Helper Functions
// =============================================================================

export function updateNavigationActive(
  navigation: NavItem[], 
  currentPath: string
): NavItem[] {
  return navigation.map(item => ({
    ...item,
    active: isNavItemActive(item, currentPath),
    ...(item.children && {
      children: item.children.map(child => ({
        ...child,
        active: child.href === currentPath,
      })),
    }),
  }));
}

export function findNavigationItem(
  navigation: NavItem[], 
  href: string
): NavItem | null {
  for (const item of navigation) {
    if (item.href === href) return item;
    
    if (item.children) {
      const found = findNavigationItem(item.children, href);
      if (found) return found;
    }
  }
  
  return null;
}

// =============================================================================
// Mobile Navigation Configuration
// =============================================================================

export const mobileNavigationItems: NavItem[] = [
  {
    title: 'Dashboard',
    href: '/dashboard',
    icon: Home,
  },
  {
    title: 'Live',
    href: '/live',
    icon: Mic,
  },
  {
    title: 'Sessions',
    href: '/sessions',
    icon: FileText,
  },
  {
    title: 'Analytics',
    href: '/analytics',
    icon: BarChart3,
  },
  {
    title: 'Settings',
    href: '/settings',
    icon: Settings,
  },
];

// =============================================================================
// Quick Actions Configuration
// =============================================================================

export const quickActions: NavItem[] = [
  {
    title: 'Start Recording',
    href: '/live',
    icon: Mic,
    onClick: () => {
      // Navigate to live recording
      console.log('Starting new recording session...');
    },
  },
  {
    title: 'View Latest Session',
    href: '/sessions/latest',
    icon: FileText,
    onClick: () => {
      // Navigate to latest session
      console.log('Opening latest session...');
    },
  },
  {
    title: 'System Health',
    href: '/health',
    icon: Activity,
    onClick: () => {
      // Check system health
      console.log('Checking system health...');
    },
  },
];

// =============================================================================
// Footer Navigation
// =============================================================================

export const footerLinks = {
  product: [
    { title: 'Features', href: '/features' },
    { title: 'Pricing', href: '/pricing' },
    { title: 'Security', href: '/security' },
    { title: 'API', href: '/api' },
  ],
  company: [
    { title: 'About', href: '/about' },
    { title: 'Blog', href: '/blog' },
    { title: 'Careers', href: '/careers' },
    { title: 'Contact', href: '/contact' },
  ],
  resources: [
    { title: 'Documentation', href: '/docs' },
    { title: 'Help Center', href: '/help' },
    { title: 'Community', href: '/community' },
    { title: 'Status', href: '/status' },
  ],
  legal: [
    { title: 'Privacy', href: '/privacy' },
    { title: 'Terms', href: '/terms' },
    { title: 'Cookies', href: '/cookies' },
  ],
};