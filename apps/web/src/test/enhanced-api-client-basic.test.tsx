/**
 * Basic Enhanced API Client Test
 * Testing minimal functionality to identify issues
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { toast } from 'sonner';

// Mock Sonner toast
vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
    loading: vi.fn(),
    dismiss: vi.fn(),
    warning: vi.fn(),
  }
}));

// Simple test to verify our client can be created
describe('Enhanced API Client - Basic', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should be able to import and create client', async () => {
    const { EnhancedApiClient } = await import('../services/enhanced-api-client');
    const client = new EnhancedApiClient('http://localhost:3001');
    
    expect(client).toBeDefined();
    expect(typeof client.get).toBe('function');
    expect(typeof client.post).toBe('function');
    expect(typeof client.put).toBe('function');
    expect(typeof client.delete).toBe('function');
  });

  it('should have performance monitoring methods', async () => {
    const { EnhancedApiClient } = await import('../services/enhanced-api-client');
    const client = new EnhancedApiClient('http://localhost:3001');
    
    expect(typeof client.getPerformanceMetrics).toBe('function');
    expect(typeof client.getAverageRequestDuration).toBe('function');
    expect(typeof client.getTotalRetryCount).toBe('function');
  });

  it('should support health check', async () => {
    const { EnhancedApiClient } = await import('../services/enhanced-api-client');
    const client = new EnhancedApiClient('http://localhost:3001');
    
    expect(typeof client.healthCheck).toBe('function');
  });
});