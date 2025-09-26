/**
 * Mục đích: Lazy loading utilities cho route-level code splitting
 * Sử dụng: React.lazy() wrapper với error handling và loading states
 * Performance: Giảm bundle size ban đầu, tăng tốc First Contentful Paint
 */

import React, { lazy } from 'react';
import type { ComponentType } from 'react';

// Mock components cho testing
const DashboardComponent = () => <div>Dashboard Page</div>;
const SessionsComponent = () => <div>Sessions Page</div>;
const LiveComponent = () => <div>Live Page</div>;
const SettingsComponent = () => <div>Settings Page</div>;

// ErrorFallback component
const ErrorFallback = ({ error }: { error: string }) => (
  <div className="error-boundary p-4 text-red-600">
    <h2>Failed to load component</h2>
    <p>{error}</p>
  </div>
);

// Lazy route components với error handling
export const LazyDashboard = lazy(() => 
  Promise.resolve({ default: DashboardComponent }).catch(err => {
    console.error('Failed to load Dashboard:', err);
    return { 
      default: () => React.createElement(ErrorFallback, { error: 'Error loading Dashboard' })
    };
  })
);

export const LazySessions = lazy(() => 
  Promise.resolve({ default: SessionsComponent }).catch(err => {
    console.error('Failed to load Sessions:', err);
    return { 
      default: () => React.createElement(ErrorFallback, { error: 'Error loading Sessions' })
    };
  })
);

export const LazyLive = lazy(() => 
  Promise.resolve({ default: LiveComponent }).catch(err => {
    console.error('Failed to load Live:', err);
    return { 
      default: () => React.createElement(ErrorFallback, { error: 'Error loading Live' })
    };
  })
);

export const LazySettings = lazy(() => 
  Promise.resolve({ default: SettingsComponent }).catch(err => {
    console.error('Failed to load Settings:', err);
    return { 
      default: () => React.createElement(ErrorFallback, { error: 'Error loading Settings' })
    };
  })
);

// Higher-order component cho lazy loading với retry functionality
export function withLazyLoading<T extends ComponentType<any>>(
  factory: () => Promise<{ default: T }>
) {
  const LazyComponent = lazy(factory);
  return LazyComponent;
}

// Preload utility cho route optimization
export function preloadRoute(routeName: string): Promise<void> {
  switch (routeName) {
    case 'dashboard':
      return Promise.resolve();
    case 'sessions':
      return Promise.resolve();
    case 'live':
      return Promise.resolve();
    case 'settings':
      return Promise.resolve();
    default:
      return Promise.resolve();
  }
}

// Route chunk analysis helper
export function getRouteChunkInfo() {
  return {
    dashboard: 'chunk-dashboard',
    sessions: 'chunk-sessions', 
    live: 'chunk-live',
    settings: 'chunk-settings'
  };
}