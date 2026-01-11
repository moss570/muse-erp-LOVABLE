import { useState, useMemo } from 'react';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, subDays, subMonths, subWeeks } from 'date-fns';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { TrendingUp, TrendingDown, DollarSign, ChevronDown, ChevronRight, Calendar, Download, Printer } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

type PeriodType = 'day' | 'week' | 'month';

interface PLLineItem {
  category: string;
  label: string;
  amount: number;
  priorAmount?: number;
  children?: PLLineItem[];
}

export default function ProfitLoss() {
  const [periodType, setPeriodType] = useState<PeriodType>('month');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set(['revenue', 'cogs', 'expenses']));

  // Calculate date range based on period type
  const dateRange = useMemo(() => {
    let start: Date, end: Date, priorStart: Date, priorEnd: Date;

    switch (periodType) {
      case 'day':
        start = selectedDate;
        end = selectedDate;
        priorStart = subDays(selectedDate, 1);
        priorEnd = subDays(selectedDate, 1);
        break;
      case 'week':
        start = startOfWeek(selectedDate);
        end = endOfWeek(selectedDate);
        priorStart = startOfWeek(subWeeks(selectedDate, 1));
        priorEnd = endOfWeek(subWeeks(selectedDate, 1));
        break;
      case 'month':
      default:
        start = startOfMonth(selectedDate);
        end = endOfMonth(selectedDate);
        priorStart = startOfMonth(subMonths(selectedDate, 1));
        priorEnd = endOfMonth(subMonths(selectedDate, 1));
    }

    return {
      start: format(start, 'yyyy-MM-dd'),
      end: format(end, 'yyyy-MM-dd'),
      priorStart: format(priorStart, 'yyyy-MM-dd'),
      priorEnd: format(priorEnd, 'yyyy-MM-dd'),
      label: periodType === 'day' 
        ? format(selectedDate, 'MMMM d, yyyy')
        : periodType === 'week'
        ? `Week of ${format(start, 'MMM d')} - ${format(end, 'MMM d, yyyy')}`
        : format(selectedDate, 'MMMM yyyy'),
    };
  }, [periodType, selectedDate]);

  // Fetch invoice data for revenue
  const { data: invoiceData } = useQuery({
    queryKey: ['pl-invoices', dateRange.start, dateRange.end],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('purchase_order_invoices')
        .select('invoice_type, subtotal, tax_amount, total_amount')
        .gte('invoice_date', dateRange.start)
        .lte('invoice_date', dateRange.end);
      if (error) throw error;
      return data;
    },
  });

  // Fetch fixed costs
  const { data: fixedCosts } = useQuery({
    queryKey: ['pl-fixed-costs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('fixed_costs')
        .select('*')
        .eq('is_active', true);
      if (error) throw error;
      return data;
    },
  });

  // Fetch overhead settings
  const { data: overheadSettings } = useQuery({
    queryKey: ['pl-overhead'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('overhead_settings')
        .select('*');
      if (error) throw error;
      return data;
    },
  });

  // Calculate P&L data
  const plData = useMemo(() => {
    // Material purchases (from invoices)
    const materialPurchases = invoiceData?.filter((i) => i.invoice_type === 'material')
      .reduce((sum, i) => sum + Number(i.subtotal || 0), 0) ?? 0;
    
    const freightCosts = invoiceData?.filter((i) => i.invoice_type === 'freight')
      .reduce((sum, i) => sum + Number(i.total_amount || 0), 0) ?? 0;

    // Fixed costs (prorated based on period)
    const monthlyFixedCosts = fixedCosts?.reduce((sum, c) => sum + Number(c.monthly_amount || 0), 0) ?? 0;
    const periodFixedCosts = periodType === 'day' 
      ? monthlyFixedCosts / 30 
      : periodType === 'week' 
      ? monthlyFixedCosts / 4 
      : monthlyFixedCosts;

    // Group fixed costs by category
    const fixedCostsByCategory = fixedCosts?.reduce((acc, cost) => {
      const cat = cost.category || 'other';
      if (!acc[cat]) acc[cat] = 0;
      acc[cat] += Number(cost.monthly_amount || 0) * (periodType === 'day' ? 1/30 : periodType === 'week' ? 1/4 : 1);
      return acc;
    }, {} as Record<string, number>) ?? {};

    // For demo purposes, using placeholder values
    // In production, these would come from actual production and sales data
    const grossRevenue = 125000 * (periodType === 'day' ? 1/30 : periodType === 'week' ? 1/4 : 1);
    const returns = grossRevenue * 0.02;
    const netRevenue = grossRevenue - returns;

    const rawMaterials = materialPurchases || (netRevenue * 0.35);
    const labor = netRevenue * 0.15;
    const overhead = Number(overheadSettings?.find((s) => s.setting_key === 'overhead_rate_per_hour')?.setting_value ?? 0) * 160 * 
      (periodType === 'day' ? 1/22 : periodType === 'week' ? 1/4 : 1);
    const totalCogs = rawMaterials + labor + overhead + freightCosts;
    const grossProfit = netRevenue - totalCogs;
    const grossMargin = netRevenue > 0 ? (grossProfit / netRevenue) * 100 : 0;

    const totalOperatingExpenses = periodFixedCosts;
    const operatingIncome = grossProfit - totalOperatingExpenses;
    const operatingMargin = netRevenue > 0 ? (operatingIncome / netRevenue) * 100 : 0;

    return {
      revenue: {
        gross: grossRevenue,
        returns,
        net: netRevenue,
      },
      cogs: {
        rawMaterials,
        labor,
        overhead,
        freight: freightCosts,
        total: totalCogs,
      },
      grossProfit,
      grossMargin,
      expenses: fixedCostsByCategory,
      totalExpenses: totalOperatingExpenses,
      operatingIncome,
      operatingMargin,
    };
  }, [invoiceData, fixedCosts, overheadSettings, periodType]);

  const toggleRow = (key: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(key)) {
      newExpanded.delete(key);
    } else {
      newExpanded.add(key);
    }
    setExpandedRows(newExpanded);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatPercent = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Profit & Loss</h1>
          <p className="text-muted-foreground">{dateRange.label}</p>
        </div>
        <div className="flex items-center gap-4">
          <Select value={periodType} onValueChange={(v) => setPeriodType(v as PeriodType)}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="day">Daily</SelectItem>
              <SelectItem value="week">Weekly</SelectItem>
              <SelectItem value="month">Monthly</SelectItem>
            </SelectContent>
          </Select>
          <input
            type="date"
            value={format(selectedDate, 'yyyy-MM-dd')}
            onChange={(e) => setSelectedDate(new Date(e.target.value))}
            className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
          />
          <Button variant="outline" size="icon">
            <Printer className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon">
            <Download className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Net Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(plData.revenue.net)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Gross Profit</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(plData.grossProfit)}</div>
            <p className="text-xs text-muted-foreground">{formatPercent(plData.grossMargin)} margin</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Operating Income</CardTitle>
            {plData.operatingIncome >= 0 ? (
              <TrendingUp className="h-4 w-4 text-green-500" />
            ) : (
              <TrendingDown className="h-4 w-4 text-red-500" />
            )}
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${plData.operatingIncome < 0 ? 'text-red-500' : ''}`}>
              {formatCurrency(plData.operatingIncome)}
            </div>
            <p className="text-xs text-muted-foreground">{formatPercent(plData.operatingMargin)} margin</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total COGS</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(plData.cogs.total)}</div>
            <p className="text-xs text-muted-foreground">
              {formatPercent((plData.cogs.total / plData.revenue.net) * 100)} of revenue
            </p>
          </CardContent>
        </Card>
      </div>

      {/* P&L Statement */}
      <Card>
        <CardHeader>
          <CardTitle>Income Statement</CardTitle>
          <CardDescription>Detailed profit and loss breakdown</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-1/2">Account</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="text-right">% of Revenue</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {/* Revenue Section */}
              <TableRow className="bg-muted/50">
                <TableCell colSpan={3} className="font-semibold">
                  <Collapsible open={expandedRows.has('revenue')}>
                    <CollapsibleTrigger asChild>
                      <button className="flex items-center gap-2" onClick={() => toggleRow('revenue')}>
                        {expandedRows.has('revenue') ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                        REVENUE
                      </button>
                    </CollapsibleTrigger>
                  </Collapsible>
                </TableCell>
              </TableRow>
              {expandedRows.has('revenue') && (
                <>
                  <TableRow>
                    <TableCell className="pl-8">Gross Revenue</TableCell>
                    <TableCell className="text-right font-mono">{formatCurrency(plData.revenue.gross)}</TableCell>
                    <TableCell className="text-right text-muted-foreground">100.0%</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="pl-8">Less: Returns & Allowances</TableCell>
                    <TableCell className="text-right font-mono text-red-500">({formatCurrency(plData.revenue.returns)})</TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {formatPercent((plData.revenue.returns / plData.revenue.gross) * 100)}
                    </TableCell>
                  </TableRow>
                </>
              )}
              <TableRow className="font-semibold border-t-2">
                <TableCell className="pl-4">Net Revenue</TableCell>
                <TableCell className="text-right font-mono">{formatCurrency(plData.revenue.net)}</TableCell>
                <TableCell className="text-right">100.0%</TableCell>
              </TableRow>

              {/* COGS Section */}
              <TableRow className="bg-muted/50">
                <TableCell colSpan={3} className="font-semibold">
                  <Collapsible open={expandedRows.has('cogs')}>
                    <CollapsibleTrigger asChild>
                      <button className="flex items-center gap-2" onClick={() => toggleRow('cogs')}>
                        {expandedRows.has('cogs') ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                        COST OF GOODS SOLD
                      </button>
                    </CollapsibleTrigger>
                  </Collapsible>
                </TableCell>
              </TableRow>
              {expandedRows.has('cogs') && (
                <>
                  <TableRow>
                    <TableCell className="pl-8">Raw Materials</TableCell>
                    <TableCell className="text-right font-mono">{formatCurrency(plData.cogs.rawMaterials)}</TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {formatPercent((plData.cogs.rawMaterials / plData.revenue.net) * 100)}
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="pl-8">Direct Labor</TableCell>
                    <TableCell className="text-right font-mono">{formatCurrency(plData.cogs.labor)}</TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {formatPercent((plData.cogs.labor / plData.revenue.net) * 100)}
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="pl-8">Manufacturing Overhead</TableCell>
                    <TableCell className="text-right font-mono">{formatCurrency(plData.cogs.overhead)}</TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {formatPercent((plData.cogs.overhead / plData.revenue.net) * 100)}
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="pl-8">Freight & Shipping</TableCell>
                    <TableCell className="text-right font-mono">{formatCurrency(plData.cogs.freight)}</TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {formatPercent((plData.cogs.freight / plData.revenue.net) * 100)}
                    </TableCell>
                  </TableRow>
                </>
              )}
              <TableRow className="font-semibold border-t-2">
                <TableCell className="pl-4">Total COGS</TableCell>
                <TableCell className="text-right font-mono">{formatCurrency(plData.cogs.total)}</TableCell>
                <TableCell className="text-right">
                  {formatPercent((plData.cogs.total / plData.revenue.net) * 100)}
                </TableCell>
              </TableRow>

              {/* Gross Profit */}
              <TableRow className="bg-green-500/10 font-bold">
                <TableCell>GROSS PROFIT</TableCell>
                <TableCell className="text-right font-mono">{formatCurrency(plData.grossProfit)}</TableCell>
                <TableCell className="text-right">{formatPercent(plData.grossMargin)}</TableCell>
              </TableRow>

              {/* Operating Expenses */}
              <TableRow className="bg-muted/50">
                <TableCell colSpan={3} className="font-semibold">
                  <Collapsible open={expandedRows.has('expenses')}>
                    <CollapsibleTrigger asChild>
                      <button className="flex items-center gap-2" onClick={() => toggleRow('expenses')}>
                        {expandedRows.has('expenses') ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                        OPERATING EXPENSES
                      </button>
                    </CollapsibleTrigger>
                  </Collapsible>
                </TableCell>
              </TableRow>
              {expandedRows.has('expenses') && (
                <>
                  {Object.entries(plData.expenses).map(([category, amount]) => (
                    <TableRow key={category}>
                      <TableCell className="pl-8 capitalize">{category}</TableCell>
                      <TableCell className="text-right font-mono">{formatCurrency(amount)}</TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {formatPercent((amount / plData.revenue.net) * 100)}
                      </TableCell>
                    </TableRow>
                  ))}
                </>
              )}
              <TableRow className="font-semibold border-t-2">
                <TableCell className="pl-4">Total Operating Expenses</TableCell>
                <TableCell className="text-right font-mono">{formatCurrency(plData.totalExpenses)}</TableCell>
                <TableCell className="text-right">
                  {formatPercent((plData.totalExpenses / plData.revenue.net) * 100)}
                </TableCell>
              </TableRow>

              {/* Operating Income */}
              <TableRow className={`font-bold text-lg ${plData.operatingIncome >= 0 ? 'bg-green-500/10' : 'bg-red-500/10'}`}>
                <TableCell>OPERATING INCOME</TableCell>
                <TableCell className={`text-right font-mono ${plData.operatingIncome < 0 ? 'text-red-500' : ''}`}>
                  {formatCurrency(plData.operatingIncome)}
                </TableCell>
                <TableCell className="text-right">{formatPercent(plData.operatingMargin)}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
