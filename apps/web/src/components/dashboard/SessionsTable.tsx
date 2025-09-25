/**
 * Sessions Table Component (P27.4)
 * Advanced data table với pagination, sorting, filtering, search
 * Responsive design với mobile-friendly layout
 */

import { useState, useMemo, useCallback } from 'react';
import { 
  ChevronUp, 
  ChevronDown, 
  Search, 
  Filter,
  Download,
  MoreHorizontal,
  Calendar,
  Clock
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Session } from '@/types/components';

// Table interfaces
interface SortConfig {
  field: keyof Session;
  direction: 'asc' | 'desc';
}

interface FilterConfig {
  severity?: 'CLEAN' | 'OFFENSIVE' | 'HATE' | 'ALL';
  status?: 'completed' | 'processing' | 'failed' | 'ALL';
  dateRange?: {
    start: string;
    end: string;
  };
  search?: string;
}

export interface SessionsTableProps {
  sessions: Session[];
  totalCount: number;
  currentPage: number;
  pageSize: number;
  isLoading?: boolean;
  onPageChange: (page: number) => void;
  onSortChange: (sort: SortConfig) => void;
  onFilterChange: (filters: FilterConfig) => void;
  className?: string;
}

// Status badge component
function StatusBadge({ status }: { status: Session['status'] }) {
  const statusConfig = {
    completed: { color: 'bg-green-100 text-green-800', icon: '✓' },
    processing: { color: 'bg-blue-100 text-blue-800', icon: '●' },
    failed: { color: 'bg-red-100 text-red-800', icon: '✕' },
  } as const;

  const config = statusConfig[status] || statusConfig.completed;
  
  return (
    <span className={cn('inline-flex items-center px-2 py-1 rounded-full text-xs font-medium', config.color)}>
      <span className="mr-1" aria-hidden="true">{config.icon}</span>
      {status}
    </span>
  );
}

// Severity badge component
function SeverityBadge({ severity }: { severity: Session['highestSeverity'] }) {
  const severityConfig = {
    CLEAN: { color: 'bg-green-100 text-green-800', icon: '✓' },
    OFFENSIVE: { color: 'bg-yellow-100 text-yellow-800', icon: '⚠' },
    HATE: { color: 'bg-red-100 text-red-800', icon: '⚠' },
  } as const;

  const config = severityConfig[severity] || severityConfig.CLEAN;
  
  return (
    <span className={cn('inline-flex items-center px-2 py-1 rounded-full text-xs font-medium', config.color)}>
      <span className="mr-1" aria-hidden="true">{config.icon}</span>
      {severity}
    </span>
  );
}

// Table header component
function TableHeader({ 
  field, 
  children, 
  sortable = false, 
  currentSort, 
  onSort 
}: {
  field?: keyof Session;
  children: React.ReactNode;
  sortable?: boolean;
  currentSort?: SortConfig;
  onSort?: (field: keyof Session) => void;
}) {
  const isSorted = currentSort?.field === field;
  const isAsc = isSorted && currentSort?.direction === 'asc';
  
  if (!sortable || !field || !onSort) {
    return (
      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
        {children}
      </th>
    );
  }

  return (
    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
      <button
        onClick={() => onSort(field)}
        className="group inline-flex items-center hover:text-gray-700"
        aria-label={`Sort by ${children}`}
      >
        {children}
        <span className="ml-2 flex-none rounded">
          {isSorted ? (
            isAsc ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )
          ) : (
            <div className="h-4 w-4 opacity-0 group-hover:opacity-50">
              <ChevronUp className="h-4 w-4" />
            </div>
          )}
        </span>
      </button>
    </th>
  );
}

// Pagination component
function Pagination({ 
  currentPage, 
  totalPages, 
  onPageChange 
}: {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}) {
  const pages = useMemo(() => {
    const delta = 2;
    const range = [];
    const rangeWithDots = [];

    for (let i = Math.max(2, currentPage - delta); i <= Math.min(totalPages - 1, currentPage + delta); i++) {
      range.push(i);
    }

    if (currentPage - delta > 2) {
      rangeWithDots.push(1, '...');
    } else {
      rangeWithDots.push(1);
    }

    rangeWithDots.push(...range);

    if (currentPage + delta < totalPages - 1) {
      rangeWithDots.push('...', totalPages);
    } else {
      rangeWithDots.push(totalPages);
    }

    return rangeWithDots;
  }, [currentPage, totalPages]);

  return (
    <div className="flex items-center justify-between px-4 py-3 bg-white border-t border-gray-200 sm:px-6">
      <div className="flex justify-between flex-1 sm:hidden">
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage <= 1}
          className="relative inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Previous
        </button>
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= totalPages}
          className="relative ml-3 inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Next Page
        </button>
      </div>
      
      <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
        <div>
          <p className="text-sm text-gray-700">
            Showing page <span className="font-medium">{currentPage}</span> of{' '}
            <span className="font-medium">{totalPages}</span>
          </p>
        </div>
        <div>
          <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
            {pages.map((page, index) => (
              page === '...' ? (
                <span key={index} className="relative inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700">
                  ...
                </span>
              ) : (
                <button
                  key={index}
                  onClick={() => onPageChange(page as number)}
                  className={cn(
                    'relative inline-flex items-center px-4 py-2 text-sm font-medium',
                    page === currentPage
                      ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
                      : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50',
                    index === 0 && 'rounded-l-md',
                    index === pages.length - 1 && 'rounded-r-md'
                  )}
                >
                  {page}
                </button>
              )
            ))}
          </nav>
        </div>
      </div>
    </div>
  );
}

// Empty state component
function EmptySessionsState() {
  return (
    <div data-testid="empty-sessions-state" className="text-center py-12">
      <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
      <h3 className="text-lg font-medium text-gray-900 mb-2">No sessions found</h3>
      <p className="text-gray-500">Try adjusting your filters or create a new session to get started.</p>
    </div>
  );
}

// Main Sessions Table Component  
export function SessionsTable({
  sessions,
  totalCount,
  currentPage,
  pageSize,
  isLoading = false,
  onPageChange,
  onSortChange,
  onFilterChange,
  className,
}: SessionsTableProps) {
  const [currentSort, setCurrentSort] = useState<SortConfig>({ field: 'startTime', direction: 'desc' });
  const [filters, setFilters] = useState<FilterConfig>({
    severity: 'ALL',
    status: 'ALL',
    search: '',
  });
  const [showFilters, setShowFilters] = useState(false);

  // Calculate pagination
  const totalPages = Math.ceil(totalCount / pageSize);
  const startIndex = (currentPage - 1) * pageSize + 1;
  const endIndex = Math.min(currentPage * pageSize, totalCount);

  // Handle sorting
  const handleSort = useCallback((field: keyof Session) => {
    const newDirection: 'asc' | 'desc' = currentSort.field === field && currentSort.direction === 'asc' ? 'desc' : 'asc';
    const newSort: SortConfig = { field, direction: newDirection };
    setCurrentSort(newSort);
    onSortChange(newSort);
  }, [currentSort, onSortChange]);

  // Handle filters
  const handleFilterChange = useCallback((newFilters: Partial<FilterConfig>) => {
    const updatedFilters = { ...filters, ...newFilters };
    setFilters(updatedFilters);
    onFilterChange(updatedFilters);
  }, [filters, onFilterChange]);

  // Format duration (duration is already in seconds)
  const formatDuration = (duration: number) => {
    const minutes = Math.floor(duration / 60);
    const seconds = duration % 60;
    
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (sessions.length === 0 && !isLoading) {
    return <EmptySessionsState />;
  }

  return (
    <div className={cn('bg-white rounded-lg border border-gray-200', className)}>
      {/* Table Header with Controls */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Sessions</h3>
            <p className="text-sm text-gray-600">
              Showing {startIndex}-{endIndex} of {totalCount} sessions
            </p>
          </div>
          
          <div className="flex items-center space-x-3">
            {/* Search */}
            <div className="relative">
              <Search className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search sessions..."
                value={filters.search}
                onChange={(e) => handleFilterChange({ search: e.target.value })}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
                aria-label="Search sessions"
              />
            </div>
            
            {/* Filter Toggle */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              aria-label="Toggle filters"
            >
              <Filter className="h-4 w-4 mr-2" />
              Filters
            </button>
            
            {/* Export */}
            <button className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">
              <Download className="h-4 w-4 mr-2" />
              Export
            </button>
          </div>
        </div>
        
        {/* Expandable Filters */}
        {showFilters && (
          <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Severity</label>
              <select
                value={filters.severity}
                onChange={(e) => handleFilterChange({ severity: e.target.value as any })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
                aria-label="Filter by severity"
              >
                <option value="ALL">All Severities</option>
                <option value="CLEAN">Clean</option>
                <option value="OFFENSIVE">Offensive</option>
                <option value="HATE">Hate Speech</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select
                value={filters.status}
                onChange={(e) => handleFilterChange({ status: e.target.value as any })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
                aria-label="Filter by status"
              >
                <option value="ALL">All Statuses</option>
                <option value="completed">Completed</option>
                <option value="processing">Processing</option>
                <option value="failed">Failed</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date Range</label>
              <input
                type="date"
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
                aria-label="Filter by date"
              />
            </div>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <TableHeader field="id" sortable currentSort={currentSort} onSort={handleSort}>
                  Session ID
                </TableHeader>
                <TableHeader field="status" sortable currentSort={currentSort} onSort={handleSort}>
                  Status
                </TableHeader>
                <TableHeader field="detectionsCount" sortable currentSort={currentSort} onSort={handleSort}>
                  Detections
                </TableHeader>
                <TableHeader field="highestSeverity" sortable currentSort={currentSort} onSort={handleSort}>
                  Severity
                </TableHeader>
                <TableHeader field="startTime" sortable currentSort={currentSort} onSort={handleSort}>
                  Started At
                </TableHeader>
                <TableHeader>Duration</TableHeader>
                <TableHeader>Actions</TableHeader>
              </tr>
            </thead>
            
            <tbody className="bg-white divide-y divide-gray-200">
              {isLoading ? (
                Array.from({ length: pageSize }).map((_, index) => (
                  <tr key={index} className="animate-pulse">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="h-4 bg-gray-200 rounded w-24" />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="h-6 bg-gray-200 rounded-full w-20" />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="h-4 bg-gray-200 rounded w-8" />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="h-6 bg-gray-200 rounded-full w-16" />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="h-4 bg-gray-200 rounded w-32" />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="h-4 bg-gray-200 rounded w-16" />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="h-8 bg-gray-200 rounded w-8" />
                    </td>
                  </tr>
                ))
              ) : (
                sessions.map((session) => (
                  <tr key={session.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {session.id}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <StatusBadge status={session.status} />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {session.detectionsCount}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <SeverityBadge severity={session.highestSeverity} />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div className="flex items-center">
                        <Clock className="h-4 w-4 mr-1" />
                        {formatDate(session.startTime)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDuration(session.duration)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <button className="text-gray-400 hover:text-gray-600">
                        <MoreHorizontal className="h-5 w-5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={onPageChange}
        />
      )}
    </div>
  );
}