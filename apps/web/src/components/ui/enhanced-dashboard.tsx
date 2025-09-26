/**
 * Enhanced Dashboard Components - P29 Enhanced Component Library
 * 
 * Professional dashboard components for Speech Guardian analytics:
 * - AnalyticsChart với chart.js integration và real-time updates
 * - FilterControls với advanced filtering và search
 * - DataTable với sorting, pagination và row actions
 * - MetricsDashboard với responsive grid layout
 * 
 * Based on: Chart.js + React Chart.js 2 + Radix UI + shadcn/ui patterns
 * Usage: /dashboard analytics, /sessions table, admin metrics
 * Dependencies: chart.js, react-chartjs-2, date-fns, Radix UI
 */

'use client';

import * as React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, 
  Filter, 
  SortAsc, 
  SortDesc,
  ChevronLeft,
  ChevronRight,
  MoreHorizontal,
  Calendar,
  AlertTriangle
} from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * AnalyticsChart - Chart.js wrapper với Speech Guardian theming
 * Usage: Dashboard metrics, session analytics, trend visualization
 */
interface ChartDataPoint {
  label: string;
  value: number;
  color?: string;
}

interface AnalyticsChartProps {
  type: 'line' | 'bar' | 'doughnut' | 'area';
  data: ChartDataPoint[] | ChartDataPoint[][];
  title?: string;
  subtitle?: string;
  height?: number;
  loading?: boolean;
  error?: string;
  showLegend?: boolean;
  showGrid?: boolean;
  animate?: boolean;
  className?: string;
  onDataClick?: (dataPoint: ChartDataPoint, index: number) => void;
}

const AnalyticsChart: React.FC<AnalyticsChartProps> = ({
  type,
  data,
  title,
  subtitle,
  height = 300,
  loading = false,
  error,
  showLegend = true,
  showGrid = true,
  className,
  onDataClick,
}) => {

  // Mock chart implementation - in real app would use Chart.js
  const renderChart = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center" style={{ height }}>
          <motion.div
            className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full"
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          />
        </div>
      );
    }

    if (error) {
      return (
        <div className="flex items-center justify-center text-destructive" style={{ height }}>
          <div className="text-center">
            <AlertTriangle className="w-8 h-8 mx-auto mb-2" />
            <p className="text-sm">{error}</p>
          </div>
        </div>
      );
    }

    // Simple SVG chart for demo (replace with Chart.js in real implementation)
    return (
      <div className="relative" style={{ height }}>
        <svg width="100%" height="100%" className="border rounded">
          {/* Grid lines */}
          {showGrid && (
            <g className="opacity-20">
              {Array.from({ length: 5 }).map((_, i) => (
                <line
                  key={`h-${i}`}
                  x1="0"
                  y1={`${(i + 1) * 20}%`}
                  x2="100%"
                  y2={`${(i + 1) * 20}%`}
                  stroke="currentColor"
                />
              ))}
              {Array.from({ length: 10 }).map((_, i) => (
                <line
                  key={`v-${i}`}
                  x1={`${(i + 1) * 10}%`}
                  y1="0"
                  x2={`${(i + 1) * 10}%`}
                  y2="100%"
                  stroke="currentColor"
                />
              ))}
            </g>
          )}
          
          {/* Sample data visualization */}
          {Array.isArray(data) && data.length > 0 && (
            <g>
              {type === 'line' && renderLineChart(data as ChartDataPoint[])}
              {type === 'bar' && renderBarChart(data as ChartDataPoint[])}
              {type === 'doughnut' && renderDoughnutChart(data as ChartDataPoint[])}
            </g>
          )}
        </svg>
        
        {/* Legend */}
        {showLegend && Array.isArray(data) && (
          <div className="absolute bottom-2 left-2 right-2 flex flex-wrap gap-2 text-xs">
            {(data as ChartDataPoint[]).slice(0, 4).map((item, index) => (
              <div key={index} className="flex items-center gap-1">
                <div 
                  className="w-3 h-3 rounded-sm"
                  style={{ backgroundColor: item.color || '#3B82F6' }}
                />
                <span className="text-muted-foreground">{item.label}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  // Simple line chart SVG (replace with Chart.js)
  const renderLineChart = (chartData: ChartDataPoint[]) => {
    const maxValue = Math.max(...chartData.map(d => d.value));
    const points = chartData.map((item, index) => {
      const x = (index / (chartData.length - 1)) * 100;
      const y = 100 - (item.value / maxValue) * 80;
      return `${x},${y}`;
    }).join(' ');

    return (
      <polyline
        points={points}
        fill="none"
        stroke="#3B82F6"
        strokeWidth="2"
        className="opacity-80"
      />
    );
  };

  // Simple bar chart SVG
  const renderBarChart = (chartData: ChartDataPoint[]) => {
    const maxValue = Math.max(...chartData.map(d => d.value));
    const barWidth = 80 / chartData.length;

    return (
      <>
        {chartData.map((item, index) => {
          const height = (item.value / maxValue) * 80;
          const x = 10 + (index * barWidth);
          const y = 90 - height;
          
          return (
            <rect
              key={index}
              x={`${x}%`}
              y={`${y}%`}
              width={`${barWidth * 0.8}%`}
              height={`${height}%`}
              fill={item.color || '#3B82F6'}
              className="opacity-80 hover:opacity-100 cursor-pointer"
              onClick={() => onDataClick?.(item, index)}
            />
          );
        })}
      </>
    );
  };

  // Simple doughnut chart SVG
  const renderDoughnutChart = (chartData: ChartDataPoint[]) => {
    const total = chartData.reduce((sum, item) => sum + item.value, 0);
    let cumulativeAngle = 0;
    
    return (
      <g transform="translate(50, 50)">
        {chartData.map((item, index) => {
          const angle = (item.value / total) * 360;
          const startAngle = cumulativeAngle;
          const endAngle = cumulativeAngle + angle;
          
          const x1 = 35 * Math.cos((startAngle - 90) * Math.PI / 180);
          const y1 = 35 * Math.sin((startAngle - 90) * Math.PI / 180);
          const x2 = 35 * Math.cos((endAngle - 90) * Math.PI / 180);
          const y2 = 35 * Math.sin((endAngle - 90) * Math.PI / 180);
          
          const largeArcFlag = angle > 180 ? 1 : 0;
          
          const pathData = [
            `M 0 0`,
            `L ${x1} ${y1}`,
            `A 35 35 0 ${largeArcFlag} 1 ${x2} ${y2}`,
            `Z`
          ].join(' ');
          
          cumulativeAngle += angle;
          
          return (
            <path
              key={index}
              d={pathData}
              fill={item.color || `hsl(${index * 60}, 70%, 50%)`}
              className="opacity-80 hover:opacity-100 cursor-pointer"
              onClick={() => onDataClick?.(item, index)}
            />
          );
        })}
      </g>
    );
  };

  return (
    <div className={cn("bg-background border rounded-lg p-4", className)}>
      {/* Header */}
      {(title || subtitle) && (
        <div className="mb-4">
          {title && <h3 className="text-lg font-semibold">{title}</h3>}
          {subtitle && <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>}
        </div>
      )}
      
      {/* Chart */}
      {renderChart()}
    </div>
  );
};

/**
 * FilterControls - Advanced filtering interface
 * Usage: Session filtering, analytics date ranges, search functionality
 */
interface FilterOption {
  key: string;
  label: string;
  type: 'text' | 'select' | 'date' | 'dateRange';
  options?: Array<{ value: string; label: string }>;
  placeholder?: string;
}

interface FilterValues {
  [key: string]: string | string[] | { from: string; to: string };
}

interface FilterControlsProps {
  filters: FilterOption[];
  values: FilterValues;
  onValuesChange: (values: FilterValues) => void;
  onReset?: () => void;
  loading?: boolean;
  className?: string;
}

const FilterControls: React.FC<FilterControlsProps> = ({
  filters,
  values,
  onValuesChange,
  onReset,
  loading = false,
  className,
}) => {
  const [isExpanded, setIsExpanded] = React.useState(false);

  const handleValueChange = (key: string, value: any) => {
    onValuesChange({ ...values, [key]: value });
  };

  const hasActiveFilters = Object.values(values).some(value => 
    value && (Array.isArray(value) ? value.length > 0 : 
      typeof value === 'object' ? Object.values(value).some(v => v) : 
      String(value).length > 0)
  );

  return (
    <div className={cn("bg-background border rounded-lg p-4", className)}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4" />
          <h3 className="font-medium">Filters</h3>
          {hasActiveFilters && (
            <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full">
              Active
            </span>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          {hasActiveFilters && onReset && (
            <button
              onClick={onReset}
              disabled={loading}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Reset
            </button>
          )}
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-sm text-primary hover:text-primary/80 transition-colors"
          >
            {isExpanded ? 'Collapse' : 'Expand'}
          </button>
        </div>
      </div>

      {/* Quick filters (always visible) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
        {filters.slice(0, 3).map((filter) => (
          <div key={filter.key}>
            <label className="text-sm font-medium mb-1 block">
              {filter.label}
            </label>
            {renderFilterInput(filter, values[filter.key], (value) => handleValueChange(filter.key, value))}
          </div>
        ))}
      </div>

      {/* Expanded filters */}
      <AnimatePresence>
        {isExpanded && filters.length > 3 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 pt-3 border-t"
          >
            {filters.slice(3).map((filter) => (
              <div key={filter.key}>
                <label className="text-sm font-medium mb-1 block">
                  {filter.label}
                </label>
                {renderFilterInput(filter, values[filter.key], (value) => handleValueChange(filter.key, value))}
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );

  function renderFilterInput(filter: FilterOption, value: any, onChange: (value: any) => void) {
    switch (filter.type) {
      case 'text':
        return (
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              value={value || ''}
              onChange={(e) => onChange(e.target.value)}
              placeholder={filter.placeholder}
              disabled={loading}
              className="w-full pl-10 pr-3 py-2 border border-input bg-background rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>
        );

      case 'select':
        return (
          <select
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            disabled={loading}
            className="w-full px-3 py-2 border border-input bg-background rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-ring"
          >
            <option value="">{filter.placeholder || 'Select...'}</option>
            {filter.options?.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        );

      case 'date':
        return (
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="date"
              value={value || ''}
              onChange={(e) => onChange(e.target.value)}
              disabled={loading}
              className="w-full pl-10 pr-3 py-2 border border-input bg-background rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>
        );

      case 'dateRange':
        const rangeValue = value as { from: string; to: string } || { from: '', to: '' };
        return (
          <div className="flex gap-2">
            <input
              type="date"
              value={rangeValue.from || ''}
              onChange={(e) => onChange({ ...rangeValue, from: e.target.value })}
              disabled={loading}
              placeholder="From"
              className="flex-1 px-3 py-2 border border-input bg-background rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-ring"
            />
            <input
              type="date"
              value={rangeValue.to || ''}
              onChange={(e) => onChange({ ...rangeValue, to: e.target.value })}
              disabled={loading}
              placeholder="To"
              className="flex-1 px-3 py-2 border border-input bg-background rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>
        );

      default:
        return null;
    }
  }
};

/**
 * DataTable - Professional table với sorting và pagination
 * Usage: Sessions list, users table, analytics data
 */
interface TableColumn<T = any> {
  key: string;
  label: string;
  sortable?: boolean;
  render?: (value: any, row: T, index: number) => React.ReactNode;
  width?: string;
  align?: 'left' | 'center' | 'right';
}

interface DataTableProps<T = any> {
  columns: TableColumn<T>[];
  data: T[];
  loading?: boolean;
  error?: string;
  sortKey?: string;
  sortDirection?: 'asc' | 'desc';
  onSort?: (key: string, direction: 'asc' | 'desc') => void;
  pagination?: {
    page: number;
    pageSize: number;
    total: number;
    onPageChange: (page: number) => void;
  };
  actions?: Array<{
    label: string;
    icon?: React.ReactNode;
    onClick: (row: T, index: number) => void;
    variant?: 'default' | 'destructive';
  }>;
  onRowClick?: (row: T, index: number) => void;
  className?: string;
}

function DataTable<T = any>({
  columns,
  data,
  loading = false,
  error,
  sortKey,
  sortDirection,
  onSort,
  pagination,
  actions,
  onRowClick,
  className,
}: DataTableProps<T>) {
  const handleSort = (columnKey: string) => {
    if (!onSort) return;
    
    const newDirection = sortKey === columnKey && sortDirection === 'asc' ? 'desc' : 'asc';
    onSort(columnKey, newDirection);
  };

  const renderSortIcon = (columnKey: string) => {
    if (sortKey !== columnKey) return <SortAsc className="w-4 h-4 opacity-30" />;
    return sortDirection === 'asc' ? 
      <SortAsc className="w-4 h-4 text-primary" /> : 
      <SortDesc className="w-4 h-4 text-primary" />;
  };

  if (error) {
    return (
      <div className="bg-background border rounded-lg p-8 text-center">
        <AlertTriangle className="w-8 h-8 text-destructive mx-auto mb-3" />
        <p className="text-destructive">{error}</p>
      </div>
    );
  }

  return (
    <div className={cn("bg-background border rounded-lg", className)}>
      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="border-b">
            <tr>
              {columns.map((column) => (
                <th
                  key={column.key}
                  className={cn(
                    "px-4 py-3 text-sm font-medium text-left",
                    column.sortable && "cursor-pointer hover:bg-muted/50 transition-colors",
                    column.align === 'center' && "text-center",
                    column.align === 'right' && "text-right"
                  )}
                  style={{ width: column.width }}
                  onClick={() => column.sortable && handleSort(column.key)}
                >
                  <div className="flex items-center gap-2">
                    {column.label}
                    {column.sortable && renderSortIcon(column.key)}
                  </div>
                </th>
              ))}
              {actions && actions.length > 0 && (
                <th className="px-4 py-3 text-sm font-medium text-right w-20">
                  Actions
                </th>
              )}
            </tr>
          </thead>
          
          <tbody>
            {loading ? (
              Array.from({ length: 5 }).map((_, index) => (
                <tr key={index} className="border-b">
                  {columns.map((column) => (
                    <td key={column.key} className="px-4 py-3">
                      <div className="h-4 bg-muted rounded animate-pulse" />
                    </td>
                  ))}
                  {actions && (
                    <td className="px-4 py-3">
                      <div className="h-4 w-8 bg-muted rounded animate-pulse ml-auto" />
                    </td>
                  )}
                </tr>
              ))
            ) : data.length === 0 ? (
              <tr>
                <td 
                  colSpan={columns.length + (actions ? 1 : 0)} 
                  className="px-4 py-8 text-center text-muted-foreground"
                >
                  No data available
                </td>
              </tr>
            ) : (
              data.map((row, index) => (
                <tr
                  key={index}
                  className={cn(
                    "border-b hover:bg-muted/50 transition-colors",
                    onRowClick && "cursor-pointer"
                  )}
                  onClick={() => onRowClick?.(row, index)}
                >
                  {columns.map((column) => (
                    <td
                      key={column.key}
                      className={cn(
                        "px-4 py-3 text-sm",
                        column.align === 'center' && "text-center",
                        column.align === 'right' && "text-right"
                      )}
                    >
                      {column.render ? 
                        column.render((row as any)[column.key], row, index) : 
                        String((row as any)[column.key] || '-')
                      }
                    </td>
                  ))}
                  
                  {actions && actions.length > 0 && (
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {actions.map((action, actionIndex) => (
                          <button
                            key={actionIndex}
                            onClick={(e) => {
                              e.stopPropagation();
                              action.onClick(row, index);
                            }}
                            className={cn(
                              "p-1 rounded hover:bg-muted transition-colors",
                              action.variant === 'destructive' && "hover:bg-destructive/10 text-destructive"
                            )}
                            title={action.label}
                          >
                            {action.icon || <MoreHorizontal className="w-4 h-4" />}
                          </button>
                        ))}
                      </div>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pagination && (
        <div className="flex items-center justify-between px-4 py-3 border-t">
          <div className="text-sm text-muted-foreground">
            Showing {((pagination.page - 1) * pagination.pageSize) + 1} to{' '}
            {Math.min(pagination.page * pagination.pageSize, pagination.total)} of{' '}
            {pagination.total} results
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={() => pagination.onPageChange(pagination.page - 1)}
              disabled={pagination.page <= 1 || loading}
              className="p-2 rounded hover:bg-muted transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            
            <span className="text-sm font-medium px-2">
              Page {pagination.page}
            </span>
            
            <button
              onClick={() => pagination.onPageChange(pagination.page + 1)}
              disabled={pagination.page >= Math.ceil(pagination.total / pagination.pageSize) || loading}
              className="p-2 rounded hover:bg-muted transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// Exports
export {
  AnalyticsChart,
  FilterControls,
  DataTable,
};

export type {
  AnalyticsChartProps,
  FilterControlsProps,
  DataTableProps,
  TableColumn,
  FilterOption,
  FilterValues,
  ChartDataPoint,
};