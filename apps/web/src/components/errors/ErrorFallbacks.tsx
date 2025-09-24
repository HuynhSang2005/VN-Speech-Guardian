/**
 * Specialized Error Fallback Components for VN Speech Guardian
 * Mục đích: Provide user-friendly error displays với Vietnamese localization
 * Features: Themed fallbacks, recovery actions, context-aware messaging
 */

import type { ErrorFallbackProps } from './ErrorBoundary';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { AlertTriangle, Mic, Wifi, RefreshCw, Home, Bug } from 'lucide-react';

/**
 * Generic Error Fallback - Default fallback for all error boundaries
 * Provides basic error information and recovery options
 */
export interface GenericErrorFallbackProps extends ErrorFallbackProps {
  title?: string | undefined;
  description?: string | undefined;
  showErrorDetails?: boolean | undefined;
  showHomeButton?: boolean | undefined;
  showRefreshButton?: boolean | undefined;
}

export function GenericErrorFallback({ 
  error, 
  resetErrorBoundary,
  errorId,
  retryCount = 0,
  title = "Đã xảy ra lỗi",
  description = "Chúng tôi đang khắc phục sự cố này. Vui lòng thử lại.",
  showErrorDetails = false,
  showHomeButton = true,
  showRefreshButton = true
}: GenericErrorFallbackProps) {
  const handleRefresh = () => {
    window.location.reload();
  };

  const handleGoHome = () => {
    window.location.href = '/';
  };

  return (
    <Card className="w-full max-w-md mx-auto mt-8">
      <CardHeader className="text-center">
        <div className="mx-auto mb-4 p-3 bg-red-100 rounded-full w-fit">
          <AlertTriangle className="h-6 w-6 text-red-600" />
        </div>
        <CardTitle className="text-lg font-semibold text-gray-900">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-gray-600 text-center">
          {description}
        </p>

        {showErrorDetails && (
          <details className="text-xs">
            <summary className="cursor-pointer text-gray-500 hover:text-gray-700">
              Chi tiết lỗi
            </summary>
            <div className="mt-2 p-2 bg-gray-50 rounded text-gray-700 font-mono whitespace-pre-wrap">
              {error.message}
              {errorId && (
                <div className="mt-2 text-gray-500">
                  ID: {errorId}
                </div>
              )}
              {retryCount > 0 && (
                <div className="mt-1 text-gray-500">
                  Đã thử lại: {retryCount} lần
                </div>
              )}
            </div>
          </details>
        )}

        <div className="flex flex-col gap-2">
          <Button 
            onClick={resetErrorBoundary}
            className="w-full"
            variant="default"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Thử lại
          </Button>

          {showRefreshButton && (
            <Button 
              onClick={handleRefresh}
              variant="outline"
              className="w-full"
            >
              Tải lại trang
            </Button>
          )}

          {showHomeButton && (
            <Button 
              onClick={handleGoHome}
              variant="ghost"
              className="w-full"
            >
              <Home className="h-4 w-4 mr-2" />
              Về trang chủ
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Audio Error Fallback - Specialized for microphone and audio processing errors
 * Provides audio-specific troubleshooting and permissions guidance
 */
export function AudioErrorFallback({ 
  error, 
  resetErrorBoundary,
  errorId,
  retryCount = 0
}: ErrorFallbackProps) {
  const handleCheckPermissions = async () => {
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
      resetErrorBoundary();
    } catch (permissionError) {
      alert('Vui lòng cấp quyền truy cập microphone trong cài đặt trình duyệt.');
    }
  };

  const isPermissionError = error.message.includes('Permission') || 
                           error.message.includes('NotAllowedError') ||
                           error.message.includes('permission');

  return (
    <Card className="w-full max-w-md mx-auto mt-8">
      <CardHeader className="text-center">
        <div className="mx-auto mb-4 p-3 bg-red-100 rounded-full w-fit">
          <Mic className="h-6 w-6 text-red-600" />
        </div>
        <CardTitle className="text-lg font-semibold text-gray-900">
          Lỗi âm thanh
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {isPermissionError ? (
          <div>
            <p className="text-sm text-gray-600 text-center mb-4">
              Không thể truy cập microphone. Vui lòng:
            </p>
            <ul className="text-sm text-gray-600 space-y-2 mb-4">
              <li>• Cấp quyền truy cập microphone</li>
              <li>• Kiểm tra microphone đã kết nối</li>
              <li>• Tắt các ứng dụng khác đang dùng microphone</li>
            </ul>
          </div>
        ) : (
          <p className="text-sm text-gray-600 text-center">
            Xảy ra lỗi trong quá trình xử lý âm thanh. Vui lòng kiểm tra kết nối microphone.
          </p>
        )}

        <div className="flex flex-col gap-2">
          {isPermissionError ? (
            <Button 
              onClick={handleCheckPermissions}
              className="w-full"
            >
              <Mic className="h-4 w-4 mr-2" />
              Kiểm tra quyền microphone
            </Button>
          ) : (
            <Button 
              onClick={resetErrorBoundary}
              className="w-full"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Thử lại
            </Button>
          )}

          <Button 
            onClick={() => window.location.href = '/'}
            variant="outline"
            className="w-full"
          >
            <Home className="h-4 w-4 mr-2" />
            Về trang chủ
          </Button>
        </div>

        {retryCount > 2 && (
          <div className="mt-4 p-3 bg-yellow-50 rounded-lg">
            <p className="text-xs text-yellow-700">
              Đã thử lại {retryCount} lần. Vui lòng liên hệ hỗ trợ nếu vấn đề vẫn tiếp tục.
            </p>
          </div>
        )}

        {errorId && (
          <div className="text-xs text-gray-400 text-center">
            ID lỗi: {errorId}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * Network Error Fallback - For API and connectivity errors
 * Provides network troubleshooting and retry mechanisms
 */
export function NetworkErrorFallback({ 
  error, 
  resetErrorBoundary,
  errorId,
  retryCount = 0
}: ErrorFallbackProps) {
  const isOffline = !navigator.onLine;
  const isTimeoutError = error.message.includes('timeout') || 
                        error.message.includes('TIMEOUT');
  const is5xxError = error.message.includes('5') && error.message.includes('Error');

  const handleRetry = () => {
    if (isOffline) {
      alert('Vui lòng kiểm tra kết nối internet.');
      return;
    }
    resetErrorBoundary();
  };

  return (
    <Card className="w-full max-w-md mx-auto mt-8">
      <CardHeader className="text-center">
        <div className="mx-auto mb-4 p-3 bg-red-100 rounded-full w-fit">
          <Wifi className="h-6 w-6 text-red-600" />
        </div>
        <CardTitle className="text-lg font-semibold text-gray-900">
          Lỗi kết nối
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {isOffline ? (
          <p className="text-sm text-gray-600 text-center">
            Không có kết nối internet. Vui lòng kiểm tra mạng và thử lại.
          </p>
        ) : isTimeoutError ? (
          <p className="text-sm text-gray-600 text-center">
            Kết nối bị timeout. Máy chủ có thể đang quá tải.
          </p>
        ) : is5xxError ? (
          <p className="text-sm text-gray-600 text-center">
            Máy chủ đang gặp sự cố. Chúng tôi đang khắc phục.
          </p>
        ) : (
          <p className="text-sm text-gray-600 text-center">
            Không thể kết nối đến máy chủ. Vui lòng thử lại sau.
          </p>
        )}

        <div className="flex flex-col gap-2">
          <Button 
            onClick={handleRetry}
            className="w-full"
            disabled={isOffline}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            {isOffline ? 'Không có mạng' : 'Thử lại'}
          </Button>

          <Button 
            onClick={() => window.location.reload()}
            variant="outline"
            className="w-full"
          >
            Tải lại trang
          </Button>
        </div>

        {retryCount > 0 && (
          <div className="text-xs text-gray-500 text-center">
            Đã thử lại: {retryCount} lần
          </div>
        )}

        {errorId && (
          <div className="text-xs text-gray-400 text-center">
            ID lỗi: {errorId}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * Authentication Error Fallback - For auth and permission errors
 * Provides login redirect and permission management
 */
export function AuthErrorFallback({ 
  error, 
  resetErrorBoundary,
  errorId
}: ErrorFallbackProps) {
  const isUnauthorized = error.message.includes('401') || 
                        error.message.includes('Unauthorized');
  const isForbidden = error.message.includes('403') || 
                     error.message.includes('Forbidden');

  const handleLogin = () => {
    window.location.href = '/login';
  };

  const handleRefresh = () => {
    window.location.reload();
  };

  return (
    <Card className="w-full max-w-md mx-auto mt-8">
      <CardHeader className="text-center">
        <div className="mx-auto mb-4 p-3 bg-yellow-100 rounded-full w-fit">
          <AlertTriangle className="h-6 w-6 text-yellow-600" />
        </div>
        <CardTitle className="text-lg font-semibold text-gray-900">
          {isUnauthorized ? 'Cần đăng nhập' : isForbidden ? 'Không có quyền' : 'Lỗi xác thực'}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {isUnauthorized ? (
          <p className="text-sm text-gray-600 text-center">
            Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.
          </p>
        ) : isForbidden ? (
          <p className="text-sm text-gray-600 text-center">
            Bạn không có quyền truy cập tính năng này. Liên hệ quản trị viên.
          </p>
        ) : (
          <p className="text-sm text-gray-600 text-center">
            Xảy ra lỗi xác thực. Vui lòng thử lại.
          </p>
        )}

        <div className="flex flex-col gap-2">
          {isUnauthorized ? (
            <Button 
              onClick={handleLogin}
              className="w-full"
            >
              Đăng nhập
            </Button>
          ) : (
            <Button 
              onClick={resetErrorBoundary}
              className="w-full"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Thử lại
            </Button>
          )}

          <Button 
            onClick={handleRefresh}
            variant="outline"
            className="w-full"
          >
            Tải lại trang
          </Button>

          <Button 
            onClick={() => window.location.href = '/'}
            variant="ghost"
            className="w-full"
          >
            <Home className="h-4 w-4 mr-2" />
            Về trang chủ
          </Button>
        </div>

        {errorId && (
          <div className="text-xs text-gray-400 text-center">
            ID lỗi: {errorId}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * Development Error Fallback - Enhanced error display for development
 * Shows full stack trace and debugging information
 */
export function DevelopmentErrorFallback({ 
  error, 
  resetErrorBoundary,
  errorId,
  retryCount = 0
}: ErrorFallbackProps) {
  const isDevelopment = import.meta.env.DEV;

  if (!isDevelopment) {
    return <GenericErrorFallback 
      error={error} 
      resetErrorBoundary={resetErrorBoundary}
      errorId={errorId}
      retryCount={retryCount}
    />;
  }

  return (
    <Card className="w-full max-w-2xl mx-auto mt-8 border-red-300">
      <CardHeader className="bg-red-50">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-red-100 rounded-full">
            <Bug className="h-5 w-5 text-red-600" />
          </div>
          <div>
            <CardTitle className="text-lg font-semibold text-red-800">
              Development Error
            </CardTitle>
            <p className="text-sm text-red-600">
              {error.name}: {error.message}
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 pt-6">
        {/* Error Stack */}
        <div>
          <h4 className="font-semibold text-gray-900 mb-2">Stack Trace:</h4>
          <pre className="text-xs bg-gray-100 p-3 rounded overflow-auto max-h-64 text-gray-800">
            {error.stack}
          </pre>
        </div>

        {/* Error Details */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <strong>Error ID:</strong> {errorId || 'N/A'}
          </div>
          <div>
            <strong>Retry Count:</strong> {retryCount}
          </div>
          <div>
            <strong>User Agent:</strong> {navigator.userAgent.substring(0, 50)}...
          </div>
          <div>
            <strong>URL:</strong> {window.location.href}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-4">
          <Button 
            onClick={resetErrorBoundary}
            variant="default"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Reset Error Boundary
          </Button>
          <Button 
            onClick={() => window.location.reload()}
            variant="outline"
          >
            Reload Page
          </Button>
          <Button 
            onClick={() => console.clear()}
            variant="ghost"
          >
            Clear Console
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}