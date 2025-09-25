/**
 * Loading skeletons cho performance optimization
 * - Route-level loading states  
 * - Component-level loading states
 * - Consistent với design system
 */

import { cn } from '@/lib/utils'

// Base skeleton component
function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-md bg-muted",
        className
      )}
      {...props}
    />
  )
}

// Dashboard skeleton
export function DashboardSkeleton() {
  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="space-y-2">
        <Skeleton className="h-8 w-[200px]" />
        <Skeleton className="h-4 w-[300px]" />
      </div>

      {/* Metric cards grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-lg border p-6 space-y-2">
            <Skeleton className="h-4 w-[100px]" />
            <Skeleton className="h-8 w-[80px]" />
            <Skeleton className="h-3 w-[60px]" />
          </div>
        ))}
      </div>

      {/* Charts grid */}
      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-lg border p-6 space-y-4">
          <Skeleton className="h-6 w-[150px]" />
          <Skeleton className="h-[300px] w-full" />
        </div>
        <div className="rounded-lg border p-6 space-y-4">
          <Skeleton className="h-6 w-[150px]" />
          <Skeleton className="h-[300px] w-full" />
        </div>
      </div>

      {/* Activity table */}
      <div className="rounded-lg border p-6 space-y-4">
        <Skeleton className="h-6 w-[150px]" />
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex space-x-4">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="space-y-2 flex-1">
                <Skeleton className="h-4 w-[200px]" />
                <Skeleton className="h-3 w-[150px]" />
              </div>
              <Skeleton className="h-4 w-[80px]" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// Live processing skeleton
export function LiveProcessingSkeleton() {
  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Top status bar */}
      <div className="border-b border-gray-800 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Skeleton className="h-6 w-[120px] bg-gray-800" />
            <Skeleton className="h-6 w-[80px] bg-gray-800" />
          </div>
          <Skeleton className="h-8 w-[100px] bg-gray-800 rounded-full" />
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="text-center space-y-8">
          {/* Audio visualizer placeholder */}
          <div className="relative">
            <Skeleton className="h-[300px] w-[300px] rounded-full bg-gray-800 mx-auto" />
            <div className="absolute inset-0 flex items-center justify-center">
              <Skeleton className="h-16 w-16 rounded-full bg-gray-700" />
            </div>
          </div>

          {/* Status */}
          <Skeleton className="h-6 w-[150px] bg-gray-800 mx-auto" />

          {/* Controls */}
          <div className="flex justify-center space-x-4">
            <Skeleton className="h-10 w-24 bg-gray-800 rounded-lg" />
            <Skeleton className="h-10 w-24 bg-gray-800 rounded-lg" />
          </div>
        </div>
      </div>

      {/* Transcript panel */}
      <div className="fixed bottom-0 left-0 right-0 h-64 bg-gray-800 border-t border-gray-700 p-4">
        <Skeleton className="h-6 w-[100px] bg-gray-700 mb-4" />
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-4 w-full bg-gray-700" />
          ))}
        </div>
      </div>
    </div>
  )
}

// Sessions list skeleton
export function SessionsListSkeleton() {
  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div className="space-y-2">
          <Skeleton className="h-8 w-[150px]" />
          <Skeleton className="h-4 w-[250px]" />
        </div>
        <Skeleton className="h-10 w-[120px]" />
      </div>

      {/* Filters */}
      <div className="flex space-x-4">
        <Skeleton className="h-10 w-[150px]" />
        <Skeleton className="h-10 w-[150px]" />
        <Skeleton className="h-10 w-[100px]" />
      </div>

      {/* Table */}
      <div className="rounded-lg border">
        {/* Table header */}
        <div className="border-b p-4">
          <div className="flex space-x-4">
            <Skeleton className="h-4 w-[100px]" />
            <Skeleton className="h-4 w-[150px]" />
            <Skeleton className="h-4 w-[100px]" />
            <Skeleton className="h-4 w-[80px]" />
            <Skeleton className="h-4 w-[60px]" />
          </div>
        </div>

        {/* Table rows */}
        <div className="divide-y">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="p-4">
              <div className="flex space-x-4">
                <Skeleton className="h-4 w-[100px]" />
                <Skeleton className="h-4 w-[150px]" />
                <Skeleton className="h-4 w-[100px]" />
                <Skeleton className="h-4 w-[80px]" />
                <Skeleton className="h-4 w-[60px]" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Pagination */}
      <div className="flex justify-between items-center">
        <Skeleton className="h-8 w-[150px]" />
        <div className="flex space-x-2">
          <Skeleton className="h-8 w-8" />
          <Skeleton className="h-8 w-8" />
          <Skeleton className="h-8 w-8" />
        </div>
      </div>
    </div>
  )
}

// Session detail skeleton
export function SessionDetailSkeleton() {
  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="space-y-2">
        <Skeleton className="h-8 w-[200px]" />
        <Skeleton className="h-4 w-[300px]" />
      </div>

      {/* Session info cards */}
      <div className="grid gap-4 md:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="rounded-lg border p-4 space-y-2">
            <Skeleton className="h-4 w-[80px]" />
            <Skeleton className="h-6 w-[100px]" />
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="space-y-4">
        <div className="flex space-x-4">
          <Skeleton className="h-10 w-[100px]" />
          <Skeleton className="h-10 w-[100px]" />
          <Skeleton className="h-10 w-[100px]" />
        </div>

        {/* Tab content */}
        <div className="rounded-lg border p-6 space-y-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex space-x-4">
              <Skeleton className="h-4 w-[80px]" />
              <Skeleton className="h-4 flex-1" />
              <Skeleton className="h-4 w-[60px]" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// Generic page skeleton
export function PageSkeleton() {
  return (
    <div className="space-y-6 p-6">
      <div className="space-y-2">
        <Skeleton className="h-8 w-[250px]" />
        <Skeleton className="h-4 w-[350px]" />
      </div>
      
      <div className="space-y-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    </div>
  )
}

export { Skeleton }