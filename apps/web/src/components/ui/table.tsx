/**
 * Enhanced Table Component System
 * Modern data table với sorting, filtering, pagination
 * Support: responsive design, row selection, custom cells
 */

import * as React from 'react'
import { cva } from 'class-variance-authority'
import { 
  ChevronDown, 
  ChevronUp, 
  ChevronsUpDown, 
  MoreHorizontal,
  Search,
  Filter,
  Download,
  RefreshCw
} from 'lucide-react'

import { cn } from '@/lib/utils'
import { Button } from './button'
import { Input } from './input'
import { Badge } from './badge'

// =============================================================================
// Base Table Components
// =============================================================================

const Table = React.forwardRef<
  HTMLTableElement,
  React.HTMLAttributes<HTMLTableElement>
>(({ className, ...props }, ref) => (
  <div className="relative w-full overflow-auto">
    <table
      ref={ref}
      className={cn("w-full caption-bottom text-sm", className)}
      {...props}
    />
  </div>
))
Table.displayName = "Table"

const TableHeader = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <thead ref={ref} className={cn("[&_tr]:border-b", className)} {...props} />
))
TableHeader.displayName = "TableHeader"

const TableBody = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <tbody
    ref={ref}
    className={cn("[&_tr:last-child]:border-0", className)}
    {...props}
  />
))
TableBody.displayName = "TableBody"

const TableFooter = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <tfoot
    ref={ref}
    className={cn(
      "border-t bg-muted/50 font-medium [&>tr]:last:border-b-0",
      className
    )}
    {...props}
  />
))
TableFooter.displayName = "TableFooter"

const TableRow = React.forwardRef<
  HTMLTableRowElement,
  React.HTMLAttributes<HTMLTableRowElement>
>(({ className, ...props }, ref) => (
  <tr
    ref={ref}
    className={cn(
      "border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted",
      className
    )}
    {...props}
  />
))
TableRow.displayName = "TableRow"

const TableHead = React.forwardRef<
  HTMLTableCellElement,
  React.ThHTMLAttributes<HTMLTableCellElement>
>(({ className, ...props }, ref) => (
  <th
    ref={ref}
    className={cn(
      "h-10 px-2 text-left align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]",
      className
    )}
    {...props}
  />
))
TableHead.displayName = "TableHead"

const TableCell = React.forwardRef<
  HTMLTableCellElement,
  React.TdHTMLAttributes<HTMLTableCellElement>
>(({ className, ...props }, ref) => (
  <td
    ref={ref}
    className={cn(
      "p-2 align-middle [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]",
      className
    )}
    {...props}
  />
))
TableCell.displayName = "TableCell"

const TableCaption = React.forwardRef<
  HTMLTableCaptionElement,
  React.HTMLAttributes<HTMLTableCaptionElement>
>(({ className, ...props }, ref) => (
  <caption
    ref={ref}
    className={cn("mt-4 text-sm text-muted-foreground", className)}
    {...props}
  />
))
TableCaption.displayName = "TableCaption"

// =============================================================================
// Sortable Table Header
// =============================================================================

interface SortableHeaderProps {
  children: React.ReactNode
  sortKey?: string
  currentSort?: {
    key: string
    direction: 'asc' | 'desc'
  }
  onSort?: (key: string, direction: 'asc' | 'desc') => void
  className?: string
}

export function SortableHeader({
  children,
  sortKey,
  currentSort,
  onSort,
  className,
}: SortableHeaderProps) {
  const handleSort = () => {
    if (!sortKey || !onSort) return

    const newDirection = 
      currentSort?.key === sortKey && currentSort.direction === 'asc' 
        ? 'desc' 
        : 'asc'
    
    onSort(sortKey, newDirection)
  }

  const getSortIcon = () => {
    if (!sortKey) return null
    
    if (currentSort?.key === sortKey) {
      return currentSort.direction === 'asc' 
        ? <ChevronUp className="ml-2 h-4 w-4" />
        : <ChevronDown className="ml-2 h-4 w-4" />
    }
    
    return <ChevronsUpDown className="ml-2 h-4 w-4 opacity-50" />
  }

  return (
    <TableHead className={className}>
      {sortKey ? (
        <button
          type="button"
          className="flex items-center hover:text-foreground transition-colors"
          onClick={handleSort}
        >
          {children}
          {getSortIcon()}
        </button>
      ) : (
        children
      )}
    </TableHead>
  )
}

// =============================================================================
// Enhanced Data Table
// =============================================================================

interface Column<T> {
  key: string
  header: string
  sortable?: boolean
  render?: (item: T) => React.ReactNode
  width?: string
  className?: string
}

interface DataTableProps<T> {
  data: T[]
  columns: Column<T>[]
  loading?: boolean
  searchKey?: keyof T
  searchPlaceholder?: string
  onRowClick?: (item: T) => void
  className?: string
  emptyMessage?: string
  actions?: {
    refresh?: () => void
    export?: () => void
    filter?: () => void
  }
}

export function DataTable<T extends Record<string, any>>({
  data,
  columns,
  loading = false,
  searchKey,
  searchPlaceholder = "Search...",
  onRowClick,
  className,
  emptyMessage = "No data available",
  actions,
}: DataTableProps<T>) {
  const [searchQuery, setSearchQuery] = React.useState("")
  const [sortConfig, setSortConfig] = React.useState<{
    key: string
    direction: 'asc' | 'desc'
  } | null>(null)

  // Filter data based on search
  const filteredData = React.useMemo(() => {
    if (!searchQuery || !searchKey) return data

    return data.filter(item =>
      String(item[searchKey])
        .toLowerCase()
        .includes(searchQuery.toLowerCase())
    )
  }, [data, searchQuery, searchKey])

  // Sort filtered data
  const sortedData = React.useMemo(() => {
    if (!sortConfig) return filteredData

    return [...filteredData].sort((a, b) => {
      const aValue = a[sortConfig.key]
      const bValue = b[sortConfig.key]

      if (aValue < bValue) {
        return sortConfig.direction === 'asc' ? -1 : 1
      }
      if (aValue > bValue) {
        return sortConfig.direction === 'asc' ? 1 : -1
      }
      return 0
    })
  }, [filteredData, sortConfig])

  const handleSort = (key: string, direction: 'asc' | 'desc') => {
    setSortConfig({ key, direction })
  }

  return (
    <div className={cn("space-y-4", className)}>
      {/* Table Actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          {searchKey && (
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={searchPlaceholder}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 w-64"
              />
            </div>
          )}
        </div>

        <div className="flex items-center space-x-2">
          {actions?.filter && (
            <Button variant="outline" size="sm" onClick={actions.filter}>
              <Filter className="mr-2 h-4 w-4" />
              Filter
            </Button>
          )}
          
          {actions?.export && (
            <Button variant="outline" size="sm" onClick={actions.export}>
              <Download className="mr-2 h-4 w-4" />
              Export
            </Button>
          )}
          
          {actions?.refresh && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={actions.refresh}
              disabled={loading}
            >
              <RefreshCw className={cn("mr-2 h-4 w-4", loading && "animate-spin")} />
              Refresh
            </Button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((column) => (
                <SortableHeader
                  key={column.key}
                  sortKey={column.sortable ? column.key : undefined}
                  currentSort={sortConfig}
                  onSort={handleSort}
                  className={column.className}
                >
                  {column.header}
                </SortableHeader>
              ))}
            </TableRow>
          </TableHeader>
          
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  <div className="flex items-center justify-center">
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    Loading...
                  </div>
                </TableCell>
              </TableRow>
            ) : sortedData.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  {emptyMessage}
                </TableCell>
              </TableRow>
            ) : (
              sortedData.map((item, index) => (
                <TableRow
                  key={index}
                  className={onRowClick ? "cursor-pointer" : ""}
                  onClick={() => onRowClick?.(item)}
                >
                  {columns.map((column) => (
                    <TableCell
                      key={column.key}
                      className={column.className}
                      style={{ width: column.width }}
                    >
                      {column.render 
                        ? column.render(item) 
                        : String(item[column.key] ?? '')}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Table Info */}
      {!loading && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <div>
            Showing {sortedData.length} of {data.length} entries
            {searchQuery && (
              <span> (filtered from {data.length} total entries)</span>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// =============================================================================
// Detection Sessions Table for Speech Guardian
// =============================================================================

interface DetectionSession {
  id: string
  timestamp: string
  duration: number
  detections: number
  severity: 'low' | 'medium' | 'high' | 'critical'
  status: 'active' | 'completed' | 'error'
  user?: string
}

interface DetectionSessionsTableProps {
  sessions: DetectionSession[]
  loading?: boolean
  onSessionClick?: (session: DetectionSession) => void
  className?: string
}

export function DetectionSessionsTable({
  sessions,
  loading = false,
  onSessionClick,
  className,
}: DetectionSessionsTableProps) {
  const columns: Column<DetectionSession>[] = [
    {
      key: 'timestamp',
      header: 'Time',
      sortable: true,
      render: (session) => (
        <div className="font-mono text-sm">
          {new Date(session.timestamp).toLocaleString()}
        </div>
      ),
    },
    {
      key: 'duration',
      header: 'Duration',
      sortable: true,
      render: (session) => (
        <span className="font-mono text-sm">
          {Math.round(session.duration / 1000)}s
        </span>
      ),
    },
    {
      key: 'detections',
      header: 'Detections',
      sortable: true,
      render: (session) => (
        <Badge variant={session.detections > 0 ? 'destructive' : 'secondary'}>
          {session.detections}
        </Badge>
      ),
    },
    {
      key: 'severity',
      header: 'Max Severity',
      render: (session) => (
        <Badge
          variant={
            session.severity === 'critical' || session.severity === 'high'
              ? 'destructive'
              : session.severity === 'medium'
              ? 'warning'
              : 'secondary'
          }
        >
          {session.severity}
        </Badge>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (session) => (
        <Badge
          variant={
            session.status === 'completed'
              ? 'success'
              : session.status === 'error'
              ? 'destructive'
              : 'info'
          }
        >
          {session.status}
        </Badge>
      ),
    },
    {
      key: 'user',
      header: 'User',
      render: (session) => session.user || 'Anonymous',
    },
  ]

  return (
    <DataTable
      data={sessions}
      columns={columns}
      loading={loading}
      searchKey="user"
      searchPlaceholder="Search by user..."
      onRowClick={onSessionClick}
      className={className}
      emptyMessage="No sessions found"
      actions={{
        refresh: () => window.location.reload(),
        export: () => console.log('Export sessions'),
      }}
    />
  )
}

export {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableHead,
  TableRow,
  TableCell,
  TableCaption,
}