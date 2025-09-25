/**
 * Mock Data Factories - P32 Testing Infrastructure  
 * Mục đích: Type-safe mock data generation for comprehensive testing
 * Research: Factory pattern với realistic Vietnamese content cho Speech Guardian
 */

// VI: Simple mock data generation without external dependencies
// Replaced faker with built-in JavaScript for better compatibility

// =============================================================================
// Helper Functions for Mock Data Generation
// =============================================================================

const randomElement = <T>(array: T[]): T => array[Math.floor(Math.random() * array.length)];
const randomInt = (min: number, max: number): number => Math.floor(Math.random() * (max - min + 1)) + min;
const randomFloat = (min: number, max: number, precision = 2): number => 
  Math.round((Math.random() * (max - min) + min) * Math.pow(10, precision)) / Math.pow(10, precision);
const randomBoolean = (probability = 0.5): boolean => Math.random() < probability;
const randomDate = (daysBack = 30): Date => new Date(Date.now() - Math.random() * daysBack * 24 * 60 * 60 * 1000);
const generateId = (): string => `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

// =============================================================================
// Base Types (matching OpenAPI schema)
// =============================================================================

export interface SessionDto {
  id: string
  name: string
  description?: string
  startedAt: string
  endedAt?: string
  status: 'idle' | 'recording' | 'processing' | 'completed' | 'error'
  duration?: number
  settings: {
    language: 'vi' | 'en'
    sensitivity: 'low' | 'medium' | 'high'
    autoStop: boolean
    maxDuration?: number
  }
  stats: {
    totalSegments: number
    totalDetections: number
    avgConfidence: number
  }
  createdAt: string
  updatedAt: string
}

export interface DetectionDto {
  id: string
  sessionId: string
  type: 'CLEAN' | 'OFFENSIVE' | 'HATE' | 'SPAM' | 'TOXIC'
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  confidence: number
  snippet: string
  context: string
  startMs: number
  endMs: number
  recommended_action: 'LOG' | 'WARN' | 'BLOCK' | 'ESCALATE'
  metadata: {
    keywords: string[]
    category: string
    processed_by: 'PHOBERT' | 'RULE_ENGINE' | 'HYBRID'
  }
  createdAt: string
}

export interface TranscriptDto {
  id: string
  sessionId: string
  text: string
  confidence: number
  startMs: number
  endMs: number
  speaker?: string
  language: 'vi' | 'en'
  is_final: boolean
  words: Array<{
    word: string
    startMs: number
    endMs: number
    confidence: number
  }>
  createdAt: string
}

export interface StatsOverviewDto {
  totalSessions: number
  activeSessions: number
  totalMinutesProcessed: number
  safetyScore: number
  detectionsToday: number
  trends: {
    sessions: { value: number; period: string; direction: 'up' | 'down' }
    detections: { value: number; period: string; direction: 'up' | 'down' }
    safety: { value: number; period: string; direction: 'up' | 'down' }
  }
  topDetectionTypes: Array<{
    type: string
    count: number
    percentage: number
  }>
}

// =============================================================================
// Vietnamese Content Templates
// =============================================================================

const VIETNAMESE_PHRASES = [
  'Xin chào, tôi tên là Nguyễn Văn An',
  'Hôm nay thời tiết thật đẹp',
  'Chúng ta cùng làm việc với nhau',
  'Cảm ơn bạn đã giúp đỡ tôi',
  'Tôi đang học tiếng Việt',
  'Gia đình tôi sống ở Hà Nội',
  'Món phở này rất ngon',
  'Chúc mừng năm mới',
  'Tôi thích đọc sách',
  'Hẹn gặp lại bạn sau',
]

const OFFENSIVE_PHRASES = [
  'từ không phù hợp',
  'nội dung độc hại',
  'ngôn từ thù địch',
  'bình luận tiêu cực',
  'từ ngữ không tôn trọng',
]

const KEYWORDS_BY_CATEGORY = {
  CLEAN: ['xin chào', 'cảm ơn', 'làm ơn', 'tốt lành', 'hòa bình'],
  OFFENSIVE: ['chửi thề', 'tục tĩu', 'không lịch sự', 'thô lỗ'],
  HATE: ['kỳ thị', 'phân biệt', 'thù địch', 'ghét bỏ'],
  SPAM: ['quảng cáo', 'spam', 'lừa đảo', 'giảm giá'],
  TOXIC: ['độc hại', 'có hại', 'tiêu cực', 'phá hoại'],
}

// =============================================================================
// Session Mock Factory
// =============================================================================

export const createMockSession = (overrides: Partial<SessionDto> = {}): SessionDto => {
  const startedAt = faker.date.recent(7) // Last 7 days
  const endedAt = faker.datatype.boolean(0.7) 
    ? faker.date.between(startedAt, new Date()) 
    : undefined

  const duration = endedAt 
    ? Math.floor((endedAt.getTime() - startedAt.getTime()) / 1000)
    : undefined

  const totalSegments = faker.datatype.number({ min: 5, max: 100 })
  const totalDetections = faker.datatype.number({ min: 0, max: Math.floor(totalSegments * 0.3) })

  return {
    id: faker.datatype.uuid(),
    name: `Phiên ghi âm ${faker.date.recent().toLocaleDateString('vi-VN')}`,
    description: faker.lorem.sentence(),
    startedAt: startedAt.toISOString(),
    endedAt: endedAt?.toISOString(),
    status: faker.helpers.arrayElement(['idle', 'recording', 'processing', 'completed', 'error']),
    duration,
    settings: {
      language: faker.helpers.arrayElement(['vi', 'en']),
      sensitivity: faker.helpers.arrayElement(['low', 'medium', 'high']),
      autoStop: faker.datatype.boolean(),
      maxDuration: faker.helpers.maybe(() => faker.datatype.number({ min: 300, max: 3600 }), 0.5),
    },
    stats: {
      totalSegments,
      totalDetections,
      avgConfidence: faker.datatype.float({ min: 0.6, max: 0.98, precision: 0.01 }),
    },
    createdAt: startedAt.toISOString(),
    updatedAt: faker.date.between(startedAt, new Date()).toISOString(),
    ...overrides,
  }
}

export const createMockSessionList = (count = 10): SessionDto[] => {
  return Array.from({ length: count }, () => createMockSession())
}

// =============================================================================
// Detection Mock Factory
// =============================================================================

export const createMockDetection = (overrides: Partial<DetectionDto> = {}): DetectionDto => {
  const type = faker.helpers.arrayElement(['CLEAN', 'OFFENSIVE', 'HATE', 'SPAM', 'TOXIC'])
  const severity = faker.helpers.arrayElement(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'])
  const confidence = faker.datatype.float({ min: 0.5, max: 0.99, precision: 0.01 })
  
  // Generate realistic Vietnamese content
  const isOffensive = ['OFFENSIVE', 'HATE', 'TOXIC'].includes(type)
  const snippet = isOffensive 
    ? faker.helpers.arrayElement(OFFENSIVE_PHRASES)
    : faker.helpers.arrayElement(VIETNAMESE_PHRASES)
  
  const context = `... ${snippet} ...`
  const keywords = KEYWORDS_BY_CATEGORY[type as keyof typeof KEYWORDS_BY_CATEGORY] || []
  
  const startMs = faker.datatype.number({ min: 1000, max: 300000 }) // 1s to 5min
  const endMs = startMs + faker.datatype.number({ min: 1000, max: 5000 }) // 1-5s duration

  return {
    id: faker.datatype.uuid(),
    sessionId: faker.datatype.uuid(),
    type,
    severity,
    confidence,
    snippet,
    context,
    startMs,
    endMs,
    recommended_action: faker.helpers.arrayElement(['LOG', 'WARN', 'BLOCK', 'ESCALATE']),
    metadata: {
      keywords: faker.helpers.arrayElements(keywords, faker.datatype.number({ min: 1, max: 3 })),
      category: type.toLowerCase(),
      processed_by: faker.helpers.arrayElement(['PHOBERT', 'RULE_ENGINE', 'HYBRID']),
    },
    createdAt: faker.date.recent().toISOString(),
    ...overrides,
  }
}

export const createMockDetectionList = (sessionId: string, count = 5): DetectionDto[] => {
  return Array.from({ length: count }, () => 
    createMockDetection({ sessionId })
  )
}

// =============================================================================
// Transcript Mock Factory
// =============================================================================

export const createMockTranscript = (overrides: Partial<TranscriptDto> = {}): TranscriptDto => {
  const text = faker.helpers.arrayElement(VIETNAMESE_PHRASES)
  const words = text.split(' ')
  const startMs = faker.datatype.number({ min: 0, max: 300000 })
  const totalDuration = faker.datatype.number({ min: 2000, max: 8000 })
  const endMs = startMs + totalDuration

  // Generate word-level timestamps
  const wordTimings = words.map((word, index) => {
    const wordStartMs = startMs + (index * totalDuration / words.length)
    const wordEndMs = wordStartMs + (totalDuration / words.length)
    
    return {
      word,
      startMs: Math.floor(wordStartMs),
      endMs: Math.floor(wordEndMs),
      confidence: faker.datatype.float({ min: 0.7, max: 0.99, precision: 0.01 }),
    }
  })

  return {
    id: faker.datatype.uuid(),
    sessionId: faker.datatype.uuid(),
    text,
    confidence: faker.datatype.float({ min: 0.8, max: 0.99, precision: 0.01 }),
    startMs,
    endMs,
    speaker: faker.helpers.maybe(() => `Speaker ${faker.datatype.number({ min: 1, max: 3 })}`, 0.3),
    language: faker.helpers.arrayElement(['vi', 'en']),
    is_final: faker.datatype.boolean(0.8),
    words: wordTimings,
    createdAt: faker.date.recent().toISOString(),
    ...overrides,
  }
}

export const createMockTranscriptList = (sessionId: string, count = 20): TranscriptDto[] => {
  return Array.from({ length: count }, (_, index) => 
    createMockTranscript({ 
      sessionId,
      startMs: index * 3000, // 3s intervals
      endMs: (index + 1) * 3000,
    })
  )
}

// =============================================================================
// Stats Mock Factory
// =============================================================================

export const createMockStatsOverview = (overrides: Partial<StatsOverviewDto> = {}): StatsOverviewDto => {
  const totalSessions = faker.datatype.number({ min: 50, max: 500 })
  const activeSessions = faker.datatype.number({ min: 0, max: 10 })
  const totalMinutesProcessed = faker.datatype.number({ min: 1000, max: 10000 })
  const detectionsToday = faker.datatype.number({ min: 5, max: 50 })
  
  // Calculate safety score based on detections
  const safetyScore = Math.max(0, 100 - (detectionsToday * 2))

  return {
    totalSessions,
    activeSessions,
    totalMinutesProcessed,
    safetyScore,
    detectionsToday,
    trends: {
      sessions: {
        value: faker.datatype.number({ min: -15, max: 25 }),
        period: '7d',
        direction: faker.helpers.arrayElement(['up', 'down']),
      },
      detections: {
        value: faker.datatype.number({ min: -30, max: 40 }),
        period: '24h',
        direction: faker.helpers.arrayElement(['up', 'down']),
      },
      safety: {
        value: faker.datatype.number({ min: -10, max: 15 }),
        period: '7d',
        direction: faker.helpers.arrayElement(['up', 'down']),
      },
    },
    topDetectionTypes: [
      { type: 'OFFENSIVE', count: 15, percentage: 45 },
      { type: 'SPAM', count: 8, percentage: 24 },
      { type: 'HATE', count: 6, percentage: 18 },
      { type: 'TOXIC', count: 4, percentage: 13 },
    ],
    ...overrides,
  }
}

// =============================================================================
// User Profile Mock Factory
// =============================================================================

export interface UserProfileDto {
  id: string
  email: string
  name: string
  avatar?: string
  role: 'USER' | 'ADMIN' | 'MODERATOR'
  preferences: {
    language: 'vi' | 'en'
    theme: 'light' | 'dark'
    notifications: boolean
    autoSave: boolean
  }
  stats: {
    totalSessions: number
    totalMinutes: number
    joinedAt: string
  }
}

export const createMockUserProfile = (overrides: Partial<UserProfileDto> = {}): UserProfileDto => {
  const firstName = faker.name.firstName()
  const lastName = faker.name.lastName()
  
  return {
    id: faker.datatype.uuid(),
    email: faker.internet.email(firstName, lastName),
    name: `${firstName} ${lastName}`,
    avatar: faker.helpers.maybe(() => faker.internet.avatar(), 0.6),
    role: faker.helpers.arrayElement(['USER', 'ADMIN', 'MODERATOR']),
    preferences: {
      language: faker.helpers.arrayElement(['vi', 'en']),
      theme: faker.helpers.arrayElement(['light', 'dark']),
      notifications: faker.datatype.boolean(0.8),
      autoSave: faker.datatype.boolean(0.9),
    },
    stats: {
      totalSessions: faker.datatype.number({ min: 0, max: 100 }),
      totalMinutes: faker.datatype.number({ min: 0, max: 5000 }),
      joinedAt: faker.date.past().toISOString(),
    },
    ...overrides,
  }
}

// =============================================================================
// Audio Data Mock Factory
// =============================================================================

export const createMockAudioData = (sampleRate = 16000, duration = 1): Float32Array => {
  const samples = sampleRate * duration
  const data = new Float32Array(samples)
  
  // Generate sine wave với noise
  for (let i = 0; i < samples; i++) {
    const t = i / sampleRate
    const frequency = 440 // A4 note
    const sine = Math.sin(2 * Math.PI * frequency * t)
    const noise = (Math.random() - 0.5) * 0.1
    data[i] = sine * 0.5 + noise
  }
  
  return data
}

export const createMockAudioChunk = (chunkSize = 4096): ArrayBuffer => {
  const data = new Float32Array(chunkSize)
  
  for (let i = 0; i < chunkSize; i++) {
    data[i] = (Math.random() - 0.5) * 2 // Random audio data
  }
  
  return data.buffer
}

// =============================================================================
// WebSocket Event Mock Factory
// =============================================================================

export interface SocketEventDto {
  event: string
  data: any
  timestamp: string
}

export const createMockSocketEvent = (
  event: string, 
  data: any,
  overrides: Partial<SocketEventDto> = {}
): SocketEventDto => {
  return {
    event,
    data,
    timestamp: new Date().toISOString(),
    ...overrides,
  }
}

// Common socket events
export const createTranscriptPartialEvent = (text: string) => 
  createMockSocketEvent('transcript-partial', { text, timestamp: Date.now() })

export const createTranscriptFinalEvent = (transcript: TranscriptDto) =>
  createMockSocketEvent('transcript-final', transcript)

export const createDetectionAlertEvent = (detection: DetectionDto) =>
  createMockSocketEvent('detection-alert', detection)

export const createSessionStatusEvent = (status: string) =>
  createMockSocketEvent('session-status', { status, timestamp: Date.now() })

// =============================================================================
// Batch Factory Functions
// =============================================================================

export const createMockDashboardData = () => ({
  sessions: createMockSessionList(15),
  stats: createMockStatsOverview(),
  recentDetections: createMockDetectionList('recent-session', 8),
  user: createMockUserProfile(),
})

export const createMockLiveProcessingData = (sessionId: string) => ({
  session: createMockSession({ id: sessionId, status: 'recording' }),
  transcripts: createMockTranscriptList(sessionId, 10),
  detections: createMockDetectionList(sessionId, 3),
  audioData: createMockAudioData(),
})

// =============================================================================
// Test Scenario Builders
// =============================================================================

export const createHighRiskSession = (): SessionDto => {
  return createMockSession({
    stats: {
      totalSegments: 50,
      totalDetections: 25, // High detection rate
      avgConfidence: 0.92,
    },
    status: 'completed',
  })
}

export const createSafeSession = (): SessionDto => {
  return createMockSession({
    stats: {
      totalSegments: 100,
      totalDetections: 2, // Very low detection rate
      avgConfidence: 0.95,
    },
    status: 'completed',
  })
}

export const createProcessingSession = (): SessionDto => {
  return createMockSession({
    status: 'processing',
    endedAt: undefined,
    duration: undefined,
  })
}

// =============================================================================
// Export Factory Functions
// =============================================================================

export const mockFactories = {
  session: createMockSession,
  sessionList: createMockSessionList,
  detection: createMockDetection,
  detectionList: createMockDetectionList,
  transcript: createMockTranscript,
  transcriptList: createMockTranscriptList,
  stats: createMockStatsOverview,
  user: createMockUserProfile,
  audioData: createMockAudioData,
  audioChunk: createMockAudioChunk,
  socketEvent: createMockSocketEvent,
  dashboardData: createMockDashboardData,
  liveProcessingData: createMockLiveProcessingData,
  
  // Scenario builders
  scenarios: {
    highRisk: createHighRiskSession,
    safe: createSafeSession,
    processing: createProcessingSession,
  },
}