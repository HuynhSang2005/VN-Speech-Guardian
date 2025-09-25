/**
 * Enhanced Test Setup - P32 Professional Unit Tests
 * Mục đích: Comprehensive testing environment setup với enterprise patterns
 * Research: Latest Vitest 2.1 + RTL 16.1 + MSW 2.6 best practices
 */

import '@testing-library/jest-dom'
import { vi, beforeAll, afterEach, afterAll } from 'vitest'
import { cleanup } from '@testing-library/react'
import { server } from './mocks/api'

// =============================================================================
// Environment Variables & Configuration
// =============================================================================

process.env.VITE_CLERK_PUBLISHABLE_KEY = 'pk_test_bW9ja19rZXlfZm9yX3Rlc3Rpbmc'
process.env.VITE_API_BASE_URL = 'http://localhost:4000'
process.env.VITE_WS_URL = 'ws://localhost:4000'
process.env.NODE_ENV = 'test'

// =============================================================================
// Console Management - Filter test noise
// =============================================================================

const originalConsoleError = console.error
const originalConsoleWarn = console.warn

console.error = (...args) => {
  // Ignore specific React/Testing Library warnings in tests
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

// Canvas and WebGL mocks for audio visualizer
const mockCanvas = {
  getContext: vi.fn(() => ({
    fillRect: vi.fn(),
    clearRect: vi.fn(),
    getImageData: vi.fn(() => ({ data: new Array(4) })),
    putImageData: vi.fn(),
    createImageData: vi.fn(() => ({ data: new Array(4) })),
    setTransform: vi.fn(),
    drawImage: vi.fn(),
    save: vi.fn(),
    fillText: vi.fn(),
    restore: vi.fn(),
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    closePath: vi.fn(),
    stroke: vi.fn(),
    translate: vi.fn(),
    scale: vi.fn(),
    rotate: vi.fn(),
    arc: vi.fn(),
    fill: vi.fn(),
    measureText: vi.fn(() => ({ width: 0 })),
    transform: vi.fn(),
    rect: vi.fn(),
    clip: vi.fn(),
  })),
  toDataURL: vi.fn(() => 'data:image/png;base64,mock'),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  width: 300,
  height: 300,
}

Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
  value: mockCanvas.getContext,
})

Object.defineProperty(HTMLCanvasElement.prototype, 'toDataURL', {
  value: mockCanvas.toDataURL,
})

// AudioContext mock for audio processing
const mockAudioContext = {
  close: vi.fn(() => Promise.resolve()),
  createBuffer: vi.fn(),
  createBufferSource: vi.fn(() => ({
    connect: vi.fn(),
    start: vi.fn(),
    stop: vi.fn(),
  })),
  createMediaElementSource: vi.fn(),
  createMediaStreamSource: vi.fn(() => ({
    connect: vi.fn(),
    disconnect: vi.fn(),
  })),
  createGain: vi.fn(() => ({
    connect: vi.fn(),
    disconnect: vi.fn(),
    gain: { value: 1 },
  })),
  createAnalyser: vi.fn(() => ({
    connect: vi.fn(),
    disconnect: vi.fn(),
    fftSize: 2048,
    frequencyBinCount: 1024,
    getByteFrequencyData: vi.fn(),
    getFloatFrequencyData: vi.fn(),
  })),
  createScriptProcessor: vi.fn(() => ({
    connect: vi.fn(),
    disconnect: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  })),
  destination: {
    connect: vi.fn(),
    disconnect: vi.fn(),
  },
  sampleRate: 44100,
  currentTime: 0,
  state: 'running',
  suspend: vi.fn(() => Promise.resolve()),
  resume: vi.fn(() => Promise.resolve()),
}

// @ts-ignore
global.AudioContext = vi.fn(() => mockAudioContext)
// @ts-ignore  
global.webkitAudioContext = vi.fn(() => mockAudioContext)

// MediaDevices mock for microphone access
Object.defineProperty(navigator, 'mediaDevices', {
  writable: true,
  value: {
    getUserMedia: vi.fn(() => Promise.resolve({
      getTracks: () => [
        {
          kind: 'audio',
          enabled: true,
          stop: vi.fn(),
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
        }
      ],
      getAudioTracks: () => [
        {
          kind: 'audio', 
          enabled: true,
          stop: vi.fn(),
        }
      ],
      addTrack: vi.fn(),
      removeTrack: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
    enumerateDevices: vi.fn(() => Promise.resolve([
      {
        deviceId: 'default',
        kind: 'audioinput',
        label: 'Default Microphone',
        groupId: 'default',
      }
    ])),
  },
})

// ResizeObserver mock
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}))

// IntersectionObserver mock  
global.IntersectionObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}))

// URL.createObjectURL mock
global.URL.createObjectURL = vi.fn(() => 'mock-object-url')
global.URL.revokeObjectURL = vi.fn()