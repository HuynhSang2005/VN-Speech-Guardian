/**
 * Playwright Global Setup
 * Chuẩn bị môi trường testing trước khi chạy tất cả test cases
 * Theo testing.instructions.md - comprehensive test setup
 */
import { chromium, FullConfig } from '@playwright/test';

async function globalSetup(config: FullConfig) {
  console.log('🚀 Starting Playwright global setup...');
  
  // Optional: Start development server if needed
  // Trong trường hợp này, dev server sẽ chạy riêng
  
  // Setup test data hoặc authentication nếu cần
  // For now, we'll keep it simple
  
  // Validate development server is running
  try {
    const response = await fetch('http://localhost:3000');
    if (!response.ok) {
      console.warn('⚠️  Development server may not be running at http://localhost:3000');
      console.warn('   Please start the dev server with: npm run dev');
    } else {
      console.log('✅ Development server is running');
    }
  } catch (error) {
    console.warn('⚠️  Could not connect to development server:', (error as Error).message);
    console.warn('   Tests may fail. Please ensure dev server is running.');
  }
  
  console.log('✅ Playwright global setup completed');
}

export default globalSetup;