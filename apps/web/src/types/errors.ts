/**
 * Enhanced Error Types for VN Speech Guardian API Client
 * Provides structured error handling with Vietnamese messages
 */

export interface ApiErrorDetails {
  code: string;
  message: string;
  details?: Record<string, unknown> | undefined;
  timestamp: string;
  path: string;
  statusCode: number;
  requestId?: string | undefined;
}

/**
 * Base API Error class với Vietnamese error messages
 */
export abstract class BaseApiError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly timestamp: string;
  public readonly path: string;
  public readonly requestId?: string | undefined;
  public readonly details?: Record<string, unknown> | undefined;

  constructor(
    message: string,
    statusCode: number,
    code: string,
    path: string,
    requestId?: string | undefined,
    details?: Record<string, unknown> | undefined
  ) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.code = code;
    this.path = path;
    this.timestamp = new Date().toISOString();
    this.requestId = requestId;
    this.details = details;

    // Ensure proper prototype chain for instanceof checks
    Object.setPrototypeOf(this, new.target.prototype);
  }

  /**
   * Get Vietnamese error message cho user display
   */
  abstract getVietnameseMessage(): string;

  /**
   * Convert to JSON for logging/monitoring
   */
  toJSON(): ApiErrorDetails {
    return {
      code: this.code,
      message: this.message,
      details: this.details,
      timestamp: this.timestamp,
      path: this.path,
      statusCode: this.statusCode,
      requestId: this.requestId,
    };
  }
}

/**
 * Network connectivity errors (offline, DNS, etc.)
 */
export class NetworkError extends BaseApiError {
  constructor(path: string, requestId?: string, originalError?: Error) {
    super(
      originalError?.message || 'Network request failed',
      0,
      'NETWORK_ERROR',
      path,
      requestId,
      { originalError: originalError?.message }
    );
  }

  getVietnameseMessage(): string {
    return 'Lỗi kết nối mạng. Vui lòng kiểm tra kết nối internet và thử lại.';
  }
}

/**
 * Authentication/Authorization errors (401, 403)
 */
export class AuthenticationError extends BaseApiError {
  constructor(
    message: string,
    statusCode: number,
    path: string,
    requestId?: string,
    code: string = 'AUTH_ERROR'
  ) {
    super(message, statusCode, code, path, requestId);
  }

  getVietnameseMessage(): string {
    if (this.statusCode === 401) {
      return 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.';
    }
    if (this.statusCode === 403) {
      return 'Bạn không có quyền truy cập tính năng này.';
    }
    return 'Lỗi xác thực. Vui lòng đăng nhập lại.';
  }
}

/**
 * Rate limiting errors (429)
 */
export class RateLimitError extends BaseApiError {
  public readonly retryAfter?: number | undefined;

  constructor(
    message: string,
    path: string,
    requestId?: string,
    retryAfter?: number | undefined
  ) {
    super(message, 429, 'RATE_LIMIT_ERROR', path, requestId, { retryAfter });
    this.retryAfter = retryAfter;
  }

  getVietnameseMessage(): string {
    const retryText = this.retryAfter 
      ? ` Vui lòng thử lại sau ${this.retryAfter} giây.`
      : ' Vui lòng thử lại sau.';
    return `Quá nhiều yêu cầu.${retryText}`;
  }
}

/**
 * Client errors (400-499, excluding auth and rate limit)
 */
export class ClientError extends BaseApiError {
  constructor(
    message: string,
    statusCode: number,
    path: string,
    requestId?: string,
    code: string = 'CLIENT_ERROR',
    details?: Record<string, unknown>
  ) {
    super(message, statusCode, code, path, requestId, details);
  }

  getVietnameseMessage(): string {
    switch (this.statusCode) {
      case 400:
        return 'Dữ liệu không hợp lệ. Vui lòng kiểm tra và thử lại.';
      case 404:
        return 'Không tìm thấy tài nguyên yêu cầu.';
      case 409:
        return 'Dữ liệu bị xung đột. Vui lòng tải lại trang và thử lại.';
      case 422:
        return 'Dữ liệu không đúng định dạng. Vui lòng kiểm tra và thử lại.';
      default:
        return 'Yêu cầu không hợp lệ. Vui lòng thử lại.';
    }
  }
}

/**
 * Server errors (500-599)
 */
export class ServerError extends BaseApiError {
  constructor(
    message: string,
    statusCode: number,
    path: string,
    requestId?: string,
    code: string = 'SERVER_ERROR'
  ) {
    super(message, statusCode, code, path, requestId);
  }

  getVietnameseMessage(): string {
    switch (this.statusCode) {
      case 500:
        return 'Lỗi máy chủ nội bộ. Vui lòng thử lại sau.';
      case 502:
        return 'Lỗi gateway. Vui lòng thử lại sau.';
      case 503:
        return 'Dịch vụ tạm thời không khả dụng. Vui lòng thử lại sau.';
      case 504:
        return 'Máy chủ phản hồi quá chậm. Vui lòng thử lại sau.';
      default:
        return 'Lỗi máy chủ. Vui lòng thử lại sau.';
    }
  }
}

/**
 * Timeout errors
 */
export class TimeoutError extends BaseApiError {
  constructor(path: string, timeout: number, requestId?: string) {
    super(
      `Request timeout after ${timeout}ms`,
      408,
      'TIMEOUT_ERROR',
      path,
      requestId,
      { timeout }
    );
  }

  getVietnameseMessage(): string {
    return 'Yêu cầu bị quá thời gian chờ. Vui lòng thử lại.';
  }
}

/**
 * Request cancellation errors
 */
export class CancelledError extends BaseApiError {
  constructor(path: string, requestId?: string) {
    super('Request was cancelled', 0, 'CANCELLED_ERROR', path, requestId);
  }

  getVietnameseMessage(): string {
    return 'Yêu cầu đã bị hủy.';
  }
}

/**
 * Type guard functions
 */
export const isNetworkError = (error: unknown): error is NetworkError => {
  return error instanceof NetworkError;
};

export const isAuthenticationError = (error: unknown): error is AuthenticationError => {
  return error instanceof AuthenticationError;
};

export const isRateLimitError = (error: unknown): error is RateLimitError => {
  return error instanceof RateLimitError;
};

export const isClientError = (error: unknown): error is ClientError => {
  return error instanceof ClientError;
};

export const isServerError = (error: unknown): error is ServerError => {
  return error instanceof ServerError;
};

export const isTimeoutError = (error: unknown): error is TimeoutError => {
  return error instanceof TimeoutError;
};

export const isCancelledError = (error: unknown): error is CancelledError => {
  return error instanceof CancelledError;
};

export const isApiError = (error: unknown): error is BaseApiError => {
  return error instanceof BaseApiError;
};

/**
 * Error factory function để create appropriate error from Axios error
 */
export const createApiError = (
  axiosError: any,
  path: string,
  requestId?: string
): BaseApiError => {
  // Network errors
  if (!axiosError.response) {
    if (axiosError.code === 'ECONNABORTED' || axiosError.message?.includes('timeout')) {
      return new TimeoutError(path, 30000, requestId);
    }
    if (axiosError.message?.includes('cancel')) {
      return new CancelledError(path, requestId);
    }
    return new NetworkError(path, requestId, axiosError);
  }

  const { status, data } = axiosError.response;
  const message = data?.error?.message || data?.message || axiosError.message;
  const code = data?.error?.code || data?.code;

  // Authentication errors
  if (status === 401 || status === 403) {
    return new AuthenticationError(message, status, path, requestId, code);
  }

  // Rate limiting
  if (status === 429) {
    const retryAfter = axiosError.response.headers['retry-after'];
    return new RateLimitError(message, path, requestId, retryAfter ? parseInt(retryAfter) : undefined);
  }

  // Client errors
  if (status >= 400 && status < 500) {
    return new ClientError(message, status, path, requestId, code, data?.details);
  }

  // Server errors
  if (status >= 500) {
    return new ServerError(message, status, path, requestId, code);
  }

  // Fallback
  return new ClientError(message, status, path, requestId, code);
};