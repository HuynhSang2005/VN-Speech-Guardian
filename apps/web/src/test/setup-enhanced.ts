/**
 * Professional Testing Environment Setup - P32 Unit Tests  
 * Mục đích: Enhanced test setup với MSW integration và comprehensive mocks
 * Research: Latest Vitest 2.1 + RTL 16.1 + MSW 2.6 enterprise patterns
 */

import '@testing-library/jest-dom'
import { vi, beforeAll, afterEach, afterAll } from 'vitest'
import { cleanup } from '@testing-library/react'
import { server } from './mocks/api'

// =============================================================================
// Environment Configuration
// =============================================================================

process.env.VITE_CLERK_PUBLISHABLE_KEY = 'pk_test_bW9ja19rZXlfZm9yX3Rlc3Rpbmc'
process.env.VITE_API_BASE_URL = 'http://localhost:4000'
process.env.VITE_WS_URL = 'ws://localhost:4000'
process.env.NODE_ENV = 'test'

// =============================================================================
// Console Management & Error Filtering
// =============================================================================

const originalConsoleError = console.error
const originalConsoleWarn = console.warn

console.error = (...args) => {
  const message = args[0]?.toString() || ''
  if (
    message.includes('Warning: React does not recognize') ||
    message.includes('Warning: Failed prop type') ||
    message.includes('validateDOMNesting') ||
    message.includes('act() warning') ||
    message.includes('ResizeObserver loop limit exceeded')
  ) {
    return
  }
  originalConsoleError(...args)
}

console.warn = (...args) => {
  const message = args[0]?.toString() || ''
  if (
    message.includes('componentWillReceiveProps') ||
    message.includes('componentWillUpdate') ||
    message.includes('React does not recognize')
  ) {
    return
  }
  originalConsoleWarn(...args)
}

// =============================================================================
// Advanced Audio Context Mock
// =============================================================================

const mockAudioContext = {
  close: vi.fn(() => Promise.resolve()),
  suspend: vi.fn(() => Promise.resolve()),
  resume: vi.fn(() => Promise.resolve()),
  
  createBuffer: vi.fn((channels: number, length: number, sampleRate: number) => ({
    length,
    sampleRate,
    numberOfChannels: channels,
    getChannelData: vi.fn(() => new Float32Array(length)),
  })),
  
  createBufferSource: vi.fn(() => ({
    buffer: null,
    connect: vi.fn(),
    disconnect: vi.fn(),
    start: vi.fn(),
    stop: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  })),
  
  createMediaStreamSource: vi.fn(() => ({
    connect: vi.fn(),
    disconnect: vi.fn(),
  })),
  
  createGain: vi.fn(() => ({
    connect: vi.fn(),
    disconnect: vi.fn(),
    gain: { 
      value: 1,
      setValueAtTime: vi.fn(),
      linearRampToValueAtTime: vi.fn(),
    },
  })),
  
  createAnalyser: vi.fn(() => ({
    connect: vi.fn(),
    disconnect: vi.fn(),
    fftSize: 2048,
    frequencyBinCount: 1024,
    getByteFrequencyData: vi.fn((array: Uint8Array) => {
      for (let i = 0; i < array.length; i++) {
        array[i] = Math.floor(Math.random() * 255)
      }
    }),
    getFloatFrequencyData: vi.fn(),
    getByteTimeDomainData: vi.fn(),
    getFloatTimeDomainData: vi.fn(),
  })),
  
  audioWorklet: {
    addModule: vi.fn(() => Promise.resolve()),
  },
  
  destination: {
    connect: vi.fn(),
    disconnect: vi.fn(),
  },
  
  sampleRate: 44100,
  currentTime: 0,
  state: 'running' as AudioContextState,
}

// @ts-ignore
global.AudioContext = vi.fn(() => mockAudioContext)
// @ts-ignore  
global.webkitAudioContext = vi.fn(() => mockAudioContext)

// =============================================================================
// MediaDevices Mock với Realistic Functionality
// =============================================================================

const mockMediaStream = {
  id: 'mock-stream-id',
  active: true,
  getTracks: () => [
    {
      id: 'mock-audio-track',
      kind: 'audio',
      label: 'Mock Microphone',
      enabled: true,
      stop: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }
  ],
  addTrack: vi.fn(),
  removeTrack: vi.fn(),
  clone: vi.fn(),
}

Object.defineProperty(navigator, 'mediaDevices', {
  writable: true,
  value: {
    getUserMedia: vi.fn(() => Promise.resolve(mockMediaStream)),
    enumerateDevices: vi.fn(() => Promise.resolve([
      {
        deviceId: 'default',
        kind: 'audioinput' as MediaDeviceKind,
        label: 'Default Microphone',
        groupId: 'default-group',
      },
    ])),
    getSupportedConstraints: vi.fn(() => ({
      sampleRate: true,
      channelCount: true,
      echoCancellation: true,
      noiseSuppression: true,
    })),
  },
})

// =============================================================================
// Canvas & Graphics Mocks
// =============================================================================

const mockCanvasContext = {
  clearRect: vi.fn(),
  fillRect: vi.fn(),
  strokeRect: vi.fn(),
  beginPath: vi.fn(),
  closePath: vi.fn(),
  moveTo: vi.fn(),
  lineTo: vi.fn(),
  arc: vi.fn(),
  stroke: vi.fn(),
  fill: vi.fn(),
  save: vi.fn(),
  restore: vi.fn(),
  translate: vi.fn(),
  rotate: vi.fn(),
  scale: vi.fn(),
  createLinearGradient: vi.fn(() => ({
    addColorStop: vi.fn(),
  })),
  createRadialGradient: vi.fn(() => ({
    addColorStop: vi.fn(),
  })),
  measureText: vi.fn(() => ({ width: 100 })),
  drawImage: vi.fn(),
  fillStyle: '#000000',
  strokeStyle: '#000000',
  lineWidth: 1,
  font: '16px Arial',
}

const mockCanvas = {
  getContext: vi.fn((type: string) => {
    if (type === '2d') return mockCanvasContext
    return null
  }),
  toDataURL: vi.fn(() => 'data:image/png;base64,mock'),
  width: 300,
  height: 300,
}

Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
  value: mockCanvas.getContext,
})

Object.defineProperty(HTMLCanvasElement.prototype, 'toDataURL', {
  value: mockCanvas.toDataURL,
})

// =============================================================================
// Observer APIs Mocks
// =============================================================================

global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}))

global.IntersectionObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}))

global.MutationObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  disconnect: vi.fn(),
  takeRecords: vi.fn(() => []),
}))

// =============================================================================
// URL & Crypto APIs
// =============================================================================

global.URL.createObjectURL = vi.fn(() => 'mock-object-url')
global.URL.revokeObjectURL = vi.fn()

Object.defineProperty(global, 'crypto', {
  value: {
    randomUUID: vi.fn(() => '550e8400-e29b-41d4-a716-446655440000'),
    getRandomValues: vi.fn((array: any) => {
      for (let i = 0; i < array.length; i++) {
        array[i] = Math.floor(Math.random() * 256)
      }
      return array
    }),
  },
})

// =============================================================================
// Socket.IO Mock
// =============================================================================

const createMockSocket = () => ({
  id: 'mock-socket-id',
  connected: true,
  connect: vi.fn(),
  disconnect: vi.fn(),
  emit: vi.fn(),
  on: vi.fn(),
  off: vi.fn(),
  removeAllListeners: vi.fn(),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  _listeners: {} as Record<string, any[]>,
});

const createMockManager = () => ({
  socket: vi.fn(() => createMockSocket()),
  on: vi.fn(),
  off: vi.fn(),
  connect: vi.fn(),
  disconnect: vi.fn(),
  open: vi.fn(),
  close: vi.fn(),
  engine: {
    on: vi.fn(),
    off: vi.fn(),
  }
});

const mockSocket = createMockSocket();

vi.mock('socket.io-client', () => ({
  io: vi.fn(() => mockSocket),
  Socket: vi.fn(() => mockSocket),
  Manager: vi.fn(() => createMockManager()),
}))

// =============================================================================
// MSW Server Setup - moved to individual test files
// =============================================================================

// =============================================================================
// Framer Motion Mock for Performance Testing
// =============================================================================

vi.mock('framer-motion', () => ({
  motion: {
    div: 'div',
    button: 'button',
    span: 'span',
    canvas: 'canvas',
  },
  AnimatePresence: ({ children }: { children: any }) => children,
  useAnimation: () => ({
    start: vi.fn(),
    stop: vi.fn(),
    set: vi.fn(),
  }),
  useMotionValue: (initial: any) => ({
    get: () => initial,
    set: vi.fn(),
  }),
  useSpring: (value: any) => value,
  useTransform: (value: any) => value,
}))

// =============================================================================
// Test Lifecycle & MSW Integration
// =============================================================================

beforeAll(() => {
  server.listen({ 
    onUnhandledRequest: 'warn' 
  })
})

afterEach(() => {
  cleanup()
  server.resetHandlers()
  vi.clearAllMocks()
})

afterAll(() => {
  server.close()
  console.error = originalConsoleError
  console.warn = originalConsoleWarn
})

// =============================================================================
// Global Test Utilities
// =============================================================================

export const waitForNextTick = () => new Promise(resolve => setTimeout(resolve, 0))

export const createMockFile = (name: string, size = 1024, type = 'audio/wav') => {
  const file = new File(['mock content'], name, { type })
  Object.defineProperty(file, 'size', { value: size })
  return file
}

export const simulateAudioData = (length = 1024) => {
  return new Float32Array(length).map(() => Math.random() * 2 - 1)
}

export { mockSocket, mockAudioContext, mockMediaStream, mockCanvas }