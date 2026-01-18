import { useState } from 'react';
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { useCapaTrendData, type TrendDataPoint } from '@/hooks/useCapaAnalytics';

interface CapaTrendChartProps {
  title?: string;
  description?: string;
  height?: number;
  defaultMonths?: number;
}

export function CapaTrendChart({
  title = 'Opened vs Closed Trend',
  description = 'Monthly CAPA activity and backlog trend',
  height = 350,
  defaultMonths = 12,
}: CapaTrendChartProps) {
  const [months, setMonths] = useState(defaultMonths);
  const { data: trendData, isLoading, isError } = useCapaTrendData({ months });

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

  if (isError || !trendData) {
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

  const { summary } = trendData;
  const trendDirection = summary.netChange > 0 ? 'up' : summary.netChange < 0 ? 'down' : 'neutral';

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </div>
          <Select value={months.toString()} onValueChange={(v) => setMonths(parseInt(v))}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="6">Last 6 months</SelectItem>
              <SelectItem value="12">Last 12 months</SelectItem>
              <SelectItem value="18">Last 18 months</SelectItem>
              <SelectItem value="24">Last 24 months</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        {/* Summary Stats */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="text-center p-3 bg-blue-50 rounded-lg">
            <p className="text-2xl font-bold text-blue-600">{summary.totalOpened}</p>
            <p className="text-xs text-muted-foreground">Opened</p>
          </div>
          <div className="text-center p-3 bg-green-50 rounded-lg">
            <p className="text-2xl font-bold text-green-600">{summary.totalClosed}</p>
            <p className="text-xs text-muted-foreground">Closed</p>
          </div>
          <div className={`text-center p-3 rounded-lg ${
            trendDirection === 'up' ? 'bg-red-50' : 
            trendDirection === 'down' ? 'bg-green-50' : 'bg-gray-50'
          }`}>
            <p className={`text-2xl font-bold flex items-center justify-center gap-1 ${
              trendDirection === 'up' ? 'text-red-600' : 
              trendDirection === 'down' ? 'text-green-600' : 'text-gray-600'
            }`}>
              {trendDirection === 'up' && <TrendingUp className="w-5 h-5" />}
              {trendDirection === 'down' && <TrendingDown className="w-5 h-5" />}
              {trendDirection === 'neutral' && <Minus className="w-5 h-5" />}
              {summary.netChange > 0 ? '+' : ''}{summary.netChange}
            </p>
            <p className="text-xs text-muted-foreground">Net Change</p>
          </div>
          <div className="text-center p-3 bg-amber-50 rounded-lg">
            <p className="text-2xl font-bold text-amber-600">{summary.currentOpenBacklog}</p>
            <p className="text-xs text-muted-foreground">Current Backlog</p>
          </div>
        </div>

        {/* Chart */}
        <ResponsiveContainer width="100%" height={height}>
          <ComposedChart data={trendData.data} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis
              dataKey="monthLabel"
              fontSize={11}
              tickMargin={months > 12 ? 1 : 0}
              angle={months > 12 ? -45 : 0}
              textAnchor={months > 12 ? 'end' : 'middle'}
              height={months > 12 ? 60 : 30}
              className="fill-muted-foreground"
            />
            <YAxis yAxisId="left" className="fill-muted-foreground" />
            <YAxis yAxisId="right" orientation="right" className="fill-muted-foreground" />
            <Tooltip
              content={({ active, payload, label }) => {
                if (!active || !payload?.length) return null;
                const data = payload[0].payload as TrendDataPoint;
                return (
                  <div className="bg-popover border rounded-lg shadow-lg p-3">
                    <p className="font-medium mb-2">{label}</p>
                    <div className="space-y-1">
                      <p className="text-sm flex items-center gap-2">
                        <span className="w-3 h-3 rounded bg-blue-500" />
                        Opened: {data.opened}
                      </p>
                      <p className="text-sm flex items-center gap-2">
                        <span className="w-3 h-3 rounded bg-green-500" />
                        Closed: {data.closed}
                      </p>
                      <p className="text-sm flex items-center gap-2">
                        <span className="w-3 h-3 rounded bg-amber-500" />
                        Backlog: {data.cumulativeOpen}
                      </p>
                      <p className={`text-sm font-medium ${
                        data.netChange > 0 ? 'text-red-500' : 
                        data.netChange < 0 ? 'text-green-500' : ''
                      }`}>
                        Net: {data.netChange > 0 ? '+' : ''}{data.netChange}
                      </p>
                    </div>
                  </div>
                );
              }}
            />
            <Legend />

            <Bar yAxisId="left" dataKey="opened" name="Opened" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            <Bar yAxisId="left" dataKey="closed" name="Closed" fill="#22c55e" radius={[4, 4, 0, 0]} />
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="cumulativeOpen"
              name="Backlog"
              stroke="#f59e0b"
              strokeWidth={2}
              dot={{ fill: '#f59e0b', r: 3 }}
            />
          </ComposedChart>
        </ResponsiveContainer>

        {/* Monthly averages */}
        <div className="flex justify-center gap-8 mt-4 text-sm text-muted-foreground">
          <span>Avg. Opened/Month: <strong>{summary.averageOpenedPerMonth}</strong></span>
          <span>Avg. Closed/Month: <strong>{summary.averageClosedPerMonth}</strong></span>
        </div>
      </CardContent>
    </Card>
  );
}
