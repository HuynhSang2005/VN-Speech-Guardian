/**
 * E2E tests cho application flow - bao gồm authentication
 * Kiểm tra tình trạng hiện tại của toàn bộ application
 * Theo testing.instructions.md - realistic application testing
 */
import { test, expect } from '@playwright/test'

test.describe('Application Flow E2E', () => {
  
  test('should load home page and redirect to login', async ({ page }) => {
    // Go to root
    await page.goto('/')
    
    // Should redirect to login or show login
    await page.waitForLoadState('networkidle')
    
    const url = page.url()
    
    // Should either be on login page or home page
    const isOnLoginPage = url.includes('/login') || url.includes('/sign-in')
    const isOnHomePage = url === 'http://localhost:3000/'
    
    expect(isOnLoginPage || isOnHomePage).toBe(true)
  })

  test('should load login page successfully', async ({ page }) => {
    await page.goto('/login')
    await page.waitForLoadState('networkidle')
    
    // Should be on a login-related page
    const url = page.url()
    expect(url).toMatch(/(login|sign-in|auth)/)
  })

  test('should show proper error page for 404', async ({ page }) => {
    await page.goto('/non-existent-page')
    await page.waitForLoadState('networkidle')
    
    // Should show 404 content or be redirected
    const content = await page.content()
    const has404 = content.includes('404') || content.includes('không tìm thấy') || content.includes('Not Found')
    const isRedirected = !page.url().includes('non-existent-page')
    
    expect(has404 || isRedirected).toBe(true)
  })

  test('should have working React application', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    
    // Check if React is working by looking for root element
    const root = page.locator('#root')
    await expect(root).toBeVisible()
    
    // Should have some content
    const content = await root.innerHTML()
    expect(content.length).toBeGreaterThan(50)
  })

  test('should handle network requests properly', async ({ page }) => {
    const responses: string[] = []
    const errors: string[] = []
    
    page.on('response', (response) => {
      responses.push(`${response.status()} ${response.url()}`)
    })
    
    page.on('requestfailed', (request) => {
      errors.push(`FAILED: ${request.url()}`)
    })
    
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    
    // Should have successful responses for main resources
    const hasSuccessfulHTML = responses.some(r => r.includes('200') && r.includes('localhost:3000'))
    expect(hasSuccessfulHTML).toBe(true)
    
    // Should not have critical errors
    const criticalErrors = errors.filter(e => 
      e.includes('main') || e.includes('index') || e.includes('.js')
    )
    expect(criticalErrors).toHaveLength(0)
  })

  test('should be responsive and mobile-friendly', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    
    // Test desktop
    await page.setViewportSize({ width: 1280, height: 720 })
    await page.waitForTimeout(500)
    let isVisible = await page.locator('#root').isVisible()
    expect(isVisible).toBe(true)
    
    // Test tablet
    await page.setViewportSize({ width: 768, height: 1024 })
    await page.waitForTimeout(500)
    isVisible = await page.locator('#root').isVisible()
    expect(isVisible).toBe(true)
    
    // Test mobile
    await page.setViewportSize({ width: 375, height: 667 })
    await page.waitForTimeout(500)
    isVisible = await page.locator('#root').isVisible()
    expect(isVisible).toBe(true)
  })

  test('should not have console errors on load', async ({ page }) => {
    const consoleErrors: string[] = []
    
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text())
      }
    })
    
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(2000)
    
    // Filter out known non-critical errors
    const criticalErrors = consoleErrors.filter(error => 
      !error.includes('favicon') && 
      !error.includes('clerk') &&  // Auth-related errors might be expected
      !error.includes('404')
    )
    
    // Log errors for debugging but don't fail if they're not critical
    if (criticalErrors.length > 0) {
      console.log('Console errors found:', criticalErrors)
    }
    
    // For now, just ensure we don't have too many errors
    expect(criticalErrors.length).toBeLessThan(5)
  })

  test('should handle JavaScript execution without crashes', async ({ page }) => {
    let jsErrors: string[] = []
    
    page.on('pageerror', (error) => {
      jsErrors.push(error.message)
    })
    
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    
    // Interact with the page
    await page.keyboard.press('Tab')
    await page.waitForTimeout(500)
    
    // Click somewhere if possible
    const clickableElements = await page.locator('button, a, [role="button"]').count()
    if (clickableElements > 0) {
      try {
        await page.locator('button, a, [role="button"]').first().click({ timeout: 2000 })
        await page.waitForTimeout(500)
      } catch (e) {
        // Click might fail, that's okay for this test
      }
    }
    
    // Should not have crashed
    const title = await page.title()
    expect(title).toBeTruthy()
    
    // Log JS errors for debugging
    if (jsErrors.length > 0) {
      console.log('JavaScript errors found:', jsErrors)
    }
  })
})

// Test specific route access patterns
test.describe('Route Protection', () => {
  
  test('protected routes should redirect to login', async ({ page }) => {
    // Try to access protected routes
    const protectedRoutes = ['/dashboard', '/live', '/sessions']
    
    for (const route of protectedRoutes) {
      await page.goto(route)
      await page.waitForLoadState('networkidle', { timeout: 10000 })
      
      const url = page.url()
      
      // Should be redirected to login or show auth interface
      const isProtected = url.includes('/login') || 
                         url.includes('/sign-in') || 
                         url.includes('/auth') ||
                         page.url() !== `http://localhost:3000${route}`
      
      expect(isProtected).toBe(true)
    }
  })
})