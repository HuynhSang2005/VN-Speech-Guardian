/**
 * Session utilities for calculations and formatting
 * Mục đích: Common functions for session data processing
 */

import type { SessionDto } from '@/components/sessions/SessionCard'

export const calculateRiskLevel = (session: SessionDto): 'low' | 'medium' | 'high' => {
  const detectionRate = session.stats.totalSegments > 0 
    ? (session.stats.totalDetections / session.stats.totalSegments) * 100 
    : 0
  
  if (detectionRate > 20) return 'high'
  if (detectionRate > 5) return 'medium'
  return 'low'
}

export const formatDuration = (seconds?: number): string => {
  if (!seconds) return 'In Progress'
  
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = seconds % 60
  
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
}

export const formatDate = (dateString: string): string => {
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

export const getStatusColor = (status: string): string => {
  switch (status) {
    case 'completed': return 'bg-green-100 text-green-800'
    case 'error': return 'bg-red-100 text-red-800'
    case 'processing': return 'bg-yellow-100 text-yellow-800'
    case 'recording': return 'bg-blue-100 text-blue-800'
    default: return 'bg-gray-100 text-gray-800'
  }
}

export const getRiskStyling = (riskLevel: string): string => {
  switch (riskLevel) {
    case 'high': return 'border-red-200 bg-red-50'
    case 'medium': return 'border-yellow-200 bg-yellow-50'
    default: return 'border-green-200 bg-green-50'
  }
}