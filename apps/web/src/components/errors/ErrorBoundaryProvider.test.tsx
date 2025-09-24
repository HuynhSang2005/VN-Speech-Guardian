/**
 * Error Boundary Provider Tests - Context and Configuration Testing
 * Testing provider system and hook integration for VN Speech Guardian
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { 
  ErrorBoundaryProvider, 
  useErrorBoundary, 
  useErrorHandler,
  withErrorBoundaryConfig 
} from '../../contexts/error-boundary-context';

// Test component that uses the error boundary context
const TestComponent = () => {
  const { config, theme, getErrorMessage, reportError } = useErrorBoundary();
  
  return (
    <div>
      <div data-testid="theme">{theme}</div>
      <div data-testid="max-retries">{config.maxRetries}</div>
      <div data-testid="error-message">{getErrorMessage('network')}</div>
      <button 
        onClick={() => reportError(new Error('Test error'), { feature: 'test' })}
        data-testid="report-error"
      >
        Report Error
      </button>
    </div>
  );
};

// Test component that uses error handler hook
const ErrorHandlerTestComponent = () => {
  const handleError = useErrorHandler();
  
  return (
    <button 
      onClick={() => {
        try {
          handleError(new Error('Async error'), { source: 'event-handler' });
        } catch (error) {
          // Error should be caught by nearest boundary
        }
      }}
      data-testid="trigger-error"
    >
      Trigger Error
    </button>
  );
};

// Mock console methods
const mockConsoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

describe('ErrorBoundaryProvider', () => {
  beforeEach(() => {
    mockConsoleError.mockClear();
  });

  it('should provide default configuration', () => {
    render(
      <ErrorBoundaryProvider>
        <TestComponent />
      </ErrorBoundaryProvider>
    );

    expect(screen.getByTestId('max-retries')).toHaveTextContent('3');
    expect(screen.getByTestId('error-message')).toHaveTextContent('Không thể kết nối đến máy chủ');
  });

  it('should merge custom configuration with defaults', () => {
    const customConfig: Partial<import('../../contexts/error-boundary-context').ErrorBoundaryConfig> = {
      maxRetries: 5,
      messages: {
        generic: 'Đã xảy ra lỗi không mong muốn. Vui lòng thử lại sau.',
        network: 'Custom network error message',
        authentication: 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.',
        audio: 'Không thể truy cập microphone. Kiểm tra quyền trình duyệt.',
        permission: 'Không có quyền thực hiện thao tác này.',
      },
    };

    render(
      <ErrorBoundaryProvider config={customConfig}>
        <TestComponent />
      </ErrorBoundaryProvider>
    );

    expect(screen.getByTestId('max-retries')).toHaveTextContent('5');
    expect(screen.getByTestId('error-message')).toHaveTextContent('Custom network error message');
  });

  it('should detect light/dark theme based on user preference', () => {
    // Mock media query for dark theme
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation(query => ({
        matches: query === '(prefers-color-scheme: dark)',
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });

    render(
      <ErrorBoundaryProvider config={{ theme: 'auto' }}>
        <TestComponent />
      </ErrorBoundaryProvider>
    );

    expect(screen.getByTestId('theme')).toHaveTextContent('dark');
  });

  it('should report errors with context when enabled', () => {
    render(
      <ErrorBoundaryProvider config={{ enableReporting: true }}>
        <TestComponent />
      </ErrorBoundaryProvider>
    );

    fireEvent.click(screen.getByTestId('report-error'));

    expect(mockConsoleError).toHaveBeenCalledWith(
      'Reporting error:',
      expect.objectContaining({
        message: 'Test error',
        context: expect.objectContaining({
          timestamp: expect.any(String),
          userAgent: expect.any(String),
          url: expect.any(String),
          theme: expect.any(String),
          language: 'vi',
        }),
      })
    );
  });

  it('should not report errors when reporting is disabled', () => {
    render(
      <ErrorBoundaryProvider config={{ enableReporting: false }}>
        <TestComponent />
      </ErrorBoundaryProvider>
    );

    fireEvent.click(screen.getByTestId('report-error'));

    expect(mockConsoleError).not.toHaveBeenCalled();
  });
});

describe('useErrorBoundary hook', () => {
  it('should throw error when used outside provider', () => {
    // Temporarily suppress console errors for this test
    const mockConsoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    
    expect(() => {
      render(<TestComponent />);
    }).toThrow('useErrorBoundary must be used within an ErrorBoundaryProvider');
    
    mockConsoleError.mockRestore();
  });

  it('should provide access to configuration and utilities', () => {
    render(
      <ErrorBoundaryProvider>
        <TestComponent />
      </ErrorBoundaryProvider>
    );

    expect(screen.getByTestId('theme')).toBeInTheDocument();
    expect(screen.getByTestId('max-retries')).toBeInTheDocument();
    expect(screen.getByTestId('error-message')).toBeInTheDocument();
  });

  it('should return correct localized messages', () => {
    const customMessages = {
      generic: 'Custom generic error',
      network: 'Custom network error',
      authentication: 'Custom auth error',
      audio: 'Custom audio error',
      permission: 'Custom permission error',
    };

    const TestMessagesComponent = () => {
      const { getErrorMessage } = useErrorBoundary();
      return (
        <div>
          <div data-testid="generic">{getErrorMessage('generic')}</div>
          <div data-testid="network">{getErrorMessage('network')}</div>
          <div data-testid="authentication">{getErrorMessage('authentication')}</div>
          <div data-testid="audio">{getErrorMessage('audio')}</div>
          <div data-testid="permission">{getErrorMessage('permission')}</div>
        </div>
      );
    };

    render(
      <ErrorBoundaryProvider config={{ messages: customMessages }}>
        <TestMessagesComponent />
      </ErrorBoundaryProvider>
    );

    expect(screen.getByTestId('generic')).toHaveTextContent('Custom generic error');
    expect(screen.getByTestId('network')).toHaveTextContent('Custom network error');
    expect(screen.getByTestId('authentication')).toHaveTextContent('Custom auth error');
    expect(screen.getByTestId('audio')).toHaveTextContent('Custom audio error');
    expect(screen.getByTestId('permission')).toHaveTextContent('Custom permission error');
  });
});

describe('useErrorHandler hook', () => {
  it('should throw error when used outside provider', () => {
    // Temporarily suppress console errors for this test
    const mockConsoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    
    expect(() => {
      render(<ErrorHandlerTestComponent />);
    }).toThrow('useErrorBoundary must be used within an ErrorBoundaryProvider');
    
    mockConsoleError.mockRestore();
  });

  it('should handle errors imperatively', () => {
    const mockConsoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

    render(
      <ErrorBoundaryProvider config={{ enableReporting: true }}>
        <ErrorHandlerTestComponent />
      </ErrorBoundaryProvider>
    );

    // This would trigger error reporting and throw to nearest boundary
    fireEvent.click(screen.getByTestId('trigger-error'));

    expect(mockConsoleError).toHaveBeenCalledWith(
      'Reporting error:',
      expect.objectContaining({
        message: 'Async error',
        context: expect.objectContaining({
          source: 'event-handler',
        }),
      })
    );

    mockConsoleError.mockRestore();
  });
});

describe('withErrorBoundaryConfig HOC', () => {
  const SimpleComponent = ({ message }: { message: string }) => (
    <div data-testid="message">{message}</div>
  );

  it('should wrap component with error boundary configuration', () => {
    const WrappedComponent = withErrorBoundaryConfig(SimpleComponent, {
      maxRetries: 10,
      theme: 'dark',
    });

    render(<WrappedComponent message="Test message" />);

    expect(screen.getByTestId('message')).toHaveTextContent('Test message');
  });

  it('should handle undefined config', () => {
    const WrappedComponent = withErrorBoundaryConfig(SimpleComponent);

    render(<WrappedComponent message="Test message" />);

    expect(screen.getByTestId('message')).toHaveTextContent('Test message');
  });

  it('should preserve component display name', () => {
    // Create a named component with displayName
    const NamedComponent = ({ message }: { message: string }) => (
      <div data-testid="message">{message}</div>
    );
    NamedComponent.displayName = 'SimpleTestComponent';
    
    const WrappedComponent = withErrorBoundaryConfig(NamedComponent);

    expect(WrappedComponent.displayName).toBe('withErrorBoundaryConfig(SimpleTestComponent)');
  });

  it('should use component name when no display name', () => {
    const UnnamedComponent = () => <div>Test</div>;
    const WrappedComponent = withErrorBoundaryConfig(UnnamedComponent);

    expect(WrappedComponent.displayName).toBe('withErrorBoundaryConfig(UnnamedComponent)');
  });
});

describe('Error Context Configuration', () => {
  it('should handle branding customization', () => {
    const customBranding = {
      logo: '/custom-logo.png',
      primaryColor: '#FF0000',
      supportUrl: '/custom-support',
      contactEmail: 'custom@example.com',
    };

    const BrandingTestComponent = () => {
      const { config } = useErrorBoundary();
      return (
        <div>
          <div data-testid="primary-color">{config.branding.primaryColor}</div>
          <div data-testid="support-url">{config.branding.supportUrl}</div>
          <div data-testid="contact-email">{config.branding.contactEmail}</div>
        </div>
      );
    };

    render(
      <ErrorBoundaryProvider config={{ branding: customBranding }}>
        <BrandingTestComponent />
      </ErrorBoundaryProvider>
    );

    expect(screen.getByTestId('primary-color')).toHaveTextContent('#FF0000');
    expect(screen.getByTestId('support-url')).toHaveTextContent('/custom-support');
    expect(screen.getByTestId('contact-email')).toHaveTextContent('custom@example.com');
  });

  it('should handle theme-specific configurations', () => {
    const lightThemeConfig = { theme: 'light' as const };
    const darkThemeConfig = { theme: 'dark' as const };

    const ThemeTestComponent = () => {
      const { theme } = useErrorBoundary();
      return <div data-testid="current-theme">{theme}</div>;
    };

    // Test light theme
    const { rerender } = render(
      <ErrorBoundaryProvider config={lightThemeConfig}>
        <ThemeTestComponent />
      </ErrorBoundaryProvider>
    );

    expect(screen.getByTestId('current-theme')).toHaveTextContent('light');

    // Test dark theme
    rerender(
      <ErrorBoundaryProvider config={darkThemeConfig}>
        <ThemeTestComponent />
      </ErrorBoundaryProvider>
    );

    expect(screen.getByTestId('current-theme')).toHaveTextContent('dark');
  });

  it('should handle retry configuration', () => {
    const retryConfig = {
      maxRetries: 7,
      retryDelay: 2000,
    };

    const RetryTestComponent = () => {
      const { config } = useErrorBoundary();
      return (
        <div>
          <div data-testid="max-retries">{config.maxRetries}</div>
          <div data-testid="retry-delay">{config.retryDelay}</div>
        </div>
      );
    };

    render(
      <ErrorBoundaryProvider config={retryConfig}>
        <RetryTestComponent />
      </ErrorBoundaryProvider>
    );

    expect(screen.getByTestId('max-retries')).toHaveTextContent('7');
    expect(screen.getByTestId('retry-delay')).toHaveTextContent('2000');
  });
});