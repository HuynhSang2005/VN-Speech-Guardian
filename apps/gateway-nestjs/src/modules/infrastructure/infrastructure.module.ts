import { Module } from '@nestjs/common';
import { CircuitBreakerService } from './circuit-breaker/circuit-breaker.service';

/**
 * Infrastructure Module
 * 
 * Mục đích: Shared infrastructure services và utilities  
 * Scope: Cross-cutting concerns không specific cho business domain
 * 
 * Services:
 * - CircuitBreakerService: Resilience pattern cho external calls
 * 
 * Future additions:
 * - Caching services
 * - Monitoring/metrics
 * - Rate limiting utilities
 */
@Module({
  providers: [CircuitBreakerService],
  exports: [CircuitBreakerService],
})
export class InfrastructureModule {}