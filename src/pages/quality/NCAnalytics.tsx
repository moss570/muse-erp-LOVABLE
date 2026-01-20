import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { useNCMetrics, useNCParetoAnalysis, useCostOfQuality, refreshNCAnalytics } from '@/hooks/useNCAnalytics';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  ComposedChart,
} from 'recharts';
import {
  TrendingUp,
  AlertTriangle,
  DollarSign,
  Calendar,
  Download,
  RefreshCw,
  Info,
} from 'lucide-react';
import { format, subDays, subMonths } from 'date-fns';
import { NC_TYPE_CONFIG } from '@/types/non-conformities';
import { toast } from 'sonner';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];

export default function NCAnalytics() {
  const [dateRange, setDateRange] = useState('30');
  const [paretoGroupBy, setParetoGroupBy] = useState<'nc_type' | 'material_id' | 'supplier_id' | 'equipment_id'>('nc_type');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const endDate = format(new Date(), 'yyyy-MM-dd');
  const startDate = format(
    dateRange === '30' ? subDays(new Date(), 30) :
    dateRange === '90' ? subDays(new Date(), 90) :
    dateRange === '180' ? subDays(new Date(), 180) :
    subMonths(new Date(), 12),
    'yyyy-MM-dd'
  );

  const { data: metrics, isLoading: metricsLoading } = useNCMetrics(startDate, endDate);
  const { data: paretoData, isLoading: paretoLoading } = useNCParetoAnalysis(startDate, endDate, paretoGroupBy);
  const { data: costData, isLoading: costLoading } = useCostOfQuality(startDate, endDate);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refreshNCAnalytics();
      toast.success('Analytics refreshed');
    } catch (error) {
      toast.error('Failed to refresh analytics');
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <div className="container py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Non-Conformity Analytics</h1>
          <p className="text-muted-foreground">
            Quality metrics, trends, and cost analysis
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-[160px]">
              <Calendar className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="30">Last 30 Days</SelectItem>
              <SelectItem value="90">Last 90 Days</SelectItem>
              <SelectItem value="180">Last 6 Months</SelectItem>
              <SelectItem value="365">Last 12 Months</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={handleRefresh} disabled={isRefreshing}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      {metricsLoading ? (
        <div className="grid grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
      ) : metrics ? (
        <div className="grid grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total NCs</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{metrics.metrics.total_ncs}</p>
              <p className="text-xs text-muted-foreground">
                {metrics.metrics.open_ncs} open, {metrics.metrics.closed_ncs} closed
              </p>
            </CardContent>
          </Card>

          <Card className={metrics.metrics.critical_ncs > 0 ? 'border-destructive' : ''}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Critical Issues</CardTitle>
              <AlertTriangle className="h-4 w-4 text-destructive" />
            </CardHeader>
            <CardContent>
              <p className={`text-2xl font-bold ${metrics.metrics.critical_ncs > 0 ? 'text-destructive' : ''}`}>
                {metrics.metrics.critical_ncs}
              </p>
              <p className="text-xs text-muted-foreground">
                {metrics.metrics.food_safety_ncs} food safety related
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Cost Impact</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">
                ${(metrics.metrics.total_estimated_cost || 0).toLocaleString()}
              </p>
              <p className="text-xs text-muted-foreground">
                Estimated cost (actual: ${(metrics.metrics.total_actual_cost || 0).toLocaleString()})
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Avg. Time to Close</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">
                {metrics.metrics.avg_days_to_close?.toFixed(1) || 'N/A'} days
              </p>
              <p className="text-xs text-muted-foreground">
                CAPA created: {metrics.metrics.capa_created_ncs}/{metrics.metrics.capa_required_ncs} required
              </p>
            </CardContent>
          </Card>
        </div>
      ) : null}

      {/* Charts and Analysis */}
      <Tabs defaultValue="trends" className="space-y-4">
        <TabsList>
          <TabsTrigger value="trends">Trends</TabsTrigger>
          <TabsTrigger value="breakdown">Breakdown</TabsTrigger>
          <TabsTrigger value="pareto">Pareto Analysis</TabsTrigger>
          <TabsTrigger value="cost">Cost of Quality</TabsTrigger>
        </TabsList>

        {/* Trends Tab */}
        <TabsContent value="trends">
          <Card>
            <CardHeader>
              <CardTitle>NC Trend Over Time</CardTitle>
              <CardDescription>Monthly non-conformity counts</CardDescription>
            </CardHeader>
            <CardContent>
              {metricsLoading ? (
                <Skeleton className="h-[300px]" />
              ) : metrics?.by_month && metrics.by_month.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={metrics.by_month}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="count" stroke="hsl(var(--primary))" name="NCs" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-center text-muted-foreground py-12">No data available</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Breakdown Tab */}
        <TabsContent value="breakdown">
          <div className="grid grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>By Type</CardTitle>
                <CardDescription>Distribution of NC types</CardDescription>
              </CardHeader>
              <CardContent>
                {metricsLoading ? (
                  <Skeleton className="h-[300px]" />
                ) : metrics?.by_type && metrics.by_type.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={metrics.by_type} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" />
                      <YAxis dataKey="nc_type" type="category" width={120} />
                      <Tooltip />
                      <Bar dataKey="count" fill="hsl(var(--primary))" name="Count" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-center text-muted-foreground py-12">No data available</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>By Disposition</CardTitle>
                <CardDescription>How NCs were resolved</CardDescription>
              </CardHeader>
              <CardContent>
                {metricsLoading ? (
                  <Skeleton className="h-[300px]" />
                ) : metrics?.by_disposition && metrics.by_disposition.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={metrics.by_disposition}
                        nameKey="disposition"
                        dataKey="count"
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        label={({ disposition, count }) => `${disposition}: ${count}`}
                      >
                        {metrics.by_disposition.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-center text-muted-foreground py-12">No data available</p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Pareto Tab */}
        <TabsContent value="pareto">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Pareto Analysis (80/20 Rule)</CardTitle>
                  <CardDescription>Identify the vital few vs trivial many</CardDescription>
                </div>
                <Select value={paretoGroupBy} onValueChange={(v) => setParetoGroupBy(v as typeof paretoGroupBy)}>
                  <SelectTrigger className="w-[160px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="nc_type">By NC Type</SelectItem>
                    <SelectItem value="material_id">By Material</SelectItem>
                    <SelectItem value="supplier_id">By Supplier</SelectItem>
                    <SelectItem value="equipment_id">By Equipment</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              {paretoLoading ? (
                <Skeleton className="h-[300px]" />
              ) : paretoData && paretoData.length > 0 ? (
                <>
                  <ResponsiveContainer width="100%" height={300}>
                    <ComposedChart data={paretoData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="category" angle={-45} textAnchor="end" height={100} />
                      <YAxis yAxisId="left" orientation="left" />
                      <YAxis yAxisId="right" orientation="right" domain={[0, 100]} />
                      <Tooltip />
                      <Legend />
                      <Bar yAxisId="left" dataKey="nc_count" fill="hsl(var(--primary))" name="Count" />
                      <Line yAxisId="right" type="monotone" dataKey="cumulative_percentage" stroke="hsl(var(--destructive))" name="Cumulative %" strokeWidth={2} />
                    </ComposedChart>
                  </ResponsiveContainer>

                  <div className="mt-4 space-y-2">
                    <p className="text-sm font-medium">Top Issues (80% Rule):</p>
                    {paretoData
                      .filter(d => d.cumulative_percentage <= 80)
                      .map((item, index) => (
                        <div key={index} className="flex items-center justify-between p-2 bg-muted rounded">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{item.category}</span>
                            <span className="text-sm text-muted-foreground">
                              ({item.nc_count} NCs, {item.percentage}%)
                            </span>
                          </div>
                          <span className="text-sm font-medium">
                            ${(item.total_cost || 0).toLocaleString()}
                          </span>
                        </div>
                      ))}
                  </div>
                </>
              ) : (
                <p className="text-center text-muted-foreground py-12">No data available</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Cost of Quality Tab */}
        <TabsContent value="cost">
          <Card>
            <CardHeader>
              <CardTitle>Cost of Quality Breakdown</CardTitle>
              <CardDescription>Categorized by Prevention, Appraisal, and Failure costs</CardDescription>
            </CardHeader>
            <CardContent>
              {costLoading ? (
                <Skeleton className="h-[300px]" />
              ) : costData && Object.keys(costData).length > 0 ? (
                <div className="space-y-6">
                  {/* Summary Cards */}
                  <div className="grid grid-cols-4 gap-4">
                    {Object.entries(costData).map(([type, data]) => (
                      <Card key={type}>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm font-medium capitalize">
                            {type.replace(/_/g, ' ')}
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <p className="text-xl font-bold">
                            ${data.total.toLocaleString()}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {data.items.length} items
                          </p>
                        </CardContent>
                      </Card>
                    ))}
                  </div>

                  {/* Pie Chart */}
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={Object.entries(costData).map(([type, data]) => ({
                          name: type.replace(/_/g, ' '),
                          value: data.total,
                        }))}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, value }) => `${name}: $${value.toLocaleString()}`}
                        outerRadius={100}
                        dataKey="value"
                      >
                        {Object.keys(costData).map((_, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>

                  {/* Summary */}
                  <div className="text-center">
                    <p className="text-lg font-semibold">
                      Total Cost of Quality: ${Object.values(costData).reduce((sum, d) => sum + d.total, 0).toLocaleString()}
                    </p>
                    <Alert className="mt-4">
                      <Info className="h-4 w-4" />
                      <AlertDescription>
                        Prevention & Appraisal costs are investments to prevent defects.
                        Failure costs are losses from defects that occurred.
                        The goal is to shift spending from failure to prevention.
                      </AlertDescription>
                    </Alert>
                  </div>
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-12">No cost data available</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
