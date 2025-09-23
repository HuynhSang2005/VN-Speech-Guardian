/**
 * Hook để xử lý media permissions (microphone, camera)
 * Modern React 19 với proper permission handling
 */
import { useCallback, useEffect, useState } from 'react';
import type { 
  TMediaPermissionState,
  THookError 
} from '@/schemas';
import type { MediaPermissions, UseMediaPermissionsReturn } from '@/types/hooks';

export function useMediaPermissions(): UseMediaPermissionsReturn {
  const [permissions, setPermissions] = useState<MediaPermissions>({
    microphone: 'prompt',
    camera: 'prompt'
  });
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<THookError | null>(null);

  // Check if Permissions API is supported
  const isPermissionsAPISupported = 'permissions' in navigator && 'query' in navigator.permissions;

  // Map permission state từ PermissionStatus to our type
  const mapPermissionState = (state: PermissionState): TMediaPermissionState => {
    switch (state) {
      case 'granted':
        return 'granted';
      case 'denied':
        return 'denied';
      case 'prompt':
      default:
        return 'prompt';
    }
  };

  // Check current permission status
  const checkPermissions = useCallback(async (): Promise<void> => {
    if (!isPermissionsAPISupported) {
      // Fallback: assume prompt nếu không support Permissions API
      setPermissions({ microphone: 'prompt' });
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Check microphone permission
      const micPermission = await navigator.permissions.query({ name: 'microphone' as PermissionName });
      
      const newPermissions: MediaPermissions = {
        microphone: mapPermissionState(micPermission.state)
      };

      // Check camera permission if supported
      try {
        const cameraPermission = await navigator.permissions.query({ name: 'camera' as PermissionName });
        newPermissions.camera = mapPermissionState(cameraPermission.state);
      } catch {
        // Camera permission check failed or not supported
        // Leave camera as undefined
      }

      setPermissions(newPermissions);
    } catch (err) {
      const checkError: THookError = {
        message: err instanceof Error ? err.message : 'Failed to check permissions',
        code: 'PERMISSION_CHECK_FAILED',
        timestamp: new Date()
      };
      setError(checkError);
    } finally {
      setIsLoading(false);
    }
  }, [isPermissionsAPISupported]);

  // Request microphone permission
  const requestMicrophone = useCallback(async (): Promise<TMediaPermissionState> => {
    setIsLoading(true);
    setError(null);

    try {
      // Try to get microphone access
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: true,
        video: false
      });

      // If successful, stop the stream (chỉ cần permission)
      stream.getTracks().forEach(track => track.stop());

      // Update permission state
      setPermissions(prev => ({
        ...prev,
        microphone: 'granted'
      }));

      return 'granted';

    } catch (err) {
      let permissionState: TMediaPermissionState = 'denied';
      let errorMessage = 'Microphone access denied';

      if (err instanceof Error) {
        // Determine more specific error
        if (err.name === 'NotAllowedError') {
          permissionState = 'denied';
          errorMessage = 'Microphone access denied by user';
        } else if (err.name === 'NotFoundError') {
          errorMessage = 'No microphone device found';
        } else if (err.name === 'NotSupportedError') {
          errorMessage = 'Microphone not supported in this browser';
        } else {
          errorMessage = err.message;
        }
      }

      const requestError: THookError = {
        message: errorMessage,
        code: 'MICROPHONE_REQUEST_FAILED',
        timestamp: new Date()
      };
      
      setError(requestError);
      setPermissions(prev => ({
        ...prev,
        microphone: permissionState
      }));

      return permissionState;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Request camera permission
  const requestCamera = useCallback(async (): Promise<TMediaPermissionState> => {
    setIsLoading(true);
    setError(null);

    try {
      // Try to get camera access
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: true,
        audio: false
      });

      // If successful, stop the stream
      stream.getTracks().forEach(track => track.stop());

      // Update permission state
      setPermissions(prev => ({
        ...prev,
        camera: 'granted'
      }));

      return 'granted';

    } catch (err) {
      let permissionState: TMediaPermissionState = 'denied';
      let errorMessage = 'Camera access denied';

      if (err instanceof Error) {
        if (err.name === 'NotAllowedError') {
          permissionState = 'denied';
          errorMessage = 'Camera access denied by user';
        } else if (err.name === 'NotFoundError') {
          errorMessage = 'No camera device found';
        } else if (err.name === 'NotSupportedError') {
          errorMessage = 'Camera not supported in this browser';
        } else {
          errorMessage = err.message;
        }
      }

      const requestError: THookError = {
        message: errorMessage,
        code: 'CAMERA_REQUEST_FAILED',
        timestamp: new Date()
      };
      
      setError(requestError);
      setPermissions(prev => ({
        ...prev,
        camera: permissionState
      }));

      return permissionState;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Listen to permission changes (nếu Permissions API supported)
  useEffect(() => {
    if (!isPermissionsAPISupported) {
      return;
    }

    let micPermission: PermissionStatus | null = null;
    let cameraPermission: PermissionStatus | null = null;

    const setupPermissionListeners = async () => {
      try {
        micPermission = await navigator.permissions.query({ name: 'microphone' as PermissionName });
        
        const handleMicChange = () => {
          setPermissions(prev => ({
            ...prev,
            microphone: mapPermissionState(micPermission!.state)
          }));
        };

        micPermission.addEventListener('change', handleMicChange);

        // Setup camera permission listener if supported
        try {
          cameraPermission = await navigator.permissions.query({ name: 'camera' as PermissionName });
          
          const handleCameraChange = () => {
            setPermissions(prev => ({
              ...prev,
              camera: mapPermissionState(cameraPermission!.state)
            }));
          };

          cameraPermission.addEventListener('change', handleCameraChange);
        } catch {
          // Camera permission not supported
        }

        // Initial check
        await checkPermissions();

      } catch (err) {
        console.warn('Failed to setup permission listeners:', err);
      }
    };

    void setupPermissionListeners();

    // Cleanup - simplified to avoid scope issues
    return () => {
      // Event listeners will be cleaned up when permissions are garbage collected
    };
  }, [isPermissionsAPISupported, checkPermissions]);

  // Initial permission check on mount
  useEffect(() => {
    void checkPermissions();
  }, [checkPermissions]);

  return {
    permissions,
    isLoading,
    error,
    requestMicrophone,
    requestCamera,
    checkPermissions
  };
}

export default useMediaPermissions;
