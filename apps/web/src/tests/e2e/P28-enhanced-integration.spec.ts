/**
 * P28 E2E Tests - Enhanced Forms & Motion Integration
 * Mục đích: End-to-end testing for React 19 patterns and Framer Motion v12
 * Coverage: User workflows, form submission, real-time interactions, performance
 * Tech: Playwright, visual regression testing, performance monitoring
 */

import { test, expect, type Page, type BrowserContext } from '@playwright/test';
import type { Locator } from '@playwright/test';

// Test data
const testSessionData = {
  name: 'E2E Test Session',
  description: 'This is an end-to-end test session for P28 implementation',
  language: 'vi',
  sensitivity: 'medium',
};

const mockAudioBlob = new Uint8Array([
  // Mock PCM data - simplified for testing
  0x52, 0x49, 0x46, 0x46, 0x24, 0x08, 0x00, 0x00,
  0x57, 0x41, 0x56, 0x45, 0x66, 0x6d, 0x74, 0x20,
  0x10, 0x00, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00,
  0x44, 0xac, 0x00, 0x00, 0x88, 0x58, 0x01, 0x00,
  0x02, 0x00, 0x10, 0x00, 0x64, 0x61, 0x74, 0x61,
]);

// Page Object Model
class SessionFormPage {
  constructor(private page: Page) {}
  
  get nameInput(): Locator {
    return this.page.getByLabel(/session name/i);
  }
  
  get descriptionInput(): Locator {
    return this.page.getByLabel(/description/i);
  }
  
  get languageSelect(): Locator {
    return this.page.getByLabel(/language/i);
  }
  
  get sensitivitySelect(): Locator {
    return this.page.getByLabel(/sensitivity/i);
  }
  
  get autoStopCheckbox(): Locator {
    return this.page.getByLabel(/auto-stop/i);
  }
  
  get submitButton(): Locator {
    return this.page.getByRole('button', { name: /create session/i });
  }
  
  get resetButton(): Locator {
    return this.page.getByRole('button', { name: /reset/i });
  }
  
  async fillForm(data: typeof testSessionData): Promise<void> {
    await this.nameInput.fill(data.name);
    await this.descriptionInput.fill(data.description);
    await this.languageSelect.selectOption(data.language);
    await this.sensitivitySelect.selectOption(data.sensitivity);
  }
  
  async submitForm(): Promise<void> {
    await this.submitButton.click();
  }
  
  async getValidationError(field: string): Promise<string | null> {
    const errorElement = this.page.locator(`[data-testid="${field}-error"]`).first();
    return await errorElement.textContent();
  }
}

class LiveProcessingPage {
  constructor(private page: Page) {}
  
  get audioVisualizer(): Locator {
    return this.page.locator('[data-testid="audio-visualizer"]');
  }
  
  get startButton(): Locator {
    return this.page.getByRole('button', { name: /start recording/i });
  }
  
  get stopButton(): Locator {
    return this.page.getByRole('button', { name: /stop recording/i });
  }
  
  get transcriptPanel(): Locator {
    return this.page.locator('[data-testid="transcript-panel"]');
  }
  
  get detectionAlerts(): Locator {
    return this.page.locator('[data-testid="detection-alerts"]');
  }
  
  get connectionStatus(): Locator {
    return this.page.locator('[data-testid="connection-status"]');
  }
  
  async startRecording(): Promise<void> {
    await this.startButton.click();
    await this.page.waitForSelector('[data-testid="recording-indicator"]');
  }
  
  async stopRecording(): Promise<void> {
    await this.stopButton.click();
    await this.page.waitForSelector('[data-testid="recording-indicator"]', { state: 'hidden' });
  }
  
  async getTranscriptSegments(): Promise<string[]> {
    const segments = await this.transcriptPanel.locator('.transcript-segment').all();
    const texts = await Promise.all(segments.map(segment => segment.textContent()));
    return texts.filter((text): text is string => text !== null);
  }
}

// Setup and teardown
test.beforeEach(async ({ page, context }) => {
  // Mock API responses
  await page.route('/api/sessions', async (route) => {
    if (route.request().method() === 'POST') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            id: 'test-session-e2e',
            name: testSessionData.name,
            description: testSessionData.description,
            startedAt: new Date().toISOString(),
          },
        }),
      });
    } else {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: [],
          meta: { pagination: { page: 1, limit: 20, total: 0 } },
        }),
      });
    }
  });
  
  // Mock WebSocket for real-time features
  await page.addInitScript(() => {
    class MockWebSocket {
      onopen: ((event: Event) => void) | null = null;
      onmessage: ((event: MessageEvent) => void) | null = null;
      onclose: ((event: CloseEvent) => void) | null = null;
      onerror: ((event: Event) => void) | null = null;
      
      constructor(url: string) {
        setTimeout(() => {
          if (this.onopen) {
            this.onopen(new Event('open'));
          }
        }, 100);
      }
      
      send(data: any) {
        // Mock response
        setTimeout(() => {
          if (this.onmessage) {
            this.onmessage(new MessageEvent('message', {
              data: JSON.stringify({
                type: 'transcript-partial',
                data: { text: 'Mock transcript data' },
              }),
            }));
          }
        }, 200);
      }
      
      close() {
        if (this.onclose) {
          this.onclose(new CloseEvent('close'));
        }
      }
    }
    
    (window as any).WebSocket = MockWebSocket;
  });
  
  // Grant microphone permissions
  await context.grantPermissions(['microphone']);
});

test.describe('P28 Enhanced Session Form E2E', () => {
  test('should render form with all required fields', async ({ page }) => {
    await page.goto('/sessions/new');
    
    const formPage = new SessionFormPage(page);
    
    // Verify all form elements are present
    await expect(formPage.nameInput).toBeVisible();
    await expect(formPage.descriptionInput).toBeVisible();
    await expect(formPage.languageSelect).toBeVisible();
    await expect(formPage.sensitivitySelect).toBeVisible();
    await expect(formPage.autoStopCheckbox).toBeVisible();
    await expect(formPage.submitButton).toBeVisible();
    await expect(formPage.resetButton).toBeVisible();
  });
  
  test('should validate required fields and show errors', async ({ page }) => {
    await page.goto('/sessions/new');
    
    const formPage = new SessionFormPage(page);
    
    // Submit empty form
    await formPage.submitForm();
    
    // Check validation errors appear
    await expect(page.getByText(/name must be at least 3 characters/i)).toBeVisible();
    
    // Fill name with too short value
    await formPage.nameInput.fill('Ab');
    await page.keyboard.press('Tab');
    
    await expect(page.getByText(/name must be at least 3 characters/i)).toBeVisible();
    
    // Fill name with too long value
    await formPage.nameInput.fill('A'.repeat(51));
    await page.keyboard.press('Tab');
    
    await expect(page.getByText(/name cannot exceed 50 characters/i)).toBeVisible();
  });
  
  test('should successfully submit valid form with React 19 useActionState', async ({ page }) => {
    await page.goto('/sessions/new');
    
    const formPage = new SessionFormPage(page);
    
    // Fill form with valid data
    await formPage.fillForm(testSessionData);
    
    // Submit form
    await formPage.submitForm();
    
    // Check loading state
    await expect(page.getByText(/creating/i)).toBeVisible();
    
    // Wait for form submission to complete
    await page.waitForURL(/\/sessions\/test-session-e2e/, { timeout: 5000 });
    
    // Verify redirect to session detail page
    expect(page.url()).toContain('/sessions/test-session-e2e');
  });
  
  test('should preserve form values on validation error', async ({ page }) => {
    // Mock server validation error
    await page.route('/api/sessions', async (route) => {
      await route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({
          error: 'Validation failed',
          fieldErrors: {
            name: ['Session name already exists'],
          },
          values: {
            name: testSessionData.name,
            description: testSessionData.description,
          },
        }),
      });
    });
    
    await page.goto('/sessions/new');
    
    const formPage = new SessionFormPage(page);
    
    // Fill and submit form
    await formPage.fillForm(testSessionData);
    await formPage.submitForm();
    
    // Check error message appears
    await expect(page.getByText(/session name already exists/i)).toBeVisible();
    
    // Verify form values are preserved
    await expect(formPage.nameInput).toHaveValue(testSessionData.name);
    await expect(formPage.descriptionInput).toHaveValue(testSessionData.description);
  });
  
  test('should handle form reset functionality', async ({ page }) => {
    await page.goto('/sessions/new');
    
    const formPage = new SessionFormPage(page);
    
    // Fill form
    await formPage.fillForm(testSessionData);
    
    // Verify values are filled
    await expect(formPage.nameInput).toHaveValue(testSessionData.name);
    await expect(formPage.descriptionInput).toHaveValue(testSessionData.description);
    
    // Reset form
    await formPage.resetButton.click();
    
    // Verify form is cleared
    await expect(formPage.nameInput).toHaveValue('');
    await expect(formPage.descriptionInput).toHaveValue('');
  });
});

test.describe('P28 Enhanced Motion Components E2E', () => {
  test('should render audio visualizer with animations', async ({ page }) => {
    await page.goto('/live');
    
    const livePage = new LiveProcessingPage(page);
    
    // Check visualizer is present
    await expect(livePage.audioVisualizer).toBeVisible();
    
    // Verify initial state (not recording)
    await expect(page.locator('.bg-gray-400')).toBeVisible(); // Inactive indicator
    
    // Start recording
    await livePage.startRecording();
    
    // Verify active state
    await expect(page.locator('.bg-green-500')).toBeVisible(); // Active indicator
    
    // Check visualizer animations are running
    const visualizer = livePage.audioVisualizer;
    const initialTransform = await visualizer.evaluate(el => getComputedStyle(el).transform);
    
    // Wait a bit for animation
    await page.waitForTimeout(500);
    
    const laterTransform = await visualizer.evaluate(el => getComputedStyle(el).transform);
    
    // Transform should change (animation running)
    expect(initialTransform).not.toBe(laterTransform);
  });
  
  test('should handle session card interactions', async ({ page }) => {
    // Mock sessions data
    await page.route('/api/sessions', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: [
            {
              id: 'session-1',
              name: 'Test Session 1',
              description: 'Test description',
              startedAt: new Date().toISOString(),
              endedAt: new Date(Date.now() + 300000).toISOString(),
              lang: 'vi',
            },
          ],
          meta: { pagination: { page: 1, limit: 20, total: 1 } },
        }),
      });
    });
    
    await page.goto('/sessions');
    
    // Find session card
    const sessionCard = page.locator('[data-testid="session-card"]').first();
    await expect(sessionCard).toBeVisible();
    
    // Click to expand
    await sessionCard.click();
    
    // Check expanded content appears
    await expect(page.getByText(/duration:/i)).toBeVisible();
    await expect(page.getByText(/language:/i)).toBeVisible();
    await expect(page.getByText('View Details')).toBeVisible();
    await expect(page.getByText('Delete')).toBeVisible();
    
    // Test collapse
    await sessionCard.click();
    
    // Expanded content should be hidden
    await expect(page.getByText(/duration:/i)).not.toBeVisible();
  });
  
  test('should handle swipe gestures on session cards', async ({ page }) => {
    await page.route('/api/sessions', async (route) => {
      if (route.request().method() === 'DELETE') {
        await route.fulfill({ status: 200, body: JSON.stringify({ success: true }) });
      } else {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: [
              {
                id: 'session-swipe-test',
                name: 'Swipe Test Session',
                startedAt: new Date().toISOString(),
              },
            ],
          }),
        });
      }
    });
    
    await page.goto('/sessions');
    
    const sessionCard = page.locator('[data-testid="session-card"]').first();
    await expect(sessionCard).toBeVisible();
    
    // Simulate swipe left gesture
    const cardBounds = await sessionCard.boundingBox();
    if (cardBounds) {
      await page.mouse.move(cardBounds.x + cardBounds.width / 2, cardBounds.y + cardBounds.height / 2);
      await page.mouse.down();
      await page.mouse.move(cardBounds.x - 150, cardBounds.y + cardBounds.height / 2);
      await page.mouse.up();
    }
    
    // Card should be removed
    await expect(sessionCard).not.toBeVisible();
  });
  
  test('should display transcript segments with gestures', async ({ page }) => {
    await page.goto('/live');
    
    const livePage = new LiveProcessingPage(page);
    
    // Start recording to generate transcript
    await livePage.startRecording();
    
    // Wait for mock transcript data
    await expect(page.getByText(/mock transcript data/i)).toBeVisible();
    
    // Test transcript segment deletion
    const deleteButton = page.locator('[data-testid="transcript-segment"] button').first();
    await deleteButton.click();
    
    // Segment should be removed
    await expect(page.getByText(/mock transcript data/i)).not.toBeVisible();
  });
});

test.describe('P28 Performance Tests', () => {
  test('should render components within performance budgets', async ({ page, context }) => {
    await page.goto('/live');
    
    // Start performance tracing
    await context.tracing.start({ screenshots: true, snapshots: true });
    
    const livePage = new LiveProcessingPage(page);
    
    // Perform actions that trigger animations
    await livePage.startRecording();
    
    // Wait for animations to complete
    await page.waitForTimeout(2000);
    
    await livePage.stopRecording();
    
    // Stop tracing
    await context.tracing.stop({ path: 'performance-trace.zip' });
    
    // Measure Core Web Vitals
    const vitals = await page.evaluate(() => {
      return new Promise((resolve) => {
        const observer = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const vitals: any = {};
          
          entries.forEach((entry) => {
            if (entry.entryType === 'navigation') {
              vitals.FCP = entry.startTime + (entry as any).firstContentfulPaint;
              vitals.LCP = entry.startTime + (entry as any).largestContentfulPaint;
            }
            if (entry.entryType === 'layout-shift') {
              vitals.CLS = (vitals.CLS || 0) + (entry as any).value;
            }
          });
          
          resolve(vitals);
        });
        
        observer.observe({ entryTypes: ['navigation', 'layout-shift'] });
        
        // Fallback timeout
        setTimeout(() => resolve({}), 3000);
      });
    });
    
    console.log('Core Web Vitals:', vitals);
    
    // Performance assertions
    if ((vitals as any).FCP) {
      expect((vitals as any).FCP).toBeLessThan(2000); // FCP < 2s
    }
    if ((vitals as any).LCP) {
      expect((vitals as any).LCP).toBeLessThan(2500); // LCP < 2.5s
    }
    if ((vitals as any).CLS) {
      expect((vitals as any).CLS).toBeLessThan(0.1); // CLS < 0.1
    }
  });
  
  test('should handle multiple rapid interactions without performance degradation', async ({ page }) => {
    await page.goto('/sessions');
    
    // Mock multiple sessions
    await page.route('/api/sessions', async (route) => {
      const sessions = Array.from({ length: 20 }, (_, i) => ({
        id: `session-${i}`,
        name: `Test Session ${i}`,
        startedAt: new Date().toISOString(),
      }));
      
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: sessions,
        }),
      });
    });
    
    await page.reload();
    
    // Perform rapid interactions
    const sessionCards = page.locator('[data-testid="session-card"]');
    const count = await sessionCards.count();
    
    const startTime = Date.now();
    
    // Click each card rapidly
    for (let i = 0; i < Math.min(count, 10); i++) {
      await sessionCards.nth(i).click();
      await page.waitForTimeout(50); // Short delay between clicks
    }
    
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    // Should complete interactions within reasonable time
    expect(duration).toBeLessThan(2000); // < 2 seconds for 10 interactions
    
    // Check that all cards are still responsive
    const lastCard = sessionCards.nth(Math.min(count - 1, 9));
    await expect(lastCard).toBeVisible();
  });
  
  test('should maintain 60fps during animations', async ({ page }) => {
    await page.goto('/live');
    
    // Monitor frame rate during animations
    const frameRates = await page.evaluate(() => {
      return new Promise<number[]>((resolve) => {
        const frameRates: number[] = [];
        let lastTime = performance.now();
        let frameCount = 0;
        
        const measureFrame = () => {
          const currentTime = performance.now();
          const deltaTime = currentTime - lastTime;
          const fps = 1000 / deltaTime;
          
          frameRates.push(fps);
          frameCount++;
          
          if (frameCount < 60) { // Measure 60 frames
            lastTime = currentTime;
            requestAnimationFrame(measureFrame);
          } else {
            resolve(frameRates);
          }
        };
        
        requestAnimationFrame(measureFrame);
      });
    });
    
    // Calculate average FPS
    const averageFps = frameRates.reduce((sum, fps) => sum + fps, 0) / frameRates.length;
    const minFps = Math.min(...frameRates);
    
    console.log(`Average FPS: ${averageFps.toFixed(2)}, Min FPS: ${minFps.toFixed(2)}`);
    
    // Performance assertions
    expect(averageFps).toBeGreaterThan(55); // Average > 55fps
    expect(minFps).toBeGreaterThan(30); // Min > 30fps (acceptable drops)
  });
});

test.describe('P28 Accessibility Tests', () => {
  test('should be navigable with keyboard', async ({ page }) => {
    await page.goto('/sessions/new');
    
    const formPage = new SessionFormPage(page);
    
    // Test keyboard navigation
    await page.keyboard.press('Tab');
    await expect(formPage.nameInput).toBeFocused();
    
    await page.keyboard.press('Tab');
    await expect(formPage.descriptionInput).toBeFocused();
    
    await page.keyboard.press('Tab');
    await expect(formPage.languageSelect).toBeFocused();
    
    await page.keyboard.press('Tab');
    await expect(formPage.sensitivitySelect).toBeFocused();
    
    await page.keyboard.press('Tab');
    await expect(formPage.autoStopCheckbox).toBeFocused();
    
    await page.keyboard.press('Tab');
    await expect(formPage.submitButton).toBeFocused();
  });
  
  test('should have proper ARIA attributes', async ({ page }) => {
    await page.goto('/sessions/new');
    
    // Check form accessibility
    const nameInput = page.getByLabel(/session name/i);
    await expect(nameInput).toHaveAttribute('aria-required', 'true');
    
    const submitButton = page.getByRole('button', { name: /create session/i });
    await expect(submitButton).toHaveAttribute('type', 'submit');
    
    // Check that validation errors have proper aria-describedby
    await submitButton.click();
    
    const errorMessage = page.getByText(/name must be at least 3 characters/i);
    await expect(errorMessage).toBeVisible();
    
    const errorId = await errorMessage.getAttribute('id');
    if (errorId) {
      await expect(nameInput).toHaveAttribute('aria-describedby', errorId);
    }
  });
  
  test('should support screen reader announcements', async ({ page }) => {
    await page.goto('/live');
    
    // Check live regions for dynamic content
    const transcriptPanel = page.locator('[data-testid="transcript-panel"]');
    await expect(transcriptPanel).toHaveAttribute('aria-live', 'polite');
    
    const detectionAlerts = page.locator('[data-testid="detection-alerts"]');
    await expect(detectionAlerts).toHaveAttribute('aria-live', 'assertive');
  });
  
  test('should respect prefers-reduced-motion', async ({ page }) => {
    // Set reduced motion preference
    await page.emulateMedia({ reducedMotion: 'reduce' });
    
    await page.goto('/live');
    
    // Animations should be disabled or reduced
    const visualizer = page.locator('[data-testid="audio-visualizer"]');
    await expect(visualizer).toBeVisible();
    
    // Check that transition durations are reduced
    const transitionDuration = await visualizer.evaluate(el => 
      getComputedStyle(el).transitionDuration
    );
    
    // Should be instant or very short
    expect(transitionDuration === '0s' || parseFloat(transitionDuration) < 0.2).toBe(true);
  });
});

test.describe('P28 Visual Regression Tests', () => {
  test('session form visual appearance', async ({ page }) => {
    await page.goto('/sessions/new');
    
    // Take screenshot of form
    await expect(page).toHaveScreenshot('session-form.png');
    
    // Test validation error state
    await page.getByRole('button', { name: /create session/i }).click();
    await page.waitForSelector('[data-testid="name-error"]');
    
    await expect(page).toHaveScreenshot('session-form-errors.png');
  });
  
  test('audio visualizer visual states', async ({ page }) => {
    await page.goto('/live');
    
    // Inactive state
    await expect(page.locator('[data-testid="audio-visualizer"]')).toHaveScreenshot('visualizer-inactive.png');
    
    // Active state
    const livePage = new LiveProcessingPage(page);
    await livePage.startRecording();
    
    await expect(page.locator('[data-testid="audio-visualizer"]')).toHaveScreenshot('visualizer-active.png');
  });
  
  test('session cards layout', async ({ page }) => {
    await page.route('/api/sessions', async (route) => {
      const sessions = Array.from({ length: 5 }, (_, i) => ({
        id: `session-${i}`,
        name: `Test Session ${i}`,
        description: `Description for session ${i}`,
        startedAt: new Date().toISOString(),
        endedAt: new Date(Date.now() + 300000).toISOString(),
        lang: 'vi',
      }));
      
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: sessions }),
      });
    });
    
    await page.goto('/sessions');
    
    await expect(page).toHaveScreenshot('session-cards-list.png');
    
    // Expanded state
    const firstCard = page.locator('[data-testid="session-card"]').first();
    await firstCard.click();
    
    await expect(page).toHaveScreenshot('session-cards-expanded.png');
  });
});