/**
 * Analytics Charts Component (P27.2)
 * Recharts integration với LineChart, PieChart, BarChart
 * Responsive design và interactive tooltips
 */

import { useMemo } from 'react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { TrendingUp, PieChart as PieChartIcon, BarChart3 } from 'lucide-react';

// Chart data interfaces
interface TimelineData {
  date: string;
  sessions: number;
  detections: number;
}

interface SeverityData {
  name: string;
  value: number;
  color: string;
  [key: string]: any; // Index signature for Recharts ChartDataInput compatibility
}

interface HourlyActivityData {
  hour: number;
  activity: number;
}

export interface AnalyticsChartsData {
  timeline: TimelineData[];
  severity: SeverityData[];
  hourlyActivity: HourlyActivityData[];
}

export interface AnalyticsChartsProps {
  data: AnalyticsChartsData;
  isLoading?: boolean;
  onChartClick?: (event: { chartType: string; dataPoint: any }) => void;
  className?: string;
}

// Chart skeleton component
function ChartSkeleton({ title }: { title: string }) {
  return (
    <div data-testid="chart-skeleton" className="bg-white rounded-lg border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>
      <div className="h-64 bg-gray-100 rounded animate-pulse flex items-center justify-center">
        <div className="text-gray-400">Loading chart...</div>
      </div>
    </div>
  );
}

// Empty state component
function ChartEmptyState({ title, icon: Icon }: { title: string; icon: any }) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>
      <div className="h-64 flex items-center justify-center text-gray-500">
        <div className="text-center">
          <Icon className="h-12 w-12 mx-auto mb-2 opacity-50" />
          <p>No data available</p>
        </div>
      </div>
    </div>
  );
}

// Custom tooltip components
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white p-4 border border-gray-200 rounded-lg shadow-lg">
        <p className="font-medium text-gray-900">{label}</p>
        {payload.map((pld: any, index: number) => (
          <p key={index} style={{ color: pld.color }} className="text-sm">
            {`${pld.dataKey}: ${pld.value}`}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

// Timeline Chart Component  
function TimelineChart({ 
  data, 
  onChartClick 
}: { 
  data: TimelineData[]; 
  onChartClick?: (event: any) => void;
}) {
  if (data.length === 0) {
    return <ChartEmptyState title="Activity Timeline" icon={TrendingUp} />;
  }

  return (
    <div data-testid="timeline-chart" className="bg-white rounded-lg border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Activity Timeline</h3>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart
          data={data}
          onClick={(data) => onChartClick?.({ chartType: 'timeline', dataPoint: data })}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis 
            dataKey="date" 
            stroke="#6b7280"
            fontSize={12}
            tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          />
          <YAxis stroke="#6b7280" fontSize={12} />
          <Tooltip content={<CustomTooltip />} />
          <Legend />
          <Line 
            type="monotone" 
            dataKey="sessions" 
            stroke="#3b82f6" 
            strokeWidth={2}
            dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4 }}
            name="Sessions"
          />
          <Line 
            type="monotone" 
            dataKey="detections" 
            stroke="#ef4444" 
            strokeWidth={2}
            dot={{ fill: '#ef4444', strokeWidth: 2, r: 4 }}
            name="Detections"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

// Severity Distribution Chart
function SeverityChart({ 
  data, 
  onChartClick 
}: { 
  data: SeverityData[]; 
  onChartClick?: (event: any) => void;
}) {
  if (data.length === 0) {
    return <ChartEmptyState title="Severity Distribution" icon={PieChartIcon} />;
  }

  return (
    <div data-testid="severity-chart" className="bg-white rounded-lg border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Severity Distribution</h3>
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={({ name, percent }) => `${name} ${((percent as number) * 100).toFixed(1)}%`}
            outerRadius={80}
            fill="#8884d8"
            dataKey="value"
            onClick={(data) => onChartClick?.({ chartType: 'severity', dataPoint: data })}
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

// Hourly Activity Chart
function ActivityChart({ 
  data, 
  onChartClick 
}: { 
  data: HourlyActivityData[]; 
  onChartClick?: (event: any) => void;
}) {
  if (data.length === 0) {
    return <ChartEmptyState title="Hourly Activity" icon={BarChart3} />;
  }

  return (
    <div data-testid="activity-chart" className="bg-white rounded-lg border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Hourly Activity</h3>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart
          data={data}
          onClick={(data) => onChartClick?.({ chartType: 'activity', dataPoint: data })}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis 
            dataKey="hour" 
            stroke="#6b7280"
            fontSize={12}
            tickFormatter={(value) => `${value}:00`}
          />
          <YAxis stroke="#6b7280" fontSize={12} />
          <Tooltip 
            content={<CustomTooltip />}
            labelFormatter={(value) => `Hour: ${value}:00`}
          />
          <Bar 
            dataKey="activity" 
            fill="#10b981"
            radius={[4, 4, 0, 0]}
            name="Activity"
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// Main Analytics Charts Component
export function AnalyticsCharts({
  data,
  isLoading = false,
  onChartClick,
  className,
}: AnalyticsChartsProps) {
  const chartsData = useMemo(() => {
    if (!data) return null;
    
    return {
      timeline: data.timeline || [],
      severity: data.severity || [],
      hourlyActivity: data.hourlyActivity || [],
    };
  }, [data]);

  if (isLoading) {
    return (
      <div className={className}>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ChartSkeleton title="Activity Timeline" />
          <ChartSkeleton title="Severity Distribution" />
        </div>
        <div className="mt-6">
          <ChartSkeleton title="Hourly Activity" />
        </div>
      </div>
    );
  }

  if (!chartsData) {
    return (
      <div className={className}>
        <div className="text-center py-12">
          <p className="text-gray-500">No chart data available</p>
        </div>
      </div>
    );
  }

  return (
    <div className={className}>
      {/* Top row - Timeline and Severity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <TimelineChart 
          data={chartsData.timeline} 
          {...(onChartClick && { onChartClick })}
        />
        <SeverityChart 
          data={chartsData.severity} 
          {...(onChartClick && { onChartClick })}
        />
      </div>
      
      {/* Bottom row - Hourly Activity */}
      <ActivityChart 
        data={chartsData.hourlyActivity} 
        {...(onChartClick && { onChartClick })}
      />
    </div>
  );
}