import { useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Cell,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Clock, Target, TrendingUp, TrendingDown } from 'lucide-react';
import { useCapaMTTCData, type MTTCDataPoint } from '@/hooks/useCapaAnalytics';
import { cn } from '@/lib/utils';

interface CapaMTTCChartProps {
  dateFrom?: string;
  dateTo?: string;
  title?: string;
  description?: string;
  height?: number;
}

export function CapaMTTCChart({
  dateFrom,
  dateTo,
  title = 'Mean Time to Closure (MTTC)',
  description = 'Average days to close CAPAs by severity and type',
  height = 300,
}: CapaMTTCChartProps) {
  const [activeTab, setActiveTab] = useState<'severity' | 'type'>('severity');
  const { data: mttcData, isLoading, isError } = useCapaMTTCData({
    dateFrom,
    dateTo,
    groupBy: 'both',
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent>
          <Skeleton className="w-full" style={{ height }} />
        </CardContent>
      </Card>
    );
  }

  if (isError || !mttcData) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center text-muted-foreground" style={{ height }}>
            Failed to load data
          </div>
        </CardContent>
      </Card>
    );
  }

  const { overall, bySeverity, byType } = mttcData;

  // Severity colors for the severity chart
  const severityColors: Record<string, string> = {
    Critical: '#ef4444',
    Major: '#f59e0b',
    Minor: '#3b82f6',
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Clock className="w-5 h-5 text-muted-foreground" />
          <CardTitle>{title}</CardTitle>
        </div>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        {/* Overall Stats */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="text-center p-3 bg-muted rounded-lg">
            <p className="text-2xl font-bold">{overall.meanDays}</p>
            <p className="text-xs text-muted-foreground">Avg. Days</p>
          </div>
          <div className="text-center p-3 bg-muted rounded-lg">
            <p className="text-2xl font-bold">{overall.medianDays}</p>
            <p className="text-xs text-muted-foreground">Median Days</p>
          </div>
          <div className="text-center p-3 bg-muted rounded-lg">
            <p className="text-2xl font-bold">{overall.minDays} - {overall.maxDays}</p>
            <p className="text-xs text-muted-foreground">Range</p>
          </div>
          <div className="text-center p-3 bg-muted rounded-lg">
            <p className={cn(
              "text-2xl font-bold",
              overall.onTimePercentage >= 80 ? "text-green-600" :
              overall.onTimePercentage >= 60 ? "text-amber-600" : "text-red-600"
            )}>{overall.onTimePercentage}%</p>
            <p className="text-xs text-muted-foreground">On-Time</p>
          </div>
        </div>

        {/* Tabs for Severity vs Type view */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'severity' | 'type')}>
          <TabsList className="mb-4">
            <TabsTrigger value="severity">By Severity</TabsTrigger>
            <TabsTrigger value="type">By Type</TabsTrigger>
          </TabsList>

          <TabsContent value="severity">
            {bySeverity.length === 0 || bySeverity.every(s => s.count === 0) ? (
              <div className="flex items-center justify-center text-muted-foreground" style={{ height }}>
                No closed CAPAs available
              </div>
            ) : (
              <>
                <ResponsiveContainer width="100%" height={height}>
                  <BarChart data={bySeverity} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="category" className="fill-muted-foreground" />
                    <YAxis label={{ value: 'Days', angle: -90, position: 'insideLeft' }} className="fill-muted-foreground" />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (!active || !payload?.length) return null;
                        const data = payload[0].payload as MTTCDataPoint;
                        return (
                          <div className="bg-popover border rounded-lg shadow-lg p-3">
                            <p className="font-medium mb-2">{data.category}</p>
                            <div className="space-y-1 text-sm">
                              <p>Mean: {data.meanDays} days</p>
                              <p>Median: {data.medianDays} days</p>
                              <p>Range: {data.minDays} - {data.maxDays} days</p>
                              <p>Count: {data.count} CAPAs</p>
                              {data.targetDays && (
                                <p className={data.meanDays <= data.targetDays ? 'text-green-600' : 'text-red-600'}>
                                  Target: {data.targetDays} days
                                  {data.meanDays <= data.targetDays ? ' ✓' : ' ✗'}
                                </p>
                              )}
                              <p>On-Time: {data.onTimePercentage}%</p>
                            </div>
                          </div>
                        );
                      }}
                    />
                    
                    {/* Target lines for severity */}
                    {bySeverity.map((entry) => (
                      entry.targetDays && (
                        <ReferenceLine 
                          key={`target-${entry.category}`}
                          y={entry.targetDays} 
                          stroke="#94a3b8" 
                          strokeDasharray="3 3"
                        />
                      )
                    ))}

                    <Bar dataKey="meanDays" name="Mean Days" radius={[4, 4, 0, 0]}>
                      {bySeverity.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={severityColors[entry.category] || '#3b82f6'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>

                {/* Target legend */}
                <div className="flex justify-center mt-2">
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Target className="w-3 h-3" />
                    Target times: Critical ≤28d, Major ≤58d, Minor ≤120d
                  </p>
                </div>
              </>
            )}
          </TabsContent>

          <TabsContent value="type">
            {byType.length === 0 ? (
              <div className="flex items-center justify-center text-muted-foreground" style={{ height }}>
                No closed CAPAs available
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={height + 50}>
                <BarChart
                  data={[...byType].sort((a, b) => b.meanDays - a.meanDays)}
                  layout="vertical"
                  margin={{ top: 20, right: 80, left: 120, bottom: 20 }}
                >
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis type="number" label={{ value: 'Days', position: 'bottom' }} className="fill-muted-foreground" />
                  <YAxis type="category" dataKey="category" width={110} fontSize={12} className="fill-muted-foreground" />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null;
                      const data = payload[0].payload as MTTCDataPoint;
                      return (
                        <div className="bg-popover border rounded-lg shadow-lg p-3">
                          <p className="font-medium mb-2">{data.category}</p>
                          <div className="space-y-1 text-sm">
                            <p>Mean: {data.meanDays} days</p>
                            <p>Median: {data.medianDays} days</p>
                            <p>Range: {data.minDays} - {data.maxDays} days</p>
                            <p>Count: {data.count} CAPAs</p>
                            <p>On-Time: {data.onTimePercentage}%</p>
                          </div>
                        </div>
                      );
                    }}
                  />

                  {/* Reference line at overall mean */}
                  <ReferenceLine x={overall.meanDays} stroke="#f59e0b" strokeDasharray="5 5" label={{ value: `Avg: ${overall.meanDays}d`, position: 'top', fill: '#f59e0b' }} />

                  <Bar dataKey="meanDays" name="Mean Days" radius={[0, 4, 4, 0]}>
                    {byType.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={entry.meanDays > overall.meanDays ? '#ef4444' : '#22c55e'}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </TabsContent>
        </Tabs>

        {/* Performance insight */}
        <div className="mt-4 text-center">
          {overall.count === 0 ? (
            <span className="text-sm text-muted-foreground">No closed CAPAs in the selected period</span>
          ) : overall.onTimePercentage >= 80 ? (
            <span className="text-sm text-green-600 flex items-center justify-center gap-1">
              <TrendingUp className="w-4 h-4" />
              Strong performance: {overall.onTimePercentage}% of CAPAs closed on time
            </span>
          ) : overall.onTimePercentage >= 60 ? (
            <span className="text-sm text-amber-600 flex items-center justify-center gap-1">
              <TrendingUp className="w-4 h-4" />
              Room for improvement: {overall.onTimePercentage}% on-time closure rate
            </span>
          ) : (
            <span className="text-sm text-red-600 flex items-center justify-center gap-1">
              <TrendingDown className="w-4 h-4" />
              Action needed: Only {overall.onTimePercentage}% of CAPAs closed on time
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
