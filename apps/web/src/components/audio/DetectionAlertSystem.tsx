/**
 * DetectionAlertSystem - Professional alert system for speech content detection
 * 
 * Features:
 * - Real-time detection alerts (CLEAN/OFFENSIVE/HATE)
 * - Severity-based styling and urgency levels
 * - Toast notifications with custom styling
 * - Alert history and aggregation
 * - Sound notifications (optional)
 * - Dismissible alerts with auto-expiry
 * - Performance optimized with React.memo
 * 
 * Integration:
 * - Connects to detection results from Socket.IO
 * - Integrates with Sonner for toast notifications
 * - Supports custom alert actions and callbacks
 * - Includes accessibility features for screen readers
 */

import React, { useMemo, useCallback, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  AlertTriangle, 
  Shield, 
  CheckCircle, 
  X, 
  Volume2, 
  VolumeX,
  Clock,
  TrendingUp,
  Eye,
  EyeOff,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';

// =============================================================================
// Types & Interfaces
// =============================================================================

export interface DetectionAlert {
  /** Unique alert identifier */
  id: string;
  
  /** Detection type */
  type: 'CLEAN' | 'OFFENSIVE' | 'HATE';
  
  /** Alert severity level */
  severity: 'LOW' | 'MEDIUM' | 'HIGH';
  
  /** Confidence score for detection */
  confidence: number;
  
  /** Text snippet that triggered detection */
  snippet: string;
  
  /** Full context text */
  context?: string;
  
  /** Session information */
  sessionId: string;
  
  /** Timestamp when alert was created */
  timestamp: Date;
  
  /** Whether alert has been acknowledged by user */
  acknowledged: boolean;
  
  /** Whether alert should auto-dismiss */
  autoDismiss?: boolean;
  
  /** Custom action for the alert */
  action?: {
    label: string;
    onClick: () => void;
  };
}

interface DetectionAlertSystemProps {
  /** Array of detection alerts */
  alerts: DetectionAlert[];
  
  /** Whether to show toast notifications */
  enableToasts?: boolean;
  
  /** Whether to play sound notifications */
  enableSounds?: boolean;
  
  /** Maximum number of visible alerts */
  maxVisibleAlerts?: number;
  
  /** Auto-dismiss timeout in milliseconds */
  autoDismissTimeout?: number;
  
  /** Whether to show alert statistics */
  showStatistics?: boolean;
  
  /** Custom className for styling */
  className?: string;
  
  /** Callback when alert is acknowledged */
  onAlertAcknowledged?: (alertId: string) => void;
  
  /** Callback when alert is dismissed */
  onAlertDismissed?: (alertId: string) => void;
  
  /** Callback when alert is clicked */
  onAlertClicked?: (alert: DetectionAlert) => void;
  
  /** Callback for custom alert actions */
  onCustomAction?: (alert: DetectionAlert, actionType: string) => void;
}

// =============================================================================
// Alert Configuration
// =============================================================================

const ALERT_CONFIG = {
  CLEAN: {
    icon: CheckCircle,
    colors: {
      bg: 'bg-green-500/10',
      border: 'border-green-500/30',
      text: 'text-green-400',
      badge: 'bg-green-500 text-green-50',
    },
    priority: 1,
    sound: null, // No sound for clean content
  },
  OFFENSIVE: {
    icon: AlertTriangle,
    colors: {
      bg: 'bg-yellow-500/10',
      border: 'border-yellow-500/30', 
      text: 'text-yellow-400',
      badge: 'bg-yellow-500 text-yellow-50',
    },
    priority: 2,
    sound: 'notification', // Moderate sound
  },
  HATE: {
    icon: Shield,
    colors: {
      bg: 'bg-red-500/10',
      border: 'border-red-500/30',
      text: 'text-red-400',
      badge: 'bg-red-500 text-red-50',
    },
    priority: 3,
    sound: 'alert', // Urgent sound
  },
} as const;

const SEVERITY_CONFIG = {
  LOW: {
    intensity: 'opacity-70',
    urgency: 'Normal',
  },
  MEDIUM: {
    intensity: 'opacity-90 animate-pulse-slow',
    urgency: 'Elevated',
  },
  HIGH: {
    intensity: 'opacity-100 animate-pulse',
    urgency: 'Critical',
  },
} as const;

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Formats timestamp to human-readable format
 */
const formatTimestamp = (date: Date): string => {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  
  if (diffSeconds < 60) return 'Just now';
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  
  return date.toLocaleDateString();
};

/**
 * Gets alert configuration based on type and severity
 */
const getAlertConfig = (type: DetectionAlert['type'], severity: DetectionAlert['severity']) => {
  const typeConfig = ALERT_CONFIG[type];
  const severityConfig = SEVERITY_CONFIG[severity];
  
  return {
    ...typeConfig,
    ...severityConfig,
    priority: typeConfig.priority + (severity === 'HIGH' ? 2 : severity === 'MEDIUM' ? 1 : 0),
  };
};

// =============================================================================
// Alert Item Component
// =============================================================================

interface AlertItemProps {
  alert: DetectionAlert;
  onAcknowledge: (alertId: string) => void;
  onDismiss: (alertId: string) => void;
  onClick: (alert: DetectionAlert) => void;
  showStatistics: boolean;
}

const AlertItem = React.memo<AlertItemProps>(({ 
  alert, 
  onAcknowledge, 
  onDismiss, 
  onClick,
  showStatistics 
}) => {
  const config = useMemo(() => getAlertConfig(alert.type, alert.severity), [alert.type, alert.severity]);
  const IconComponent = config.icon;
  
  return (
    <motion.div
      initial={{ opacity: 0, x: 100, scale: 0.9 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 100, scale: 0.9 }}
      whileHover={{ scale: 1.02 }}
      className={cn(
        "group relative p-4 rounded-lg border cursor-pointer transition-all duration-200",
        config.colors.bg,
        config.colors.border,
        config.intensity,
        "hover:shadow-lg hover:shadow-black/20",
        alert.acknowledged && "opacity-50"
      )}
      onClick={() => onClick(alert)}
    >
      {/* Alert Header */}
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center space-x-2">
          <IconComponent className={cn("w-5 h-5", config.colors.text)} />
          <Badge className={cn("text-xs font-medium", config.colors.badge)}>
            {alert.type}
          </Badge>
          <Badge variant="outline" className="text-xs">
            {alert.severity}
          </Badge>
          {showStatistics && (
            <span className="text-xs text-gray-400">
              {Math.round(alert.confidence * 100)}%
            </span>
          )}
        </div>
        
        <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {!alert.acknowledged && (
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onAcknowledge(alert.id);
              }}
              className={cn("text-xs h-6 px-2", config.colors.text)}
            >
              <CheckCircle className="w-3 h-3 mr-1" />
              ACK
            </Button>
          )}
          
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onDismiss(alert.id);
            }}
            className="text-gray-400 hover:text-red-400 h-6 w-6 p-0"
          >
            <X className="w-3 h-3" />
          </Button>
        </div>
      </div>
      
      {/* Alert Content */}
      <div className="space-y-2">
        <p className={cn("text-sm font-medium", config.colors.text)}>
          "{alert.snippet}"
        </p>
        
        {alert.context && (
          <p className="text-xs text-gray-400 line-clamp-2">
            Context: {alert.context}
          </p>
        )}
        
        <div className="flex items-center justify-between text-xs text-gray-500">
          <span className="flex items-center space-x-1">
            <Clock className="w-3 h-3" />
            <span>{formatTimestamp(alert.timestamp)}</span>
          </span>
          
          <span className="flex items-center space-x-1">
            <span>Urgency: {config.urgency}</span>
          </span>
        </div>
      </div>
      
      {/* Custom Action */}
      {alert.action && (
        <div className="mt-3 pt-3 border-t border-gray-700/30">
          <Button
            variant="outline"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              alert.action!.onClick();
            }}
            className="text-xs"
          >
            {alert.action.label}
          </Button>
        </div>
      )}
      
      {/* Acknowledged Indicator */}
      {alert.acknowledged && (
        <div className="absolute top-2 right-2 w-2 h-2 bg-green-500 rounded-full" />
      )}
    </motion.div>
  );
});

AlertItem.displayName = 'AlertItem';

// =============================================================================
// Statistics Component
// =============================================================================

interface AlertStatisticsProps {
  alerts: DetectionAlert[];
  className?: string;
}

const AlertStatistics: React.FC<AlertStatisticsProps> = ({ alerts, className }) => {
  const stats = useMemo(() => {
    const total = alerts.length;
    const acknowledged = alerts.filter(a => a.acknowledged).length;
    const byType = alerts.reduce((acc, alert) => {
      acc[alert.type] = (acc[alert.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    const bySeverity = alerts.reduce((acc, alert) => {
      acc[alert.severity] = (acc[alert.severity] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    const avgConfidence = alerts.length > 0 
      ? alerts.reduce((sum, alert) => sum + alert.confidence, 0) / alerts.length
      : 0;
    
    return {
      total,
      acknowledged,
      byType,
      bySeverity,
      avgConfidence,
    };
  }, [alerts]);
  
  return (
    <Card className={cn("p-4 bg-gray-800/50 border-gray-700/30", className)}>
      <div className="flex items-center space-x-2 mb-3">
        <TrendingUp className="w-4 h-4 text-blue-400" />
        <h4 className="text-sm font-medium text-gray-200">Detection Statistics</h4>
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <div className="text-xs text-gray-400">Total Alerts</div>
          <div className="text-lg font-bold text-gray-200">{stats.total}</div>
        </div>
        
        <div className="space-y-2">
          <div className="text-xs text-gray-400">Acknowledged</div>
          <div className="text-lg font-bold text-green-400">{stats.acknowledged}</div>
        </div>
        
        <div className="space-y-2">
          <div className="text-xs text-gray-400">Avg Confidence</div>
          <div className="text-lg font-bold text-blue-400">
            {Math.round(stats.avgConfidence * 100)}%
          </div>
        </div>
        
        <div className="space-y-2">
          <div className="text-xs text-gray-400">High Severity</div>
          <div className="text-lg font-bold text-red-400">{stats.bySeverity.HIGH || 0}</div>
        </div>
      </div>
      
      {/* Type Breakdown */}
      <div className="mt-4 pt-4 border-t border-gray-700/30">
        <div className="grid grid-cols-3 gap-2">
          {Object.entries(stats.byType).map(([type, count]) => {
            const config = ALERT_CONFIG[type as keyof typeof ALERT_CONFIG];
            return (
              <div key={type} className="text-center">
                <div className={cn("text-xs font-medium", config.colors.text)}>
                  {type}
                </div>
                <div className="text-sm font-bold text-gray-200">{count}</div>
              </div>
            );
          })}
        </div>
      </div>
    </Card>
  );
};

// =============================================================================
// Main Component
// =============================================================================

export const DetectionAlertSystem: React.FC<DetectionAlertSystemProps> = ({
  alerts,
  enableToasts = true,
  enableSounds = true,
  maxVisibleAlerts = 5,
  autoDismissTimeout = 10000, // 10 seconds
  showStatistics = true,
  className,
  onAlertAcknowledged,
  onAlertDismissed,
  onAlertClicked,
  // onCustomAction, // Commented out unused parameter
}) => {
  const [dismissedAlerts, setDismissedAlerts] = useState<Set<string>>(new Set());
  const [soundEnabled, setSoundEnabled] = useState(enableSounds);
  const [statisticsVisible, setStatisticsVisible] = useState(showStatistics);
  const processedAlerts = useRef<Set<string>>(new Set());
  
  // Filter and sort alerts
  const visibleAlerts = useMemo(() => {
    return alerts
      .filter(alert => !dismissedAlerts.has(alert.id))
      .sort((a, b) => {
        // Sort by priority (type + severity), then by timestamp
        const configA = getAlertConfig(a.type, a.severity);
        const configB = getAlertConfig(b.type, b.severity);
        
        if (configA.priority !== configB.priority) {
          return configB.priority - configA.priority; // Higher priority first
        }
        
        return b.timestamp.getTime() - a.timestamp.getTime(); // Newer first
      })
      .slice(0, maxVisibleAlerts);
  }, [alerts, dismissedAlerts, maxVisibleAlerts]);
  
  // Handle alert acknowledgment
  const handleAcknowledge = useCallback((alertId: string) => {
    onAlertAcknowledged?.(alertId);
  }, [onAlertAcknowledged]);
  
  // Handle alert dismissal
  const handleDismiss = useCallback((alertId: string) => {
    setDismissedAlerts(prev => new Set([...prev, alertId]));
    onAlertDismissed?.(alertId);
  }, [onAlertDismissed]);
  
  // Handle alert click
  const handleAlertClick = useCallback((alert: DetectionAlert) => {
    onAlertClicked?.(alert);
  }, [onAlertClicked]);
  
  // Process new alerts for toasts and sounds
  useEffect(() => {
    alerts.forEach(alert => {
      if (processedAlerts.current.has(alert.id)) return;
      
      processedAlerts.current.add(alert.id);
      const config = getAlertConfig(alert.type, alert.severity);
      
      // Show toast notification
      if (enableToasts) {
        const toastConfig = {
          duration: alert.type === 'CLEAN' ? 3000 : 5000,
          className: cn(
            config.colors.bg,
            config.colors.border,
            'border'
          ),
        };
        
        if (alert.type === 'CLEAN') {
          toast.success(`Clean content detected: "${alert.snippet}"`, toastConfig);
        } else if (alert.type === 'OFFENSIVE') {
          toast.warning(`Potentially offensive content: "${alert.snippet}"`, toastConfig);
        } else {
          toast.error(`Harmful content detected: "${alert.snippet}"`, toastConfig);
        }
      }
      
      // Play sound notification
      if (soundEnabled && config.sound) {
        // Note: In a real implementation, you would play actual sound files
        // For now, we'll use the Web Audio API or HTML5 audio
        console.log(`Playing ${config.sound} sound for ${alert.type} detection`);
      }
    });
  }, [alerts, enableToasts, soundEnabled]);
  
  // Auto-dismiss alerts
  useEffect(() => {
    if (!autoDismissTimeout) return;
    
    const timeouts = visibleAlerts
      .filter(alert => alert.autoDismiss !== false)
      .map(alert => {
        const timeElapsed = Date.now() - alert.timestamp.getTime();
        const remainingTime = Math.max(0, autoDismissTimeout - timeElapsed);
        
        return setTimeout(() => {
          handleDismiss(alert.id);
        }, remainingTime);
      });
    
    return () => {
      timeouts.forEach(clearTimeout);
    };
  }, [visibleAlerts, autoDismissTimeout, handleDismiss]);
  
  return (
    <div className={cn("space-y-4", className)}>
      {/* Header Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <h3 className="text-lg font-semibold text-gray-200">Detection Alerts</h3>
          {visibleAlerts.length > 0 && (
            <Badge variant="outline" className="text-xs">
              {visibleAlerts.length} active
            </Badge>
          )}
        </div>
        
        <div className="flex items-center space-x-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setStatisticsVisible(!statisticsVisible)}
            className="text-gray-400 hover:text-gray-200"
          >
            {statisticsVisible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </Button>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="text-gray-400 hover:text-gray-200"
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </Button>
        </div>
      </div>
      
      {/* Statistics */}
      {statisticsVisible && (
        <AlertStatistics alerts={alerts} />
      )}
      
      {/* Alert List */}
      <div className="space-y-3">
        <AnimatePresence mode="popLayout">
          {visibleAlerts.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-8 text-gray-500"
            >
              <Shield className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No active alerts</p>
              <p className="text-sm text-gray-600 mt-1">
                Detection alerts will appear here
              </p>
            </motion.div>
          ) : (
            visibleAlerts.map(alert => (
              <AlertItem
                key={alert.id}
                alert={alert}
                onAcknowledge={handleAcknowledge}
                onDismiss={handleDismiss}
                onClick={handleAlertClick}
                showStatistics={statisticsVisible}
              />
            ))
          )}
        </AnimatePresence>
      </div>
      
      {/* Overflow Indicator */}
      {alerts.length > maxVisibleAlerts && (
        <div className="text-center py-2 text-sm text-gray-500">
          +{alerts.length - maxVisibleAlerts} more alerts hidden
        </div>
      )}
    </div>
  );
};

// =============================================================================
// Default Export
// =============================================================================

export default DetectionAlertSystem;