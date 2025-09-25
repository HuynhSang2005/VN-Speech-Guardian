/**
 * Simplified Mock Data Factories - P32 Testing Infrastructure  
 * Mục đích: Type-safe mock data generation without external dependencies
 * Simple JavaScript-based implementation for reliable testing
 */

// =============================================================================
// Helper Functions for Mock Data Generation
// =============================================================================

const randomElement = <T>(array: readonly T[]): T => {
  if (array.length === 0) throw new Error('Array cannot be empty');
  return array[Math.floor(Math.random() * array.length)]!;
};

const randomInt = (min: number, max: number): number => 
  Math.floor(Math.random() * (max - min + 1)) + min;

const randomFloat = (min: number, max: number, precision = 2): number => 
  Math.round((Math.random() * (max - min) + min) * Math.pow(10, precision)) / Math.pow(10, precision);

const randomBoolean = (probability = 0.5): boolean => Math.random() < probability;

const randomDate = (daysBack = 30): Date => 
  new Date(Date.now() - Math.random() * daysBack * 24 * 60 * 60 * 1000);

const generateId = (): string => 
  `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

// =============================================================================
// Vietnamese Test Data Constants
// =============================================================================

const VIETNAMESE_PHRASES = [
  "Xin chào, tôi muốn hỏi về dịch vụ của công ty",
  "Cảm ơn bạn đã hỗ trợ tôi rất nhiều",
  "Tôi cần thêm thông tin về sản phẩm này",
  "Làm thế nào để tôi có thể liên hệ với bộ phận hỗ trợ?",
  "Dịch vụ của các bạn thật tuyệt vời",
  "Tôi có một số câu hỏi về quy trình thanh toán",
  "Có thể giúp tôi kiểm tra trạng thái đơn hàng không?",
  "Thời gian giao hàng dự kiến là bao lâu?",
  "Tôi muốn đổi trả sản phẩm này",
  "Chính sách bảo hành như thế nào?"
];

const OFFENSIVE_PHRASES = [
  "Dịch vụ này thật tệ hại", 
  "Nhân viên không có trách nhiệm",
  "Tôi rất bực mình với thái độ phục vụ",
  "Sản phẩm chất lượng kém"
];

const USER_NAMES = [
  "Nguyễn Văn Anh", "Trần Thị Bình", "Lê Minh Cường", 
  "Phạm Thị Dung", "Hoàng Văn Em", "Vũ Thị Phương"
];

// =============================================================================
// Mock Factory Functions
// =============================================================================

export interface MockSession {
  id: string;
  name: string;
  description: string;
  startedAt: string;
  endedAt?: string;
  status: 'idle' | 'recording' | 'processing' | 'completed' | 'error';
  duration: number;
  settings: {
    language: 'vi' | 'en';
    sensitivity: 'low' | 'medium' | 'high';
    autoStop: boolean;
    maxDuration?: number;
  };
  stats: {
    totalSegments: number;
    totalDetections: number;
    avgConfidence: number;
  };
  createdAt: string;
  updatedAt: string;
}

export interface MockDetection {
  id: string;
  sessionId: string;
  label: 'CLEAN' | 'OFFENSIVE' | 'HATE' | 'SPAM' | 'TOXIC';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  score: number;
  snippet: string;
  startMs: number;
  endMs: number;
  createdAt: string;
}

export interface MockTranscript {
  id: string;
  sessionId: string;
  segIdx: number;
  text: string;
  startMs: number;
  endMs: number;
  confidence?: number;
  createdAt: string;
}

export const createMockSession = (overrides: Partial<MockSession> = {}): MockSession => {
  const startedAt = new Date(Date.now() - randomInt(0, 7) * 24 * 60 * 60 * 1000);
  const hasEnded = randomBoolean(0.7);
  const endedAt = hasEnded 
    ? new Date(startedAt.getTime() + randomInt(300, 3600) * 1000)
    : undefined;
  
  const duration = endedAt 
    ? Math.floor((endedAt.getTime() - startedAt.getTime()) / 1000) 
    : 0;

  const totalSegments = randomInt(5, 100);
  const totalDetections = randomInt(0, Math.floor(totalSegments * 0.3));

  return {
    id: generateId(),
    name: `Phiên ghi âm ${startedAt.toLocaleDateString('vi-VN')}`,
    description: randomElement(VIETNAMESE_PHRASES),
    startedAt: startedAt.toISOString(),
    ...(endedAt ? { endedAt: endedAt.toISOString() } : {}),
    status: randomElement(['idle', 'recording', 'processing', 'completed', 'error']),
    duration,
    settings: {
      language: randomElement(['vi', 'en']),
      sensitivity: randomElement(['low', 'medium', 'high']),
      autoStop: randomBoolean(),
      ...(randomBoolean(0.5) ? { maxDuration: randomInt(300, 3600) } : {}),
    },
    stats: {
      totalSegments,
      totalDetections,
      avgConfidence: randomFloat(0.6, 0.98),
    },
    createdAt: startedAt.toISOString(),
    updatedAt: (endedAt || startedAt).toISOString(),
    ...overrides,
  };
};

export const createMockDetection = (overrides: Partial<MockDetection> = {}): MockDetection => {
  const types = ['CLEAN', 'OFFENSIVE', 'HATE', 'SPAM', 'TOXIC'] as const;
  const severities = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as const;
  
  const type = randomElement(types);
  const severity = randomElement(severities);
  const confidence = randomFloat(0.5, 0.99);
  
  const phrases = type === 'CLEAN' ? VIETNAMESE_PHRASES : OFFENSIVE_PHRASES;
  const snippet = randomElement(phrases);
  
  const startMs = randomInt(0, 30000);
  const endMs = startMs + randomInt(1000, 5000);

  return {
    id: generateId(),
    sessionId: generateId(),
    label: type,
    severity,
    score: confidence,
    snippet,
    startMs,
    endMs,
    createdAt: new Date().toISOString(),
    ...overrides,
  };
};

export const createMockTranscript = (overrides: Partial<MockTranscript> = {}): MockTranscript => {
  const startMs = randomInt(0, 60000);
  const endMs = startMs + randomInt(1000, 5000);

  return {
    id: generateId(),
    sessionId: generateId(),
    segIdx: randomInt(0, 100),
    text: randomElement(VIETNAMESE_PHRASES),
    startMs,
    endMs,
    confidence: randomFloat(0.7, 0.99),
    createdAt: new Date().toISOString(),
    ...overrides,
  };
};

export const createMockUser = (overrides: any = {}) => ({
  id: generateId(),
  firstName: randomElement(USER_NAMES.map(n => n.split(' ')[0])),
  lastName: randomElement(USER_NAMES.map(n => n.split(' ').slice(1).join(' '))),
  emailAddress: 'test@vnsg.dev',
  imageUrl: 'https://img.clerk.com/test-avatar.jpg',
  ...overrides,
});

export const createMockStats = (overrides: any = {}) => ({
  totalSessions: randomInt(1000, 2000),
  totalDetections: randomInt(50, 200),
  toxicPercent: randomFloat(5, 15),
  ...overrides,
});

// =============================================================================
// Factory Builders for Complex Scenarios
// =============================================================================

export const createRiskScenarioSessions = () => [
  createMockSession({ 
    name: 'Phiên an toàn',
    stats: { totalSegments: 50, totalDetections: 2, avgConfidence: 0.95 }
  }),
  createMockSession({ 
    name: 'Phiên cảnh báo',
    stats: { totalSegments: 30, totalDetections: 8, avgConfidence: 0.87 }
  }),
  createMockSession({ 
    name: 'Phiên nguy hiểm',
    stats: { totalSegments: 20, totalDetections: 15, avgConfidence: 0.92 }
  }),
];

export const createTimelineData = (days = 7) => 
  Array.from({ length: days }, (_, i) => ({
    date: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    sessions: randomInt(10, 50),
    detections: randomInt(0, 10),
  })).reverse();

// =============================================================================
// Performance Test Data
// =============================================================================

export const createLargeSessionDataset = (count = 1000) =>
  Array.from({ length: count }, () => createMockSession());

export const createHighFrequencyDetections = (sessionId: string, count = 100) =>
  Array.from({ length: count }, (_, i) => createMockDetection({
    sessionId,
    startMs: i * 1000,
    endMs: (i + 1) * 1000,
  }));

// =============================================================================
// Audio Testing Utilities
// =============================================================================

export const createMockAudioData = (sampleCount: number, duration: number): Float32Array => {
  const samples = new Float32Array(sampleCount);
  const frequency = 440; // A4 note for consistent test audio
  const sampleRate = sampleCount / duration;
  
  for (let i = 0; i < sampleCount; i++) {
    // Generate sine wave with some randomness for realistic audio
    const time = i / sampleRate;
    const baseWave = Math.sin(2 * Math.PI * frequency * time);
    const noise = (Math.random() - 0.5) * 0.1;
    samples[i] = baseWave * 0.8 + noise;
  }
  
  return samples;
};