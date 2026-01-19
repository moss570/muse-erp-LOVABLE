import { useState } from 'react';
import { format, subMonths } from 'date-fns';
import { BarChart3, TrendingDown, TrendingUp, Clock, Target } from 'lucide-react';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { CapaParetoChart } from '@/components/capa/CapaParetoChart';
import { CapaTrendChart } from '@/components/capa/CapaTrendChart';
import { CapaMTTCChart } from '@/components/capa/CapaMTTCChart';
import { useCapaAnalyticsDashboard } from '@/hooks/useCapaAnalytics';
import { cn } from '@/lib/utils';

export default function CapaAnalytics() {
  const [months, setMonths] = useState(12);
  const [dateRange, setDateRange] = useState<{ from?: string; to?: string }>({});

  const { pareto, trend, mttc, isLoading } = useCapaAnalyticsDashboard({
    months,
    dateFrom: dateRange.from,
    dateTo: dateRange.to,
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">CAPA Analytics</h1>
          <p className="text-muted-foreground">
            Analyze corrective action trends, patterns, and performance metrics
          </p>
        </div>
        <Select value={months.toString()} onValueChange={(v) => setMonths(parseInt(v))}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Time range" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="3">Last 3 months</SelectItem>
            <SelectItem value="6">Last 6 months</SelectItem>
            <SelectItem value="12">Last 12 months</SelectItem>
            <SelectItem value="24">Last 24 months</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Total Opened
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold">{trend.data?.summary.totalOpened || 0}</div>
            )}
            <p className="text-xs text-muted-foreground mt-1">
              {trend.data?.summary.averageOpenedPerMonth || 0}/month avg
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Target className="h-4 w-4" />
              Total Closed
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold text-green-600">{trend.data?.summary.totalClosed || 0}</div>
            )}
            <p className="text-xs text-muted-foreground mt-1">
              {trend.data?.summary.averageClosedPerMonth || 0}/month avg
            </p>
          </CardContent>
        </Card>

        <Card className={cn(
          (trend.data?.summary.netChange || 0) > 0 && 'border-amber-300'
        )}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              {(trend.data?.summary.netChange || 0) > 0 ? (
                <TrendingUp className="h-4 w-4 text-amber-600" />
              ) : (
                <TrendingDown className="h-4 w-4 text-green-600" />
              )}
              Net Change
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className={cn(
                'text-2xl font-bold',
                (trend.data?.summary.netChange || 0) > 0 ? 'text-amber-600' : 'text-green-600'
              )}>
                {(trend.data?.summary.netChange || 0) > 0 ? '+' : ''}
                {trend.data?.summary.netChange || 0}
              </div>
            )}
            <p className="text-xs text-muted-foreground mt-1">
              Opened minus closed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Mean Time to Close
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold">{mttc.data?.overall.meanDays || 0} days</div>
            )}
            <p className="text-xs text-muted-foreground mt-1">
              {mttc.data?.overall.onTimePercentage || 0}% on-time
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-2 gap-6">
        {/* Pareto Chart */}
        <CapaParetoChart 
          title="CAPA Types Distribution"
          description="Identify the most common types of corrective actions"
        />

        {/* MTTC Chart */}
        <CapaMTTCChart 
          title="Mean Time to Closure"
          description="Average days to close CAPAs by severity and type"
        />
      </div>

      {/* Trend Chart - Full Width */}
      <CapaTrendChart 
        title="Monthly Trends"
        description="Track opened vs closed CAPAs and backlog over time"
        defaultMonths={months}
        height={350}
      />
    </div>
  );
}
