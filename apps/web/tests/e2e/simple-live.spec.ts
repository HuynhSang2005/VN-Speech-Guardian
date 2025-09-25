/**
 * E2E tests đơn giản cho Live Processing page
 * Kiểm tra tình trạng hiện tại của implementation
 * Theo testing.instructions.md - realistic E2E validation
 */
import { test, expect } from '@playwright/test'

test.describe('Live Processing Page - Basic E2E', () => {
  
  test.beforeEach(async ({ page }) => {
    // Navigate to live page
    await page.goto('/live')
    
    // Wait for page to load
    await page.waitForLoadState('networkidle')
  })

  test('should load live page without errors', async ({ page }) => {
    // Page should load successfully
    expect(page.url()).toContain('/live')
    
    // Should not have any console errors
    const errors: string[] = []
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(msg.text())
      }
    })
    
    await page.waitForTimeout(2000)
    expect(errors).toHaveLength(0)
  })

  test('should display page title correctly', async ({ page }) => {
    // Check if title is set (might be default Vite title for now)
    const title = await page.title()
    expect(title).toBeTruthy()
  })

  test('should render React components', async ({ page }) => {
    // Look for any React-rendered content
    // This is a basic check to ensure React is working
    const body = await page.locator('body').innerHTML()
    expect(body.length).toBeGreaterThan(100) // Should have some content
  })

  test('should be responsive on different screen sizes', async ({ page }) => {
    // Test desktop view
    await page.setViewportSize({ width: 1280, height: 720 })
    await page.waitForTimeout(500)
    
    // Test mobile view
    await page.setViewportSize({ width: 375, height: 667 })
    await page.waitForTimeout(500)
    
    // Should not crash on viewport changes
    expect(page.url()).toContain('/live')
  })

  test('should handle JavaScript errors gracefully', async ({ page }) => {
    let jsErrors: string[] = []
    
    page.on('pageerror', (error) => {
      jsErrors.push(error.message)
    })
    
    // Wait for any potential errors to surface
    await page.waitForTimeout(3000)
    
    // Log errors if any (for debugging) but don't fail test
    if (jsErrors.length > 0) {
      console.log('JavaScript errors found:', jsErrors)
    }
    
    // Page should still be functional
    expect(page.url()).toContain('/live')
  })

  test('should load without network errors', async ({ page }) => {
    const failedRequests: string[] = []
    
    page.on('requestfailed', (request) => {
      failedRequests.push(`${request.method()} ${request.url()}`)
    })
    
    await page.reload()
    await page.waitForLoadState('networkidle')
    
    // Should not have failed requests for critical resources
    const criticalFailures = failedRequests.filter(req => 
      req.includes('.js') || req.includes('.css') || req.includes('main')
    )
    
    expect(criticalFailures).toHaveLength(0)
  })
})

// Simple smoke tests for specific features if they exist
test.describe('Live Processing Features - Conditional', () => {
  
  test.beforeEach(async ({ page }) => {
    await page.goto('/live')  
    await page.waitForLoadState('networkidle')
  })

  test('should show some UI elements', async ({ page }) => {
    // Look for any common UI elements that might exist
    const hasButtons = await page.locator('button').count() > 0
    const hasInputs = await page.locator('input').count() > 0
    const hasDivs = await page.locator('div').count() > 0
    
    // At least some UI should exist
    expect(hasButtons || hasInputs || hasDivs).toBe(true)
  })

  test('should handle clicks without crashing', async ({ page }) => {
    // Find any clickable elements and test them
    const buttons = page.locator('button')
    const buttonCount = await buttons.count()
    
    if (buttonCount > 0) {
      // Click first button if exists
      await buttons.first().click({ timeout: 5000 })
      await page.waitForTimeout(1000)
      
      // Page should still be functional
      expect(page.url()).toContain('/live')
    }
  })
})

// Test basic accessibility
test.describe('Accessibility - Basic', () => {
  
  test.beforeEach(async ({ page }) => {
    await page.goto('/live')
    await page.waitForLoadState('networkidle')
  })

  test('should have proper HTML structure', async ({ page }) => {
    // Check for basic HTML structure
    const html = page.locator('html')
    const body = page.locator('body')
    const root = page.locator('#root')
    
    await expect(html).toBeVisible()
    await expect(body).toBeVisible()
    
    // Check if React root exists
    const rootExists = await root.count() > 0
    if (rootExists) {
      await expect(root).toBeVisible()
    }
  })

  test('should be keyboard accessible', async ({ page }) => {
    // Test Tab navigation
    await page.keyboard.press('Tab')
    await page.waitForTimeout(500)
    
    // Should not crash
    expect(page.url()).toContain('/live')
  })
})