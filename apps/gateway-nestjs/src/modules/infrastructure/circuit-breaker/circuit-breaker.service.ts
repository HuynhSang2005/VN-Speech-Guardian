/**
 * Mục đích: Circuit Breaker Service implementation theo Martin Fowler pattern
 * Pattern: State machine (closed/open/half-open) với exponential backoff
 * Research: https://martinfowler.com/bliki/CircuitBreaker.html
 */

import { Injectable, Logger, Inject } from '@nestjs/common';
import { EventEmitter } from 'events';
import {
  CircuitBreakerState,
  CircuitBreakerConfig,
  CircuitBreakerMetrics,
  CircuitBreakerCallResult,
  CircuitBreakerEvent,
  HealthCheckResult,
  ExponentialBackoffConfig,
  AIWorkerCircuitBreakerContext,
} from './circuit-breaker.types';
import { CIRCUIT_BREAKER_CONFIG } from '../../../config';

@Injectable()
export class CircuitBreakerService extends EventEmitter {
  private readonly logger = new Logger(CircuitBreakerService.name);

  // State machine
  private state: CircuitBreakerState = 'closed';
  private healthCheckState: CircuitBreakerState = 'closed';
  
  // Metrics tracking
  private failureCount = 0;
  private successCount = 0;
  private totalRequests = 0;
  private slowCallCount = 0;
  private stateTransitionCount = 0;
  private lastFailureTime?: number;
  private lastSuccessTime?: number;
  private createdAt = Date.now();
  
  // Health check metrics (separate from main metrics)
  private healthFailureCount = 0;
  private healthSuccessCount = 0;
  private healthTotalRequests = 0;
  
  // Event history
  private eventHistory: CircuitBreakerEvent[] = [];
  
  // Circuit breaker configuration
  private readonly config: typeof CIRCUIT_BREAKER_CONFIG;
  private enabled = true;
  
  // Timers for state transitions
  private resetTimer?: NodeJS.Timeout;
  private healthResetTimer?: NodeJS.Timeout;

  constructor(
    @Inject('AI_WORKER_SERVICE') private readonly aiWorkerService?: any,
  ) {
    super();
    this.config = CIRCUIT_BREAKER_CONFIG;
    this.enabled = this.config.enableCircuitBreaker;
    
    this.logger.log('Circuit Breaker initialized', {
      enabled: this.enabled,
      config: {
        aiWorker: this.config.aiWorker,
        healthCheck: this.config.healthCheck,
      },
    });
  }

  /**
   * Thực hiện call với circuit breaker protection
   * @param method Tên method của AI Worker service
   * @param args Arguments cho method
   * @param context Context thêm (sessionId, requestType, v.v.)
   */
  async executeCall(
    method: string,
    args: any[],
    context?: AIWorkerCircuitBreakerContext
  ): Promise<any> {
    const startTime = Date.now();
    this.totalRequests++;
    
    // Check if circuit breaker is disabled
    if (!this.enabled) {
      return this.callAIWorkerMethod(method, args);
    }
    
    // Check circuit state
    if (this.state === 'open') {
      await this.checkForReset();
      
      if (this.state === 'open') {
        const error = new Error('Circuit breaker is OPEN - service temporarily unavailable');
        (error as any).code = 'CIRCUIT_BREAKER_OPEN';
        
        this.emitEvent({
          type: 'call_rejected',
          timestamp: Date.now(),
          reason: 'Circuit breaker open',
          metadata: { method, context },
        });
        
        throw error;
      }
    }
    
    try {
      const result = await this.callWithTimeout(method, args);
      const duration = Date.now() - startTime;
      
      await this.recordSuccess(duration);
      
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      
      await this.recordFailure(error as Error, duration);
      throw error;
    }
  }

  /**
   * Execute call với retry logic và exponential backoff
   */
  async executeCallWithRetry(
    method: string,
    args: any[],
    maxRetries = 3,
    context?: AIWorkerCircuitBreakerContext
  ): Promise<any> {
    let lastError: Error;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await this.executeCall(method, args, { 
          requestType: 'asr', 
          originalRequestTime: Date.now(),
          retryAttempt: attempt,
          ...context
        });
      } catch (error) {
        lastError = error as Error;
        
        // Don't retry if circuit is open
        if ((error as any).code === 'CIRCUIT_BREAKER_OPEN') {
          throw error;
        }
        
        // Apply exponential backoff if not last attempt
        if (attempt < maxRetries) {
          const delay = this.calculateBackoffDelay(attempt);
          await this.sleep(delay);
        }
      }
    }
    
    throw lastError!;
  }

  /**
   * Check health của AI Worker với separate circuit breaker
   */
  async checkAIWorkerHealth(): Promise<HealthCheckResult> {
    const startTime = Date.now();
    this.healthTotalRequests++;
    
    // Check health circuit state
    if (this.healthCheckState === 'open') {
      await this.checkForHealthReset();
      
      if (this.healthCheckState === 'open') {
        throw new Error('Health check circuit breaker is OPEN');
      }
    }
    
    try {
      // Call actual AI Worker health endpoint
      const result = await this.callAIWorkerHealth();
      const responseTime = Date.now() - startTime;
      
      this.recordHealthSuccess();
      
      return {
        healthy: true,
        responseTime,
        timestamp: Date.now(),
        ...result,
      };
    } catch (error) {
      this.recordHealthFailure(error as Error);
      
      return {
        healthy: false,
        responseTime: Date.now() - startTime,
        error: (error as Error).message,
        timestamp: Date.now(),
      };
    }
  }

  /**
   * Manual trip circuit breaker
   */
  async tripCircuitBreaker(reason: string): Promise<void> {
    const previousState = this.state;
    this.state = 'open';
    this.lastFailureTime = Date.now();
    this.stateTransitionCount++;
    
    this.scheduleReset();
    
    this.emitEvent({
      type: 'state_change',
      timestamp: Date.now(),
      previousState,
      newState: this.state,
      reason,
    });
    
    this.logger.warn('Circuit breaker manually tripped', {
      previousState,
      newState: this.state,
      reason,
    });
  }

  /**
   * Manual reset circuit breaker
   */
  async resetCircuitBreaker(reason: string): Promise<void> {
    const previousState = this.state;
    this.state = 'closed';
    this.resetMetrics();
    this.stateTransitionCount++;
    
    if (this.resetTimer) {
      clearTimeout(this.resetTimer);
      this.resetTimer = undefined;
    }
    
    this.emitEvent({
      type: 'manual_reset',
      timestamp: Date.now(),
      previousState,
      newState: this.state,
      reason,
    });
    
    this.logger.log('Circuit breaker manually reset', {
      previousState,
      newState: this.state,
      reason,
    });
  }

  /**
   * Set state to half-open (for testing)
   */
  async setStateToHalfOpen(): Promise<void> {
    const previousState = this.state;
    this.state = 'half-open';
    this.stateTransitionCount++;
    
    this.emitEvent({
      type: 'state_change',
      timestamp: Date.now(),
      previousState,
      newState: this.state,
      reason: 'half-open transition',
    });
  }

  /**
   * Get current circuit breaker state
   */
  getCurrentState(): CircuitBreakerState {
    return this.state;
  }

  /**
   * Get health check circuit breaker state
   */
  getHealthCheckState(): CircuitBreakerState {
    return this.healthCheckState;
  }

  /**
   * Get comprehensive metrics
   */
  getMetrics(): CircuitBreakerMetrics {
    const now = Date.now();
    const failureRate = this.totalRequests > 0 ? this.failureCount / this.totalRequests : 0;
    const slowCallRate = this.totalRequests > 0 ? this.slowCallCount / this.totalRequests : 0;
    
    return {
      state: this.state,
      failureCount: this.failureCount,
      successCount: this.successCount,
      totalRequests: this.totalRequests,
      failureRate,
      slowCallCount: this.slowCallCount,
      slowCallRate,
      lastFailureTime: this.lastFailureTime,
      lastSuccessTime: this.lastSuccessTime,
      stateTransitionCount: this.stateTransitionCount,
      uptime: now - this.createdAt,
    };
  }

  /**
   * Get event history
   */
  getEventHistory(): CircuitBreakerEvent[] {
    return [...this.eventHistory];
  }

  /**
   * Enable/disable circuit breaker
   */
  enableCircuitBreaker(): void {
    this.enabled = true;
    this.logger.log('Circuit breaker enabled');
  }

  disableCircuitBreaker(): void {
    this.enabled = false;
    this.logger.log('Circuit breaker disabled');
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Trip health check breaker (for testing)
   */
  async tripHealthCheckBreaker(reason: string): Promise<void> {
    const previousState = this.healthCheckState;
    this.healthCheckState = 'open';
    this.scheduleHealthReset();
    
    this.logger.warn('Health check circuit breaker tripped', {
      previousState,
      newState: this.healthCheckState,
      reason,
    });
  }

  /**
   * Get Prometheus metrics (for monitoring)
   */
  getPrometheusMetrics(): string {
    const metrics = this.getMetrics();
    const stateValue = this.state === 'closed' ? 0 : this.state === 'half-open' ? 1 : 2;
    
    return `
# HELP circuit_breaker_state Circuit breaker state (0=closed, 1=half-open, 2=open)
# TYPE circuit_breaker_state gauge
circuit_breaker_state{service="ai-worker"} ${stateValue}

# HELP circuit_breaker_requests_total Total number of requests
# TYPE circuit_breaker_requests_total counter
circuit_breaker_requests_total{service="ai-worker"} ${metrics.totalRequests}

# HELP circuit_breaker_failures_total Total number of failures
# TYPE circuit_breaker_failures_total counter
circuit_breaker_failures_total{service="ai-worker"} ${metrics.failureCount}

# HELP circuit_breaker_request_duration_seconds Request duration in seconds
# TYPE circuit_breaker_request_duration_seconds histogram
circuit_breaker_slow_calls_total{service="ai-worker"} ${metrics.slowCallCount}

# HELP circuit_breaker_state_transitions_total Number of state transitions
# TYPE circuit_breaker_state_transitions_total counter
circuit_breaker_state_transitions_total{service="ai-worker"} ${metrics.stateTransitionCount}
`.trim();
  }

  /**
   * Set custom logger (for testing)
   */
  setLogger(logger: any): void {
    (this as any).logger = logger;
  }

  // Private methods

  private async callAIWorkerMethod(method: string, args: any[]): Promise<any> {
    if (!this.aiWorkerService) {
      throw new Error('AI Worker service not injected');
    }
    
    // Call the actual AI Worker service method
    if (typeof this.aiWorkerService[method] !== 'function') {
      throw new Error(`AI Worker service does not have method: ${method}`);
    }
    
    return this.aiWorkerService[method](...args);
  }

  private async callAIWorkerHealth(): Promise<any> {
    if (!this.aiWorkerService || typeof this.aiWorkerService.checkHealth !== 'function') {
      throw new Error('AI Worker service health check not available');
    }
    
    return this.aiWorkerService.checkHealth();
  }

  private async callWithTimeout(method: string, args: any[], timeout = 5000): Promise<any> {
    return new Promise(async (resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Call to ${method} timed out after ${timeout}ms`));
      }, timeout);
      
      try {
        const result = await this.callAIWorkerMethod(method, args);
        clearTimeout(timer);
        resolve(result);
      } catch (error) {
        clearTimeout(timer);
        reject(error);
      }
    });
  }

  private async recordSuccess(duration: number): Promise<void> {
    this.successCount++;
    this.lastSuccessTime = Date.now();
    
    // Check if slow call
    if (duration > this.config.aiWorker.slowCallDurationThresholdMs) {
      this.slowCallCount++;
    }
    
    // Handle state transitions
    if (this.state === 'half-open') {
      await this.transitionToClosed('successful call in half-open');
    } else if (this.state === 'closed' && this.shouldTripCircuit()) {
      // VI: Slow calls có thể trip circuit từ closed → open
      await this.transitionToOpen('slow call threshold exceeded');
    }
    
    this.emitEvent({
      type: 'call_success',
      timestamp: Date.now(),
      metadata: { duration, slowCall: duration > this.config.aiWorker.slowCallDurationThresholdMs },
    });
  }

  private async recordFailure(error: Error, duration: number): Promise<void> {
    this.failureCount++;
    this.lastFailureTime = Date.now();
    
    // Handle state transitions
    if (this.state === 'half-open') {
      await this.transitionToOpen('failure in half-open state');
    } else if (this.shouldTripCircuit()) {
      await this.transitionToOpen('failure threshold exceeded');
    }
    
    this.emitEvent({
      type: 'call_failure',
      timestamp: Date.now(),
      reason: error.message,
      metadata: { duration, error: error.stack },
    });
  }

  private recordHealthSuccess(): void {
    this.healthSuccessCount++;
    
    if (this.healthCheckState === 'half-open') {
      this.healthCheckState = 'closed';
    }
  }

  private recordHealthFailure(error: Error): void {
    this.healthFailureCount++;
    
    if (this.healthCheckState === 'half-open') {
      this.healthCheckState = 'open';
      this.scheduleHealthReset();
    } else if (this.shouldTripHealthCircuit()) {
      this.healthCheckState = 'open';
      this.scheduleHealthReset();
    }
  }

  private shouldTripCircuit(): boolean {
    const config = this.config.aiWorker;
    
    // Check failure threshold
    if (this.failureCount >= config.failureThreshold) {
      return true;
    }
    
    // Check volume threshold before percentage calculation
    if (this.totalRequests < config.requestVolumeThreshold) {
      return false;
    }
    
    // Check error percentage
    const errorRate = this.failureCount / this.totalRequests;
    if (errorRate >= config.errorPercentageThreshold / 100) {
      return true;
    }
    
    // Check slow call percentage
    const slowCallRate = this.slowCallCount / this.totalRequests;
    if (slowCallRate >= config.slowCallPercentageThreshold / 100) {
      return true;
    }
    
    return false;
  }

  private shouldTripHealthCircuit(): boolean {
    const config = this.config.healthCheck;
    
    if (this.healthFailureCount >= config.failureThreshold) {
      return true;
    }
    
    if (this.healthTotalRequests < config.requestVolumeThreshold) {
      return false;
    }
    
    const errorRate = this.healthFailureCount / this.healthTotalRequests;
    return errorRate >= config.errorPercentageThreshold / 100;
  }

  private async transitionToOpen(reason: string): Promise<void> {
    const previousState = this.state;
    this.state = 'open';
    this.stateTransitionCount++;
    this.scheduleReset();
    
    this.emitEvent({
      type: 'state_change',
      timestamp: Date.now(),
      previousState,
      newState: this.state,
      reason,
    });
    
    this.logger.warn('Circuit breaker opened', {
      previousState,
      reason,
      metrics: this.getMetrics(),
    });
  }

  private async transitionToClosed(reason: string): Promise<void> {
    const previousState = this.state;
    this.state = 'closed';
    // VI: Theo Martin Fowler, không reset metrics khi half-open → closed
    // Metrics chỉ reset khi bắt đầu chu kỳ mới (closed/open → half-open)
    this.stateTransitionCount++;
    
    if (this.resetTimer) {
      clearTimeout(this.resetTimer);
      this.resetTimer = undefined;
    }
    
    this.emitEvent({
      type: 'state_change',
      timestamp: Date.now(),
      previousState,
      newState: this.state,
      reason,
    });
    
    this.logger.log('Circuit breaker closed', {
      previousState,
      reason,
    });
  }

  private async transitionToHalfOpen(reason: string): Promise<void> {
    const previousState = this.state;
    this.state = 'half-open';
    // VI: Reset metrics khi bắt đầu test phase (open → half-open)
    this.resetMetrics();
    this.stateTransitionCount++;
    
    this.emitEvent({
      type: 'state_change',
      timestamp: Date.now(),
      previousState,
      newState: this.state,
      reason,
    });
    
    this.logger.log('Circuit breaker half-open', {
      previousState,
      reason,
    });
  }

  private scheduleReset(): void {
    if (this.resetTimer) {
      clearTimeout(this.resetTimer);
    }
    
    this.resetTimer = setTimeout(() => {
      if (this.state === 'open') {
        this.transitionToHalfOpen('reset timeout expired');
      }
    }, this.config.aiWorker.resetTimeoutMs);
  }

  private scheduleHealthReset(): void {
    if (this.healthResetTimer) {
      clearTimeout(this.healthResetTimer);
    }
    
    this.healthResetTimer = setTimeout(() => {
      if (this.healthCheckState === 'open') {
        this.healthCheckState = 'half-open';
      }
    }, this.config.healthCheck.resetTimeoutMs);
  }

  private async checkForReset(): Promise<void> {
    if (this.state === 'open' && this.lastFailureTime) {
      const timeSinceFailure = Date.now() - this.lastFailureTime;
      if (timeSinceFailure >= this.config.aiWorker.resetTimeoutMs) {
        await this.transitionToHalfOpen('reset timeout check');
      }
    }
  }

  private async checkForHealthReset(): Promise<void> {
    if (this.healthCheckState === 'open') {
      // Health check reset logic would go here
      const now = Date.now();
      // Simplified for now
      if (now - this.createdAt > this.config.healthCheck.resetTimeoutMs) {
        this.healthCheckState = 'half-open';
      }
    }
  }

  private resetMetrics(): void {
    this.failureCount = 0;
    this.successCount = 0;
    // Keep total requests for historical tracking
    this.slowCallCount = 0;
  }

  private calculateBackoffDelay(attempt: number): number {
    const config = this.config.backoff;
    let delay = config.initialDelayMs * Math.pow(config.multiplier, attempt);
    delay = Math.min(delay, config.maxDelayMs);
    
    // Add jitter if enabled
    if (config.jitter) {
      const jitterRange = delay * 0.1; // 10% jitter
      const jitter = (Math.random() - 0.5) * 2 * jitterRange;
      delay += jitter;
    }
    
    return Math.max(0, delay);
  }

  private async sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private emitEvent(event: Omit<CircuitBreakerEvent, 'type'> & { type: CircuitBreakerEvent['type'] }): void {
    // Add to history
    this.eventHistory.push(event as CircuitBreakerEvent);
    
    // Limit history size
    if (this.eventHistory.length > this.config.maxEventsInHistory) {
      this.eventHistory.shift();
    }
    
    // Emit event for listeners
    this.emit(event.type, event);
    
    // Log structured event if enabled
    if (this.config.enableMetricsLogging) {
      this.logger.debug('Circuit breaker event', event);
    }
  }
}