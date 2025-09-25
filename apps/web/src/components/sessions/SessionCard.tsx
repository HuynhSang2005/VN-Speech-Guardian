/**
 * SessionCard Component - P32 Component Testing Implementation
 * Mục đích: Display session information in card format with actions
 * Research: Based on existing session schemas and component patterns
 */

import React from 'react'
import { Clock, CheckCircle, Edit, Trash2 } from 'lucide-react'

// Define SessionDto type locally for component
export interface SessionDto {
  id: string
  name: string
  description?: string
  startedAt: string
  endedAt?: string
  status: 'idle' | 'recording' | 'processing' | 'completed' | 'error'
  duration?: number
  stats: {
    totalSegments: number
    totalDetections: number
    avgConfidence: number
  }
  createdAt: string
  updatedAt: string
}

export interface SessionCardProps {
  session: SessionDto
  onSelect?: (session: SessionDto) => void
  onEdit?: (session: SessionDto) => void
  onDelete?: (session: SessionDto) => void
  isSelected?: boolean
  showActions?: boolean
  className?: string
}

export const SessionCard: React.FC<SessionCardProps> = ({
  session,
  onSelect,
  onEdit,
  onDelete,
  isSelected = false,
  showActions = true,
  className = '',
}) => {
  const [showDeleteConfirm, setShowDeleteConfirm] = React.useState(false)

  if (!session) {
    return (
      <div className="text-center text-gray-500 py-4">
        Session not available
      </div>
    )
  }

  // Handle incomplete session data
  if (!session.name || !session.id) {
    return (
      <div data-testid="session-skeleton" className="animate-pulse">
        <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
        <div className="h-3 bg-gray-200 rounded w-1/2"></div>
      </div>
    )
  }

  const calculateRiskLevel = (session: SessionDto) => {
    const detectionRate = session.stats.totalSegments > 0 
      ? (session.stats.totalDetections / session.stats.totalSegments) * 100 
      : 0
    
    if (detectionRate > 20) return 'high'
    if (detectionRate > 5) return 'medium'
    return 'low'
  }

  const formatDuration = (seconds?: number) => {
    if (!seconds) return 'In Progress'
    
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60
    
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMinutes = Math.floor(diffMs / (1000 * 60))
    
    if (diffMinutes < 60) {
      return `${diffMinutes} phút trước`
    }
    
    return date.toLocaleDateString('vi-VN') + ' ' + date.toLocaleTimeString('vi-VN', { 
      hour: '2-digit', 
      minute: '2-digit' 
    })
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800'
      case 'error': return 'bg-red-100 text-red-800'
      case 'processing': return 'bg-yellow-100 text-yellow-800'
      case 'recording': return 'bg-blue-100 text-blue-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getRiskStyling = (riskLevel: string) => {
    switch (riskLevel) {
      case 'high': return 'border-red-200 bg-red-50'
      case 'medium': return 'border-yellow-200 bg-yellow-50'
      default: return 'border-green-200 bg-green-50'
    }
  }

  const riskLevel = calculateRiskLevel(session)
  const detectionRate = session.stats.totalSegments > 0 
    ? Math.round((session.stats.totalDetections / session.stats.totalSegments) * 100)
    : 0

  const handleCardClick = () => {
    onSelect?.(session)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      onSelect?.(session)
    }
  }

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation()
    onEdit?.(session)
  }

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation()
    setShowDeleteConfirm(true)
  }

  const confirmDelete = () => {
    onDelete?.(session)
    setShowDeleteConfirm(false)
  }

  return (
    <>
      <div
        data-testid="session-card"
        className={`
          relative p-4 border rounded-lg cursor-pointer transition-all duration-200
          hover:shadow-md focus:outline-none focus:ring-2 focus:ring-blue-500
          ${getRiskStyling(riskLevel)}
          ${isSelected ? 'ring-2 ring-blue-500 bg-blue-50' : ''}
          ${className}
        `}
        role="button"
        tabIndex={0}
        aria-label={`Session ${session.name} - Click to view details`}
        onClick={handleCardClick}
        onKeyDown={handleKeyDown}
      >
        {/* Selection indicator */}
        {isSelected && (
          <div data-testid="selected-indicator" className="absolute top-2 right-2">
            <CheckCircle className="w-5 h-5 text-blue-500" />
          </div>
        )}

        {/* Recording indicator */}
        {session.status === 'recording' && (
          <div data-testid="recording-indicator" className="absolute top-2 left-2">
            <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
          </div>
        )}

        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-semibold text-gray-900 truncate">
              {session.name}
            </h3>
            {session.description && (
              <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                {session.description}
              </p>
            )}
          </div>

          {/* Actions menu */}
          {showActions && (
            <div className="flex space-x-1 ml-2">
              <button
                onClick={handleEdit}
                aria-label={`Edit session ${session.name}`}
                className="p-1 text-gray-400 hover:text-gray-600 rounded"
              >
                <Edit className="w-4 h-4" />
              </button>
              <button
                onClick={handleDelete}
                aria-label={`Delete session ${session.name}`}
                className="p-1 text-gray-400 hover:text-red-600 rounded"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        {/* Status badge */}
        <div className="flex items-center justify-between mb-3">
          <span
            data-testid="status-badge"
            className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(session.status)}`}
          >
            {session.status === 'completed' && 'Completed'}
            {session.status === 'error' && 'Error'}
            {session.status === 'processing' && 'Processing'}
            {session.status === 'recording' && 'Recording'}
            {session.status === 'idle' && 'Idle'}
          </span>

          <span
            data-testid="risk-indicator"
            className={`text-xs font-medium ${
              riskLevel === 'high' ? 'text-red-600' : 
              riskLevel === 'medium' ? 'text-yellow-600' : 
              'text-green-600'
            }`}
          >
            {riskLevel === 'high' ? 'High Risk' : 
             riskLevel === 'medium' ? 'Medium Risk' : 
             'Safe'}
          </span>
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-3 gap-4 text-sm mb-3">
          <div aria-label={`Total segments: ${session.stats.totalSegments}`}>
            <div className="text-gray-500">Segments</div>
            <div className="font-medium">{session.stats.totalSegments}</div>
          </div>
          <div aria-label={`Total detections: ${session.stats.totalDetections}`}>
            <div className="text-gray-500">Detections</div>
            <div className="font-medium">{session.stats.totalDetections}</div>
          </div>
          <div aria-label={`Average confidence: ${Math.round(session.stats.avgConfidence * 100)}%`}>
            <div className="text-gray-500">Confidence</div>
            <div className="font-medium">{Math.round(session.stats.avgConfidence * 100)}%</div>
          </div>
        </div>

        {/* Detection rate */}
        <div className="mb-3 text-sm">
          <div className="text-gray-500">Detection Rate</div>
          <div className="font-medium">{detectionRate}% <span className="text-gray-400">detection rate</span></div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between text-xs text-gray-500">
          <div className="flex items-center">
            <Clock className="w-3 h-3 mr-1" />
            {formatDuration(session.duration)}
          </div>
          <div>
            {formatDate(session.createdAt)}
          </div>
        </div>

        {/* Live region for status announcements */}
        <div role="status" aria-live="polite" className="sr-only">
          {session.status === 'processing' && 'Session is processing'}
          {session.status === 'completed' && 'Session completed'}
          {session.status === 'error' && 'Session encountered an error'}
        </div>
      </div>

      {/* Delete confirmation dialog */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-sm w-full mx-4">
            <h3 className="text-lg font-semibold mb-2">Are you sure?</h3>
            <p className="text-gray-600 mb-4">
              This action cannot be undone. This will permanently delete the session.
            </p>
            <div className="flex space-x-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-md text-sm font-medium hover:bg-red-700"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}