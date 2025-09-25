/**
 * Playwright Global Teardown
 * Dọn dẹp môi trường sau khi hoàn thành tất cả test cases
 * Theo testing.instructions.md - clean test environment
 */
import { FullConfig } from '@playwright/test';

async function globalTeardown(config: FullConfig) {
  console.log('🧹 Starting Playwright global teardown...');
  
  // Cleanup test data hoặc resources nếu cần
  // For now, we'll keep it simple
  
  console.log('✅ Playwright global teardown completed');
}

export default globalTeardown;