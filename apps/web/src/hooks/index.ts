/**
 * Custom React hooks cho VN Speech Guardian
 * Core hooks theo frontend.instructions.md patterns
 */

// Core hooks
export { useAudio } from './use-audio';
export { useWebSocket } from './use-websocket';
export { useLocalStorage } from './use-local-storage';
export { useMediaPermissions } from './use-media-permissions';
export { useDetectionHistory } from './use-detection-history';

// Debounce hooks - multiple exports
export { 
  useDebounce, 
  useDebouncedCallback, 
  useDebouncedState 
} from './use-debounce';

// Types are exported from /src/types/ folder