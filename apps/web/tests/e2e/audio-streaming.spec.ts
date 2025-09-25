/**
 * End-to-End Tests for Real-time Audio Streaming
 * 
 * Test Coverage:
 * - Complete audio streaming workflow (microphone → Socket.IO → AI Worker)
 * - Multi-tab/multi-user scenarios
 * - Network interruption handling
 * - Performance and latency requirements
 * - Error recovery and resilience
 * - Cross-browser compatibility
 * 
 * Testing Strategy:
 * - Playwright test automation with real browser instances
 * - Mock microphone input and Socket.IO server
 * - Network condition simulation
 * - Performance metrics validation
 * - Visual regression testing for UI components
 * 
 * @author VN Speech Guardian Team  
 * @version 1.0.0
 * @requires Playwright, Socket.IO server mock
 */

import { test, expect, Page, Browser } from '@playwright/test';
import { WebSocketMockServer } from '../support/websocket-mock-server';

// =============================================================================
// Test Configuration & Constants
// =============================================================================

const TEST_CONFIG = {
  // Audio streaming parameters
  SAMPLE_RATE: 16000,
  CHUNK_SIZE_MS: 250,
  MAX_LATENCY_MS: 500,
  TEST_DURATION_MS: 5000,
  
  // Network simulation
  SLOW_NETWORK_LATENCY: 1000,  // 1s latency
  FAST_NETWORK_LATENCY: 50,    // 50ms latency
  PACKET_LOSS_RATE: 0.1,       // 10% packet loss
  
  // Performance thresholds
  MAX_MEMORY_USAGE_MB: 100,
  MAX_CPU_USAGE_PERCENT: 50,
  MIN_FRAME_RATE: 30,
  
  // UI interaction timeouts
  CONNECT_TIMEOUT: 5000,
  STREAM_START_TIMEOUT: 3000,
  RESPONSE_TIMEOUT: 2000,
} as const;

// Mock audio data for testing
const MOCK_AUDIO_CHUNK = new Float32Array(1024).fill(0.5);
const MOCK_TRANSCRIPT_RESPONSE = {
  sessionId: 'test-session-123',
  text: 'Hello, this is a test transcript',
  confidence: 0.95,
  timestamp: Date.now(),
};

// =============================================================================
// Test Utilities & Helpers
// =============================================================================

class AudioStreamingTestHelper {
  public page: Page; // Make page public for test access

  constructor(page: Page) {
    this.page = page;
  }

  /**
   * Grant microphone permissions cho browser
   */
  async grantMicrophonePermissions(): Promise<void> {
    await this.page.context().grantPermissions(['microphone']);
  }

  /**
   * Mock getUserMedia với fake audio stream
   */
  async mockAudioInput(): Promise<void> {
    await this.page.addInitScript(() => {
      // Mock MediaDevices.getUserMedia
      Object.defineProperty(navigator, 'mediaDevices', {
        writable: true,
        value: {
          getUserMedia: async () => {
            // Create mock MediaStream using unknown cast
            const mockStream = {
              id: 'mock-stream-id',
              active: true,
              getTracks: () => [mockAudioTrack],
              getAudioTracks: () => [mockAudioTrack],
              getVideoTracks: () => [],
              addTrack: () => {},
              removeTrack: () => {},
              addEventListener: () => {},
              removeEventListener: () => {},
              dispatchEvent: () => true,
              onaddtrack: null,
              onremovetrack: null,
              clone: () => mockStream,
              getTrackById: () => null,
            } as unknown as MediaStream;

            const mockAudioTrack = {
              id: 'mock-audio-track',
              kind: 'audio',
              enabled: true,
              muted: false,
              readyState: 'live',
              contentHint: '',
              label: 'Mock Audio Track',
              onended: null,
              onmute: null,
              onunmute: null,
              stop: () => {},
              addEventListener: () => {},
              removeEventListener: () => {},
              dispatchEvent: () => true,
              applyConstraints: async () => {},
              clone: () => mockAudioTrack,
              getCapabilities: () => ({}),
              getConstraints: () => ({}),
              getSettings: () => ({}),
            } as unknown as MediaStreamTrack;

            return mockStream;
          },
          enumerateDevices: async () => [
            {
              deviceId: 'mock-microphone-id',
              kind: 'audioinput' as MediaDeviceKind,
              label: 'Mock Microphone',
              groupId: 'mock-group',
              toJSON: () => ({}),
            }
          ],
        },
      });

      // Mock AudioContext for worklet processing
      (window as any).MockAudioContext = (window as any).AudioContext || (window as any).webkitAudioContext;
      (window as any).AudioContext = class MockAudioContext {
        sampleRate = 48000;
        state = 'running';
        
        createAnalyser() {
          return {
            frequencyBinCount: 1024,
            getFloatFrequencyData: () => {},
            getFloatTimeDomainData: () => {},
          };
        }
        
        createMediaStreamSource() {
          return {
            connect: () => {},
            disconnect: () => {},
          };
        }
        
        createGain() {
          return {
            gain: { value: 1 },
            connect: () => {},
            disconnect: () => {},
          };
        }
        
        get audioWorklet() {
          return {
            addModule: async () => {},
          };
        }
        
        createAudioWorkletNode() {
          return {
            port: {
              postMessage: () => {},
              addEventListener: () => {},
            },
            connect: () => {},
            disconnect: () => {},
          };
        }
        
        async resume() {}
        async suspend() {}
      };
    });
  }

  /**
   * Inject mock Socket.IO client
   */
  async mockSocketIO(): Promise<void> {
    await this.page.addInitScript(() => {
      // Mock Socket.IO client with simplified interface
      (window as any).io = {
        Manager: class MockManager {
          public uri: string;
          public opts: any;
          
          constructor(uri: string, opts?: any) {
            this.uri = uri;
            this.opts = opts || {};
          }
          
          socket() {
            const mockSocket = {
              id: 'mock-socket-id',
              connected: true,
              disconnected: false,
              mockHandlers: {} as Record<string, Function>,
              emit: function(event: string, data?: any) {
                console.log('Mock emit:', event, data);
                // Simulate server responses
                setTimeout(() => {
                  if (event === 'session:start') {
                    this.mockHandlers['session:created']?.(data.sessionId);
                  } else if (event === 'audio:chunk') {
                    this.mockHandlers['transcript:partial']?.({
                      sessionId: 'test-session-123',
                      text: 'Hello, this is a test transcript',
                      confidence: 0.95,
                      timestamp: Date.now(),
                    });
                  }
                }, 100);
              },
              on: function(event: string, handler: Function) {
                this.mockHandlers[event] = handler;
              },
              off: () => {},
              connect: function() {
                setTimeout(() => this.mockHandlers['connect']?.(), 100);
              },
              disconnect: () => {},
            };
            return mockSocket;
          }
        }
      };
    });
  }

  /**
   * Start audio streaming via UI
   */
  async startStreaming(): Promise<void> {
    // Navigate to live page
    await this.page.goto('/live');
    
    // Wait for page to load và components to initialize
    await this.page.waitForSelector('[data-testid="audio-streaming-controls"]', {
      timeout: TEST_CONFIG.CONNECT_TIMEOUT,
    });
    
    // Click start streaming button
    const startButton = this.page.locator('[data-testid="start-streaming-button"]');
    await expect(startButton).toBeVisible();
    await startButton.click();
    
    // Wait for streaming to start
    await this.page.waitForSelector('[data-testid="streaming-active"]', {
      timeout: TEST_CONFIG.STREAM_START_TIMEOUT,
    });
  }

  /**
   * Stop audio streaming
   */
  async stopStreaming(): Promise<void> {
    const stopButton = this.page.locator('[data-testid="stop-streaming-button"]');
    await expect(stopButton).toBeVisible();
    await stopButton.click();
    
    await this.page.waitForSelector('[data-testid="streaming-inactive"]', {
      timeout: TEST_CONFIG.RESPONSE_TIMEOUT,
    });
  }

  /**
   * Get current streaming metrics từ UI
   */
  async getStreamingMetrics(): Promise<{
    latency: number;
    chunksSent: number;
    networkQuality: string;
  }> {
    // Wait for metrics panel to be visible
    await this.page.waitForSelector('[data-testid="streaming-metrics"]');
    
    const metrics = await this.page.evaluate(() => {
      const metricsElement = document.querySelector('[data-testid="streaming-metrics"]');
      return {
        latency: parseInt(metricsElement?.getAttribute('data-latency') || '0'),
        chunksSent: parseInt(metricsElement?.getAttribute('data-chunks-sent') || '0'),
        networkQuality: metricsElement?.getAttribute('data-network-quality') || 'unknown',
      };
    });
    
    return metrics;
  }

  /**
   * Simulate network conditions
   */
  async simulateNetworkCondition(condition: 'fast' | 'slow' | 'offline'): Promise<void> {
    const context = this.page.context();
    
    switch (condition) {
      case 'fast':
        await context.setOffline(false);
        // Simulate fast network (no throttling)
        break;
        
      case 'slow':
        await context.setOffline(false);
        // Simulate slow network với custom throttling
        await context.route('**/*', async (route) => {
          await new Promise(resolve => setTimeout(resolve, TEST_CONFIG.SLOW_NETWORK_LATENCY));
          await route.continue();
        });
        break;
        
      case 'offline':
        await context.setOffline(true);
        break;
    }
  }
}

// =============================================================================
// Main Test Suite
// =============================================================================

test.describe('Real-time Audio Streaming E2E', () => {
  let helper: AudioStreamingTestHelper;
  let mockServer: WebSocketMockServer;

  test.beforeEach(async ({ page }) => {
    helper = new AudioStreamingTestHelper(page);
    
    // Setup browser permissions and mocks
    await helper.grantMicrophonePermissions();
    await helper.mockAudioInput();
    await helper.mockSocketIO();
    
    // Start mock WebSocket server
    mockServer = new WebSocketMockServer();
    await mockServer.start();
  });

  test.afterEach(async () => {
    await mockServer?.stop();
  });

  // =============================================================================
  // Basic Streaming Workflow Tests
  // =============================================================================

  test('should complete basic streaming workflow', async () => {
    // Start streaming
    await helper.startStreaming();
    
    // Verify streaming is active
    const streamingStatus = helper.page.locator('[data-testid="streaming-status"]');
    await expect(streamingStatus).toContainText('Streaming Active');
    
    // Verify Socket.IO connection
    const connectionStatus = helper.page.locator('[data-testid="connection-status"]');
    await expect(connectionStatus).toContainText('Connected');
    
    // Wait for some streaming activity
    await helper.page.waitForTimeout(2000);
    
    // Check that metrics are updating
    const metrics = await helper.getStreamingMetrics();
    expect(metrics.chunksSent).toBeGreaterThan(0);
    expect(metrics.latency).toBeLessThan(TEST_CONFIG.MAX_LATENCY_MS);
    
    // Stop streaming
    await helper.stopStreaming();
    
    // Verify streaming stopped
    await expect(streamingStatus).toContainText('Streaming Inactive');
  });

  test('should handle transcript responses correctly', async () => {
    await helper.startStreaming();
    
    // Wait for transcript to appear
    const transcriptArea = helper.page.locator('[data-testid="transcript-display"]');
    await expect(transcriptArea).toBeVisible();
    
    // Should receive mock transcript responses
    await helper.page.waitForFunction(() => {
      const element = document.querySelector('[data-testid="transcript-display"]');
      return element && element.textContent?.includes('test transcript');
    }, { timeout: 5000 });
    
    await helper.stopStreaming();
  });

  test('should display audio level visualization', async () => {
    await helper.startStreaming();
    
    // Check audio visualizer is active
    const visualizer = helper.page.locator('[data-testid="audio-visualizer"]');
    await expect(visualizer).toBeVisible();
    
    // Verify visualizer shows activity
    const visualizerCanvas = visualizer.locator('canvas');
    await expect(visualizerCanvas).toBeVisible();
    
    // Check that audio level is being updated
    await helper.page.waitForFunction(() => {
      const element = document.querySelector('[data-testid="audio-level"]');
      return element && parseFloat(element.getAttribute('data-level') || '0') > 0;
    }, { timeout: 3000 });
    
    await helper.stopStreaming();
  });

  // =============================================================================
  // Error Handling Tests
  // =============================================================================

  test('should handle microphone permission denial', async ({ page }) => {
    // Deny microphone permission
    await page.context().grantPermissions([]);
    
    // Override mock để simulate permission denied
    await page.addInitScript(() => {
      navigator.mediaDevices.getUserMedia = async () => {
        throw new DOMException('Permission denied', 'NotAllowedError');
      };
    });
    
    await page.goto('/live');
    
    const startButton = page.locator('[data-testid="start-streaming-button"]');
    await startButton.click();
    
    // Should show error message
    const errorMessage = page.locator('[data-testid="error-message"]');
    await expect(errorMessage).toBeVisible();
    await expect(errorMessage).toContainText('Permission denied');
  });

  test('should handle Socket.IO connection failures', async ({ page }) => {
    // Mock connection failure
    await page.addInitScript(() => {
      (window as any).io = {
        Manager: class {
          socket() {
            return {
              connected: false,
              emit: () => {},
              on: (event: string, handler: Function) => {
                if (event === 'connect_error') {
                  setTimeout(() => handler({ message: 'Connection failed' }), 100);
                }
              },
              off: () => {},
              connect: () => {},
              disconnect: () => {},
            };
          }
        }
      };
    });
    
    const helper = new AudioStreamingTestHelper(page);
    await helper.grantMicrophonePermissions();
    await helper.mockAudioInput();
    
    await page.goto('/live');
    
    const startButton = page.locator('[data-testid="start-streaming-button"]');
    await startButton.click();
    
    // Should show connection error
    const connectionStatus = page.locator('[data-testid="connection-status"]');
    await expect(connectionStatus).toContainText('Disconnected');
    
    const errorToast = page.locator('[data-testid="error-toast"]');
    await expect(errorToast).toBeVisible();
  });

  test('should recover from network interruptions', async () => {
    await helper.startStreaming();
    
    // Verify initial connection
    let connectionStatus = helper.page.locator('[data-testid="connection-status"]');
    await expect(connectionStatus).toContainText('Connected');
    
    // Simulate network interruption
    await helper.simulateNetworkCondition('offline');
    await helper.page.waitForTimeout(1000);
    
    // Should show reconnecting state
    await expect(connectionStatus).toContainText('Reconnecting');
    
    // Restore network
    await helper.simulateNetworkCondition('fast');
    
    // Should reconnect automatically
    await expect(connectionStatus).toContainText('Connected');
    
    await helper.stopStreaming();
  });

  // =============================================================================
  // Performance Tests
  // =============================================================================

  test('should maintain acceptable latency', async () => {
    await helper.startStreaming();
    
    // Let it run for a while to get stable metrics
    await helper.page.waitForTimeout(3000);
    
    const metrics = await helper.getStreamingMetrics();
    
    // Verify latency requirements
    expect(metrics.latency).toBeLessThan(TEST_CONFIG.MAX_LATENCY_MS);
    expect(metrics.networkQuality).not.toBe('poor');
    
    await helper.stopStreaming();
  });

  test('should handle high audio throughput', async () => {
    // Start with fast network conditions
    await helper.simulateNetworkCondition('fast');
    await helper.startStreaming();
    
    // Run for longer period to test sustained throughput
    await helper.page.waitForTimeout(TEST_CONFIG.TEST_DURATION_MS);
    
    const metrics = await helper.getStreamingMetrics();
    
    // Should handle continuous streaming without issues
    expect(metrics.chunksSent).toBeGreaterThan(10); // At least 10 chunks in 5 seconds
    expect(metrics.networkQuality).toBe('excellent');
    
    await helper.stopStreaming();
  });

  test('should degrade gracefully under poor network conditions', async () => {
    // Start with slow network
    await helper.simulateNetworkCondition('slow');
    await helper.startStreaming();
    
    await helper.page.waitForTimeout(5000);
    
    const metrics = await helper.getStreamingMetrics();
    
    // Should adapt to poor conditions
    expect(metrics.latency).toBeGreaterThan(TEST_CONFIG.SLOW_NETWORK_LATENCY);
    expect(metrics.networkQuality).toBe('poor');
    
    // But should still be functional
    expect(metrics.chunksSent).toBeGreaterThan(0);
    
    await helper.stopStreaming();
  });

  // =============================================================================
  // Multi-Tab/Multi-User Tests
  // =============================================================================

  test('should handle multiple browser tabs', async ({ browser }) => {
    // Open two tabs
    const page1 = await browser.newPage();
    const page2 = await browser.newPage();
    
    const helper1 = new AudioStreamingTestHelper(page1);
    const helper2 = new AudioStreamingTestHelper(page2);
    
    // Setup both tabs
    await Promise.all([
      helper1.grantMicrophonePermissions(),
      helper2.grantMicrophonePermissions(),
      helper1.mockAudioInput(),
      helper2.mockAudioInput(),
      helper1.mockSocketIO(),
      helper2.mockSocketIO(),
    ]);
    
    // Start streaming on first tab
    await helper1.startStreaming();
    
    // Attempt to start on second tab
    await helper2.startStreaming();
    
    // Both should be able to stream (different sessions)
    const status1 = page1.locator('[data-testid="streaming-status"]');
    const status2 = page2.locator('[data-testid="streaming-status"]');
    
    await expect(status1).toContainText('Streaming Active');
    await expect(status2).toContainText('Streaming Active');
    
    // Clean up
    await helper1.stopStreaming();
    await helper2.stopStreaming();
    await page1.close();
    await page2.close();
  });

  // =============================================================================
  // Cross-Browser Compatibility Tests
  // =============================================================================

  test('should work across different browsers', async () => {
    // This test would be run với different browser configurations
    // trong Playwright config file (chromium, firefox, webkit)
    
    await helper.startStreaming();
    
    // Basic functionality check
    const streamingStatus = helper.page.locator('[data-testid="streaming-status"]');
    await expect(streamingStatus).toContainText('Streaming Active');
    
    // Check browser-specific features
    const audioContext = await helper.page.evaluate(() => {
      return typeof AudioContext !== 'undefined' || typeof (window as any).webkitAudioContext !== 'undefined';
    });
    expect(audioContext).toBe(true);
    
    const mediaDevices = await helper.page.evaluate(() => {
      return typeof navigator.mediaDevices !== 'undefined';
    });
    expect(mediaDevices).toBe(true);
    
    await helper.stopStreaming();
  });

  // =============================================================================
  // UI/UX Tests
  // =============================================================================

  test('should provide clear visual feedback', async () => {
    await helper.page.goto('/live');
    
    // Check initial state
    const startButton = helper.page.locator('[data-testid="start-streaming-button"]');
    await expect(startButton).toBeVisible();
    await expect(startButton).not.toBeDisabled();
    
    // Start streaming
    await startButton.click();
    
    // Button should change state
    const stopButton = helper.page.locator('[data-testid="stop-streaming-button"]');
    await expect(stopButton).toBeVisible();
    await expect(startButton).not.toBeVisible();
    
    // Status indicators should update
    const connectionIndicator = helper.page.locator('[data-testid="connection-indicator"]');
    await expect(connectionIndicator).toHaveClass(/connected/);
    
    // Stop streaming
    await stopButton.click();
    
    // Should return to initial state
    await expect(startButton).toBeVisible();
    await expect(stopButton).not.toBeVisible();
  });

  test('should display real-time metrics accurately', async () => {
    await helper.startStreaming();
    
    // Check that metrics panel is visible
    const metricsPanel = helper.page.locator('[data-testid="streaming-metrics"]');
    await expect(metricsPanel).toBeVisible();
    
    // Verify metrics are updating
    const initialMetrics = await helper.getStreamingMetrics();
    
    await helper.page.waitForTimeout(2000);
    
    const updatedMetrics = await helper.getStreamingMetrics();
    expect(updatedMetrics.chunksSent).toBeGreaterThan(initialMetrics.chunksSent);
    
    await helper.stopStreaming();
  });
});