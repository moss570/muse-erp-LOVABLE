import { useState } from 'react';
import { format } from 'date-fns';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import {
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Minus,
  RefreshCw,
  History,
  FileWarning,
  Package,
  FileText,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Loader2,
} from 'lucide-react';

import {
  useSupplierScorecard,
  useCalculateSupplierMetrics,
  useChangeSupplierStatus,
} from '@/hooks/useSupplierScoring';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { GRADE_CONFIG } from '@/types/supplier-scoring';

interface SupplierScorecardProps {
  supplierId: string;
}

export function SupplierScorecard({ supplierId }: SupplierScorecardProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'metrics' | 'history'>('overview');
  const [showProbationDialog, setShowProbationDialog] = useState(false);
  const [probationReason, setProbationReason] = useState('');

  const { data: scorecard, isLoading, isError } = useSupplierScorecard(supplierId);
  const calculateMetrics = useCalculateSupplierMetrics();
  const changeStatus = useChangeSupplierStatus();

  const handleRecalculate = async () => {
    await calculateMetrics.mutateAsync({ supplierId, forceRecalculate: true });
  };

  const handleProbation = async () => {
    if (!scorecard) return;
    await changeStatus.mutateAsync({
      supplierId,
      newStatus: 'Probation',
      reason: probationReason || 'Performance score triggered auto-probation',
      isAutomatic: false,
      triggerDetails: scorecard.triggered_rules,
    });
    setShowProbationDialog(false);
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (isError || !scorecard) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        Failed to load scorecard. Please try again.
      </div>
    );
  }

  const { metrics, score_history, status_history, triggered_rules } = scorecard;
  const gradeConfig = GRADE_CONFIG[metrics?.score_grade || 'F'];

  // Calculate trend
  const trend = score_history.length >= 2
    ? score_history[score_history.length - 1].score - score_history[score_history.length - 2].score
    : 0;

  return (
    <div className="space-y-6">
      {/* Header with Score */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-bold">{scorecard.supplier_name}</h2>
          <p className="text-muted-foreground">{scorecard.supplier_code}</p>
          <Badge variant={scorecard.current_status === 'Probation' ? 'destructive' : 'secondary'} className="mt-2">
            {scorecard.current_status}
          </Badge>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-center">
            {/* Score Circle */}
            <div className={cn(
              'w-24 h-24 rounded-full flex flex-col items-center justify-center border-4',
              gradeConfig?.bgColor,
              gradeConfig?.color,
              'border-current'
            )}>
              <span className="text-3xl font-bold">
                {metrics?.final_score ?? '--'}
              </span>
              <span className="text-sm font-medium">
                {metrics?.score_grade || '-'}
              </span>
            </div>

            {/* Trend Indicator */}
            <div className="flex items-center justify-center gap-1 mt-2">
              {trend > 0 ? (
                <TrendingUp className="h-4 w-4 text-green-600" />
              ) : trend < 0 ? (
                <TrendingDown className="h-4 w-4 text-red-600" />
              ) : (
                <Minus className="h-4 w-4 text-muted-foreground" />
              )}
              <span className={cn(
                'text-sm font-medium',
                trend > 0 ? 'text-green-600' : trend < 0 ? 'text-red-600' : 'text-muted-foreground'
              )}>
                {trend > 0 ? '+' : ''}{trend}
              </span>
            </div>
          </div>

          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleRecalculate}
            disabled={calculateMetrics.isPending}
          >
            {calculateMetrics.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            Recalculate
          </Button>
        </div>
      </div>

      {/* Alert Banner if Probation Triggered */}
      {scorecard.should_change_status && triggered_rules.length > 0 && (
        <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-destructive mt-0.5" />
            <div className="flex-1">
              <h4 className="font-semibold text-destructive">
                Probation Recommended
              </h4>
              <ul className="mt-1 text-sm text-destructive/80 space-y-1">
                {triggered_rules.filter(r => r.action_type === 'probation').map((rule, i) => (
                  <li key={i}>• {rule.message}</li>
                ))}
              </ul>
              <Button
                size="sm"
                variant="destructive"
                className="mt-3"
                onClick={() => setShowProbationDialog(true)}
              >
                Move to Probation
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="metrics">Metrics Detail</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          {/* Score Trend Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Score Trend</CardTitle>
              <CardDescription>Performance over time</CardDescription>
            </CardHeader>
            <CardContent>
              {score_history.length > 0 ? (
                <div className="h-[200px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={score_history}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="date" 
                        tickFormatter={(v) => format(new Date(v), 'MMM')}
                        fontSize={12}
                      />
                      <YAxis domain={[0, 100]} fontSize={12} />
                      <Tooltip 
                        labelFormatter={(v) => format(new Date(v as string), 'MMM dd, yyyy')}
                        formatter={(value: number) => [value, 'Score']}
                      />
                      <ReferenceLine y={60} stroke="#ef4444" strokeDasharray="3 3" />
                      <ReferenceLine y={75} stroke="#f59e0b" strokeDasharray="3 3" />
                      <Line 
                        type="monotone" 
                        dataKey="score" 
                        stroke="hsl(var(--primary))" 
                        strokeWidth={2}
                        dot={{ fill: 'hsl(var(--primary))' }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-[200px] flex items-center justify-center text-muted-foreground">
                  No score history available
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Metrics */}
          {metrics && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2">
                    <Package className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Lots Received</span>
                  </div>
                  <p className="text-2xl font-bold mt-1">{metrics.total_lots_received}</p>
                  <p className="text-xs text-muted-foreground">
                    {metrics.lots_rejected} rejected ({metrics.rejection_rate.toFixed(1)}%)
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2">
                    <FileWarning className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">CAPAs</span>
                  </div>
                  <p className="text-2xl font-bold mt-1">{metrics.total_capas}</p>
                  <p className="text-xs text-muted-foreground">
                    {metrics.open_capas} open, {metrics.critical_capas} critical
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Documents</span>
                  </div>
                  <p className="text-2xl font-bold mt-1">{metrics.document_compliance_rate.toFixed(0)}%</p>
                  <p className="text-xs text-muted-foreground">
                    {metrics.expired_documents} expired
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Deductions</span>
                  </div>
                  <p className="text-2xl font-bold mt-1 text-red-600">-{metrics.total_deductions}</p>
                  <p className="text-xs text-muted-foreground">
                    from base score of {metrics.base_score}
                  </p>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        {/* Metrics Detail Tab */}
        <TabsContent value="metrics" className="space-y-4">
          {metrics ? (
            <>
              {/* Receiving Metrics */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Package className="h-4 w-4" />
                    Receiving Performance
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-4 gap-4 text-center">
                    <div>
                      <p className="text-2xl font-bold">{metrics.total_lots_received}</p>
                      <p className="text-xs text-muted-foreground">Total Lots</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-green-600">{metrics.lots_accepted}</p>
                      <p className="text-xs text-muted-foreground">Accepted</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-red-600">{metrics.lots_rejected}</p>
                      <p className="text-xs text-muted-foreground">Rejected</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-amber-600">{metrics.lots_on_hold}</p>
                      <p className="text-xs text-muted-foreground">On Hold</p>
                    </div>
                  </div>
                  <Separator />
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Rejection Rate</span>
                      <span className={metrics.rejection_rate > 10 ? 'text-red-600' : ''}>
                        {metrics.rejection_rate.toFixed(1)}%
                      </span>
                    </div>
                    <Progress 
                      value={Math.min(metrics.rejection_rate, 100)} 
                      className="h-2"
                    />
                  </div>
                </CardContent>
              </Card>

              {/* CAPA Metrics */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <FileWarning className="h-4 w-4" />
                    CAPA Summary
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-center p-3 bg-red-50 rounded-lg">
                      <p className="text-2xl font-bold text-red-600">{metrics.critical_capas}</p>
                      <p className="text-xs text-red-600">Critical</p>
                    </div>
                    <div className="text-center p-3 bg-amber-50 rounded-lg">
                      <p className="text-2xl font-bold text-amber-600">{metrics.major_capas}</p>
                      <p className="text-xs text-amber-600">Major</p>
                    </div>
                    <div className="text-center p-3 bg-blue-50 rounded-lg">
                      <p className="text-2xl font-bold text-blue-600">{metrics.minor_capas}</p>
                      <p className="text-xs text-blue-600">Minor</p>
                    </div>
                  </div>
                  <div className="mt-4 flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Open CAPAs</span>
                    <Badge variant={metrics.open_capas > 0 ? 'destructive' : 'secondary'}>
                      {metrics.open_capas}
                    </Badge>
                  </div>
                </CardContent>
              </Card>

              {/* Document Compliance */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Document Compliance
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Compliance Rate</span>
                      <span className="text-lg font-bold">
                        {metrics.document_compliance_rate.toFixed(0)}%
                      </span>
                    </div>
                    <Progress value={metrics.document_compliance_rate} className="h-2" />
                    <div className="grid grid-cols-3 gap-2 text-center text-sm">
                      <div className="flex items-center justify-center gap-1">
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                        <span>{metrics.valid_documents} Valid</span>
                      </div>
                      <div className="flex items-center justify-center gap-1">
                        <XCircle className="h-4 w-4 text-red-600" />
                        <span>{metrics.expired_documents} Expired</span>
                      </div>
                      <div className="flex items-center justify-center gap-1">
                        <AlertCircle className="h-4 w-4 text-amber-600" />
                        <span>{metrics.expiring_soon_documents} Expiring</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </>
          ) : (
            <div className="p-8 text-center text-muted-foreground">
              No metrics calculated yet. Click "Recalculate" to generate.
            </div>
          )}
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <History className="h-4 w-4" />
                Status History
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                {status_history.length > 0 ? (
                  <div className="space-y-4">
                    {status_history.map((entry) => (
                      <div key={entry.id} className="flex gap-3 pb-4 border-b last:border-0">
                        <div className={cn(
                          'w-2 h-2 rounded-full mt-2',
                          entry.new_status === 'Probation' ? 'bg-red-500' :
                          entry.new_status === 'Approved' ? 'bg-green-500' : 'bg-gray-400'
                        )} />
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">
                              {entry.previous_status || 'New'} → {entry.new_status}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {format(new Date(entry.created_at), 'MMM dd, yyyy HH:mm')}
                            </span>
                          </div>
                          <p className="text-sm mt-1">{entry.change_reason}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            By: {entry.triggered_by === 'system' ? 'System' : 'User'}
                            {entry.performance_score_at_change && ` • Score: ${entry.performance_score_at_change}`}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center text-muted-foreground py-8">
                    No status changes recorded
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Probation Confirmation Dialog */}
      <AlertDialog open={showProbationDialog} onOpenChange={setShowProbationDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Move Supplier to Probation?</AlertDialogTitle>
            <AlertDialogDescription>
              This will change the supplier status to Probation and enable stricter monitoring.
              A 3-month rolling period will be used for score calculation.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <label className="text-sm font-medium">Reason (optional)</label>
            <Textarea
              value={probationReason}
              onChange={(e) => setProbationReason(e.target.value)}
              placeholder="Enter reason for status change..."
              className="mt-1"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleProbation}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Confirm Probation
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
