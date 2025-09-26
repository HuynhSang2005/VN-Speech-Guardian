/**
 * Page Layout Templates - VN Speech Guardian
 * Templates cho các loại trang khác nhau với consistent UX
 */

import React from 'react';
import { cn } from '../../lib/utils';
import { 
  Layout, 
  Header, 
  Sidebar, 
  MainContent, 
  PageHeader, 
  StatusBar,
  useResponsiveLayout,
  type NavItem 
} from './index';
import { 
  mainNavigation, 
  settingsNavigation, 
  userMenuItems,
  updateNavigationActive,
  generateBreadcrumbs,
  getPageTitle 
} from './navigation-config';
import { Button } from '../ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
// Import icons as needed

// =============================================================================
// Dashboard Layout Template
// =============================================================================

export interface DashboardLayoutProps {
  children: React.ReactNode;
  currentPath?: string;
  pageTitle?: string;
  pageDescription?: string;
  pageActions?: React.ReactNode;
  showSearch?: boolean;
  onSearchChange?: (query: string) => void;
  notifications?: number;
  connectionStatus?: 'connected' | 'connecting' | 'disconnected' | 'error';
  recordingStatus?: 'recording' | 'paused' | 'stopped';
  user?: {
    name: string;
    email: string;
    avatar?: string;
  };
  onLogout?: () => void;
}

export function DashboardLayout({
  children,
  currentPath = '/dashboard',
  pageTitle,
  pageDescription,
  pageActions,
  showSearch = false,
  onSearchChange,
  notifications = 0,
  connectionStatus = 'disconnected',
  recordingStatus = 'stopped',
  user,
  onLogout,
}: DashboardLayoutProps) {
  const { sidebarCollapsed, toggleSidebar } = useResponsiveLayout();

  // Generate breadcrumbs và page info
  const breadcrumbs = generateBreadcrumbs(currentPath);
  const computedPageTitle = pageTitle || getPageTitle(currentPath);
  
  // Update navigation với active state
  const navigation = updateNavigationActive(mainNavigation, currentPath);

  // User menu handler
  const handleUserMenuClick = (item: NavItem) => {
    if (item.title === 'Sign Out') {
      onLogout?.();
    } else if (item.onClick) {
      item.onClick();
    }
  };

  return (
    <Layout variant="sidebar">
      {/* Sidebar */}
      <Sidebar
        navigation={navigation}
        collapsed={sidebarCollapsed}
        onToggle={toggleSidebar}
        footer={
          <div className="space-y-2">
            <div className="px-2 py-1 text-xs text-muted-foreground">
              System Status
            </div>
            <div className="flex items-center justify-between text-xs">
              <span>AI Worker</span>
              <div className={cn(
                "w-2 h-2 rounded-full",
                connectionStatus === 'connected' ? 'bg-green-500' :
                connectionStatus === 'connecting' ? 'bg-yellow-500' :
                connectionStatus === 'error' ? 'bg-red-500' : 'bg-gray-500'
              )} />
            </div>
          </div>
        }
      />

      {/* Main Content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Header */}
        <Header
          title="VN Speech Guardian"
          subtitle={computedPageTitle}
          showSearch={showSearch}
          {...(onSearchChange && { onSearchChange })}
          notifications={notifications}
          actions={
            <div className="flex items-center space-x-2">
              {/* User Menu */}
              {user && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="h-8 w-8 rounded-full">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={user.avatar} alt={user.name} />
                        <AvatarFallback>
                          {user.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-56" align="end">
                    <div className="flex items-center justify-start gap-2 p-2">
                      <div className="flex flex-col space-y-1 leading-none">
                        <p className="font-medium">{user.name}</p>
                        <p className="text-xs text-muted-foreground">{user.email}</p>
                      </div>
                    </div>
                    <DropdownMenuSeparator />
                    {userMenuItems.map((item, index) => (
                      <DropdownMenuItem
                        key={index}
                        onClick={() => handleUserMenuClick(item)}
                        className="cursor-pointer"
                      >
                        {item.icon && <item.icon className="mr-2 h-4 w-4" />}
                        {item.title}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          }
        />

        {/* Page Content */}
        <MainContent>
          <PageHeader
            title={computedPageTitle}
            {...(pageDescription && { description: pageDescription })}
            breadcrumbs={breadcrumbs.slice(1)} // Remove "Home"
            actions={pageActions}
          />
          {children}
        </MainContent>

        {/* Status Bar */}
        <StatusBar
          connectionStatus={connectionStatus}
          recordingStatus={recordingStatus}
        >
          <span>Ready</span>
        </StatusBar>
      </div>
    </Layout>
  );
}

// =============================================================================
// Live Recording Layout Template
// =============================================================================

export interface LiveLayoutProps {
  children: React.ReactNode;
  isRecording?: boolean;
  onStartRecording?: () => void;
  onStopRecording?: () => void;
  onPauseRecording?: () => void;
  connectionStatus?: 'connected' | 'connecting' | 'disconnected' | 'error';
  sessionName?: string;
  duration?: string;
  className?: string;
}

export function LiveLayout({
  children,
  isRecording = false,
  onStartRecording,
  onStopRecording,
  onPauseRecording,
  connectionStatus = 'disconnected',
  sessionName = 'Untitled Session',
  duration = '00:00:00',
  className,
}: LiveLayoutProps) {
  return (
    <Layout variant="full" className={cn("bg-gray-900 text-white", className)}>
      {/* Live Header */}
      <div className="flex items-center justify-between h-16 px-6 bg-gray-800 border-b border-gray-700">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <div className={cn(
              "w-3 h-3 rounded-full",
              isRecording ? "bg-red-500 animate-pulse" : "bg-gray-500"
            )} />
            <span className="font-medium">{sessionName}</span>
          </div>
          <div className="text-sm text-gray-400">
            Duration: {duration}
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <div className={cn(
            "px-2 py-1 rounded text-xs uppercase tracking-wide",
            connectionStatus === 'connected' ? 'bg-green-900 text-green-200' :
            connectionStatus === 'connecting' ? 'bg-yellow-900 text-yellow-200' :
            connectionStatus === 'error' ? 'bg-red-900 text-red-200' : 'bg-gray-700 text-gray-300'
          )}>
            {connectionStatus}
          </div>
        </div>
      </div>

      {/* Live Content */}
      <div className="flex-1 overflow-hidden">
        {children}
      </div>

      {/* Live Controls */}
      <div className="h-20 px-6 bg-gray-800 border-t border-gray-700 flex items-center justify-center">
        <div className="flex items-center space-x-4">
          {!isRecording ? (
            <Button
              size="lg"
              onClick={onStartRecording}
              className="bg-red-600 hover:bg-red-700 text-white px-8"
            >
              Start Recording
            </Button>
          ) : (
            <>
              <Button
                variant="outline"
                onClick={onPauseRecording}
                className="border-gray-600 text-gray-300 hover:bg-gray-700"
              >
                Pause
              </Button>
              <Button
                variant="destructive"
                onClick={onStopRecording}
                className="px-8"
              >
                Stop Recording
              </Button>
            </>
          )}
        </div>
      </div>
    </Layout>
  );
}

// =============================================================================
// Settings Layout Template
// =============================================================================

export interface SettingsLayoutProps {
  children: React.ReactNode;
  currentPath?: string;
}

export function SettingsLayout({
  children,
  currentPath = '/settings',
}: SettingsLayoutProps) {
  const { sidebarCollapsed, toggleSidebar } = useResponsiveLayout();

  // Update settings navigation
  const navigation = updateNavigationActive(settingsNavigation, currentPath);
  const breadcrumbs = generateBreadcrumbs(currentPath);
  const pageTitle = getPageTitle(currentPath);

  return (
    <Layout variant="sidebar">
      {/* Settings Sidebar */}
      <Sidebar
        navigation={navigation}
        collapsed={sidebarCollapsed}
        onToggle={toggleSidebar}
        className="w-72"
      />

      {/* Settings Content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header title={pageTitle} />
        
        <MainContent>
          <PageHeader
            title="Settings"
            description="Manage your VN Speech Guardian preferences and system configuration"
            breadcrumbs={breadcrumbs.slice(1)}
          />
          
          <div className="grid gap-6">
            {children}
          </div>
        </MainContent>
      </div>
    </Layout>
  );
}

// =============================================================================
// Simple Layout Template
// =============================================================================

export interface SimpleLayoutProps {
  children: React.ReactNode;
  title?: string;
  description?: string;
  actions?: React.ReactNode;
  showHeader?: boolean;
  className?: string;
}

export function SimpleLayout({
  children,
  title,
  description,
  actions,
  showHeader = true,
  className,
}: SimpleLayoutProps) {
  return (
    <Layout className={className}>
      {showHeader && (
        <Header
          title={title || "VN Speech Guardian"}
          actions={actions}
        />
      )}
      
      <MainContent>
        {(title || description) && (
          <PageHeader
            title={title || "VN Speech Guardian"}
            {...(description && { description })}
            actions={actions}
          />
        )}
        {children}
      </MainContent>
    </Layout>
  );
}

// =============================================================================
// Full Screen Layout Template
// =============================================================================

export interface FullScreenLayoutProps {
  children: React.ReactNode;
  className?: string;
}

export function FullScreenLayout({
  children,
  className,
}: FullScreenLayoutProps) {
  return (
    <Layout variant="full" className={cn("bg-background", className)}>
      {children}
    </Layout>
  );
}

// =============================================================================
// Auth Layout Template
// =============================================================================

export interface AuthLayoutProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  showBranding?: boolean;
}

export function AuthLayout({
  children,
  title = "Welcome to VN Speech Guardian",
  subtitle = "Protecting Vietnamese Speech with AI-powered moderation",
  showBranding = true,
}: AuthLayoutProps) {
  return (
    <FullScreenLayout className="bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <div className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          {showBranding && (
            <div className="text-center">
              <div className="flex justify-center items-center space-x-2 mb-4">
                <div className="w-12 h-12 bg-primary rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-xl">VN</span>
                </div>
                <div className="text-2xl font-bold text-foreground">
                  Speech Guardian
                </div>
              </div>
              <h2 className="text-xl font-semibold text-foreground">
                {title}
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">
                {subtitle}
              </p>
            </div>
          )}
          
          <div className="bg-white dark:bg-gray-800 shadow-xl rounded-lg p-8">
            {children}
          </div>
        </div>
      </div>
    </FullScreenLayout>
  );
}