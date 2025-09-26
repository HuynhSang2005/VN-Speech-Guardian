/**
 * Layout Examples - VN Speech Guardian
 * Practical examples của layout system usage
 */

import React from 'react';
import {
  DashboardLayout,
  LiveLayout,
  SettingsLayout,
  AuthLayout,
  MobileBottomNav,
  useMobileNav,
  mainNavigation,
  mobileNavigationItems,
} from '../components/layout/layout-exports';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Alert, AlertDescription } from '../components/ui/alert';
import { Mic, Activity, Users, Shield } from 'lucide-react';

// =============================================================================
// Dashboard Page Example
// =============================================================================

export function DashboardPageExample() {
  const [searchQuery, setSearchQuery] = React.useState('');
  const [notifications] = React.useState(3);

  const mockUser = {
    name: 'Nguyen Van A',
    email: 'nguyenvana@example.com',
    avatar: '/api/placeholder/32/32'
  };

  const handleLogout = () => {
    console.log('User logged out');
  };

  const pageActions = (
    <div className="flex items-center space-x-2">
      <Button variant="outline" size="sm">
        Export Data
      </Button>
      <Button size="sm">
        <Mic className="mr-2 h-4 w-4" />
        Start Recording
      </Button>
    </div>
  );

  return (
    <DashboardLayout
      currentPath="/dashboard"
      pageTitle="Dashboard"
      pageDescription="Overview của VN Speech Guardian system performance và activity"
      pageActions={pageActions}
      showSearch={true}
      onSearchChange={setSearchQuery}
      notifications={notifications}
      connectionStatus="connected"
      recordingStatus="stopped"
      user={mockUser}
      onLogout={handleLogout}
    >
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {/* Metric Cards */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Sessions</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">12</div>
            <p className="text-xs text-muted-foreground">+2 from last hour</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">1,234</div>
            <p className="text-xs text-muted-foreground">+15% from last month</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Detections Today</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">89</div>
            <p className="text-xs text-muted-foreground">-12% from yesterday</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">System Health</CardTitle>
            <div className="h-2 w-2 rounded-full bg-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">99.9%</div>
            <p className="text-xs text-muted-foreground">Uptime this month</p>
          </CardContent>
        </Card>
      </div>

      {/* Search Results */}
      {searchQuery && (
        <Alert className="mt-6">
          <AlertDescription>
            Showing results for "{searchQuery}" - {Math.floor(Math.random() * 10) + 1} matches found
          </AlertDescription>
        </Alert>
      )}

      {/* Recent Activity */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[
              { user: 'User A', action: 'Started recording session', time: '2 minutes ago', severity: 'info' },
              { user: 'User B', action: 'Detected offensive content', time: '5 minutes ago', severity: 'warning' },
              { user: 'System', action: 'AI Worker reconnected', time: '10 minutes ago', severity: 'success' },
            ].map((activity, index) => (
              <div key={index} className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Badge variant={activity.severity as any}>
                    {activity.severity}
                  </Badge>
                  <div>
                    <p className="text-sm font-medium">{activity.user}</p>
                    <p className="text-xs text-muted-foreground">{activity.action}</p>
                  </div>
                </div>
                <span className="text-xs text-muted-foreground">{activity.time}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </DashboardLayout>
  );
}

// =============================================================================
// Live Recording Page Example
// =============================================================================

export function LiveRecordingPageExample() {
  const [isRecording, setIsRecording] = React.useState(false);
  const [duration, setDuration] = React.useState('00:00:00');
  const [connectionStatus, setConnectionStatus] = React.useState<'connected' | 'connecting' | 'disconnected' | 'error'>('connected');

  const handleStartRecording = () => {
    setIsRecording(true);
    console.log('Recording started');
  };

  const handleStopRecording = () => {
    setIsRecording(false);
    console.log('Recording stopped');
  };

  const handlePauseRecording = () => {
    console.log('Recording paused');
  };

  return (
    <LiveLayout
      isRecording={isRecording}
      onStartRecording={handleStartRecording}
      onStopRecording={handleStopRecording}
      onPauseRecording={handlePauseRecording}
      connectionStatus={connectionStatus}
      sessionName="Live Session #1"
      duration={duration}
    >
      {/* Live Recording Interface */}
      <div className="flex-1 flex flex-col items-center justify-center p-8">
        <div className="text-center space-y-6">
          {/* Waveform Visualization Placeholder */}
          <div className="w-80 h-80 rounded-full border-4 border-white/20 flex items-center justify-center">
            <div className={`w-60 h-60 rounded-full border-2 flex items-center justify-center ${
              isRecording ? 'border-red-400 bg-red-900/20' : 'border-gray-400 bg-gray-800/20'
            }`}>
              <Mic className={`h-16 w-16 ${isRecording ? 'text-red-400' : 'text-gray-400'}`} />
            </div>
          </div>

          {/* Status */}
          <div className="space-y-2">
            <h2 className="text-2xl font-bold">
              {isRecording ? 'Recording Active' : 'Ready to Record'}
            </h2>
            <p className="text-lg text-gray-300">
              Duration: {duration}
            </p>
          </div>

          {/* Real-time Transcript */}
          <Card className="w-full max-w-2xl bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white">Live Transcript</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-32 overflow-y-auto text-sm text-gray-300">
                {isRecording ? (
                  <p>Listening for speech...</p>
                ) : (
                  <p className="text-gray-500">Start recording to see transcript</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </LiveLayout>
  );
}

// =============================================================================
// Settings Page Example
// =============================================================================

export function SettingsPageExample() {
  return (
    <SettingsLayout currentPath="/settings/preferences">
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>User Preferences</CardTitle>
          </CardHeader>
          <CardContent>
            <p>Settings form would go here...</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Audio Configuration</CardTitle>
          </CardHeader>
          <CardContent>
            <p>Audio settings would go here...</p>
          </CardContent>
        </Card>
      </div>
    </SettingsLayout>
  );
}

// =============================================================================
// Auth Page Example
// =============================================================================

export function AuthPageExample() {
  return (
    <AuthLayout
      title="Sign in to your account"
      subtitle="Secure access to VN Speech Guardian"
    >
      <div className="space-y-6">
        <div className="space-y-4">
          <Button className="w-full" size="lg">
            Sign in with Google
          </Button>
          <Button variant="outline" className="w-full" size="lg">
            Sign in with Email
          </Button>
        </div>
        
        <div className="text-center text-sm text-muted-foreground">
          By signing in, you agree to our Terms of Service and Privacy Policy
        </div>
      </div>
    </AuthLayout>
  );
}

// =============================================================================
// Mobile Navigation Example
// =============================================================================

export function MobileNavigationExample() {
  const { isMobile, mobileNavOpen, toggleMobileNav } = useMobileNav();

  if (!isMobile) {
    return (
      <div className="p-4">
        <Alert>
          <AlertDescription>
            Mobile navigation example - resize your window to mobile size to see the mobile navigation
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="pb-20"> {/* Space for bottom nav */}
      <div className="p-4">
        <Card>
          <CardHeader>
            <CardTitle>Mobile Layout Example</CardTitle>
          </CardHeader>
          <CardContent>
            <p>This is a mobile-optimized page with bottom navigation.</p>
          </CardContent>
        </Card>
      </div>

      {/* Mobile Bottom Navigation */}
      <MobileBottomNav
        navigation={mobileNavigationItems}
        currentPath="/dashboard"
      />
    </div>
  );
}

// =============================================================================
// Complete Layout Showcase
// =============================================================================

export function LayoutShowcase() {
  const [currentLayout, setCurrentLayout] = React.useState<'dashboard' | 'live' | 'settings' | 'auth' | 'mobile'>('dashboard');

  const layouts = {
    dashboard: <DashboardPageExample />,
    live: <LiveRecordingPageExample />,
    settings: <SettingsPageExample />,
    auth: <AuthPageExample />,
    mobile: <MobileNavigationExample />,
  };

  return (
    <div className="min-h-screen">
      {/* Layout Switcher */}
      <div className="fixed top-4 right-4 z-50 bg-card border border-border rounded-lg p-2 shadow-lg">
        <div className="flex space-x-1">
          {Object.keys(layouts).map((layout) => (
            <Button
              key={layout}
              variant={currentLayout === layout ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setCurrentLayout(layout as any)}
              className="capitalize"
            >
              {layout}
            </Button>
          ))}
        </div>
      </div>

      {/* Current Layout */}
      {layouts[currentLayout]}
    </div>
  );
}