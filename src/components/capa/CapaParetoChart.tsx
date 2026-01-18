import {
  ComposedChart,
  Bar,
  Line,
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
import { useCapaParetoData, type ParetoDataPoint } from '@/hooks/useCapaAnalytics';

interface CapaParetoChartProps {
  dateFrom?: string;
  dateTo?: string;
  status?: 'all' | 'open' | 'closed';
  title?: string;
  description?: string;
  height?: number;
}

export function CapaParetoChart({
  dateFrom,
  dateTo,
  status = 'all',
  title = 'CAPA Pareto Analysis',
  description = 'Distribution of corrective actions by type (80/20 rule)',
  height = 350,
}: CapaParetoChartProps) {
  const { data: paretoData, isLoading, isError } = useCapaParetoData({
    dateFrom,
    dateTo,
    status,
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

  if (isError || !paretoData) {
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

  if (paretoData.data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center text-muted-foreground" style={{ height }}>
            No CAPA data available for the selected period
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>{title}</CardTitle>
          <span className="text-sm text-muted-foreground">
            Total: {paretoData.total} CAPAs
          </span>
        </div>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={height}>
          <ComposedChart data={paretoData.data} margin={{ top: 20, right: 60, left: 20, bottom: 60 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis 
              dataKey="label" 
              angle={-45} 
              textAnchor="end" 
              height={80}
              fontSize={12}
              className="fill-muted-foreground"
            />
            <YAxis 
              yAxisId="left" 
              orientation="left"
              className="fill-muted-foreground"
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              domain={[0, 100]}
              tickFormatter={(value) => `${value}%`}
              className="fill-muted-foreground"
            />
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const data = payload[0].payload as ParetoDataPoint;
                return (
                  <div className="bg-popover border rounded-lg shadow-lg p-3">
                    <p className="font-medium">{data.label}</p>
                    <p className="text-sm text-muted-foreground">Count: {data.count}</p>
                    <p className="text-sm text-muted-foreground">Percentage: {data.percentage}%</p>
                    <p className="text-sm text-muted-foreground">Cumulative: {data.cumulativePercentage}%</p>
                  </div>
                );
              }}
            />

            {/* 80% reference line */}
            <ReferenceLine yAxisId="right" y={80} stroke="#ef4444" strokeDasharray="5 5" label={{ value: '80%', position: 'right', fill: '#ef4444' }} />

            <Bar yAxisId="left" dataKey="count" name="Count" radius={[4, 4, 0, 0]}>
              {paretoData.data.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={paretoData.eightyPercentTypes.includes(entry.type) ? '#3b82f6' : '#94a3b8'} 
                />
              ))}
            </Bar>

            <Line
              yAxisId="right"
              type="monotone"
              dataKey="cumulativePercentage"
              stroke="#f59e0b"
              strokeWidth={2}
              dot={{ fill: '#f59e0b', r: 4 }}
              name="Cumulative %"
            />
          </ComposedChart>
        </ResponsiveContainer>

        {/* 80/20 insight */}
        <p className="text-sm text-muted-foreground mt-4 text-center">
          <span className="font-medium text-blue-600">
            {paretoData.eightyPercentTypes.length} categories
          </span>
          {' '}account for 80% of all CAPAs:{' '}
          <span className="font-medium">
            {paretoData.data
              .filter(d => paretoData.eightyPercentTypes.includes(d.type))
              .map(d => d.label)
              .join(', ')}
          </span>
        </p>
      </CardContent>
    </Card>
  );
}
