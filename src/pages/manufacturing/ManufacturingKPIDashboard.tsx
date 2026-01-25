import { useState, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Factory, 
  CalendarIcon, 
  TrendingUp,
  TrendingDown,
  Target,
  Clock,
  Gauge,
  Activity,
  BarChart3,
  Users,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  ArrowUpRight,
  ArrowDownRight,
  Minus
} from "lucide-react";
import { format, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth, eachDayOfInterval, parseISO } from "date-fns";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar,
  Legend,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell
} from "recharts";

type DateRange = "today" | "week" | "month" | "custom";

export default function ManufacturingKPIDashboard() {
  const [dateRange, setDateRange] = useState<DateRange>("week");
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  
  // Calculate date range
  const { startDate, endDate } = useMemo(() => {
    const today = new Date();
    switch (dateRange) {
      case "today":
        return { startDate: today, endDate: today };
      case "week":
        return { startDate: startOfWeek(today, { weekStartsOn: 1 }), endDate: endOfWeek(today, { weekStartsOn: 1 }) };
      case "month":
        return { startDate: startOfMonth(today), endDate: endOfMonth(today) };
      case "custom":
        return { startDate: selectedDate, endDate: selectedDate };
      default:
        return { startDate: today, endDate: today };
    }
  }, [dateRange, selectedDate]);

  const formattedStartDate = format(startDate, "yyyy-MM-dd");
  const formattedEndDate = format(endDate, "yyyy-MM-dd");

  // Fetch work orders for the date range
  const { data: workOrders = [], isLoading: woLoading } = useQuery({
    queryKey: ["kpi-work-orders", formattedStartDate, formattedEndDate],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("work_orders")
        .select(`
          *,
          product:products(id, name, sku),
          production_line:production_lines(id, name)
        `)
        .gte("scheduled_date", formattedStartDate)
        .lte("scheduled_date", formattedEndDate)
        .order("scheduled_date");

      if (error) throw error;
      return data || [];
    },
  });

  // Fetch daily production targets for the date range
  const { data: targets = [], isLoading: targetsLoading } = useQuery({
    queryKey: ["kpi-production-targets", formattedStartDate, formattedEndDate],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("daily_production_targets")
        .select(`
          *,
          production_line:production_lines(id, name)
        `)
        .gte("target_date", formattedStartDate)
        .lte("target_date", formattedEndDate)
        .order("target_date");

      if (error) throw error;
      return data || [];
    },
  });

  // Fetch production lines for filtering
  const { data: productionLines = [] } = useQuery({
    queryKey: ["production-lines"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("production_lines")
        .select("id, name")
        .eq("is_active", true)
        .order("name");

      if (error) throw error;
      return data || [];
    },
  });

  const isLoading = woLoading || targetsLoading;

  // Calculate KPIs
  const kpis = useMemo(() => {
    // Output vs Target
    const targetQuantity = targets.reduce((sum, t) => sum + (Number(t.target_quantity) || 0), 0);
    const actualQuantity = workOrders.reduce((sum, wo) => sum + (Number(wo.actual_quantity) || 0), 0);
    const outputAchievement = targetQuantity > 0 ? (actualQuantity / targetQuantity) * 100 : 0;
    
    // Yield Rate (average across completed work orders)
    const completedWOs = workOrders.filter(wo => 
      ["Completed", "completed", "COMPLETED"].includes(wo.wo_status || "")
    );
    const avgYield = completedWOs.length > 0
      ? completedWOs.reduce((sum, wo) => sum + (Number(wo.yield_percentage) || 0), 0) / completedWOs.length
      : 0;
    
    // Labor Efficiency
    const targetLaborHours = targets.reduce((sum, t) => sum + (Number(t.target_labor_hours) || 0), 0);
    const actualLaborHours = workOrders.reduce((sum, wo) => sum + (Number(wo.actual_labor_hours) || 0), 0);
    const laborEfficiency = targetLaborHours > 0 ? (targetLaborHours / Math.max(actualLaborHours, 0.01)) * 100 : 0;
    
    // Cost Variance
    const plannedCost = workOrders.reduce((sum, wo) => sum + (Number(wo.planned_total_cost) || 0), 0);
    const actualCost = workOrders.reduce((sum, wo) => sum + (Number(wo.actual_total_cost) || 0), 0);
    const costVariance = plannedCost > 0 ? ((plannedCost - actualCost) / plannedCost) * 100 : 0;
    
    // WO Status breakdown
    const statusBreakdown = {
      completed: workOrders.filter(wo => ["Completed", "completed"].includes(wo.wo_status || "")).length,
      inProgress: workOrders.filter(wo => ["In Progress", "in_progress"].includes(wo.wo_status || "")).length,
      scheduled: workOrders.filter(wo => ["Scheduled", "scheduled", "Released"].includes(wo.wo_status || "")).length,
      draft: workOrders.filter(wo => ["Draft", "draft", "Planned"].includes(wo.wo_status || "")).length,
    };
    
    return {
      targetQuantity,
      actualQuantity,
      outputAchievement,
      avgYield,
      targetLaborHours,
      actualLaborHours,
      laborEfficiency,
      plannedCost,
      actualCost,
      costVariance,
      statusBreakdown,
      totalWOs: workOrders.length,
      completedWOs: completedWOs.length,
    };
  }, [workOrders, targets]);

  // Chart data - daily output vs target
  const dailyChartData = useMemo(() => {
    const days = eachDayOfInterval({ start: startDate, end: endDate });
    return days.map(day => {
      const dateStr = format(day, "yyyy-MM-dd");
      const dayTargets = targets.filter(t => t.target_date === dateStr);
      const dayWOs = workOrders.filter(wo => wo.scheduled_date === dateStr);
      
      const target = dayTargets.reduce((sum, t) => sum + (Number(t.target_quantity) || 0), 0);
      const actual = dayWOs.reduce((sum, wo) => sum + (Number(wo.actual_quantity) || 0), 0);
      const yield_rate = dayWOs.filter(wo => wo.yield_percentage).length > 0
        ? dayWOs.reduce((sum, wo) => sum + (Number(wo.yield_percentage) || 0), 0) / dayWOs.filter(wo => wo.yield_percentage).length
        : null;
      
      return {
        date: format(day, "EEE"),
        fullDate: format(day, "MMM d"),
        target,
        actual,
        yield: yield_rate,
        achievement: target > 0 ? Math.round((actual / target) * 100) : 0,
      };
    });
  }, [startDate, endDate, targets, workOrders]);

  // Labor efficiency chart data
  const laborChartData = useMemo(() => {
    const days = eachDayOfInterval({ start: startDate, end: endDate });
    return days.map(day => {
      const dateStr = format(day, "yyyy-MM-dd");
      const dayTargets = targets.filter(t => t.target_date === dateStr);
      const dayWOs = workOrders.filter(wo => wo.scheduled_date === dateStr);
      
      const targetHours = dayTargets.reduce((sum, t) => sum + (Number(t.target_labor_hours) || 0), 0);
      const actualHours = dayWOs.reduce((sum, wo) => sum + (Number(wo.actual_labor_hours) || 0), 0);
      
      return {
        date: format(day, "EEE"),
        fullDate: format(day, "MMM d"),
        targetHours,
        actualHours,
        efficiency: targetHours > 0 && actualHours > 0 ? Math.round((targetHours / actualHours) * 100) : null,
      };
    });
  }, [startDate, endDate, targets, workOrders]);

  const statusPieData = useMemo(() => [
    { name: "Completed", value: kpis.statusBreakdown.completed, color: "hsl(142 76% 36%)" },
    { name: "In Progress", value: kpis.statusBreakdown.inProgress, color: "hsl(221 83% 53%)" },
    { name: "Scheduled", value: kpis.statusBreakdown.scheduled, color: "hsl(45 93% 47%)" },
    { name: "Draft", value: kpis.statusBreakdown.draft, color: "hsl(220 9% 46%)" },
  ].filter(d => d.value > 0), [kpis.statusBreakdown]);

  const getKPIStatus = (value: number, thresholds: { good: number; warning: number }) => {
    if (value >= thresholds.good) return "good";
    if (value >= thresholds.warning) return "warning";
    return "bad";
  };

  const KPIIndicator = ({ status }: { status: "good" | "warning" | "bad" }) => {
    if (status === "good") return <ArrowUpRight className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />;
    if (status === "warning") return <Minus className="h-4 w-4 text-amber-600 dark:text-amber-400" />;
    return <ArrowDownRight className="h-4 w-4 text-destructive" />;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <BarChart3 className="h-8 w-8" />
            Manufacturing KPIs
          </h1>
          <p className="text-muted-foreground">
            Production performance metrics and analytics
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={dateRange} onValueChange={(v) => setDateRange(v as DateRange)}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="week">This Week</SelectItem>
              <SelectItem value="month">This Month</SelectItem>
              <SelectItem value="custom">Custom Date</SelectItem>
            </SelectContent>
          </Select>
          
          {dateRange === "custom" && (
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-[180px] justify-start text-left font-normal">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {format(selectedDate, "PPP")}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={(date) => date && setSelectedDate(date)}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <>
          {/* Primary KPI Cards */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {/* Output Achievement */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Output Achievement</CardTitle>
                <Target className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="flex items-baseline gap-2">
                  <div className="text-2xl font-bold">
                    {kpis.outputAchievement.toFixed(1)}%
                  </div>
                  <KPIIndicator status={getKPIStatus(kpis.outputAchievement, { good: 95, warning: 80 })} />
                </div>
                <Progress 
                  value={Math.min(kpis.outputAchievement, 100)} 
                  className="mt-2" 
                />
                <p className="text-xs text-muted-foreground mt-2">
                  {kpis.actualQuantity.toLocaleString()} / {kpis.targetQuantity.toLocaleString()} units
                </p>
              </CardContent>
            </Card>

            {/* Yield Rate */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Average Yield Rate</CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="flex items-baseline gap-2">
                  <div className="text-2xl font-bold">
                    {kpis.avgYield.toFixed(1)}%
                  </div>
                  <KPIIndicator status={getKPIStatus(kpis.avgYield, { good: 95, warning: 85 })} />
                </div>
                <Progress 
                  value={kpis.avgYield} 
                  className={cn("mt-2", kpis.avgYield < 85 && "bg-red-100")} 
                />
                <p className="text-xs text-muted-foreground mt-2">
                  Across {kpis.completedWOs} completed work orders
                </p>
              </CardContent>
            </Card>

            {/* Labor Efficiency */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Labor Efficiency</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="flex items-baseline gap-2">
                  <div className="text-2xl font-bold">
                    {kpis.laborEfficiency > 0 ? `${kpis.laborEfficiency.toFixed(1)}%` : "N/A"}
                  </div>
                  {kpis.laborEfficiency > 0 && (
                    <KPIIndicator status={getKPIStatus(kpis.laborEfficiency, { good: 100, warning: 85 })} />
                  )}
                </div>
                {kpis.laborEfficiency > 0 && (
                  <Progress 
                    value={Math.min(kpis.laborEfficiency, 120)} 
                    className="mt-2" 
                  />
                )}
                <p className="text-xs text-muted-foreground mt-2">
                  {kpis.actualLaborHours.toFixed(1)}h actual / {kpis.targetLaborHours.toFixed(1)}h target
                </p>
              </CardContent>
            </Card>

            {/* Cost Variance */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Cost Variance</CardTitle>
                <Gauge className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="flex items-baseline gap-2">
                <div className={cn(
                    "text-2xl font-bold",
                    kpis.costVariance >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-destructive"
                  )}>
                    {kpis.costVariance >= 0 ? "+" : ""}{kpis.costVariance.toFixed(1)}%
                  </div>
                  <KPIIndicator status={kpis.costVariance >= 0 ? "good" : kpis.costVariance >= -5 ? "warning" : "bad"} />
                </div>
                <p className="text-sm mt-2">
                  <span className="text-muted-foreground">Planned:</span>{" "}
                  ${kpis.plannedCost.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                </p>
                <p className="text-xs text-muted-foreground">
                  Actual: ${kpis.actualCost.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Charts Row */}
          <div className="grid gap-4 md:grid-cols-2">
            {/* Output vs Target Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Output vs Target
                </CardTitle>
                <CardDescription>
                  Daily production performance
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={dailyChartData}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis 
                        dataKey="date" 
                        className="text-xs"
                        tick={{ fill: 'hsl(var(--muted-foreground))' }}
                      />
                      <YAxis 
                        className="text-xs"
                        tick={{ fill: 'hsl(var(--muted-foreground))' }}
                      />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'hsl(var(--background))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px'
                        }}
                        labelFormatter={(label, payload) => {
                          if (payload?.[0]?.payload?.fullDate) {
                            return payload[0].payload.fullDate;
                          }
                          return label;
                        }}
                      />
                      <Legend />
                      <Area 
                        type="monotone" 
                        dataKey="target" 
                        stackId="1"
                        stroke="hsl(var(--muted-foreground))" 
                        fill="hsl(var(--muted))"
                        name="Target"
                      />
                      <Area 
                        type="monotone" 
                        dataKey="actual" 
                        stackId="2"
                        stroke="hsl(var(--primary))" 
                        fill="hsl(var(--primary))"
                        fillOpacity={0.6}
                        name="Actual"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Yield Rate Trend */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  Yield Rate Trend
                </CardTitle>
                <CardDescription>
                  Daily yield percentage
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={dailyChartData}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis 
                        dataKey="date" 
                        className="text-xs"
                        tick={{ fill: 'hsl(var(--muted-foreground))' }}
                      />
                      <YAxis 
                        domain={[0, 100]}
                        className="text-xs"
                        tick={{ fill: 'hsl(var(--muted-foreground))' }}
                      />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'hsl(var(--background))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px'
                        }}
                        formatter={(value: any) => value ? `${value.toFixed(1)}%` : 'N/A'}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="yield" 
                        stroke="hsl(var(--chart-2))" 
                        strokeWidth={2}
                        dot={{ fill: 'hsl(var(--chart-2))' }}
                        name="Yield %"
                        connectNulls
                      />
                      {/* Target line at 95% */}
                      <Line 
                        type="monotone" 
                        dataKey={() => 95}
                        stroke="hsl(var(--muted-foreground))"
                        strokeDasharray="5 5"
                        strokeWidth={1}
                        dot={false}
                        name="Target (95%)"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Second Charts Row */}
          <div className="grid gap-4 md:grid-cols-3">
            {/* Labor Hours Chart */}
            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Labor Hours
                </CardTitle>
                <CardDescription>
                  Target vs actual labor hours
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[250px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={laborChartData}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis 
                        dataKey="date" 
                        className="text-xs"
                        tick={{ fill: 'hsl(var(--muted-foreground))' }}
                      />
                      <YAxis 
                        className="text-xs"
                        tick={{ fill: 'hsl(var(--muted-foreground))' }}
                      />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'hsl(var(--background))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px'
                        }}
                        formatter={(value: any) => `${value.toFixed(1)}h`}
                      />
                      <Legend />
                      <Bar 
                        dataKey="targetHours" 
                        fill="hsl(var(--muted-foreground))"
                        name="Target Hours"
                        radius={[4, 4, 0, 0]}
                      />
                      <Bar 
                        dataKey="actualHours" 
                        fill="hsl(var(--chart-3))"
                        name="Actual Hours"
                        radius={[4, 4, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Work Order Status */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Factory className="h-5 w-5" />
                  Work Order Status
                </CardTitle>
                <CardDescription>
                  {kpis.totalWOs} work orders
                </CardDescription>
              </CardHeader>
              <CardContent>
                {statusPieData.length > 0 ? (
                  <div className="h-[250px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={statusPieData}
                          cx="50%"
                          cy="50%"
                          innerRadius={50}
                          outerRadius={80}
                          paddingAngle={2}
                          dataKey="value"
                        >
                          {statusPieData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: 'hsl(var(--background))',
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '8px'
                          }}
                        />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                    No work orders in range
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Summary Stats Row */}
          <div className="grid gap-4 md:grid-cols-4">
            <Card className="bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
                  <div>
                    <p className="text-sm text-muted-foreground">Completed</p>
                    <p className="text-2xl font-bold">{kpis.statusBreakdown.completed}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-sky-50 dark:bg-sky-900/20 border-sky-200 dark:border-sky-800">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <Activity className="h-8 w-8 text-sky-600 dark:text-sky-400" />
                  <div>
                    <p className="text-sm text-muted-foreground">In Progress</p>
                    <p className="text-2xl font-bold">{kpis.statusBreakdown.inProgress}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <Clock className="h-8 w-8 text-amber-600 dark:text-amber-400" />
                  <div>
                    <p className="text-sm text-muted-foreground">Scheduled</p>
                    <p className="text-2xl font-bold">{kpis.statusBreakdown.scheduled}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-muted/50 border-border">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <AlertTriangle className="h-8 w-8 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Draft/Planned</p>
                    <p className="text-2xl font-bold">{kpis.statusBreakdown.draft}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
