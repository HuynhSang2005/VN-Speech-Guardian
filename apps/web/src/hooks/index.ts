/**
 * Custom React hooks cho VN Speech Guardian
 * Core hooks theo frontend.instructions.md patterns
 */

export { useAudio } from './use-audio'
export { useWebSocket } from './use-websocket'
export { useLocalStorage } from './use-local-storage'
export { useDebounce } from './use-debounce'
export { useMediaPermissions } from './use-media-permissions'
export { useDetectionHistory } from './use-detection-history'

// Types export
export type * from './types'