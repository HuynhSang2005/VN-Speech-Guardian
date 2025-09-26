/**
 * Layout Components Tests - VN Speech Guardian
 * Comprehensive testing cho layout system
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  Layout,
  Header,
  Sidebar,
  MainContent,
  PageHeader,
  StatusBar,
  Breadcrumb,
  useResponsiveLayout,
} from '../../components/layout/index';
import { mainNavigation } from '../../components/layout/navigation-config';

// =============================================================================
// Layout Container Tests
// =============================================================================

describe('Layout Component', () => {
  it('renders children correctly', () => {
    render(
      <Layout>
        <div data-testid="test-content">Test Content</div>
      </Layout>
    );
    
    expect(screen.getByTestId('test-content')).toBeInTheDocument();
  });

  it('applies correct variant classes', () => {
    const { rerender } = render(
      <Layout variant="default" data-testid="layout">
        Content
      </Layout>
    );
    
    let layout = screen.getByTestId('layout');
    expect(layout).toHaveClass('flex', 'flex-col');

    rerender(
      <Layout variant="sidebar" data-testid="layout">
        Content
      </Layout>
    );
    
    layout = screen.getByTestId('layout');
    expect(layout).toHaveClass('flex', 'h-screen', 'overflow-hidden');
  });

  it('applies custom className', () => {
    render(
      <Layout className="custom-class" data-testid="layout">
        Content
      </Layout>
    );
    
    expect(screen.getByTestId('layout')).toHaveClass('custom-class');
  });
});

// =============================================================================
// Header Component Tests
// =============================================================================

describe('Header Component', () => {
  it('renders with default title', () => {
    render(<Header />);
    expect(screen.getByText('VN Speech Guardian')).toBeInTheDocument();
  });

  it('renders custom title and subtitle', () => {
    render(
      <Header 
        title="Custom Title" 
        subtitle="Test Subtitle" 
      />
    );
    
    expect(screen.getByText('Custom Title')).toBeInTheDocument();
    expect(screen.getByText('Test Subtitle')).toBeInTheDocument();
  });

  it('shows search input when showSearch is true', () => {
    const onSearchChange = vi.fn();
    render(
      <Header 
        showSearch={true}
        onSearchChange={onSearchChange}
      />
    );
    
    const searchInput = screen.getByPlaceholderText('Search...');
    expect(searchInput).toBeInTheDocument();
  });

  it('calls onSearchChange when search input changes', async () => {
    const user = userEvent.setup();
    const onSearchChange = vi.fn();
    
    render(
      <Header 
        showSearch={true}
        onSearchChange={onSearchChange}
      />
    );
    
    const searchInput = screen.getByPlaceholderText('Search...');
    await user.type(searchInput, 'test query');
    
    expect(onSearchChange).toHaveBeenCalledWith('test query');
  });

  it('displays notification badge correctly', () => {
    render(<Header notifications={5} />);
    expect(screen.getByText('5')).toBeInTheDocument();
  });

  it('handles high notification count', () => {
    render(<Header notifications={150} />);
    expect(screen.getByText('99+')).toBeInTheDocument();
  });

  it('calls onNotificationsClick when notification button is clicked', async () => {
    const user = userEvent.setup();
    const onNotificationsClick = vi.fn();
    
    render(
      <Header 
        notifications={3}
        onNotificationsClick={onNotificationsClick}
      />
    );
    
    const notificationButton = screen.getByRole('button');
    await user.click(notificationButton);
    
    expect(onNotificationsClick).toHaveBeenCalled();
  });

  it('renders custom actions', () => {
    render(
      <Header 
        actions={
          <button data-testid="custom-action">Custom Action</button>
        }
      />
    );
    
    expect(screen.getByTestId('custom-action')).toBeInTheDocument();
  });
});

// =============================================================================
// Sidebar Component Tests
// =============================================================================

describe('Sidebar Component', () => {
  const mockNavigation = [
    {
      title: 'Dashboard',
      href: '/dashboard',
      active: true,
    },
    {
      title: 'Sessions',
      href: '/sessions',
      children: [
        { title: 'Active Sessions', href: '/sessions/active' },
        { title: 'Completed Sessions', href: '/sessions/completed' },
      ],
    },
  ];

  it('renders navigation items', () => {
    render(<Sidebar navigation={mockNavigation} />);
    
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Sessions')).toBeInTheDocument();
  });

  it('applies active state correctly', () => {
    render(<Sidebar navigation={mockNavigation} />);
    
    const dashboardButton = screen.getByText('Dashboard').closest('button');
    expect(dashboardButton).toHaveClass('bg-primary', 'text-primary-foreground');
  });

  it('toggles collapsed state', async () => {
    const user = userEvent.setup();
    const onToggle = vi.fn();
    
    render(
      <Sidebar 
        navigation={mockNavigation}
        collapsed={false}
        onToggle={onToggle}
      />
    );
    
    const toggleButton = screen.getByRole('button');
    await user.click(toggleButton);
    
    expect(onToggle).toHaveBeenCalled();
  });

  it('expands/collapses navigation with children', async () => {
    const user = userEvent.setup();
    
    render(<Sidebar navigation={mockNavigation} />);
    
    const sessionsButton = screen.getByText('Sessions').closest('button');
    
    // Initially children should not be visible
    expect(screen.queryByText('Active Sessions')).not.toBeInTheDocument();
    
    // Click to expand
    await user.click(sessionsButton!);
    
    // Children should now be visible
    expect(screen.getByText('Active Sessions')).toBeInTheDocument();
    expect(screen.getByText('Completed Sessions')).toBeInTheDocument();
  });

  it('renders footer content', () => {
    render(
      <Sidebar 
        navigation={mockNavigation}
        footer={<div data-testid="footer-content">Footer</div>}
      />
    );
    
    expect(screen.getByTestId('footer-content')).toBeInTheDocument();
  });

  it('handles collapsed state correctly', () => {
    render(
      <Sidebar 
        navigation={mockNavigation}
        collapsed={true}
      />
    );
    
    const sidebar = screen.getByRole('navigation').parentElement;
    expect(sidebar).toHaveClass('w-16');
  });
});

// =============================================================================
// PageHeader Component Tests
// =============================================================================

describe('PageHeader Component', () => {
  it('renders title correctly', () => {
    render(<PageHeader title="Test Page" />);
    expect(screen.getByText('Test Page')).toBeInTheDocument();
  });

  it('renders description when provided', () => {
    render(
      <PageHeader 
        title="Test Page" 
        description="This is a test page description" 
      />
    );
    
    expect(screen.getByText('This is a test page description')).toBeInTheDocument();
  });

  it('renders breadcrumbs when provided', () => {
    const breadcrumbs = [
      { title: 'Home', href: '/' },
      { title: 'Dashboard', href: '/dashboard' },
    ];
    
    render(
      <PageHeader 
        title="Test Page"
        breadcrumbs={breadcrumbs}
      />
    );
    
    expect(screen.getByText('Home')).toBeInTheDocument();
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
  });

  it('renders actions when provided', () => {
    render(
      <PageHeader 
        title="Test Page"
        actions={
          <button data-testid="page-action">Action</button>
        }
      />
    );
    
    expect(screen.getByTestId('page-action')).toBeInTheDocument();
  });
});

// =============================================================================
// StatusBar Component Tests
// =============================================================================

describe('StatusBar Component', () => {
  it('displays connection status correctly', () => {
    render(<StatusBar connectionStatus="connected" />);
    expect(screen.getByText('connected')).toBeInTheDocument();
  });

  it('displays recording status correctly', () => {
    render(<StatusBar recordingStatus="recording" />);
    expect(screen.getByText('recording')).toBeInTheDocument();
  });

  it('applies correct colors for connection status', () => {
    const { rerender } = render(<StatusBar connectionStatus="connected" />);
    
    let statusDot = document.querySelector('.w-2.h-2.rounded-full');
    expect(statusDot).toHaveClass('text-green-500');

    rerender(<StatusBar connectionStatus="error" />);
    statusDot = document.querySelector('.w-2.h-2.rounded-full');
    expect(statusDot).toHaveClass('text-red-500');
  });

  it('shows recording animation when recording', () => {
    render(<StatusBar recordingStatus="recording" />);
    const micIcon = document.querySelector('.animate-pulse');
    expect(micIcon).toBeInTheDocument();
  });

  it('renders children content', () => {
    render(
      <StatusBar>
        <span data-testid="status-child">Ready</span>
      </StatusBar>
    );
    
    expect(screen.getByTestId('status-child')).toBeInTheDocument();
  });
});

// =============================================================================
// Breadcrumb Component Tests
// =============================================================================

describe('Breadcrumb Component', () => {
  const items = [
    { title: 'Home', href: '/', onClick: vi.fn() },
    { title: 'Dashboard', href: '/dashboard', onClick: vi.fn() },
    { title: 'Current Page' },
  ];

  it('renders all breadcrumb items', () => {
    render(<Breadcrumb items={items} />);
    
    expect(screen.getByText('Home')).toBeInTheDocument();
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Current Page')).toBeInTheDocument();
  });

  it('calls onClick when breadcrumb item is clicked', async () => {
    const user = userEvent.setup();
    render(<Breadcrumb items={items} />);
    
    const homeButton = screen.getByText('Home');
    await user.click(homeButton);
    
    expect(items[0].onClick).toHaveBeenCalled();
  });

  it('renders custom separator', () => {
    render(<Breadcrumb items={items} separator=">" />);
    expect(screen.getByText('>')).toBeInTheDocument();
  });

  it('shows last item as non-clickable', () => {
    render(<Breadcrumb items={items} />);
    
    const lastItem = screen.getByText('Current Page');
    expect(lastItem.tagName).toBe('SPAN');
    expect(lastItem).toHaveClass('text-foreground');
  });
});

// =============================================================================
// useResponsiveLayout Hook Tests
// =============================================================================

describe('useResponsiveLayout Hook', () => {
  // Mock window.innerWidth
  const mockInnerWidth = (width: number) => {
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: width,
    });
    window.dispatchEvent(new Event('resize'));
  };

  it('detects mobile viewport correctly', async () => {
    let hookResult: any;
    
    function TestComponent() {
      hookResult = useResponsiveLayout();
      return null;
    }

    render(<TestComponent />);
    
    // Test mobile
    mockInnerWidth(500);
    await waitFor(() => {
      expect(hookResult.isMobile).toBe(true);
      expect(hookResult.sidebarCollapsed).toBe(true);
    });
  });

  it('detects desktop viewport correctly', async () => {
    let hookResult: any;
    
    function TestComponent() {
      hookResult = useResponsiveLayout();
      return null;
    }

    render(<TestComponent />);
    
    // Test desktop
    mockInnerWidth(1200);
    await waitFor(() => {
      expect(hookResult.isMobile).toBe(false);
    });
  });

  it('toggles sidebar correctly', async () => {
    let hookResult: any;
    
    function TestComponent() {
      hookResult = useResponsiveLayout();
      return (
        <button onClick={hookResult.toggleSidebar}>
          Toggle
        </button>
      );
    }

    const user = userEvent.setup();
    render(<TestComponent />);
    
    const initialState = hookResult.sidebarCollapsed;
    
    const toggleButton = screen.getByText('Toggle');
    await user.click(toggleButton);
    
    expect(hookResult.sidebarCollapsed).toBe(!initialState);
  });
});