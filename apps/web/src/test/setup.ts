/**
 * Test setup file cho Vitest + React Testing Library
 * Configuration cho comprehensive testing environment
 */

import '@testing-library/jest-dom'

// Mock global objects cho testing environment
Object.defineProperty(window, 'AudioContext', {
  writable: true,
  value: class MockAudioContext {
    createScriptProcessor = jest.fn().mockReturnValue({ connect: jest.fn() })
    createMediaStreamSource = jest.fn().mockReturnValue({ connect: jest.fn() })
    close = jest.fn()
    resume = jest.fn()
    suspend = jest.fn()
  },
})

Object.defineProperty(window, 'webkitAudioContext', {
  writable: true,
  value: window.AudioContext,
})

// Mock MediaRecorder API
Object.defineProperty(window, 'MediaRecorder', {
  writable: true,
  value: class MockMediaRecorder {
    constructor() {
      this.state = 'inactive'
      this.ondataavailable = null
      this.onstop = null
      this.onerror = null
    }
    
    start = jest.fn()
    stop = jest.fn() 
    pause = jest.fn()
    resume = jest.fn()
  },
})

// Mock getUserMedia
Object.defineProperty(navigator, 'mediaDevices', {
  writable: true,
  value: {
    getUserMedia: jest.fn().mockResolvedValue({
      getTracks: () => [{ stop: jest.fn() }],
    }),
  },
})

// Mock WebSocket
Object.defineProperty(global, 'WebSocket', {
  writable: true,
  value: class MockWebSocket {
    constructor(url: string) {
      this.url = url
      this.readyState = WebSocket.CONNECTING
      setTimeout(() => {
        this.readyState = WebSocket.OPEN
        this.onopen?.({} as Event)
      }, 100)
    }
    
    send = jest.fn()
    close = jest.fn()
    onopen: ((event: Event) => void) | null = null
    onclose: ((event: CloseEvent) => void) | null = null  
    onmessage: ((event: MessageEvent) => void) | null = null
    onerror: ((event: Event) => void) | null = null
    
    static CONNECTING = 0
    static OPEN = 1
    static CLOSING = 2
    static CLOSED = 3
  },
})

// Mock environment variables
process.env.VITE_CLERK_PUBLISHABLE_KEY = 'pk_test_mock_key'
process.env.VITE_API_BASE_URL = 'http://localhost:4000'
process.env.VITE_WS_URL = 'ws://localhost:4000'

// Setup MSW server cho API mocking
import { beforeAll, afterEach, afterAll } from 'vitest'
// Note: MSW server will be setup here when MSW is installed

// Console warnings filter - ignore common test warnings
const originalConsoleWarn = console.warn
console.warn = (...args) => {
  // Ignore specific React warnings in tests
  if (
    args[0]?.includes('Warning: React does not recognize') ||
    args[0]?.includes('Warning: Failed prop type') ||
    args[0]?.includes('validateDOMNesting')
  ) {
    return
  }
  originalConsoleWarn(...args)
}